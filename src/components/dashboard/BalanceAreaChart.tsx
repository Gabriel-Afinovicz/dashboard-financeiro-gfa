import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BalancePoint } from '../../lib/calc';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { hexToRgba } from '../../lib/colors';
import { ChartTooltip } from '../ui/ChartTooltip';

export function BalanceAreaChart({ data }: { data: BalancePoint[] }) {
  const { settings, chartColors } = useSettings();
  const { money, moneyCompact } = useMoney();
  const points = data.map((p) => ({ label: p.label, Saldo: p.balanceCents }));

  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<ChartTooltip formatter={money} />} cursor={{ stroke: hexToRgba(chartColors.accent, 0.3) }} />
          <Area
            type="monotone"
            dataKey="Saldo"
            stroke={chartColors.accent}
            strokeWidth={2.5}
            fill="url(#gradSaldo)"
            dot={false}
            activeDot={{ r: 4, fill: chartColors.accent, stroke: 'transparent' }}
            isAnimationActive={settings.animations}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
