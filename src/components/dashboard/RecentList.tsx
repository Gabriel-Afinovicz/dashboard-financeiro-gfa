import { ArrowDownLeft, ArrowUpRight, ListOrdered } from 'lucide-react';
import type { Transaction } from '../../types';
import { METHOD_SHORT } from '../../lib/categories';
import { formatDateBR } from '../../lib/format';
import { useMoney } from '../../store/SettingsContext';
import { Card, CardTitle } from '../ui/controls';

export function RecentList({
  transactions,
  onGoManage,
  delay,
}: {
  transactions: Transaction[];
  onGoManage: () => void;
  delay?: number;
}) {
  const { money } = useMoney();
  const recent = [...transactions]
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
    .slice(0, 8);

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<ListOrdered className="h-4 w-4" />}
        title="Lançamentos recentes"
        subtitle="Últimas transações registradas"
        right={
          <button
            type="button"
            onClick={onGoManage}
            className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted transition hover:text-fg"
          >
            Ver todos
          </button>
        }
      />
      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nenhuma transação ainda.</p>
      ) : (
        <ul className="divide-y divide-line">
          {recent.map((t) => {
            const income = t.type === 'receita';
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    income ? 'bg-pos/10 text-pos' : 'bg-neg/10 text-neg'
                  }`}
                >
                  {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-faint">
                    {t.category} · {METHOD_SHORT[t.method]}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${income ? 'text-pos' : 'text-neg'}`}>
                    {income ? '+' : '−'}
                    {money(t.amountCents)}
                  </p>
                  <p className="text-xs text-faint tabular-nums">{formatDateBR(t.date)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
