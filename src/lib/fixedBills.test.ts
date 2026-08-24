import { describe, expect, it } from 'vitest';
import type { FixedBill } from '../types';
import { accountBalanceCents, monthlyAggregates } from './calc';
import { expandFixedBills, mergeWithFixedBills, occurrenceDate } from './fixedBills';

function bill(partial: Partial<FixedBill>): FixedBill {
  return {
    id: partial.id ?? 'bill-1',
    description: partial.description ?? 'Netflix',
    amountCents: partial.amountCents ?? 5590,
    dayOfMonth: partial.dayOfMonth ?? 10,
    category: partial.category ?? 'Assinaturas',
    method: partial.method ?? 'cartao_credito',
    active: partial.active ?? true,
    startsOn: partial.startsOn ?? '2026-06-01',
    createdAt: partial.createdAt ?? '2026-06-01T00:00:00.000Z',
  };
}

describe('dia da fatura em meses curtos', () => {
  it('dia 31 em fevereiro vira 28 (ano não bissexto)', () => {
    expect(occurrenceDate(2026, 1, 31)).toBe('2026-02-28');
  });

  it('dia 31 em janeiro permanece 31', () => {
    expect(occurrenceDate(2026, 0, 31)).toBe('2026-01-31');
  });
});

describe('expansão de contas fixas', () => {
  it('gera uma despesa por mês até o mês atual, inclusive', () => {
    const txs = expandFixedBills([bill({ startsOn: '2026-06-15', dayOfMonth: 10 })], new Date(2026, 7, 18));
    expect(txs.map((t) => t.date)).toEqual(['2026-06-10', '2026-07-10', '2026-08-10']);
    expect(txs.every((t) => t.type === 'despesa' && t.amountCents === 5590)).toBe(true);
  });

  it('conta pausada não gera lançamento', () => {
    const txs = expandFixedBills([bill({ active: false })], new Date(2026, 7, 18));
    expect(txs).toHaveLength(0);
  });

  it('soma nas despesas do mês junto com lançamentos avulsos (sem duplicar a lógica)', () => {
    const fixed = expandFixedBills([bill({ amountCents: 10000, startsOn: '2026-08-01' })], new Date(2026, 7, 18));
    const avulso = {
      id: 'tx-1',
      type: 'despesa' as const,
      description: 'Feira',
      amountCents: 5000,
      date: '2026-08-05',
      category: 'Alimentação',
      method: 'pix' as const,
      createdAt: '2026-08-05T00:00:00.000Z',
    };
    const ledger = mergeWithFixedBills([avulso], [bill({ amountCents: 10000, startsOn: '2026-08-01' })], new Date(2026, 7, 18));
    const [aug] = monthlyAggregates(ledger, ['2026-08']);
    expect(aug.expenseCents).toBe(15000);
    expect(accountBalanceCents(ledger, 0)).toBe(-15000);
    expect(fixed).toHaveLength(1);
  });
});
