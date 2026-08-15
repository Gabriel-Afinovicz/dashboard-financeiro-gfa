import type { DataStore, Settings } from '../types';

const DATA_KEY = 'findash.data.v1';
const SETTINGS_KEY = 'findash.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: 'auto',
  font: 'inter',
  fontScale: 1,
  animations: true,
  privacy: false,
  initialBalanceCents: 0,
  monthlyGoalCents: 100000,
};

export function loadData(): DataStore | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.investments)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveData(store: DataStore): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(store));
  } catch {
    // armazenamento indisponível (modo anônimo/cota) — ignora silenciosamente
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignora
  }
}
