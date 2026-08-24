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
 * Se a conta for em dólar, o valor em centavos de BRL é estimado com base na cotação do dia de ocorrência (ratesMap) ou usdRate padrão.
 */
export function expandFixedBills(
  bills: FixedBill[],
  today: Date = new Date(),
  usdRate = 5.65,
  ratesMap?: Record<string, number>,
): Transaction[] {
  const endKey = monthKeyOf(toISO(today));
  const generated: Transaction[] = [];

  for (const bill of bills) {
    if (!bill.active) continue;

    const startKey = monthKeyOf(bill.startsOn);
    let [year, month] = startKey.split('-').map(Number);
    const [endYear, endMonth] = endKey.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const date = occurrenceDate(year, month - 1, bill.dayOfMonth);
      const rateForDate = ratesMap?.[date] ?? usdRate;

      const amountCents =
        bill.currency === 'USD' && bill.amountCentsUSD
          ? Math.round(bill.amountCentsUSD * rateForDate)
          : bill.amountCents;

      generated.push({
        id: `fixed:${bill.id}:${date}`,
        type: 'despesa',
        description: bill.currency === 'USD' ? `${bill.description} (USD)` : bill.description,
        amountCents,
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

/** Retorna todas as datas ISO de ocorrência das contas fixas em dólar para busca de cotação histórica. */
export function getFixedBillsOccurrenceDates(bills: FixedBill[], today: Date = new Date()): string[] {
  const endKey = monthKeyOf(toISO(today));
  const dates: string[] = [];

  for (const bill of bills) {
    if (!bill.active || bill.currency !== 'USD') continue;

    const startKey = monthKeyOf(bill.startsOn);
    let [year, month] = startKey.split('-').map(Number);
    const [endYear, endMonth] = endKey.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const date = occurrenceDate(year, month - 1, bill.dayOfMonth);
      dates.push(date);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return dates;
}

/** Lançamentos reais + contas fixas expandidas, para os gráficos e totais. */
export function mergeWithFixedBills(
  transactions: Transaction[],
  bills: FixedBill[],
  today: Date = new Date(),
  usdRate = 5.65,
  ratesMap?: Record<string, number>,
): Transaction[] {
  return [...transactions, ...expandFixedBills(bills, today, usdRate, ratesMap)];
}

export function monthFixedBills(
  bills: FixedBill[],
  monthKey: string,
  today: Date = new Date(),
  usdRate = 5.65,
  ratesMap?: Record<string, number>,
): Transaction[] {
  return expandFixedBills(bills, today, usdRate, ratesMap).filter((t) => monthKeyOf(t.date) === monthKey);
}

export function fixedBillsTotalCents(bills: FixedBill[], usdRate = 5.65): number {
  let total = 0;
  for (const bill of bills) {
    if (!bill.active) continue;
    if (bill.currency === 'USD' && bill.amountCentsUSD) {
      total += Math.round(bill.amountCentsUSD * usdRate);
    } else {
      total += bill.amountCents;
    }
  }
  return total;
}
