import { Gauge } from 'lucide-react';
import { useMoney } from '../../store/SettingsContext';
import { formatPercent } from '../../lib/format';
import { Card, CardTitle } from '../ui/controls';

export function MonthIndicators({
  savingsRatePct,
  avgDailyExpenseCents,
  topCategory,
  txCount,
  delay,
}: {
  savingsRatePct: number | null;
  avgDailyExpenseCents: number;
  topCategory: { name: string; totalCents: number } | null;
  txCount: number;
  delay?: number;
}) {
  const { money } = useMoney();

  const rows: { label: string; value: string; accent?: 'pos' | 'neg' }[] = [
    {
      label: 'Taxa de economia',
      value: savingsRatePct === null ? '—' : formatPercent(savingsRatePct),
      accent: savingsRatePct === null ? undefined : savingsRatePct >= 0 ? 'pos' : 'neg',
    },
    { label: 'Gasto médio por dia', value: money(avgDailyExpenseCents) },
    {
      label: 'Maior categoria de gasto',
      value: topCategory ? `${topCategory.name} · ${money(topCategory.totalCents)}` : '—',
    },
    { label: 'Lançamentos no mês', value: String(txCount) },
  ];

  return (
    <Card delay={delay}>
      <CardTitle icon={<Gauge className="h-4 w-4" />} title="Indicadores do mês" subtitle="Resumo rápido do mês atual" />
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">{row.label}</span>
            <span
              className={`text-right font-semibold tabular-nums ${
                row.accent === 'pos' ? 'text-pos' : row.accent === 'neg' ? 'text-neg' : ''
              }`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
