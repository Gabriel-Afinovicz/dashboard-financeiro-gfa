import { useEffect, useState } from 'react';
import { LineChart, Pencil, Trash2 } from 'lucide-react';
import type { Investment } from '../../types';
import { useData } from '../../store/DataContext';
import { useToast } from '../../store/ToastContext';
import { useMoney } from '../../store/SettingsContext';
import { KIND_LABELS } from '../../lib/categories';
import { investmentCurrentValueCents, investmentsSummary } from '../../lib/calc';
import { formatDateBR, formatPercent } from '../../lib/format';
import { Card, CardTitle, btnIcon } from '../ui/controls';

export function InvestmentsTable({ onEdit }: { onEdit: (inv: Investment) => void }) {
  const { investments, deleteInvestment } = useData();
  const { push } = useToast();
  const { money } = useMoney();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmId) return;
    const timer = setTimeout(() => setConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmId]);

  const summary = investmentsSummary(investments);
  const rows = [...investments].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card delay={180}>
      <CardTitle
        icon={<LineChart className="h-4 w-4" />}
        title="Carteira de investimentos"
        subtitle="Valor atual estimado por juros compostos pró-rata da taxa anual"
        right={
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted tabular-nums">
            {investments.length} {investments.length === 1 ? 'ativo' : 'ativos'}
          </span>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line bg-card2 text-left text-xs text-muted">
              <th className="px-3 py-2.5 font-medium">Nome</th>
              <th className="px-3 py-2.5 font-medium">Tipo</th>
              <th className="px-3 py-2.5 font-medium">Aplicação</th>
              <th className="px-3 py-2.5 text-right font-medium">Aplicado</th>
              <th className="px-3 py-2.5 text-right font-medium">Taxa a.a.</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor atual</th>
              <th className="px-3 py-2.5 text-right font-medium">Rendimento</th>
              <th className="px-3 py-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted">
                  Nenhum investimento registrado.
                </td>
              </tr>
            ) : (
              rows.map((inv) => {
                const current = investmentCurrentValueCents(inv);
                const yieldCents = current - inv.amountCents;
                const yieldPct = inv.amountCents > 0 ? (yieldCents / inv.amountCents) * 100 : 0;
                const gain = yieldCents >= 0;
                return (
                  <tr key={inv.id} className="transition-colors hover:bg-card2/60">
                    <td className="max-w-52 px-3 py-2.5">
                      <span className="block truncate font-medium">{inv.name}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{KIND_LABELS[inv.kind]}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted tabular-nums">{formatDateBR(inv.date)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{money(inv.amountCents)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted tabular-nums">
                      {formatPercent(inv.annualRatePct, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">{money(current)}</td>
                    <td className={`px-3 py-2.5 text-right whitespace-nowrap tabular-nums ${gain ? 'text-pos' : 'text-neg'}`}>
                      {gain ? '+' : ''}
                      {money(yieldCents)}{' '}
                      <span className="text-xs">({gain ? '+' : ''}{formatPercent(yieldPct)})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className={btnIcon} title="Editar" onClick={() => onEdit(inv)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmId === inv.id ? (
                          <button
                            type="button"
                            className="rounded-lg bg-neg px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                            onClick={async () => {
                              setConfirmId(null);
                              try {
                                await deleteInvestment(inv.id);
                                push('Investimento excluído.', 'info');
                              } catch (err) {
                                push(err instanceof Error ? err.message : 'Erro ao excluir.', 'error');
                              }
                            }}
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button type="button" className={btnIcon} title="Excluir" onClick={() => setConfirmId(inv.id)}>
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

      {investments.length > 0 && (
        <p className="mt-3 text-xs text-muted tabular-nums">
          Aplicado <span className="font-semibold text-fg">{money(summary.investedCents)}</span> · Valor atual{' '}
          <span className="font-semibold text-fg">{money(summary.currentCents)}</span> · Rendimento{' '}
          <span className={`font-semibold ${summary.yieldCents >= 0 ? 'text-pos' : 'text-neg'}`}>
            {summary.yieldCents >= 0 ? '+' : ''}
            {money(summary.yieldCents)} ({summary.yieldCents >= 0 ? '+' : ''}
            {formatPercent(summary.yieldPct)})
          </span>
        </p>
      )}
    </Card>
  );
}
