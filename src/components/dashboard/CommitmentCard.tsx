import { AlertTriangle, CheckCircle, ShieldAlert, PieChart } from 'lucide-react';
import { useMoney } from '../../store/SettingsContext';
import { Card, CardTitle } from '../ui/controls';

interface Props {
  fixedCents: number;
  cardCents: number;
  incomeCents: number;
  ratioPct: number | null;
  delay?: number;
}

export function CommitmentCard({ fixedCents, cardCents, incomeCents, ratioPct, delay }: Props) {
  const { money } = useMoney();

  const totalCommitted = fixedCents + cardCents;

  let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  let statusText = 'Ideal (≤ 50%)';
  let Icon = CheckCircle;
  let statusDescription = 'Seus custos fixos e fatura estão dentro da recomendação financeira (Regra 50/30/20).';

  if (ratioPct !== null) {
    if (ratioPct > 70) {
      badgeColor = 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      statusText = 'Elevado (> 70%)';
      Icon = ShieldAlert;
      statusDescription = 'Atenção: mais de 70% da sua renda está comprometida antes de gastos variáveis.';
    } else if (ratioPct > 50) {
      badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      statusText = 'Moderado (50%-70%)';
      Icon = AlertTriangle;
      statusDescription = 'Alerta: seus compromissos ultrapassam os 50% recomendados.';
    }
  }

  return (
    <Card delay={delay}>
      <CardTitle
        icon={<PieChart className="h-4 w-4" />}
        title="Comprometimento de Renda"
        subtitle="Regra 50/30/20 · Custos Fixos + Fatura do Cartão"
      />

      {incomeCents <= 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Cadastre receitas no mês para calcular a taxa de comprometimento.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight tabular-nums text-fg">
                {ratioPct !== null ? `${ratioPct.toFixed(1)}%` : '0%'}
              </span>
              <span className="ml-2 text-xs text-muted">da renda ({money(totalCommitted)})</span>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeColor}`}>
              <Icon className="h-3 w-3" />
              {statusText}
            </span>
          </div>

          {/* Barra de Progresso visual */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-card2 border border-line">
            <div
              className={`h-full transition-all duration-500 ${
                (ratioPct ?? 0) > 70 ? 'bg-neg' : (ratioPct ?? 0) > 50 ? 'bg-amber-500' : 'bg-pos'
              }`}
              style={{ width: `${Math.min(100, ratioPct ?? 0)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-line pt-2 text-xs">
            <div>
              <p className="text-faint">Contas Fixas:</p>
              <p className="font-semibold text-fg tabular-nums">{money(fixedCents)}</p>
            </div>
            <div>
              <p className="text-faint">Fatura Cartão:</p>
              <p className="font-semibold text-fg tabular-nums">{money(cardCents)}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted">{statusDescription}</p>
        </div>
      )}
    </Card>
  );
}
