import { useState } from 'react';
import { AlertCircle, Check, DollarSign, X } from 'lucide-react';
import type { PendingConfirmation } from '../../lib/fixedBills';
import { useFixedBills } from '../../store/FixedBillsContext';
import { useToast } from '../../store/ToastContext';
import { currencyToCents, formatDateBR, formatBRL, maskCurrency } from '../../lib/format';
import { MoneyInput, btnGhost, btnPrimary } from '../ui/controls';

interface Props {
  pending: PendingConfirmation[];
  onClose: () => void;
}

export function FixedBillConfirmModal({ pending, onClose }: Props) {
  const { confirmBillAmount } = useFixedBills();
  const { push } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const item = pending[currentIndex];

  const initialMask = item ? maskCurrency(String(item.projectedAmountCents)) : '';
  const [valueInput, setValueInput] = useState(initialMask);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = currencyToCents(valueInput);
    if (cents <= 0) return;

    confirmBillAmount(item.bill.id, item.monthKey, cents);
    push(`Valor de ${item.bill.description} confirmado (${formatBRL(cents)}).`);

    if (currentIndex + 1 < pending.length) {
      const nextItem = pending[currentIndex + 1];
      setCurrentIndex((idx) => idx + 1);
      setValueInput(maskCurrency(String(nextItem.projectedAmountCents)));
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-semibold text-base">
            <DollarSign className="h-5 w-5" />
            <span>Confirmar valor real no Banco</span>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-fg transition-colors">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="rounded-xl border border-line/60 bg-card2 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-fg text-sm">{item.bill.description}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              US$ {((item.bill.amountCentsUSD ?? 0) / 100).toFixed(2)}
            </span>
          </div>
          <p className="text-muted">
            Vencimento do mês: <strong className="text-fg">{formatDateBR(item.dueDate)}</strong>
          </p>
          <p className="text-muted">
            Estimativa com impostos: <strong className="text-accent">{formatBRL(item.projectedAmountCents)}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Valor exato cobrado pelo banco (R$)
            </label>
            <MoneyInput value={valueInput} onChange={setValueInput} placeholder="0,00" />
            <p className="mt-1 text-[11px] text-faint flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
              Confira no extrato do seu banco/cartão e ajuste se houver diferença.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-line">
            <button type="button" className={btnGhost} onClick={onClose}>
              Lembrar no sininho
            </button>
            <button type="submit" className={btnPrimary}>
              <Check className="h-4 w-4" />
              Confirmar valor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
