import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type pg from 'pg';
import { pool } from './db';
import { login, requireAuth } from './auth';
import { isUuid, parseFixedBill, parseInvestment, parseTransaction } from './validate';

export const router = Router();

const SELECT_TRANSACTIONS = `
  SELECT id, type, description, amount_cents AS "amountCents",
         to_char(date, 'YYYY-MM-DD') AS date, category, method,
         COALESCE(installments_count, 1) AS "installmentsCount",
         COALESCE(current_installment, 1) AS "currentInstallment",
         created_at AS "createdAt"
  FROM transactions`;

const SELECT_INVESTMENTS = `
  SELECT id, name, kind, amount_cents AS "amountCents",
         to_char(date, 'YYYY-MM-DD') AS date,
         annual_rate_pct::float8 AS "annualRatePct",
         created_at AS "createdAt"
  FROM investments`;

type Db = pg.Pool | pg.PoolClient;

async function getMeta(db: Db, key: string): Promise<unknown> {
  const res = await db.query('SELECT value FROM meta WHERE key = $1', [key]);
  return res.rows[0]?.value ?? null;
}

async function setMeta(db: Db, key: string, value: unknown): Promise<void> {
  await db.query(
    'INSERT INTO meta (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, JSON.stringify(value)],
  );
}

async function fetchData(db: Db) {
  const [tx, inv, sample, initialized] = await Promise.all([
    db.query(`${SELECT_TRANSACTIONS} ORDER BY date DESC, created_at DESC`),
    db.query(`${SELECT_INVESTMENTS} ORDER BY date ASC, created_at ASC`),
    getMeta(db, 'sample_data'),
    getMeta(db, 'initialized'),
  ]);
  return {
    transactions: tx.rows,
    investments: inv.rows,
    sampleData: sample === true,
    initialized: initialized === true,
  };
}

// ---------- Rotas públicas ----------

router.post('/login', login);

/** Usado pelo monitoramento do servidor; não expõe nenhum dado. */
router.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, db: 'conectado' });
});

// ---------- Daqui para baixo, tudo exige token de acesso ----------
router.use(requireAuth);

/** Confirma para o front que o token guardado no navegador continua valendo. */
router.get('/session', (_req, res) => {
  res.json({ ok: true });
});

// ---------- Dados completos ----------
router.get('/data', async (_req, res) => {
  res.json(await fetchData(pool));
});

/**
 * Substitui todos os dados (importação de backup, dados de exemplo, apagar tudo).
 * Roda em transação com advisory lock para nunca duplicar em chamadas simultâneas.
 */
router.post('/data/replace', async (req, res) => {
  const body = req.body as {
    transactions?: unknown[];
    investments?: unknown[];
    sampleData?: boolean;
  } | null;
  if (!body || !Array.isArray(body.transactions) || !Array.isArray(body.investments)) {
    res.status(400).json({ error: 'Formato inválido: esperado { transactions, investments, sampleData }.' });
    return;
  }

  const txs = [];
  for (const item of body.transactions) {
    const parsed = parseTransaction(item);
    if (!parsed.ok) {
      res.status(400).json({ error: `Transação inválida: ${parsed.error}` });
      return;
    }
    const raw = item as { id?: unknown; createdAt?: unknown };
    txs.push({
      ...parsed.value,
      id: isUuid(raw.id) ? raw.id : randomUUID(),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    });
  }

  const invs = [];
  for (const item of body.investments) {
    const parsed = parseInvestment(item);
    if (!parsed.ok) {
      res.status(400).json({ error: `Investimento inválido: ${parsed.error}` });
      return;
    }
    const raw = item as { id?: unknown; createdAt?: unknown };
    invs.push({
      ...parsed.value,
      id: isUuid(raw.id) ? raw.id : randomUUID(),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(101)');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM investments');

    for (const t of txs) {
      await client.query(
        `INSERT INTO transactions (id, type, description, amount_cents, date, category, method, installments_count, current_installment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 1), COALESCE($9, 1), COALESCE($10::timestamptz, now()))`,
        [t.id, t.type, t.description, t.amountCents, t.date, t.category, t.method, t.installmentsCount, t.currentInstallment, t.createdAt],
      );
    }
    for (const i of invs) {
      await client.query(
        `INSERT INTO investments (id, name, kind, amount_cents, date, annual_rate_pct, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))`,
        [i.id, i.name, i.kind, i.amountCents, i.date, i.annualRatePct, i.createdAt],
      );
    }

    await setMeta(client, 'sample_data', body.sampleData === true);
    await setMeta(client, 'initialized', true);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json(await fetchData(pool));
});

// ---------- Transações ----------
router.post('/transactions', async (req, res) => {
  const parsed = parseTransaction(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  const inserted = await pool.query(
    `INSERT INTO transactions (type, description, amount_cents, date, category, method, installments_count, current_installment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, type, description, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date, category, method,
               COALESCE(installments_count, 1) AS "installmentsCount",
               COALESCE(current_installment, 1) AS "currentInstallment",
               created_at AS "createdAt"`,
    [v.type, v.description, v.amountCents, v.date, v.category, v.method, v.installmentsCount ?? 1, v.currentInstallment ?? 1],
  );
  res.status(201).json(inserted.rows[0]);
});

router.put('/transactions/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  const parsed = parseTransaction(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  const updated = await pool.query(
    `UPDATE transactions
     SET type = $2, description = $3, amount_cents = $4, date = $5, category = $6, method = $7,
         installments_count = $8, current_installment = $9
     WHERE id = $1
     RETURNING id, type, description, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date, category, method,
               COALESCE(installments_count, 1) AS "installmentsCount",
               COALESCE(current_installment, 1) AS "currentInstallment",
               created_at AS "createdAt"`,
    [req.params.id, v.type, v.description, v.amountCents, v.date, v.category, v.method, v.installmentsCount ?? 1, v.currentInstallment ?? 1],
  );
  if (updated.rowCount === 0) {
    res.status(404).json({ error: 'Transação não encontrada.' });
    return;
  }
  res.json(updated.rows[0]);
});

router.delete('/transactions/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  const deleted = await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
  if (deleted.rowCount === 0) {
    res.status(404).json({ error: 'Transação não encontrada.' });
    return;
  }
  res.json({ ok: true });
});

