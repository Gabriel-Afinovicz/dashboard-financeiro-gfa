import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { FontOption, Settings } from '../types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/storage';
import { api } from '../lib/api';
import { contrastText } from '../lib/colors';
import { formatBRL, formatBRLCompact } from '../lib/format';

export const FONT_STACKS: Record<FontOption, string> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  poppins: "'Poppins', ui-sans-serif, system-ui, sans-serif",
  space: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  jetbrains: "'JetBrains Mono', ui-monospace, monospace",
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const FONT_LABELS: Record<FontOption, string> = {
  inter: 'Inter',
  poppins: 'Poppins',
  space: 'Space Grotesk',
  jetbrains: 'JetBrains Mono',
  system: 'Padrão do sistema',
};

export interface ChartColors {
  accent: string;
  pos: string;
  neg: string;
  grid: string;
  tick: string;
  track: string;
}

interface SettingsContextValue {
  settings: Settings;
  update: (partial: Partial<Settings>) => void;
  reset: () => void;
  resolvedAccent: string;
  chartColors: ChartColors;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const hydratedFromDb = useRef(false);

  const resolvedAccent = useMemo(() => {
    if (settings.accent === 'auto') return settings.theme === 'dark' ? '#fafafa' : '#0a0a0a';
    return settings.accent;
  }, [settings.accent, settings.theme]);

  // Carrega as configurações salvas no banco (o localStorage cobre o primeiro render sem piscar)
  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((remote) => {
        if (!cancelled && remote && typeof remote === 'object') {
          setSettings((s) => ({ ...s, ...remote }));
        }
      })
      .catch(() => {
        // API indisponível: segue com o localStorage; a tela de erro dos dados orienta o usuário
      })
      .finally(() => {
        if (!cancelled) hydratedFromDb.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveSettings(settings);
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.style.setProperty('--accent', resolvedAccent);
    root.style.setProperty('--accent-contrast', contrastText(resolvedAccent));
    root.style.setProperty('--font-app', FONT_STACKS[settings.font]);
    root.style.fontSize = `${16 * settings.fontScale}px`;
    root.classList.toggle('no-anim', !settings.animations);

    // Persiste no banco com debounce (após a hidratação inicial)
    if (!hydratedFromDb.current) return;
    const timer = setTimeout(() => {
      void api.saveSettings(settings).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, resolvedAccent]);

  const chartColors = useMemo<ChartColors>(() => {
    const dark = settings.theme === 'dark';
    return {
      accent: resolvedAccent,
      pos: dark ? '#4ade80' : '#16a34a',
      neg: dark ? '#f87171' : '#dc2626',
      grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      tick: dark ? '#9ca3af' : '#6b7280',
      track: dark ? '#232323' : '#e4e4e7',
    };
  }, [settings.theme, resolvedAccent]);

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, update, reset, resolvedAccent, chartColors }),
    [settings, update, reset, resolvedAccent, chartColors],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider');
  return ctx;
}

/** Formatadores de moeda que respeitam o modo privado. */
export function useMoney() {
  const { settings } = useSettings();
  const money = useCallback(
    (cents: number) => (settings.privacy ? 'R$ ••••' : formatBRL(cents)),
    [settings.privacy],
  );
  const moneyCompact = useCallback(
    (cents: number) => (settings.privacy ? '•••' : formatBRLCompact(cents)),
    [settings.privacy],
  );
  return { money, moneyCompact, privacy: settings.privacy };
}
