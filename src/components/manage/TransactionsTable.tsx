import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Search, Table2, Trash2, X } from 'lucide-react';
import type { PaymentMethod, Transaction, TransactionType } from '../../types';
import { useData } from '../../store/DataContext';
import { useToast } from '../../store/ToastContext';
import { useMoney } from '../../store/SettingsContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHOD_SHORT, PAYMENT_METHODS } from '../../lib/categories';
import { formatDateBR, monthLabel } from '../../lib/format';
import { monthKeyOf } from '../../lib/calc';
import { Card, CardTitle, SelectInput, btnIcon, inputClass } from '../ui/controls';

const PAGE_SIZE = 10;

type SortBy = 'date' | 'amount';

export function TransactionsTable({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const { transactions, deleteTransaction } = useData();
  const { push } = useToast();
  const { money } = useMoney();

  const [search, setSearch] = useState('');
  const [fType, setFType] = useState<'todos' | TransactionType>('todos');
  const [fCategory, setFCategory] = useState('todas');
  const [fMethod, setFMethod] = useState<'todos' | PaymentMethod>('todos');
  const [fMonth, setFMonth] = useState('todos');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmId) return;
    const timer = setTimeout(() => setConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmId]);

  const months = useMemo(() => {
    const keys = [...new Set(transactions.map((t) => monthKeyOf(t.date)))].sort().reverse();
    return keys.map((k) => ({ value: k, label: monthLabel(k) }));
  }, [transactions]);

  const allCategories = useMemo(
    () => [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = transactions.filter((t) => {
      if (q && !t.description.toLowerCase().includes(q)) return false;
      if (fType !== 'todos' && t.type !== fType) return false;
      if (fCategory !== 'todas' && t.category !== fCategory) return false;
      if (fMethod !== 'todos' && t.method !== fMethod) return false;
      if (fMonth !== 'todos' && monthKeyOf(t.date) !== fMonth) return false;
      return true;
    });
    list.sort((a, b) => {
      const cmp =
        sortBy === 'date'
          ? a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
          : a.amountCents - b.amountCents;
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [transactions, search, fType, fCategory, fMethod, fMonth, sortBy, sortDesc]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'receita') income += t.amountCents;
      else expense += t.amountCents;
    }
    return { income, expense, result: income - expense };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [search, fType, fCategory, fMethod, fMonth]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || fType !== 'todos' || fCategory !== 'todas' || fMethod !== 'todos' || fMonth !== 'todos';

  const toggleSort = (by: SortBy) => {
    if (sortBy === by) setSortDesc((d) => !d);
    else {
      setSortBy(by);
      setSortDesc(true);
    }
  };

  const sortIcon = (by: SortBy) =>
    sortBy === by ? (
      sortDesc ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUp className="h-3 w-3" />
      )
    ) : null;

  return (
    <Card delay={120}>
      <CardTitle
        icon={<Table2 className="h-4 w-4" />}
        title="Planilha de transações"
        subtitle="Busque, filtre, ordene, edite ou exclua qualquer lançamento"
        right={
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted tabular-nums">
            {filtered.length} de {transactions.length}
          </span>
        }
      />

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-[1fr_repeat(4,minmax(0,0.6fr))_auto]">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descrição…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <SelectInput value={fType} onChange={(e) => setFType(e.target.value as typeof fType)} aria-label="Filtrar por tipo">
          <option value="todos">Tipo: todos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </SelectInput>
        <SelectInput value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Filtrar por categoria">
          <option value="todas">Categoria: todas</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={fMethod} onChange={(e) => setFMethod(e.target.value as typeof fMethod)} aria-label="Filtrar por método">
          <option value="todos">Método: todos</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={fMonth} onChange={(e) => setFMonth(e.target.value)} aria-label="Filtrar por mês">
          <option value="todos">Mês: todos</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectInput>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFType('todos');
              setFCategory('todas');
              setFMethod('todos');
              setFMonth('todos');
            }}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-fg"
            title="Limpar filtros"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-card2 text-left text-xs text-muted">
              <th className="px-3 py-2.5 font-medium">
                <button type="button" onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 hover:text-fg">
                  Data {sortIcon('date')}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Descrição</th>
              <th className="px-3 py-2.5 font-medium">Categoria</th>
              <th className="px-3 py-2.5 font-medium">Método</th>
              <th className="px-3 py-2.5 text-right font-medium">
                <button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-1 hover:text-fg">
                  Valor {sortIcon('amount')}
                </button>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              pageRows.map((t) => {
                const income = t.type === 'receita';
                return (
                  <tr key={t.id} className="transition-colors hover:bg-card2/60">
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted tabular-nums">{formatDateBR(t.date)}</td>
                    <td className="max-w-56 px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${income ? 'bg-pos' : 'bg-neg'}`} />
                        <span className="truncate font-medium">{t.description}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{t.category}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">
                        {METHOD_SHORT[t.method]}
                        {t.installmentsCount && t.installmentsCount > 1 ? ` (${t.currentInstallment ?? 1}/${t.installmentsCount})` : ''}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums ${income ? 'text-pos' : 'text-neg'}`}>
                      {income ? '+' : '−'}
                      {money(t.amountCents)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className={btnIcon} title="Editar" onClick={() => onEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmId === t.id ? (
                          <button
                            type="button"
                            className="rounded-lg bg-neg px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                            onClick={async () => {
                              setConfirmId(null);
                              try {
                                await deleteTransaction(t.id);
                                push('Transação excluída.', 'info');
                              } catch (err) {
                                push(err instanceof Error ? err.message : 'Erro ao excluir.', 'error');
                              }
                            }}
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button type="button" className={btnIcon} title="Excluir" onClick={() => setConfirmId(t.id)}>
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

      {/* Rodapé: totais do filtro + paginação */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p className="tabular-nums">
          Receitas <span className="font-semibold text-pos">{money(totals.income)}</span> · Despesas{' '}
          <span className="font-semibold text-neg">{money(totals.expense)}</span> · Resultado{' '}
          <span className={`font-semibold ${totals.result >= 0 ? 'text-pos' : 'text-neg'}`}>{money(totals.result)}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btnIcon}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={btnIcon}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
