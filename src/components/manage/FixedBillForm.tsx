import { forwardRef, useEffect, useState } from 'react';
import { CalendarClock, Check, Plus, X } from 'lucide-react';
import type { FixedBill, PaymentMethod } from '../../types';
import { useFixedBills } from '../../store/FixedBillsContext';
import { useToast } from '../../store/ToastContext';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../lib/categories';
import { currencyToCents, maskCurrency, todayISO } from '../../lib/format';
import { validateFixedBill, type Errors, type FixedBillFormValues } from '../../lib/validate';
import { Card, CardTitle, Field, MoneyInput, SelectInput, TextInput, btnGhost, btnPrimary } from '../ui/controls';

interface Props {
  editing: FixedBill | null;
  onDoneEditing: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const FixedBillForm = forwardRef<HTMLElement, Props>(function FixedBillForm(
  { editing, onDoneEditing },
  ref,
) {
  const { addBill, updateBill } = useFixedBills();
  const { push } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('10');
  const [category, setCategory] = useState<string>('Contas');
  const [method, setMethod] = useState<PaymentMethod>('boleto');
  const [errors, setErrors] = useState<Errors<FixedBillFormValues>>({});

  useEffect(() => {
    if (!editing) return;
    setDescription(editing.description);
    setAmount(maskCurrency(String(editing.amountCents)));
    setDayOfMonth(String(editing.dayOfMonth));
    setCategory(editing.category);
    setMethod(editing.method);
    setErrors({});
  }, [editing]);

  const reset = () => {
    setDescription('');
    setAmount('');
    setDayOfMonth('10');
    setCategory('Contas');
    setMethod('boleto');
    setErrors({});
  };

  const submit = () => {
    const values: FixedBillFormValues = {
      description: description.trim(),
      amount,
      dayOfMonth,
      category,
    };
    const errs = validateFixedBill(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = {
      description: values.description,
      amountCents: currencyToCents(amount),
      dayOfMonth: Number(dayOfMonth),
      category,
      method,
      active: editing?.active ?? true,
      startsOn: editing?.startsOn ?? todayISO(),
    };

    if (editing) {
      updateBill(editing.id, input);
      push('Conta fixa atualizada.');
      onDoneEditing();
      reset();
      return;
    }

    addBill(input);
    push('Conta fixa adicionada. Ela entra sozinha na fatura de todo mês.');
    reset();
  };

  return (
    <Card className="scroll-mt-20" delay={40}>
      <span ref={ref as React.Ref<HTMLElement>} />
      <CardTitle
        icon={<CalendarClock className="h-4 w-4" />}
        title={editing ? 'Editar conta fixa' : 'Nova conta fixa'}
        subtitle="Água, luz, internet, Netflix… cai todo mês no mesmo dia. Não lance de novo em Transações, senão conta duas vezes."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Descrição"
            required
            hint="Ex.: Netflix, Conta de luz, Aluguel…"
            error={errors.description}
            className="sm:col-span-2"
          >
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Netflix"
              maxLength={60}
              invalid={!!errors.description}
            />
          </Field>

          <Field label="Valor mensal" required hint="Quanto sai todo mês." error={errors.amount}>
            <MoneyInput value={amount} onChange={setAmount} invalid={!!errors.amount} />
          </Field>

          <Field
            label="Dia da fatura"
            required
            hint="Em fevereiro, o dia 31 vira 28 ou 29."
            error={errors.dayOfMonth}
          >
            <SelectInput
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              invalid={!!errors.dayOfMonth}
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  Todo dia {day}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Categoria" required hint="Entra no gráfico de despesas." error={errors.category}>
            <SelectInput value={category} onChange={(e) => setCategory(e.target.value)} invalid={!!errors.category}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Método de pagamento" required hint="Como essa conta costuma ser paga.">
            <SelectInput value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
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
            {editing ? 'Salvar alterações' : 'Adicionar conta fixa'}
          </button>
          {editing ? (
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
          ) : null}
        </div>
      </form>
    </Card>
  );
});
