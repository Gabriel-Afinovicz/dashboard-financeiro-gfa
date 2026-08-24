import { useMemo, useState } from 'react';
import { Bell, Eye, EyeOff, LayoutDashboard, NotebookPen, Settings } from 'lucide-react';
import { useSettings } from '../../store/SettingsContext';
import { useData } from '../../store/DataContext';
import { useFixedBills } from '../../store/FixedBillsContext';
import { getPendingFixedBillConfirmations } from '../../lib/fixedBills';
import { formatBRL, formatDateBR } from '../../lib/format';
import { btnIcon } from '../ui/controls';
import { FixedBillConfirmModal } from '../manage/FixedBillConfirmModal';

export type Tab = 'dashboard' | 'manage';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export function Header({
  tab,
  onTab,
  onOpenSettings,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onOpenSettings: () => void;
}) {
  const { settings, update } = useSettings();
  const { status } = useData();
  const { bills } = useFixedBills();
  const today = dateFmt.format(new Date()).replace(/\./g, '');

  const [showBellMenu, setShowBellMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const pendingConfirmations = useMemo(
    () => getPendingFixedBillConfirmations(bills),
    [bills],
  );

  const dotTitle =
    status === 'ready' ? 'Conectado ao PostgreSQL' : status === 'error' ? 'Sem conexão com o banco' : 'Conectando…';
  const dotColor = status === 'error' ? 'bg-neg' : 'bg-accent';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5" title={dotTitle}>
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColor}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
            </span>
            <h1 className="text-sm font-bold tracking-tight sm:text-base">
              Dashboard <span className="font-medium text-muted">Financeiro</span>
            </h1>
          </div>

          <nav className="hidden sm:flex items-center rounded-full border border-line bg-card p-1" aria-label="Abas">
            <button
              type="button"
              onClick={() => onTab('dashboard')}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'dashboard' ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-fg'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Visão geral
            </button>
            <button
              type="button"
              onClick={() => onTab('manage')}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'manage' ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-fg'
              }`}
            >
              <NotebookPen className="h-4 w-4" />
              Lançamentos
            </button>
          </nav>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden text-xs text-faint md:inline">{today}</span>

            {/* Ícone de Sininho com Notificações */}
            <div className="relative">
              <button
                type="button"
                className={`${btnIcon} relative`}
                title="Notificações de confirmação de contas em Dólar"
                onClick={() => setShowBellMenu((v) => !v)}
              >
                <Bell className="h-4.5 w-4.5" />
                {pendingConfirmations.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neg text-[10px] font-bold text-white shadow">
                    {pendingConfirmations.length}
                  </span>
                )}
              </button>

              {showBellMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-2xl z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2 mb-2 font-semibold">
                    <span>Notificações Pendentes</span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                      {pendingConfirmations.length}
                    </span>
                  </div>

                  {pendingConfirmations.length === 0 ? (
                    <p className="py-4 text-center text-muted">
                      Todas as contas em Dólar deste mês estão confirmadas! ✓
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {pendingConfirmations.map((item) => (
                        <div
                          key={item.bill.id}
                          className="rounded-xl border border-line/60 bg-card2 p-2.5 transition hover:border-accent/50 cursor-pointer"
                          onClick={() => {
                            setShowBellMenu(false);
                            setShowConfirmModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="truncate">{item.bill.description}</span>
                            <span className="text-neg font-semibold">{formatBRL(item.projectedAmountCents)}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-faint">
                            Venceu em {formatDateBR(item.dueDate)} · Clique para confirmar valor real
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className={btnIcon}
              title={settings.privacy ? 'Mostrar valores' : 'Ocultar valores'}
              aria-label={settings.privacy ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={() => update({ privacy: !settings.privacy })}
            >
              {settings.privacy ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
            <button
              type="button"
              className={btnIcon}
              title="Configurações"
              aria-label="Configurações"
              onClick={onOpenSettings}
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {showConfirmModal && pendingConfirmations.length > 0 && (
        <FixedBillConfirmModal
          pending={pendingConfirmations}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}
