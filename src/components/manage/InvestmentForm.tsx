import { forwardRef, useEffect, useState } from 'react';
import { Check, PiggyBank, X } from 'lucide-react';
import type { Investment, InvestmentKind } from '../../types';
import { useData } from '../../store/DataContext';
import { useToast } from '../../store/ToastContext';
import { INVESTMENT_KINDS } from '../../lib/categories';
import { currencyToCents, maskCurrency, maskPercent, percentToNumber, todayISO } from '../../lib/format';
import { validateInvestment, type Errors, type InvestmentFormValues } from '../../lib/validate';
import { Card, CardTitle, Field, MoneyInput, PercentInput, SelectInput, TextInput, btnGhost, btnPrimary, inputClass } from '../ui/controls';

interface Props {
  editing: Investment | null;
  onDoneEditing: () => void;
}

export const InvestmentForm = forwardRef<HTMLElement, Props>(function InvestmentForm({ editing, onDoneEditing }, ref) {
  const { addInvestment, updateInvestment } = useData();
  const { push } = useToast();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('cdb');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [rate, setRate] = useState('');
  const [errors, setErrors] = useState<Errors<InvestmentFormValues>>({});

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setKind(editing.kind);
      setAmount(maskCurrency(String(editing.amountCents)));
      setDate(editing.date);
      setRate(maskPercent(String(editing.annualRatePct).replace('.', ',')));
      setErrors({});
    }
  }, [editing]);

  const reset = () => {
    setName('');
    setKind('cdb');
    setAmount('');
    setDate(todayISO());
    setRate('');
    setErrors({});
  };

  const submit = async () => {
    const values: InvestmentFormValues = { name: name.trim(), amount, date, rate };
    const errs = validateInvestment(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = {
      name: values.name,
      kind,
      amountCents: currencyToCents(amount),
      date,
      annualRatePct: percentToNumber(rate.replace(/,$/, '')),
    };

    try {
      if (editing) {
        await updateInvestment(editing.id, input);
        push('Investimento atualizado.');
        onDoneEditing();
        reset();
      } else {
        await addInvestment(input);
        push('Investimento adicionado.');
        reset();
      }
    } catch (err) {
      push(err instanceof Error ? err.message : 'Erro ao salvar o investimento.', 'error');
    }
  };

  return (
    <Card className="scroll-mt-20" delay={60}>
      <span ref={ref as React.Ref<HTMLElement>} />
      <CardTitle
        icon={<PiggyBank className="h-4 w-4" />}
        title={editing ? 'Editar investimento' : 'Novo investimento'}
        subtitle="Registre o aporte com a taxa anual esperada; o dashboard calcula o rendimento estimado com juros compostos."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field
            label="Nome do investimento"
            required
            hint="Ex.: CDB Banco X, Tesouro Selic 2029, PETR4…"
            error={errors.name}
            className="sm:col-span-2"
          >
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Tesouro Selic 2029"
              maxLength={60}
              invalid={!!errors.name}
            />
          </Field>

          <Field label="Tipo" required hint="Agrupa a carteira no gráfico de investimentos.">
            <SelectInput value={kind} onChange={(e) => setKind(e.target.value as InvestmentKind)}>
              {INVESTMENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Valor aplicado" required hint="Quanto você investiu (aporte único)." error={errors.amount}>
            <MoneyInput value={amount} onChange={setAmount} invalid={!!errors.amount} />
          </Field>

          <Field label="Data da aplicação" required hint="Início da contagem do rendimento." error={errors.date}>
            <input
              type="date"
              value={date}
              max={todayISO()}
              min="2000-01-01"
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} ${errors.date ? 'border-neg' : ''}`}
            />
          </Field>

          <Field label="Taxa anual esperada" required hint="Rentabilidade estimada ao ano. Ex.: 12,5" error={errors.rate}>
            <PercentInput value={rate} onChange={setRate} invalid={!!errors.rate} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {editing ? <Check className="h-4 w-4" /> : <PiggyBank className="h-4 w-4" />}
            {editing ? 'Salvar alterações' : 'Adicionar investimento'}
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
