import { LayoutDashboard, NotebookPen, Settings } from 'lucide-react';
import type { Tab } from './Header';

export function MobileNav({
  tab,
  onTab,
  onOpenSettings,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onOpenSettings: () => void;
}) {
  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
      active ? 'text-accent' : 'text-muted'
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-bg/90 backdrop-blur sm:hidden"
      aria-label="Navegação"
    >
      <button type="button" className={itemClass(tab === 'dashboard')} onClick={() => onTab('dashboard')}>
        <LayoutDashboard className="h-5 w-5" />
        Visão geral
      </button>
      <button type="button" className={itemClass(tab === 'manage')} onClick={() => onTab('manage')}>
        <NotebookPen className="h-5 w-5" />
        Lançamentos
      </button>
      <button type="button" className={itemClass(false)} onClick={onOpenSettings}>
        <Settings className="h-5 w-5" />
        Ajustes
      </button>
    </nav>
  );
}
