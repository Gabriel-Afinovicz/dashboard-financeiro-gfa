import type { FixedBill, Investment, Settings, Transaction } from '../types';
import { getToken, setToken } from './authToken';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type InvestmentInput = Omit<Investment, 'id' | 'createdAt'>;
export type FixedBillInput = Omit<FixedBill, 'id' | 'createdAt'>;

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
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError('Sem conexão com a API. Verifique se o servidor e o PostgreSQL estão no ar.');
  }
  if (!res.ok) {
    let message = `Erro ${res.status} na API.`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // corpo não-JSON; mantém a mensagem padrão
    }
    // Token inválido ou expirado: derruba a sessão e volta para a tela de acesso
    if (res.status === 401) setToken(null);
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean; db: string }>('/health'),
  login: (password: string) =>
    request<{ token: string }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  session: () => request<{ ok: true }>('/session'),
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

  getFixedBills: () => request<FixedBill[]>('/fixed-bills'),
  createFixedBill: (input: FixedBillInput) =>
    request<FixedBill>('/fixed-bills', { method: 'POST', body: JSON.stringify(input) }),
  updateFixedBill: (id: string, input: FixedBillInput) =>
    request<FixedBill>(`/fixed-bills/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteFixedBill: (id: string) => request<{ ok: true }>(`/fixed-bills/${id}`, { method: 'DELETE' }),

  getSettings: () => request<Partial<Settings> | null>('/settings'),
  saveSettings: (settings: Settings) =>
    request<{ ok: true }>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};
