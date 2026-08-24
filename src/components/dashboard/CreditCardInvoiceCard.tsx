import { Calendar, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import type { CreditCardInvoiceSummary } from '../../lib/calc';
import { useMoney } from '../../store/SettingsContext';
import { formatDateBR } from '../../lib/format';
import { Card, CardTitle } from '../ui/controls';

interface Props {
  summary: CreditCardInvoiceSummary;
  closingDay: number;
  dueDay: number;
  onOpenSettings?: () => void;
  delay?: number;
}

export function CreditCardInvoiceCard({ summary, closingDay, dueDay, onOpenSettings, delay }: Props) {
  const { money } = useMoney();

  const dueFormatted = formatDateBR(summary.dueDateISO).slice(0, 5); // ex: 10/09

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<CreditCard className="h-4 w-4" />}
        title="Fatura do Cartão"
        subtitle={`Fechamento dia ${closingDay} · Vencimento dia ${dueDay}`}
        right={
          onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-muted hover:text-fg underline underline-offset-2"
            >
              Ajustar datas
            </button>
          ) : null
        }
      />

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted">Fatura Atual</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-fg">
              {money(summary.currentInvoiceCents)}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                summary.isClosed
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {summary.isClosed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {summary.isClosed ? 'Fechada' : 'Aberta'}
            </span>
            <p className="mt-1 text-xs text-muted">
              {summary.daysUntilDue > 0
                ? `Vence em ${summary.daysUntilDue} dias (${dueFormatted})`
                : summary.daysUntilDue === 0
                ? `Vence HOJE (${dueFormatted})`
                : `Venceu em ${dueFormatted}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <Calendar className="h-3.5 w-3.5" /> Próxima fatura estimada:
          </span>
          <span className="font-semibold tabular-nums text-fg">
            {money(summary.nextInvoiceCents)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-faint">
        {summary.transactionsCount} compras na fatura deste ciclo
      </p>
    </Card>
  );
}
