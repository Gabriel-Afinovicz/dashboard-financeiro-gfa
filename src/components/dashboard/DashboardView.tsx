import { useMemo, useState } from 'react';
import { BarChart3, ChartLine, ChartPie, CircleDollarSign, Landmark, PiggyBank, Plus, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useData } from '../../store/DataContext';
import { useSettings } from '../../store/SettingsContext';
import {
  accountBalanceCents,
  allMonthKeys,
  cumulativeBalanceSeries,
  expensesByCategory,
  investmentsSummary,
  lastMonthsKeys,
  monthlyAggregates,
  monthSnapshot,
  pctChange,
  pixSummary,
  savingsRate,
} from '../../lib/calc';
import { todayISO } from '../../lib/format';
import { Card, CardTitle, Segmented, btnPrimary } from '../ui/controls';
import { KpiCard } from './KpiCard';
import { BalanceAreaChart } from './BalanceAreaChart';
import { IncomeExpenseBars } from './IncomeExpenseBars';
import { CategoryDonut } from './CategoryDonut';
import { PixPanel } from './PixPanel';
import { GoalCard } from './GoalCard';
import { MonthIndicators } from './MonthIndicators';
import { InvestmentsPanel } from './InvestmentsPanel';
import { RecentList } from './RecentList';

const PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 0, label: 'Tudo' },
];

