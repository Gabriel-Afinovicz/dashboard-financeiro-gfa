interface Row {
  name?: string;
  value?: number | string;
  color?: string;
}

/** Tooltip customizado para os gráficos (Recharts injeta as props). */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Row[];
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-muted">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
            <span className="text-muted">{row.name}:</span>
            <span className="font-semibold tabular-nums">{formatter(Number(row.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
