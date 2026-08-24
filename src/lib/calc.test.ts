import { describe, expect, it } from 'vitest';
import type { Investment, Transaction } from '../types';
import {
  accountBalanceCents,
  calculateClosingDayFromDueDay,
  creditCardInvoiceSummary,
  cumulativeBalanceSeries,
  expensesByCategory,
  incomeCommitmentRatio,
  investmentCurrentValueCents,
  investmentsSummary,
  lastMonthsKeys,
  monthlyAggregates,
  pctChange,
  pixSummary,
  savingsRate,
} from './calc';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    type: partial.type ?? 'despesa',
    description: partial.description ?? 'Teste',
    amountCents: partial.amountCents ?? 1000,
    date: partial.date ?? '2026-08-01',
    category: partial.category ?? 'Outros',
    method: partial.method ?? 'pix',
    createdAt: partial.createdAt ?? '2026-08-01T00:00:00.000Z',
  };
}

function inv(partial: Partial<Investment>): Investment {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    name: partial.name ?? 'Teste',
    kind: partial.kind ?? 'cdb',
    amountCents: partial.amountCents ?? 100000,
    date: partial.date ?? '2026-01-01',
    annualRatePct: partial.annualRatePct ?? 12,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('saldo em conta', () => {
  it('soma saldo inicial + receitas − despesas', () => {
    const txs = [
      tx({ type: 'receita', amountCents: 50000 }),
      tx({ type: 'despesa', amountCents: 20000 }),
      tx({ type: 'despesa', amountCents: 5000 }),
    ];
    expect(accountBalanceCents(txs, 100000)).toBe(125000);
  });

  it('sem transações devolve o saldo inicial', () => {
    expect(accountBalanceCents([], 42)).toBe(42);
  });
});

describe('agregação mensal', () => {
  const txs = [
    tx({ type: 'receita', amountCents: 300000, date: '2026-07-05' }),
    tx({ type: 'despesa', amountCents: 100000, date: '2026-07-10' }),
    tx({ type: 'receita', amountCents: 400000, date: '2026-08-05' }),
    tx({ type: 'despesa', amountCents: 150000, date: '2026-08-12' }),
    tx({ type: 'despesa', amountCents: 99900, date: '2026-06-01' }), // fora da janela
  ];

  it('agrupa receitas/despesas por mês e calcula resultado', () => {
    const agg = monthlyAggregates(txs, ['2026-07', '2026-08']);
    expect(agg[0]).toMatchObject({ incomeCents: 300000, expenseCents: 100000, resultCents: 200000 });
    expect(agg[1]).toMatchObject({ incomeCents: 400000, expenseCents: 150000, resultCents: 250000 });
  });

  it('série acumulada termina igual ao saldo total (congruência)', () => {
    const keys = ['2026-06', '2026-07', '2026-08'];
    const initial = 50000;
    const series = cumulativeBalanceSeries(txs, initial, keys);
    expect(series[series.length - 1].balanceCents).toBe(accountBalanceCents(txs, initial));
  });

  it('transações anteriores à janela entram no ponto de partida', () => {
    const series = cumulativeBalanceSeries(txs, 0, ['2026-07', '2026-08']);
    // junho: -99900 antes da janela; julho: +200000 => 100100
    expect(series[0].balanceCents).toBe(100100);
  });
});

describe('despesas por categoria', () => {
  it('percentuais somam 100% e valores batem com o total', () => {
    const txs = [
      tx({ type: 'despesa', amountCents: 60000, category: 'Moradia', date: '2026-08-01' }),
      tx({ type: 'despesa', amountCents: 30000, category: 'Alimentação', date: '2026-08-02' }),
      tx({ type: 'despesa', amountCents: 10000, category: 'Lazer', date: '2026-08-03' }),
      tx({ type: 'receita', amountCents: 999999, category: 'Salário', date: '2026-08-04' }), // ignorada
    ];
    const slices = expensesByCategory(txs, new Set(['2026-08']));
    const total = slices.reduce((acc, s) => acc + s.totalCents, 0);
    const pct = slices.reduce((acc, s) => acc + s.pct, 0);
    expect(total).toBe(100000);
    expect(pct).toBeCloseTo(100, 6);
    expect(slices[0].category).toBe('Moradia');
  });

  it('agrupa excedentes em "Outras"', () => {
    const txs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) =>
      tx({ type: 'despesa', amountCents: (7 - i) * 1000, category: c, date: '2026-08-01' }),
    );
    const slices = expensesByCategory(txs, new Set(['2026-08']), 5);
    expect(slices).toHaveLength(6);
    expect(slices[5].category).toBe('Outras');
    expect(slices[5].totalCents).toBe(3000); // 2000 + 1000
  });
});

