import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataStore, Investment, Transaction } from '../types';
import { api, type InvestmentInput, type TransactionInput } from '../lib/api';
import { loadData as loadLocalData } from '../lib/storage';
import { buildSampleStore } from '../lib/seed';

type Status = 'loading' | 'ready' | 'error';

interface DataContextValue {
  transactions: Transaction[];
  investments: Investment[];
  sampleData: boolean;
  status: Status;
  errorMessage: string | null;
  retry: () => void;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addInvestment: (input: InvestmentInput) => Promise<void>;
  updateInvestment: (id: string, input: InvestmentInput) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  replaceAll: (store: DataStore) => Promise<void>;
  clearAll: () => Promise<void>;
  loadSample: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

interface LocalStore {
  transactions: Transaction[];
  investments: Investment[];
  sampleData: boolean;
}

const EMPTY: LocalStore = { transactions: [], investments: [], sampleData: false };

// Evita inicialização dupla no StrictMode/HMR
let bootstrapStarted = false;

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LocalStore>(EMPTY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      let data = await api.getData();

      // Primeira vez com o banco: migra os dados reais do navegador,
      // ou semeia os dados de exemplo para o dashboard nascer vivo.
      if (!data.initialized) {
        const local = loadLocalData();
        const hasRealLocalData =
          local && !local.sampleData && (local.transactions.length > 0 || local.investments.length > 0);
        const seed = hasRealLocalData ? local : buildSampleStore();
        data = await api.replaceData({
          transactions: seed.transactions,
          investments: seed.investments,
          sampleData: seed.sampleData,
        });
      }

      setStore({ transactions: data.transactions, investments: data.investments, sampleData: data.sampleData });
      setStatus('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro inesperado ao carregar os dados.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (bootstrapStarted) return;
    bootstrapStarted = true;
    void load();
  }, [load]);

  const retry = useCallback(() => {
    void load();
  }, [load]);

  const addTransaction = useCallback(async (input: TransactionInput) => {
    const row = await api.createTransaction(input);
    setStore((s) => ({ ...s, transactions: [row, ...s.transactions] }));
  }, []);

  const updateTransaction = useCallback(async (id: string, input: TransactionInput) => {
    const row = await api.updateTransaction(id, input);
    setStore((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === id ? row : t)) }));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id);
    setStore((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  }, []);

  const addInvestment = useCallback(async (input: InvestmentInput) => {
    const row = await api.createInvestment(input);
    setStore((s) => ({ ...s, investments: [row, ...s.investments] }));
  }, []);

  const updateInvestment = useCallback(async (id: string, input: InvestmentInput) => {
    const row = await api.updateInvestment(id, input);
    setStore((s) => ({ ...s, investments: s.investments.map((i) => (i.id === id ? row : i)) }));
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    await api.deleteInvestment(id);
    setStore((s) => ({ ...s, investments: s.investments.filter((i) => i.id !== id) }));
  }, []);

  const applyReplace = useCallback(async (payload: { transactions: Transaction[]; investments: Investment[]; sampleData: boolean }) => {
    const data = await api.replaceData(payload);
    setStore({ transactions: data.transactions, investments: data.investments, sampleData: data.sampleData });
  }, []);

  const replaceAll = useCallback(
    async (data: DataStore) => {
      await applyReplace({ transactions: data.transactions, investments: data.investments, sampleData: data.sampleData });
    },
    [applyReplace],
  );

  const clearAll = useCallback(async () => {
    await applyReplace({ transactions: [], investments: [], sampleData: false });
  }, [applyReplace]);

  const loadSample = useCallback(async () => {
    const sample = buildSampleStore();
    await applyReplace({ transactions: sample.transactions, investments: sample.investments, sampleData: true });
  }, [applyReplace]);

  const value = useMemo<DataContextValue>(
    () => ({
      transactions: store.transactions,
      investments: store.investments,
      sampleData: store.sampleData,
      status,
      errorMessage,
      retry,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      replaceAll,
      clearAll,
      loadSample,
    }),
    [
      store,
      status,
      errorMessage,
      retry,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      replaceAll,
      clearAll,
      loadSample,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
