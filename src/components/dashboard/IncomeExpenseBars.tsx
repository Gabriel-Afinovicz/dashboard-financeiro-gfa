import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthAggregate } from '../../lib/calc';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { ChartTooltip } from '../ui/ChartTooltip';

export function IncomeExpenseBars({ data }: { data: MonthAggregate[] }) {
  const { settings, chartColors } = useSettings();
  const { money, moneyCompact } = useMoney();
  const points = data.map((m) => ({ label: m.label, Receitas: m.incomeCents, Despesas: m.expenseCents }));

  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: chartColors.tick, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fill: chartColors.tick, fontSize: 11 }}
            tickFormatter={(v: number) => moneyCompact(v)}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip formatter={money} />} cursor={{ fill: chartColors.grid }} />
          <Legend
            formatter={(value: string) => <span style={{ color: chartColors.tick, fontSize: 12 }}>{value}</span>}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="Receitas"
            fill={chartColors.pos}
            radius={[5, 5, 0, 0]}
            maxBarSize={26}
            isAnimationActive={settings.animations}
            animationDuration={800}
          />
          <Bar
            dataKey="Despesas"
            fill={chartColors.neg}
            radius={[5, 5, 0, 0]}
            maxBarSize={26}
            isAnimationActive={settings.animations}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
