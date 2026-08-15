import { Eye, EyeOff, LayoutDashboard, NotebookPen, Settings } from 'lucide-react';
import { useSettings } from '../../store/SettingsContext';
import { useData } from '../../store/DataContext';
import { btnIcon } from '../ui/controls';

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
  const today = dateFmt.format(new Date()).replace(/\./g, '');

  const dotTitle =
    status === 'ready' ? 'Conectado ao PostgreSQL' : status === 'error' ? 'Sem conexão com o banco' : 'Conectando…';
  const dotColor = status === 'error' ? 'bg-neg' : 'bg-accent';

  return (
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
  );
}
