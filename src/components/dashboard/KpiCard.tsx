import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { formatPercent } from '../../lib/format';

export function KpiCard({
  label,
  valueCents,
  icon,
  deltaPct,
  deltaLabel = 'vs mês anterior',
  invertDelta = false,
  subtitle,
  delay = 0,
}: {
  label: string;
  valueCents: number;
  icon: ReactNode;
  /** Variação percentual (null = não exibe). */
  deltaPct?: number | null;
  deltaLabel?: string;
  /** true quando subir é ruim (ex.: despesas). */
  invertDelta?: boolean;
  subtitle?: string;
  delay?: number;
}) {
  const { settings } = useSettings();
  const { money, privacy } = useMoney();
  const animated = useCountUp(valueCents, settings.animations && !privacy);
  const shown = privacy ? valueCents : Math.round(animated);

  let deltaNode: ReactNode = null;
  if (deltaPct !== undefined) {
    if (deltaPct === null) {
      deltaNode = (
        <span className="inline-flex items-center gap-1 text-xs text-faint">
          <Minus className="h-3 w-3" /> {deltaLabel}
        </span>
      );
    } else {
      const up = deltaPct >= 0;
      const good = invertDelta ? !up : up;
      deltaNode = (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${good ? 'text-pos' : 'text-neg'}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatPercent(Math.abs(deltaPct))} <span className="font-normal text-faint">{deltaLabel}</span>
        </span>
      );
    }
  }

  return (
    <div
      className="anim-fade-up rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-faint/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-faint">{icon}</span>
      </div>
      <p className={`text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${valueCents < 0 ? 'text-neg' : ''}`}>
        {money(shown)}
      </p>
      <div className="mt-1.5 min-h-4">
        {deltaNode ?? (subtitle && <span className="text-xs text-faint">{subtitle}</span>)}
      </div>
    </div>
  );
}