export function DashboardView({ onGoManage, onOpenSettings }: { onGoManage: () => void; onOpenSettings: () => void }) {
  const { transactions, investments, sampleData } = useData();
  const { settings } = useSettings();
  const [periodMonths, setPeriodMonths] = useState(6);

  const computed = useMemo(() => {
    const [prevKey, curKey] = lastMonthsKeys(2);
    const cur = monthSnapshot(transactions, curKey);
    const prev = monthSnapshot(transactions, prevKey);
    const balance = accountBalanceCents(transactions, settings.initialBalanceCents);
    const inv = investmentsSummary(investments);

    const keys = periodMonths === 0 ? allMonthKeys(transactions) : lastMonthsKeys(periodMonths);
    const keySet = new Set(keys);
    const monthly = monthlyAggregates(transactions, keys);
    const balanceSeries = cumulativeBalanceSeries(transactions, settings.initialBalanceCents, keys);
    const categories = expensesByCategory(transactions, keySet);
    const categoriesTotal = categories.reduce((acc, c) => acc + c.totalCents, 0);
    const pix = pixSummary(transactions, keySet);

    const curKeySet = new Set([curKey]);
    const monthTxCount = transactions.filter((t) => curKeySet.has(t.date.slice(0, 7))).length;
    const monthCategories = expensesByCategory(transactions, curKeySet, 1);
    const dayOfMonth = new Date().getDate();

    return {
      cur,
      prev,
      balance,
      inv,
      monthly,
      balanceSeries,
      categories,
      categoriesTotal,
      pix,
      monthTxCount,
      topCategory: monthCategories.length > 0 ? { name: monthCategories[0].category, totalCents: monthCategories[0].totalCents } : null,
      avgDailyExpense: Math.round(cur.expenseCents / dayOfMonth),
      savings: savingsRate(cur.incomeCents, cur.expenseCents),
    };
  }, [transactions, investments, settings.initialBalanceCents, periodMonths]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === periodMonths)?.label ?? '';
  const empty = transactions.length === 0 && investments.length === 0;
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  return (
    <div className="space-y-4 sm:space-y-5">
      {sampleData && (
        <div className="anim-fade-in flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-xs text-muted">
          <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-contrast">Exemplo</span>
          Você está vendo dados de demonstração. Adicione os seus na aba Lançamentos ou limpe tudo nas Configurações.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 sm:gap-4">
        <KpiCard
          label="Saldo em conta"
          valueCents={computed.balance}
          icon={<Wallet className="h-4 w-4" />}
          subtitle={`hoje, ${todayISO().split('-').reverse().slice(0, 2).join('/')}`}
          delay={0}
        />
        <KpiCard
          label={`Receitas de ${monthName}`}
          valueCents={computed.cur.incomeCents}
          icon={<TrendingUp className="h-4 w-4" />}
          deltaPct={pctChange(computed.cur.incomeCents, computed.prev.incomeCents)}
          delay={50}
        />
        <KpiCard
          label={`Despesas de ${monthName}`}
          valueCents={computed.cur.expenseCents}
          icon={<TrendingDown className="h-4 w-4" />}
          deltaPct={pctChange(computed.cur.expenseCents, computed.prev.expenseCents)}
          invertDelta
          delay={100}
        />
        <KpiCard
          label="Resultado do mês"
          valueCents={computed.cur.resultCents}
          icon={<Scale className="h-4 w-4" />}
          deltaPct={pctChange(computed.cur.resultCents, computed.prev.resultCents)}
          delay={150}
        />
        <KpiCard
          label="Investimentos"
          valueCents={computed.inv.currentCents}
          icon={<PiggyBank className="h-4 w-4" />}
          subtitle={
            computed.inv.investedCents > 0
              ? `rendimento estimado incluso`
              : 'nenhum aporte ainda'
          }
          delay={200}
        />
        <KpiCard
          label="Patrimônio total"
          valueCents={computed.balance + computed.inv.currentCents}
          icon={<Landmark className="h-4 w-4" />}
          subtitle="conta + investimentos"
          delay={250}
        />
      </div>

      {empty ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <CircleDollarSign className="h-10 w-10 text-faint" />
          <div>
            <h2 className="text-lg font-semibold">Comece registrando seus dados</h2>
            <p className="mt-1 text-sm text-muted">
              Adicione receitas, despesas e investimentos para ver os gráficos ganharem vida.
            </p>
          </div>
          <button type="button" className={btnPrimary} onClick={onGoManage}>
            <Plus className="h-4 w-4" />
            Adicionar lançamentos
          </button>
        </Card>
      ) : (
        <>
          {/* Seletor de período */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-muted">Análise do período</h2>
            <Segmented options={PERIOD_OPTIONS} value={periodMonths} onChange={setPeriodMonths} size="sm" />
          </div>

          {/* Linha 1: evolução do saldo + meta/indicadores */}
          <div className="grid gap-4 lg:grid-cols-12 sm:gap-5">
            <Card className="lg:col-span-8" delay={60}>
              <CardTitle
                icon={<ChartLine className="h-4 w-4" />}
                title="Evolução do saldo"
                subtitle={`Saldo acumulado em conta · ${periodLabel}`}
              />
              <BalanceAreaChart data={computed.balanceSeries} />
            </Card>
            <div className="flex flex-col gap-4 lg:col-span-4 sm:gap-5">
              <GoalCard
                resultCents={computed.cur.resultCents}
                goalCents={settings.monthlyGoalCents}
                onOpenSettings={onOpenSettings}
                delay={120}
              />
              <MonthIndicators
                savingsRatePct={computed.savings}
                avgDailyExpenseCents={computed.avgDailyExpense}
                topCategory={computed.topCategory}
                txCount={computed.monthTxCount}
                delay={180}
              />
            </div>
          </div>

          {/* Linha 2: barras mensais + categorias + pix */}
          <div className="grid gap-4 lg:grid-cols-12 sm:gap-5">
            <Card className="lg:col-span-6" delay={80}>
              <CardTitle
                icon={<BarChart3 className="h-4 w-4" />}
                title="Receitas × Despesas"
                subtitle={`Comparativo mensal · ${periodLabel}`}
              />
              <IncomeExpenseBars data={computed.monthly} />
            </Card>
            <Card className="lg:col-span-3" delay={140}>
              <CardTitle
                icon={<ChartPie className="h-4 w-4" />}
                title="Despesas por categoria"
                subtitle={periodLabel}
              />
              {computed.categories.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Nenhuma despesa no período.</p>
              ) : (
                <CategoryDonut data={computed.categories} totalCents={computed.categoriesTotal} />
              )}
            </Card>
            <div className="lg:col-span-3">
              <PixPanel summary={computed.pix} periodLabel={periodLabel} delay={200} />
            </div>
          </div>

          {/* Linha 3: recentes + investimentos */}
          <div className="grid gap-4 lg:grid-cols-12 sm:gap-5">
            <div className="lg:col-span-6">
              <RecentList transactions={transactions} onGoManage={onGoManage} delay={100} />
            </div>
            <div className="lg:col-span-6">
              <InvestmentsPanel investments={investments} summary={computed.inv} delay={160} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