// ---------- Investimentos ----------
router.post('/investments', async (req, res) => {
  const parsed = parseInvestment(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  const inserted = await pool.query(
    `INSERT INTO investments (name, kind, amount_cents, date, annual_rate_pct)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, kind, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date,
               annual_rate_pct::float8 AS "annualRatePct", created_at AS "createdAt"`,
    [v.name, v.kind, v.amountCents, v.date, v.annualRatePct],
  );
  res.status(201).json(inserted.rows[0]);
});

router.put('/investments/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  const parsed = parseInvestment(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  const updated = await pool.query(
    `UPDATE investments
     SET name = $2, kind = $3, amount_cents = $4, date = $5, annual_rate_pct = $6
     WHERE id = $1
     RETURNING id, name, kind, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date,
               annual_rate_pct::float8 AS "annualRatePct", created_at AS "createdAt"`,
    [req.params.id, v.name, v.kind, v.amountCents, v.date, v.annualRatePct],
  );
  if (updated.rowCount === 0) {
    res.status(404).json({ error: 'Investimento não encontrado.' });
    return;
  }
  res.json(updated.rows[0]);
});

router.delete('/investments/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  const deleted = await pool.query('DELETE FROM investments WHERE id = $1', [req.params.id]);
  if (deleted.rowCount === 0) {
    res.status(404).json({ error: 'Investimento não encontrado.' });
    return;
  }
  res.json({ ok: true });
});

// ---------- Configurações ----------
router.get('/settings', async (_req, res) => {
  res.json(await getMeta(pool, 'settings'));
});

router.put('/settings', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Configurações inválidas.' });
    return;
  }
  await setMeta(pool, 'settings', req.body);
  res.json({ ok: true });
});

// ---------- Contas Fixas ----------
const SELECT_FIXED_BILLS = `
  SELECT id, description, amount_cents AS "amountCents",
         COALESCE(currency, 'BRL') AS currency,
         amount_cents_usd AS "amountCentsUSD",
         COALESCE(confirmations, '{}'::jsonb) AS confirmations,
         day_of_month AS "dayOfMonth", category, method, active,
         to_char(starts_on, 'YYYY-MM-DD') AS "startsOn",
         created_at AS "createdAt"
  FROM fixed_bills`;

router.get('/fixed-bills', async (_req, res) => {
  try {
    const rows = await pool.query(`${SELECT_FIXED_BILLS} ORDER BY day_of_month ASC, created_at DESC`);
    res.json(rows.rows);
  } catch {
    res.json([]);
  }
});

router.post('/fixed-bills', async (req, res) => {
  const parsed = parseFixedBill(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  try {
    const inserted = await pool.query(
      `INSERT INTO fixed_bills (description, amount_cents, currency, amount_cents_usd, confirmations, day_of_month, category, method, active, starts_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, description, amount_cents AS "amountCents",
                 COALESCE(currency, 'BRL') AS currency,
                 amount_cents_usd AS "amountCentsUSD",
                 COALESCE(confirmations, '{}'::jsonb) AS confirmations,
                 day_of_month AS "dayOfMonth", category, method, active,
                 to_char(starts_on, 'YYYY-MM-DD') AS "startsOn", created_at AS "createdAt"`,
      [
        v.description,
        v.amountCents,
        v.currency ?? 'BRL',
        v.amountCentsUSD ?? null,
        JSON.stringify(v.confirmations ?? {}),
        v.dayOfMonth,
        v.category,
        v.method,
        v.active,
        v.startsOn,
      ],
    );
    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta fixa no banco de dados.' });
  }
});

router.put('/fixed-bills/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  const parsed = parseFixedBill(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const v = parsed.value;
  try {
    const updated = await pool.query(
      `UPDATE fixed_bills
       SET description = $2, amount_cents = $3, currency = $4, amount_cents_usd = $5, confirmations = $6, day_of_month = $7, category = $8, method = $9, active = $10, starts_on = $11
       WHERE id = $1
       RETURNING id, description, amount_cents AS "amountCents",
                 COALESCE(currency, 'BRL') AS currency,
                 amount_cents_usd AS "amountCentsUSD",
                 COALESCE(confirmations, '{}'::jsonb) AS confirmations,
                 day_of_month AS "dayOfMonth", category, method, active,
                 to_char(starts_on, 'YYYY-MM-DD') AS "startsOn", created_at AS "createdAt"`,
      [
        req.params.id,
        v.description,
        v.amountCents,
        v.currency ?? 'BRL',
        v.amountCentsUSD ?? null,
        JSON.stringify(v.confirmations ?? {}),
        v.dayOfMonth,
        v.category,
        v.method,
        v.active,
        v.startsOn,
      ],
    );
    if (updated.rowCount === 0) {
      res.status(404).json({ error: 'Conta fixa não encontrada.' });
      return;
    }
    res.json(updated.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar conta fixa.' });
  }
});

router.delete('/fixed-bills/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: 'Identificador inválido.' });
    return;
  }
  try {
    const deleted = await pool.query('DELETE FROM fixed_bills WHERE id = $1', [req.params.id]);
    if (deleted.rowCount === 0) {
      res.status(404).json({ error: 'Conta fixa não encontrada.' });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir conta fixa.' });
  }
});
