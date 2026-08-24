import { CalendarClock } from 'lucide-react';
import type { FixedBill } from '../../types';
import { monthFixedBills, occurrenceDate } from '../../lib/fixedBills';
import { lastMonthsKeys } from '../../lib/calc';
import { todayISO } from '../../lib/format';
import { useMoney } from '../../store/SettingsContext';
import { Card, CardTitle } from '../ui/controls';

export function FixedBillsPanel({ bills, delay }: { bills: FixedBill[]; delay?: number }) {
  const { money } = useMoney();
  const today = todayISO();
  const [, curKey] = lastMonthsKeys(2);
  const [year, month] = curKey.split('-').map(Number);
  const rows = monthFixedBills(bills, curKey).sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((acc, row) => acc + row.amountCents, 0);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<CalendarClock className="h-4 w-4" />}
        title="Contas fixas"
        subtitle={`Fatura de ${monthName} · já entra nas despesas`}
      />

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted">Nenhuma conta fixa ativa neste mês.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const due = occurrenceDate(year, month - 1, Number(row.date.slice(8)));
            const pending = due >= today;
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.description}</p>
                  <p className="text-xs text-faint">
                    Dia {row.date.slice(8)} · {pending ? 'ainda este mês' : 'já no mês'}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-neg">{money(row.amountCents)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-muted">Total fixo do mês</span>
        <span className="font-bold tabular-nums text-neg">{money(total)}</span>
      </div>
    </Card>
  );
}
