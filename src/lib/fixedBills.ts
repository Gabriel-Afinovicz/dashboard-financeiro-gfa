import type { FixedBill, Transaction } from '../types';
import { monthKeyOf } from './calc';
import { toISO } from './format';

/** Data ISO do dia no mês, limitada ao último dia quando o mês é mais curto (31 em fevereiro → 28/29). */
export function occurrenceDate(year: number, monthIndex: number, dayOfMonth: number): string {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), last);
  return toISO(new Date(year, monthIndex, day));
}

/**
 * Gera uma despesa virtual por mês, do início da conta até o mês atual.
 * O mês corrente entra mesmo se o dia ainda não chegou (conta já comprometida na fatura).
 */
export function expandFixedBills(bills: FixedBill[], today: Date = new Date()): Transaction[] {
  const endKey = monthKeyOf(toISO(today));
  const generated: Transaction[] = [];

  for (const bill of bills) {
    if (!bill.active) continue;

    const startKey = monthKeyOf(bill.startsOn);
    let [year, month] = startKey.split('-').map(Number);
    const [endYear, endMonth] = endKey.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const date = occurrenceDate(year, month - 1, bill.dayOfMonth);
      generated.push({
        id: `fixed:${bill.id}:${date}`,
        type: 'despesa',
        description: bill.description,
        amountCents: bill.amountCents,
        date,
        category: bill.category,
        method: bill.method,
        createdAt: bill.createdAt,
      });
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return generated;
}

/** Lançamentos reais + contas fixas expandidas, para os gráficos e totais. */
export function mergeWithFixedBills(
  transactions: Transaction[],
  bills: FixedBill[],
  today: Date = new Date(),
): Transaction[] {
  return [...transactions, ...expandFixedBills(bills, today)];
}

export function monthFixedBills(bills: FixedBill[], monthKey: string, today: Date = new Date()): Transaction[] {
  return expandFixedBills(bills, today).filter((t) => monthKeyOf(t.date) === monthKey);
}

export function fixedBillsTotalCents(bills: FixedBill[]): number {
  let total = 0;
  for (const bill of bills) {
    if (bill.active) total += bill.amountCents;
  }
  return total;
}
