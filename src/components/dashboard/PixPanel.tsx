import { ArrowDownLeft, ArrowUpRight, Zap } from 'lucide-react';
import type { PixSummary } from '../../lib/calc';
import { useMoney } from '../../store/SettingsContext';
import { Card, CardTitle } from '../ui/controls';

export function PixPanel({ summary, periodLabel, delay }: { summary: PixSummary; periodLabel: string; delay?: number }) {
  const { money } = useMoney();

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<Zap className="h-4 w-4" />}
        title="Pix"
        subtitle={`Movimentações via Pix · ${periodLabel}`}
      />
      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pos/10 text-pos">
            <ArrowDownLeft className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm text-muted">Recebido</span>
          <span className="font-semibold text-pos tabular-nums">{money(summary.receivedCents)}</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neg/10 text-neg">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm text-muted">Enviado</span>
          <span className="font-semibold text-neg tabular-nums">{money(summary.sentCents)}</span>
        </li>
        <li className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm font-medium">Saldo Pix</span>
          <span className={`font-bold tabular-nums ${summary.netCents >= 0 ? 'text-pos' : 'text-neg'}`}>
            {money(summary.netCents)}
          </span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-faint">{summary.count} transações via Pix no período</p>
    </Card>
  );
}
