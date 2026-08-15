import type { Investment, Settings, Transaction } from '../types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type InvestmentInput = Omit<Investment, 'id' | 'createdAt'>;

export interface RemoteData {
  transactions: Transaction[];
  investments: Investment[];
  sampleData: boolean;
  initialized: boolean;
}

export interface ReplacePayload {
  transactions: Transaction[];
  investments: Investment[];
  sampleData: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Em desenvolvimento fica vazio (proxy do Vite); em produção aponta para a API na VPS.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError('Sem conexão com a API local. Rode "npm run dev" e verifique o PostgreSQL.');
  }
  if (!res.ok) {
    let message = `Erro ${res.status} na API.`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // corpo não-JSON; mantém a mensagem padrão
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean; db: string; version: string }>('/health'),
  getData: () => request<RemoteData>('/data'),
  replaceData: (payload: ReplacePayload) =>
    request<RemoteData>('/data/replace', { method: 'POST', body: JSON.stringify(payload) }),

  createTransaction: (input: TransactionInput) =>
    request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: TransactionInput) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTransaction: (id: string) => request<{ ok: true }>(`/transactions/${id}`, { method: 'DELETE' }),

  createInvestment: (input: InvestmentInput) =>
    request<Investment>('/investments', { method: 'POST', body: JSON.stringify(input) }),
  updateInvestment: (id: string, input: InvestmentInput) =>
    request<Investment>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteInvestment: (id: string) => request<{ ok: true }>(`/investments/${id}`, { method: 'DELETE' }),

  getSettings: () => request<Partial<Settings> | null>('/settings'),
  saveSettings: (settings: Settings) =>
    request<{ ok: true }>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};
