import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySlice } from '../../lib/calc';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { alphaRamp } from '../../lib/colors';
import { formatPercent } from '../../lib/format';
import { ChartTooltip } from '../ui/ChartTooltip';

export function CategoryDonut({ data, totalCents }: { data: CategorySlice[]; totalCents: number }) {
  const { settings, chartColors } = useSettings();
  const { money } = useMoney();
  const colors = alphaRamp(chartColors.accent, data.length);
  const points = data.map((s) => ({ name: s.category, value: s.totalCents }));

  return (
    <div>
      <div className="relative mx-auto h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip formatter={money} />} />
            <Pie
              data={points}
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
              {points.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] tracking-wide text-faint uppercase">Total</span>
          <span className="max-w-28 truncate text-sm font-bold tabular-nums">{money(totalCents)}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((slice, i) => (
          <li key={slice.category} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
            <span className="flex-1 truncate text-muted">{slice.category}</span>
            <span className="font-semibold tabular-nums">{money(slice.totalCents)}</span>
            <span className="w-11 text-right text-faint tabular-nums">{formatPercent(slice.pct, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
