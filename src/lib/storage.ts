import type { DataStore, FixedBill, Settings } from '../types';

const DATA_KEY = 'findash.data.v1';
const SETTINGS_KEY = 'findash.settings.v1';
const FIXED_BILLS_KEY = 'findash.fixedBills.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: 'auto',
  font: 'inter',
  fontScale: 1,
  animations: true,
  privacy: false,
  initialBalanceCents: 0,
  monthlyGoalCents: 100000,
  creditCardClosingDay: 3,
  creditCardDueDay: 10,
  cardSpreadPct: 5.5,
  cardIofPct: 4.38,
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

function isFixedBill(value: unknown): value is FixedBill {
  if (!value || typeof value !== 'object') return false;
  const b = value as Partial<FixedBill>;
  return (
    typeof b.id === 'string' &&
    typeof b.description === 'string' &&
    typeof b.amountCents === 'number' &&
    typeof b.dayOfMonth === 'number' &&
    typeof b.category === 'string' &&
    typeof b.method === 'string' &&
    typeof b.active === 'boolean' &&
    typeof b.startsOn === 'string' &&
    typeof b.createdAt === 'string'
  );
}

/** Contas fixas ficam só no navegador (ainda não vão para o PostgreSQL). */
export function loadFixedBills(): FixedBill[] {
  try {
    const raw = localStorage.getItem(FIXED_BILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFixedBill);
  } catch {
    return [];
  }
}

export function saveFixedBills(bills: FixedBill[]): void {
  try {
    localStorage.setItem(FIXED_BILLS_KEY, JSON.stringify(bills));
  } catch {
    // ignora
  }
}
