CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 80),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 40),
  method TEXT NOT NULL CHECK (method IN ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto', 'transferencia')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_method ON transactions (method);

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind TEXT NOT NULL CHECK (kind IN ('poupanca', 'cdb', 'tesouro', 'acoes', 'fiis', 'cripto', 'fundos', 'outro')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  date DATE NOT NULL,
  annual_rate_pct NUMERIC(6, 2) NOT NULL CHECK (annual_rate_pct >= 0 AND annual_rate_pct <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metadados e configurações em formato chave/valor
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
