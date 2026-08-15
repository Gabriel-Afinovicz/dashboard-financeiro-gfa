import type { Investment, Transaction } from '../types';
import { monthLabel, parseISO } from './format';

/** Chave de mês de uma data ISO: "2026-08-14" -> "2026-08". */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Últimos n meses (incluindo o atual), em ordem crescente. Ex.: n=3 -> [jun, jul, ago]. */
export function lastMonthsKeys(n: number, ref: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** Todos os meses do primeiro lançamento até o mês atual (mín. 6 para o gráfico não ficar vazio). */
export function allMonthKeys(txs: Transaction[], ref: Date = new Date()): string[] {
  if (txs.length === 0) return lastMonthsKeys(6, ref);
  let min = monthKeyOf(txs[0].date);
  for (const t of txs) {
    const k = monthKeyOf(t.date);
    if (k < min) min = k;
  }
  const [y, m] = min.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const months = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth()) + 1;
  return lastMonthsKeys(Math.max(months, 6), ref);
}

/** Saldo em conta = saldo inicial + Σ receitas − Σ despesas. */
export function accountBalanceCents(txs: Transaction[], initialCents = 0): number {
  let total = initialCents;
  for (const t of txs) total += t.type === 'receita' ? t.amountCents : -t.amountCents;
  return total;
}

export interface MonthAggregate {
  key: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}

/** Receitas, despesas e resultado por mês, para as chaves informadas. */
export function monthlyAggregates(txs: Transaction[], keys: string[]): MonthAggregate[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const k of keys) map.set(k, { income: 0, expense: 0 });
  for (const t of txs) {
    const bucket = map.get(monthKeyOf(t.date));
    if (!bucket) continue;
    if (t.type === 'receita') bucket.income += t.amountCents;
    else bucket.expense += t.amountCents;
  }
  return keys.map((key) => {
    const { income, expense } = map.get(key)!;
    return { key, label: monthLabel(key), incomeCents: income, expenseCents: expense, resultCents: income - expense };
  });
}

/** Receitas/despesas/resultado de um único mês. */
export function monthSnapshot(txs: Transaction[], key: string) {
  const [agg] = monthlyAggregates(txs, [key]);
  return agg;
}

export interface BalancePoint {
  key: string;
  label: string;
  balanceCents: number;
}

/** Evolução mensal do saldo acumulado (inclui tudo que aconteceu antes da janela). */
export function cumulativeBalanceSeries(txs: Transaction[], initialCents: number, keys: string[]): BalancePoint[] {
  if (keys.length === 0) return [];
  let running = initialCents;
  for (const t of txs) {
    if (monthKeyOf(t.date) < keys[0]) {
      running += t.type === 'receita' ? t.amountCents : -t.amountCents;
    }
  }
  const monthly = monthlyAggregates(txs, keys);
  return monthly.map((m) => {
    running += m.resultCents;
    return { key: m.key, label: m.label, balanceCents: running };
  });
}

export interface CategorySlice {
  category: string;
  totalCents: number;
  pct: number;
}

/** Despesas por categoria dentro do conjunto de meses; agrupa excedentes em "Outras". */
export function expensesByCategory(txs: Transaction[], keySet: Set<string>, topN = 5): CategorySlice[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== 'despesa' || !keySet.has(monthKeyOf(t.date))) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountCents);
    total += t.amountCents;
  }
  if (total === 0) return [];
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const restTotal = sorted.slice(topN).reduce((acc, [, v]) => acc + v, 0);
  const slices = top.map(([category, totalCents]) => ({ category, totalCents, pct: (totalCents / total) * 100 }));
  if (restTotal > 0) slices.push({ category: 'Outras', totalCents: restTotal, pct: (restTotal / total) * 100 });
  return slices;
}

export interface PixSummary {
  receivedCents: number;
  sentCents: number;
  netCents: number;
  count: number;
}

/** Resumo de transações via Pix no conjunto de meses. */
export function pixSummary(txs: Transaction[], keySet: Set<string>): PixSummary {
  let received = 0;
  let sent = 0;
  let count = 0;
  for (const t of txs) {
    if (t.method !== 'pix' || !keySet.has(monthKeyOf(t.date))) continue;
    count++;
    if (t.type === 'receita') received += t.amountCents;
    else sent += t.amountCents;
  }
  return { receivedCents: received, sentCents: sent, netCents: received - sent, count };
}

/** Dias entre a aplicação e hoje (mínimo 0). */
export function daysSince(iso: string, today: Date = new Date()): number {
  const start = parseISO(iso).getTime();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

/** Valor atual estimado: aporte × (1 + taxa)^(dias/365), juros compostos pró-rata. */
export function investmentCurrentValueCents(inv: Investment, today: Date = new Date()): number {
  const days = daysSince(inv.date, today);
  const factor = Math.pow(1 + inv.annualRatePct / 100, days / 365);
  return Math.round(inv.amountCents * factor);
}

export interface InvestmentsSummary {
  investedCents: number;
  currentCents: number;
  yieldCents: number;
  yieldPct: number;
  byKind: { kind: string; investedCents: number; currentCents: number }[];
}

export function investmentsSummary(invs: Investment[], today: Date = new Date()): InvestmentsSummary {
  let invested = 0;
  let current = 0;
  const kindMap = new Map<string, { investedCents: number; currentCents: number }>();
  for (const inv of invs) {
    const cur = investmentCurrentValueCents(inv, today);
    invested += inv.amountCents;
    current += cur;
    const bucket = kindMap.get(inv.kind) ?? { investedCents: 0, currentCents: 0 };
    bucket.investedCents += inv.amountCents;
    bucket.currentCents += cur;
    kindMap.set(inv.kind, bucket);
  }
  const byKind = [...kindMap.entries()]
    .map(([kind, v]) => ({ kind, ...v }))
    .sort((a, b) => b.currentCents - a.currentCents);
  return {
    investedCents: invested,
    currentCents: current,
    yieldCents: current - invested,
    yieldPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    byKind,
  };
}

/** Variação percentual entre dois valores; null quando não é possível calcular. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Taxa de economia do mês = resultado / receitas (null sem receitas). */
export function savingsRate(incomeCents: number, expenseCents: number): number | null {
  if (incomeCents <= 0) return null;
  return ((incomeCents - expenseCents) / incomeCents) * 100;
}
