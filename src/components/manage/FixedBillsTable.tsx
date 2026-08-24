import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import type { FixedBill } from '../../types';
import { useFixedBills } from '../../store/FixedBillsContext';
import { useToast } from '../../store/ToastContext';
import { useMoney } from '../../store/SettingsContext';
import { METHOD_SHORT } from '../../lib/categories';
import { occurrenceDate } from '../../lib/fixedBills';
import { todayISO } from '../../lib/format';
import { Card, CardTitle, Switch, btnIcon } from '../ui/controls';

export function FixedBillsTable({ onEdit }: { onEdit: (bill: FixedBill) => void }) {
  const { bills, deleteBill, toggleBill } = useFixedBills();
  const { push } = useToast();
  const { money } = useMoney();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmId) return;
    const timer = setTimeout(() => setConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmId]);

  const today = todayISO();
  const [year, month] = today.split('-').map(Number);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  const rows = useMemo(
    () => [...bills].sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description)),
    [bills],
  );

  const monthlyTotal = useMemo(
    () => bills.reduce((acc, bill) => (bill.active ? acc + bill.amountCents : acc), 0),
    [bills],
  );

  return (
    <Card delay={80}>
      <CardTitle
        icon={<CalendarClock className="h-4 w-4" />}
        title="Contas fixas do mês"
        subtitle={`Repetem sozinhas em ${monthName}. Pause se a conta acabou.`}
        right={
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted tabular-nums">
            {bills.length} {bills.length === 1 ? 'conta' : 'contas'}
          </span>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-card2 text-left text-xs text-muted">
              <th className="px-3 py-2.5 font-medium">Conta</th>
              <th className="px-3 py-2.5 font-medium">Dia</th>
              <th className="px-3 py-2.5 font-medium">Categoria</th>
              <th className="px-3 py-2.5 font-medium">Método</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor</th>
              <th className="px-3 py-2.5 text-center font-medium">Ativa</th>
              <th className="px-3 py-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted">
                  Nenhuma conta fixa. Cadastre água, luz, streaming…
                </td>
              </tr>
            ) : (
              rows.map((bill) => {
                const due = occurrenceDate(year, month - 1, bill.dayOfMonth);
                const upcoming = bill.active && due >= today;
                return (
                  <tr key={bill.id} className={`transition-colors hover:bg-card2/60 ${bill.active ? '' : 'opacity-50'}`}>
                    <td className="max-w-52 px-3 py-2.5">
                      <span className="block truncate font-medium">{bill.description}</span>
                      <span className="text-xs text-faint">
                        {upcoming ? `Vence ${due.split('-').reverse().slice(0, 2).join('/')}` : `Dia ${bill.dayOfMonth} de cada mês`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">{bill.dayOfMonth}</td>
                    <td className="px-3 py-2.5 text-muted">{bill.category}</td>
                    <td className="px-3 py-2.5 text-muted">{METHOD_SHORT[bill.method]}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-neg">{money(bill.amountCents)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <Switch
                          checked={bill.active}
                          onChange={(active) => toggleBill(bill.id, active)}
                          label={bill.active ? `Pausar ${bill.description}` : `Reativar ${bill.description}`}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className={btnIcon} title="Editar" onClick={() => onEdit(bill)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmId === bill.id ? (
                          <button
                            type="button"
                            className="rounded-lg bg-neg px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                            onClick={() => {
                              setConfirmId(null);
                              deleteBill(bill.id);
                              push('Conta fixa excluída.', 'info');
                            }}
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button type="button" className={btnIcon} title="Excluir" onClick={() => setConfirmId(bill.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {bills.length > 0 ? (
        <p className="mt-3 text-right text-xs text-muted">
          Comprometido por mês:{' '}
          <span className="font-semibold text-neg tabular-nums">{money(monthlyTotal)}</span>
        </p>
      ) : null}
    </Card>
  );
}
