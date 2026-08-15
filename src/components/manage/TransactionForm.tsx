import { forwardRef, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { Transaction, TransactionType } from '../../types';
import { useData } from '../../store/DataContext';
import { useToast } from '../../store/ToastContext';
import { categoriesFor, PAYMENT_METHODS } from '../../lib/categories';
import { currencyToCents, maskCurrency, todayISO } from '../../lib/format';
import { validateTransaction, type Errors, type TransactionFormValues } from '../../lib/validate';
import { Card, CardTitle, Field, MoneyInput, SelectInput, TextInput, btnGhost, btnPrimary, inputClass } from '../ui/controls';

interface Props {
  editing: Transaction | null;
  onDoneEditing: () => void;
}

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
  const [errors, setErrors] = useState<Errors<TransactionFormValues>>({});

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setDescription(editing.description);
      setAmount(maskCurrency(String(editing.amountCents)));
      setDate(editing.date);
      setCategory(editing.category);
      setMethod(editing.method);
      setErrors({});
    }
  }, [editing]);

  const switchType = (t: TransactionType) => {
    setType(t);
    const list = categoriesFor(t);
    if (!list.includes(category)) setCategory(list[0]);
  };

  const submit = async () => {
    const values: TransactionFormValues = { description: description.trim(), amount, date, category };
    const errs = validateTransaction(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = {
      type,
      description: values.description,
      amountCents: currencyToCents(amount),
      date,
      category,
      method,
    };

    try {
      if (editing) {
        await updateTransaction(editing.id, input);
        push('Transação atualizada.');
        onDoneEditing();
        reset();
      } else {
        await addTransaction(input);
        push(type === 'receita' ? 'Receita adicionada.' : 'Despesa adicionada.');
        // Mantém tipo e data para facilitar lançamentos em sequência
        setDescription('');
        setAmount('');
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

          <Field label="Valor" required hint="Digite apenas números; a máscara formata." error={errors.amount}>
            <MoneyInput value={amount} onChange={setAmount} invalid={!!errors.amount} />
          </Field>

          <Field label="Data" required hint="Quando aconteceu (não aceita datas futuras)." error={errors.date}>
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

          <Field label="Método de pagamento" required hint="Pix alimenta o painel de Pix do dashboard.">
            <SelectInput value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? 'Salvar alterações' : 'Adicionar transação'}
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
