import 'dotenv/config';
import pg from 'pg';

// BIGINT (oid 20) -> number (valores em centavos cabem com folga em 2^53)
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
// DATE (oid 1082) -> string "yyyy-mm-dd" (evita deslocamento de fuso horário)
pg.types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Crie o arquivo .env na raiz do projeto.');
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export { pg };
