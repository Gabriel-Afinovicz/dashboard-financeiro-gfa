-- Migração 002: Tabela de Contas Fixas e Suporte a Parcelamento no Cartão de Crédito

-- 1. Tabela para Contas Fixas (Gastos Mensais Recorrentes)
CREATE TABLE IF NOT EXISTS fixed_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 80),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 40),
  method TEXT NOT NULL CHECK (method IN ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto', 'transferencia')),
  active BOOLEAN NOT NULL DEFAULT true,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_bills_active ON fixed_bills (active);

-- 2. Adicionar suporte a parcelamento na tabela de transações
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS installments_count INT DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 36),
  ADD COLUMN IF NOT EXISTS current_installment INT DEFAULT 1 CHECK (current_installment BETWEEN 1 AND 36);

-- Comentário explicativo:
-- Para aplicar esta migração no seu servidor PostgreSQL rodando em produção:
-- `psql -U <usuario> -d <nome_do_banco> -f server/migrations/002_fixed_bills_and_credit_cards.sql`
