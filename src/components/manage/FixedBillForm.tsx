import { forwardRef, useEffect, useState } from 'react';
import { CalendarClock, Check, Globe, Plus, X } from 'lucide-react';
import type { FixedBill, PaymentMethod } from '../../types';
import { useFixedBills } from '../../store/FixedBillsContext';
import { useToast } from '../../store/ToastContext';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../lib/categories';
import { currencyToCents, formatBRL, maskCurrency, todayISO } from '../../lib/format';
import { useUsdRate } from '../../lib/currency';
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
  const { usdRate } = useUsdRate();

  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('10');
  const [category, setCategory] = useState<string>('Contas');
  const [method, setMethod] = useState<PaymentMethod>('boleto');
  const [errors, setErrors] = useState<Errors<FixedBillFormValues>>({});

  useEffect(() => {
    if (!editing) return;
    setDescription(editing.description);
    setCurrency(editing.currency ?? 'BRL');
    if (editing.currency === 'USD' && editing.amountCentsUSD) {
      setAmount(maskCurrency(String(editing.amountCentsUSD)));
    } else {
      setAmount(maskCurrency(String(editing.amountCents)));
    }
    setDayOfMonth(String(editing.dayOfMonth));
    setCategory(editing.category);
    setMethod(editing.method);
    setErrors({});
  }, [editing]);

  const reset = () => {
    setDescription('');
    setCurrency('BRL');
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

    const rawCents = currencyToCents(amount);
    const isUSD = currency === 'USD';
    const amountCentsUSD = isUSD ? rawCents : undefined;
    const amountCents = isUSD ? Math.round(rawCents * usdRate) : rawCents;

    const input = {
      description: values.description,
      amountCents,
      currency,
      amountCentsUSD,
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
    push('Conta fixa adicionada com sucesso.');
    reset();
  };

  const parsedCents = currencyToCents(amount);
  const convertedBrl = currency === 'USD' && parsedCents > 0 ? Math.round(parsedCents * usdRate) : 0;

  return (
    <Card className="scroll-mt-20" delay={40}>
      <span ref={ref as React.Ref<HTMLElement>} />
      <CardTitle
        icon={<CalendarClock className="h-4 w-4" />}
        title={editing ? 'Editar conta fixa' : 'Nova conta fixa'}
        subtitle="Água, luz, internet, Netflix, assinaturas em dólar… cai todo mês no mesmo dia."
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
            hint="Ex.: Netflix, ChatGPT Plus, Aluguel…"
            error={errors.description}
            className="sm:col-span-2"
          >
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: ChatGPT Plus"
              maxLength={60}
              invalid={!!errors.description}
            />
          </Field>

          <Field label="Moeda" required hint="Real (R$) ou Dólar (US$)">
            <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}>
              <option value="BRL">🇧🇷 Real (R$)</option>
              <option value="USD">🇺🇸 Dólar (US$)</option>
            </SelectInput>
          </Field>

          <Field
            label={currency === 'USD' ? 'Valor em Dólar (US$)' : 'Valor mensal (R$)'}
            required
            hint={currency === 'USD' ? 'Digite o valor em dólar' : 'Quanto sai todo mês.'}
            error={errors.amount}
          >
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

        {currency === 'USD' && parsedCents > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-muted">
            <Globe className="h-4 w-4 shrink-0 text-accent" />
            <div>
              <span className="font-semibold text-fg">
                Conversão estimada: {formatBRL(convertedBrl)}
              </span>
              <span className="ml-1 text-faint">
                (Cotação USD: R$ {usdRate.toFixed(2)} via AwesomeAPI em tempo real)
              </span>
            </div>
          </div>
        )}

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
