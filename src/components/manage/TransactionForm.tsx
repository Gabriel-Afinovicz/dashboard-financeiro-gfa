import { forwardRef, useEffect, useState } from 'react';
import { Check, CreditCard, Plus, X } from 'lucide-react';
import type { Transaction, TransactionType } from '../../types';
import { useData } from '../../store/DataContext';
import { useToast } from '../../store/ToastContext';
import { categoriesFor, PAYMENT_METHODS } from '../../lib/categories';
import { addMonthsToISO, currencyToCents, formatBRL, maskCurrency, todayISO } from '../../lib/format';
import { validateTransaction, type Errors, type TransactionFormValues } from '../../lib/validate';
import { Card, CardTitle, Field, MoneyInput, SelectInput, TextInput, btnGhost, btnPrimary, inputClass } from '../ui/controls';

interface Props {
  editing: Transaction | null;
  onDoneEditing: () => void;
}

const INSTALLMENT_OPTIONS = Array.from({ length: 36 }, (_, i) => i + 1);

export const TransactionForm = forwardRef<HTMLElement, Props>(function TransactionForm(
  { editing, onDoneEditing },
  ref,
) {
  const { addTransaction, updateTransaction } = useData();
  const { push } = useToast();

  const [type, setType] = useState<TransactionType>('despesa');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string>(categoriesFor('despesa')[0]);
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);
  const [installments, setInstallments] = useState(1);
  const [errors, setErrors] = useState<Errors<TransactionFormValues>>({});

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setDescription(editing.description);
      setAmount(maskCurrency(String(editing.amountCents)));
      setDate(editing.date);
      setCategory(editing.category);
      setMethod(editing.method);
      setInstallments(editing.installmentsCount ?? 1);
      setErrors({});
    }
  }, [editing]);

  const switchType = (t: TransactionType) => {
    setType(t);
    const list = categoriesFor(t);
    if (!list.includes(category)) setCategory(list[0]);
    if (t === 'receita') setInstallments(1);
  };

  const totalCents = currencyToCents(amount);
  const isCreditCard = method === 'cartao_credito' && type === 'despesa';
  const perInstallmentCents = isCreditCard && installments > 1 ? Math.floor(totalCents / installments) : totalCents;

  const submit = async () => {
    const values: TransactionFormValues = { description: description.trim(), amount, date, category };
    const errs = validateTransaction(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      if (editing) {
        const input = {
          type,
          description: values.description,
          amountCents: totalCents,
          date,
          category,
          method,
          installmentsCount: isCreditCard ? installments : 1,
          currentInstallment: editing.currentInstallment ?? 1,
        };
        await updateTransaction(editing.id, input);
        push('Transação atualizada.');
        onDoneEditing();
        reset();
      } else if (isCreditCard && installments > 1) {
        // Gera as parcelas sequenciais nos meses futuros
        const baseCents = Math.floor(totalCents / installments);
        const remainder = totalCents - baseCents * installments;

        for (let i = 1; i <= installments; i++) {
          const instCents = i === 1 ? baseCents + remainder : baseCents;
          const instDate = addMonthsToISO(date, i - 1);
          await addTransaction({
            type: 'despesa',
            description: `${values.description} (${i}/${installments})`,
            amountCents: instCents,
            date: instDate,
            category,
            method: 'cartao_credito',
            installmentsCount: installments,
            currentInstallment: i,
          });
        }
        push(`${installments} parcelas adicionadas com sucesso nos meses correspondentes.`);
        setDescription('');
        setAmount('');
        setInstallments(1);
        setErrors({});
      } else {
        await addTransaction({
          type,
          description: values.description,
          amountCents: totalCents,
          date,
          category,
          method,
          installmentsCount: isCreditCard ? installments : 1,
          currentInstallment: 1,
        });
        push(type === 'receita' ? 'Receita adicionada.' : 'Despesa adicionada.');
        setDescription('');
        setAmount('');
        setInstallments(1);
        setErrors({});
      }
    } catch (err) {
      push(err instanceof Error ? err.message : 'Erro ao salvar a transação.', 'error');
    }
  };

  const reset = () => {
    setType('despesa');
    setDescription('');
    setAmount('');
    setDate(todayISO());
    setCategory(categoriesFor('despesa')[0]);
    setMethod(PAYMENT_METHODS[0].value);
    setInstallments(1);
    setErrors({});
  };

  return (
    <Card className="scroll-mt-20" delay={0}>
      <span ref={ref as React.Ref<HTMLElement>} />
      <CardTitle
        icon={<Plus className="h-4 w-4" />}
        title={editing ? 'Editar transação' : 'Nova transação'}
        subtitle="Receitas e despesas do dia a dia. Aportes em investimentos ficam na seção ao lado, para não contar duas vezes."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchType('receita')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
              type === 'receita'
                ? 'border-pos/50 bg-pos/10 text-pos'
                : 'border-line text-muted hover:border-faint hover:text-fg'
            }`}
          >
            Receita (entrada)
          </button>
          <button
            type="button"
            onClick={() => switchType('despesa')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
              type === 'despesa'
                ? 'border-neg/50 bg-neg/10 text-neg'
                : 'border-line text-muted hover:border-faint hover:text-fg'
            }`}
          >
            Despesa (saída)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field
            label="Descrição"
            required
            hint="Ex.: Supermercado, Salário, Uber…"
            error={errors.description}
            className="sm:col-span-2"
          >
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'receita' ? 'Ex.: Salário de agosto' : 'Ex.: Supermercado da semana'}
              maxLength={60}
              invalid={!!errors.description}
            />
          </Field>

          <Field
            label={isCreditCard && installments > 1 ? 'Valor total da compra' : 'Valor'}
            required
            hint={isCreditCard && installments > 1 ? 'O sistema calculará o valor por parcela.' : 'Digite apenas números; a máscara formata.'}
            error={errors.amount}
          >
            <MoneyInput value={amount} onChange={setAmount} invalid={!!errors.amount} />
          </Field>

          <Field label="Data" required hint="Quando aconteceu (ou início da 1ª parcela)." error={errors.date}>
            <input
              type="date"
              value={date}
              max={todayISO()}
              min="2000-01-01"
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} ${errors.date ? 'border-neg' : ''}`}
            />
          </Field>

          <Field label="Categoria" required hint="Agrupa os gastos nos gráficos." error={errors.category}>
            <SelectInput value={category} onChange={(e) => setCategory(e.target.value)} invalid={!!errors.category}>
              {categoriesFor(type).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Método de pagamento" required hint="Cartão de crédito permite parcelamento.">
            <SelectInput value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          {isCreditCard && !editing && (
            <Field label="Parcelamento" required hint="Número de parcelas da compra.">
              <SelectInput value={String(installments)} onChange={(e) => setInstallments(Number(e.target.value))}>
                {INSTALLMENT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1x (À vista)' : `${n}x`}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
        </div>

        {isCreditCard && installments > 1 && totalCents > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-muted">
            <CreditCard className="h-4 w-4 shrink-0 text-accent" />
            <div>
              <span className="font-semibold text-fg">
                {installments}x de {formatBRL(perInstallmentCents)}
              </span>
              <span className="ml-1 text-faint">
                (Total: {formatBRL(totalCents)} · 1ª parcela em {date.split('-').reverse().join('/')})
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? 'Salvar alterações' : isCreditCard && installments > 1 ? `Gerar ${installments} parcelas` : 'Adicionar transação'}
          </button>
          {editing && (
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                onDoneEditing();
                reset();
              }}
            >
              <X className="h-4 w-4" />
              Cancelar edição
            </button>
          )}
        </div>
      </form>
    </Card>
  );
});
