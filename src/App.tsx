import { useState } from 'react';
import { DatabaseZap, RefreshCw } from 'lucide-react';
import { Header, type Tab } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { ManageView } from './components/manage/ManageView';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useData } from './store/DataContext';
import { btnPrimary } from './components/ui/controls';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { status, errorMessage, retry } = useData();

  return (
    <div className="min-h-dvh">
      <Header tab={tab} onTab={setTab} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto w-full max-w-[1600px] px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-10">
        {status === 'loading' ? (
          <div className="anim-fade-in flex flex-col items-center justify-center gap-4 py-32 text-center">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
            <p className="text-sm text-muted">Conectando ao banco de dados…</p>
          </div>
        ) : status === 'error' ? (
          <div className="anim-fade-up mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-card p-8 text-center">
            <DatabaseZap className="h-10 w-10 text-neg" />
            <div>
              <h2 className="text-lg font-semibold">Sem conexão com o banco</h2>
              <p className="mt-1 text-sm text-muted">{errorMessage}</p>
              <p className="mt-2 text-xs text-faint">
                Confira se o projeto está rodando com <code className="rounded bg-card2 px-1.5 py-0.5">npm run dev</code>{' '}
                e se o serviço do PostgreSQL está ativo.
              </p>
            </div>
            <button type="button" className={btnPrimary} onClick={retry}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : tab === 'dashboard' ? (
          <div key="dashboard" className="anim-fade-in">
            <DashboardView onGoManage={() => setTab('manage')} onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        ) : (
          <div key="manage" className="anim-fade-in">
            <ManageView />
          </div>
        )}
      </main>

      <MobileNav tab={tab} onTab={setTab} onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
