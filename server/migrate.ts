import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pg, pool } from './db';

/** Cria o banco de dados caso ainda não exista (conecta ao banco padrão "postgres"). */
async function ensureDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    client.release();
    return;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== '3D000') throw err; // 3D000 = banco não existe
  }

  const url = new URL(process.env.DATABASE_URL!);
  const dbName = url.pathname.slice(1);
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  await admin.end();
  console.log(`[migração] banco "${dbName}" criado`);
}

/** Aplica as migrações .sql pendentes (controladas pela tabela schema_migrations). */
export async function migrate(): Promise<void> {
  await ensureDatabase();

  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );

  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file]);
    if (done.rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migração] aplicada: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