describe('resumo Pix', () => {
  it('considera apenas método pix dentro do período', () => {
    const txs = [
      tx({ type: 'receita', amountCents: 10000, method: 'pix', date: '2026-08-01' }),
      tx({ type: 'despesa', amountCents: 4000, method: 'pix', date: '2026-08-02' }),
      tx({ type: 'despesa', amountCents: 99999, method: 'boleto', date: '2026-08-03' }), // ignorada
      tx({ type: 'receita', amountCents: 7777, method: 'pix', date: '2026-07-01' }), // fora do período
    ];
    const s = pixSummary(txs, new Set(['2026-08']));
    expect(s).toEqual({ receivedCents: 10000, sentCents: 4000, netCents: 6000, count: 2 });
  });
});

describe('investimentos', () => {
  it('12% a.a. após exatamente 1 ano rende 12%', () => {
    const i = inv({ amountCents: 100000, annualRatePct: 12, date: '2025-08-14' });
    expect(investmentCurrentValueCents(i, new Date(2026, 7, 14))).toBe(112000);
  });

  it('no dia da aplicação vale o próprio aporte', () => {
    const i = inv({ amountCents: 55555, annualRatePct: 15, date: '2026-08-14' });
    expect(investmentCurrentValueCents(i, new Date(2026, 7, 14))).toBe(55555);
  });

  it('resumo soma aplicado, atual e rendimento de forma congruente', () => {
    const list = [
      inv({ amountCents: 100000, annualRatePct: 12, date: '2025-08-14', kind: 'cdb' }),
      inv({ amountCents: 200000, annualRatePct: 0, date: '2025-08-14', kind: 'tesouro' }),
    ];
    const s = investmentsSummary(list, new Date(2026, 7, 14));
    expect(s.investedCents).toBe(300000);
    expect(s.currentCents).toBe(312000);
    expect(s.yieldCents).toBe(s.currentCents - s.investedCents);
    expect(s.yieldPct).toBeCloseTo(4, 5);
    const kindTotal = s.byKind.reduce((acc, k) => acc + k.currentCents, 0);
    expect(kindTotal).toBe(s.currentCents);
  });
});

describe('indicadores', () => {
  it('variação percentual', () => {
    expect(pctChange(120, 100)).toBeCloseTo(20);
    expect(pctChange(80, 100)).toBeCloseTo(-20);
    expect(pctChange(50, 0)).toBeNull();
  });

  it('taxa de economia', () => {
    expect(savingsRate(100000, 75000)).toBeCloseTo(25);
    expect(savingsRate(0, 500)).toBeNull();
  });

  it('lastMonthsKeys devolve meses em ordem crescente', () => {
    const keys = lastMonthsKeys(3, new Date(2026, 7, 14));
    expect(keys).toEqual(['2026-06', '2026-07', '2026-08']);
  });
});

describe('fatura de cartão de crédito e comprometimento', () => {
  it('calcula o valor da fatura dentro do ciclo de corte', () => {
    const txs = [
      tx({ type: 'despesa', amountCents: 15000, method: 'cartao_credito', date: '2026-08-01' }),
      tx({ type: 'despesa', amountCents: 5000, method: 'cartao_credito', date: '2026-08-03' }),
      tx({ type: 'despesa', amountCents: 8000, method: 'cartao_credito', date: '2026-08-04' }), // entra na próxima fatura (corte dia 3)
      tx({ type: 'despesa', amountCents: 10000, method: 'pix', date: '2026-08-02' }),
    ];
    const s = creditCardInvoiceSummary(txs, 3, 10, new Date(2026, 7, 14));
    expect(s.currentInvoiceCents).toBe(20000);
    expect(s.nextInvoiceCents).toBe(8000);
    expect(s.transactionsCount).toBe(2);
  });

  it('ajusta vencimento da fatura do cartão para segunda-feira se cair no fim de semana', () => {
    // Em Agosto de 2026, dia 15 é Sábado -> o vencimento vira Segunda 17/08/2026
    const s = creditCardInvoiceSummary([], 3, 15, new Date(2026, 7, 10));
    expect(s.dueDateISO).toBe('2026-08-17');
  });

  it('calcula o dia de fechamento 7 dias antes do vencimento', () => {
    // Vencimento dia 10 -> Fechamento dia 3
    expect(calculateClosingDayFromDueDay(10)).toBe(3);
    // Vencimento dia 3 -> Fechamento dia 27 em meses de 31 dias
    expect(calculateClosingDayFromDueDay(3)).toBe(27);
  });

  it('calcula o percentual de comprometimento de renda', () => {
    expect(incomeCommitmentRatio(100000, 50000, 300000)).toBeCloseTo(50);
    expect(incomeCommitmentRatio(50000, 50000, 0)).toBeNull();
  });
});
