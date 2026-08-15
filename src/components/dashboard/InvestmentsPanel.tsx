import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import type { Investment, InvestmentKind } from '../../types';
import { investmentCurrentValueCents, type InvestmentsSummary } from '../../lib/calc';
import { KIND_LABELS } from '../../lib/categories';
import { alphaRamp } from '../../lib/colors';
import { formatPercent } from '../../lib/format';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { Card, CardTitle } from '../ui/controls';
import { ChartTooltip } from '../ui/ChartTooltip';

export function InvestmentsPanel({
  investments,
  summary,
  delay,
}: {
  investments: Investment[];
  summary: InvestmentsSummary;
  delay?: number;
}) {
  const { settings, chartColors } = useSettings();
  const { money } = useMoney();

  const colors = alphaRamp(chartColors.accent, Math.max(summary.byKind.length, 1));
  const donutData = summary.byKind.map((k) => ({
    name: KIND_LABELS[k.kind as InvestmentKind] ?? k.kind,
    value: k.currentCents,
  }));

  const positions = [...investments]
    .map((inv) => {
      const current = investmentCurrentValueCents(inv);
      return { inv, current, yieldPct: inv.amountCents > 0 ? ((current - inv.amountCents) / inv.amountCents) * 100 : 0 };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);

  const gain = summary.yieldCents >= 0;

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<PiggyBank className="h-4 w-4" />}
        title="Investimentos"
        subtitle="Valor atual estimado pela taxa anual"
        right={
          investments.length > 0 ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                gain ? 'bg-pos/10 text-pos' : 'bg-neg/10 text-neg'
              }`}
            >
              {gain ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {gain ? '+' : ''}
              {formatPercent(summary.yieldPct)}
            </span>
          ) : undefined
        }
      />

      {investments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nenhum investimento registrado. Adicione na aba Lançamentos.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative mx-auto h-36 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip formatter={money} />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={2}
                  cornerRadius={5}
                  stroke="transparent"
                  isAnimationActive={settings.animations}
                  animationDuration={800}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={colors[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] tracking-wide text-faint uppercase">Atual</span>
              <span className="max-w-24 truncate text-sm font-bold tabular-nums">{money(summary.currentCents)}</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between text-xs text-faint">
              <span>
                Aplicado: <span className="font-semibold text-muted tabular-nums">{money(summary.investedCents)}</span>
              </span>
              <span>
                Rendimento:{' '}
                <span className={`font-semibold tabular-nums ${gain ? 'text-pos' : 'text-neg'}`}>
                  {gain ? '+' : ''}
                  {money(summary.yieldCents)}
                </span>
              </span>
            </div>
            <ul className="space-y-2.5">
              {positions.map(({ inv, current, yieldPct }) => (
                <li key={inv.id} className="flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{inv.name}</p>
                    <p className="text-xs text-faint">{KIND_LABELS[inv.kind]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{money(current)}</p>
                    <p className={`text-xs tabular-nums ${yieldPct >= 0 ? 'text-pos' : 'text-neg'}`}>
                      {yieldPct >= 0 ? '+' : ''}
                      {formatPercent(yieldPct)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
