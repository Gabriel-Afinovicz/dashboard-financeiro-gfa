import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type pg from 'pg';
import { pool } from './db';
import { isUuid, parseInvestment, parseTransaction } from './validate';

export const router = Router();

const SELECT_TRANSACTIONS = `
  SELECT id, type, description, amount_cents AS "amountCents",
         to_char(date, 'YYYY-MM-DD') AS date, category, method,
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

// ---------- Saúde ----------
router.get('/health', async (_req, res) => {
  const version = await pool.query('SELECT version()');
  res.json({ ok: true, db: 'conectado', version: version.rows[0].version as string });
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
        `INSERT INTO transactions (id, type, description, amount_cents, date, category, method, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))`,
        [t.id, t.type, t.description, t.amountCents, t.date, t.category, t.method, t.createdAt],
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
    `INSERT INTO transactions (type, description, amount_cents, date, category, method)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, type, description, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date, category, method, created_at AS "createdAt"`,
    [v.type, v.description, v.amountCents, v.date, v.category, v.method],
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
     SET type = $2, description = $3, amount_cents = $4, date = $5, category = $6, method = $7
     WHERE id = $1
     RETURNING id, type, description, amount_cents AS "amountCents",
               to_char(date, 'YYYY-MM-DD') AS date, category, method, created_at AS "createdAt"`,
    [req.params.id, v.type, v.description, v.amountCents, v.date, v.category, v.method],
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
