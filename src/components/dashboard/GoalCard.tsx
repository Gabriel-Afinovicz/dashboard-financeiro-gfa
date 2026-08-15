import { Target } from 'lucide-react';
import { useMoney, useSettings } from '../../store/SettingsContext';
import { formatPercent } from '../../lib/format';
import { Card, CardTitle } from '../ui/controls';

export function GoalCard({
  resultCents,
  goalCents,
  onOpenSettings,
  delay,
}: {
  resultCents: number;
  goalCents: number;
  onOpenSettings: () => void;
  delay?: number;
}) {
  const { chartColors } = useSettings();
  const { money } = useMoney();

  const progress = goalCents > 0 ? Math.max(0, Math.min(1, resultCents / goalCents)) : 0;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<Target className="h-4 w-4" />}
        title="Meta de economia"
        subtitle="Resultado do mês vs meta mensal"
      />
      {goalCents <= 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted">Nenhuma meta definida ainda.</p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-fg"
          >
            Definir meta nas configurações
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" style={{ stroke: chartColors.track }} />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                style={{ stroke: chartColors.accent, transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{formatPercent(progress * 100, 0)}</span>
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm">
              <span className="font-bold tabular-nums">{money(Math.max(0, resultCents))}</span>{' '}
              <span className="text-muted">de</span>{' '}
              <span className="font-semibold tabular-nums">{money(goalCents)}</span>
            </p>
            {resultCents < 0 ? (
              <p className="text-xs text-neg">As despesas superaram as receitas em {money(-resultCents)} este mês.</p>
            ) : progress >= 1 ? (
              <p className="text-xs font-medium text-pos">Meta atingida! Excelente controle.</p>
            ) : (
              <p className="text-xs text-faint">Faltam {money(goalCents - resultCents)} para bater a meta.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
