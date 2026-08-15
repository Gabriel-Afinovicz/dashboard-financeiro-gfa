import type { DataStore, Investment, PaymentMethod, Transaction, TransactionType } from '../types';
import { toISO } from './format';

/** Gerador pseudoaleatório determinístico (mesma semente = mesmos dados). */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function id(): string {
  return crypto.randomUUID();
}

interface SeedTx {
  day: number;
  type: TransactionType;
  description: string;
  base: number; // centavos
  jitter?: number; // variação máxima em centavos
  category: string;
  method: PaymentMethod;
  everyMonth?: boolean;
}

const PLAN: SeedTx[] = [
  { day: 5, type: 'receita', description: 'Salário mensal', base: 450000, category: 'Salário', method: 'transferencia', everyMonth: true },
  { day: 18, type: 'receita', description: 'Projeto freelance', base: 90000, jitter: 60000, category: 'Freelance', method: 'pix' },
  { day: 22, type: 'receita', description: 'Venda de itens usados', base: 15000, jitter: 20000, category: 'Vendas', method: 'pix' },
  { day: 10, type: 'despesa', description: 'Aluguel do apartamento', base: 135000, category: 'Moradia', method: 'boleto', everyMonth: true },
  { day: 7, type: 'despesa', description: 'Supermercado da semana', base: 42000, jitter: 12000, category: 'Alimentação', method: 'cartao_debito', everyMonth: true },
  { day: 20, type: 'despesa', description: 'Feira e mercado', base: 28000, jitter: 9000, category: 'Alimentação', method: 'pix', everyMonth: true },
  { day: 15, type: 'despesa', description: 'Conta de luz e internet', base: 27000, jitter: 6000, category: 'Contas', method: 'boleto', everyMonth: true },
  { day: 3, type: 'despesa', description: 'Streaming e assinaturas', base: 9580, category: 'Assinaturas', method: 'cartao_credito', everyMonth: true },
  { day: 12, type: 'despesa', description: 'Combustível e transporte', base: 22000, jitter: 8000, category: 'Transporte', method: 'pix', everyMonth: true },
  { day: 25, type: 'despesa', description: 'Cinema e restaurante', base: 18000, jitter: 14000, category: 'Lazer', method: 'cartao_credito' },
  { day: 27, type: 'despesa', description: 'Farmácia', base: 11000, jitter: 7000, category: 'Saúde', method: 'cartao_debito' },
  { day: 16, type: 'despesa', description: 'Compras online', base: 24000, jitter: 20000, category: 'Compras', method: 'cartao_credito' },
];

/** Gera ~6 meses de transações plausíveis + carteira de investimentos de exemplo. */
export function buildSampleStore(today: Date = new Date()): DataStore {
  const transactions: Transaction[] = [];
  const createdAt = new Date().toISOString();

  for (let back = 5; back >= 0; back--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const random = rng(monthDate.getFullYear() * 100 + monthDate.getMonth() + 7);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    for (const item of PLAN) {
      // Itens não mensais aparecem em ~70% dos meses
      if (!item.everyMonth && random() < 0.3) continue;
      const day = Math.min(item.day, daysInMonth);
      // No mês atual, só até hoje
      if (back === 0 && day > today.getDate()) continue;
      const jitter = item.jitter ? Math.round((random() * 2 - 1) * item.jitter) : 0;
      const amount = Math.max(500, item.base + jitter);
      transactions.push({
        id: id(),
        type: item.type,
        description: item.description,
        amountCents: amount,
        date: toISO(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)),
        category: item.category,
        method: item.method,
        createdAt,
      });
    }
  }

  const monthsAgo = (n: number, day: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() - n, Math.min(day, 28));
    return toISO(d);
  };

  const investments: Investment[] = [
    { id: id(), name: 'Tesouro Selic 2029', kind: 'tesouro', amountCents: 300000, date: monthsAgo(10, 8), annualRatePct: 12.5, createdAt },
    { id: id(), name: 'CDB Banco Digital 110% CDI', kind: 'cdb', amountCents: 200000, date: monthsAgo(6, 15), annualRatePct: 13.2, createdAt },
    { id: id(), name: 'FII HGLG11', kind: 'fiis', amountCents: 150000, date: monthsAgo(4, 20), annualRatePct: 10.0, createdAt },
    { id: id(), name: 'Ações PETR4', kind: 'acoes', amountCents: 120000, date: monthsAgo(8, 11), annualRatePct: 15.0, createdAt },
    { id: id(), name: 'Poupança', kind: 'poupanca', amountCents: 80000, date: monthsAgo(12, 2), annualRatePct: 7.5, createdAt },
  ];

  return { version: 1, transactions, investments, sampleData: true };
}
