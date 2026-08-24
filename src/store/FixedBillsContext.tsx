import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FixedBill } from '../types';
import { loadFixedBills, saveFixedBills } from '../lib/storage';
import { api } from '../lib/api';

export type FixedBillInput = Omit<FixedBill, 'id' | 'createdAt'>;

interface FixedBillsContextValue {
  bills: FixedBill[];
  addBill: (input: FixedBillInput) => void;
  updateBill: (id: string, input: FixedBillInput) => void;
  deleteBill: (id: string) => void;
  toggleBill: (id: string, active: boolean) => void;
  replaceBills: (next: FixedBill[]) => void;
  clearBills: () => void;
}

const FixedBillsContext = createContext<FixedBillsContextValue | null>(null);

function persist(next: FixedBill[]): FixedBill[] {
  saveFixedBills(next);
  return next;
}

export function FixedBillsProvider({ children }: { children: ReactNode }) {
  const [bills, setBills] = useState<FixedBill[]>(() => loadFixedBills());

  useEffect(() => {
    let cancelled = false;
    api.getFixedBills().then((remote) => {
      if (!cancelled && Array.isArray(remote) && remote.length > 0) {
        setBills(persist(remote));
      }
    }).catch(() => {
      // Usa contas locais se a rota ainda não existia ou servidor offline
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addBill = useCallback((input: FixedBillInput) => {
    const tempRow: FixedBill = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setBills((current) => persist([tempRow, ...current]));
    void api.createFixedBill(input).then((created) => {
      if (created?.id) {
        setBills((current) => persist(current.map((b) => (b.id === tempRow.id ? created : b))));
      }
    }).catch(() => {});
  }, []);

  const updateBill = useCallback((id: string, input: FixedBillInput) => {
    setBills((current) => persist(current.map((bill) => (bill.id === id ? { ...bill, ...input } : bill))));
    void api.updateFixedBill(id, input).catch(() => {});
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills((current) => persist(current.filter((bill) => bill.id !== id)));
    void api.deleteFixedBill(id).catch(() => {});
  }, []);

  const toggleBill = useCallback((id: string, active: boolean) => {
    setBills((current) => {
      const target = current.find((b) => b.id === id);
      if (target) {
        void api.updateFixedBill(id, { ...target, active }).catch(() => {});
      }
      return persist(current.map((bill) => (bill.id === id ? { ...bill, active } : bill)));
    });
  }, []);

  const replaceBills = useCallback((next: FixedBill[]) => {
    setBills(persist(next));
  }, []);

  const clearBills = useCallback(() => {
    setBills(persist([]));
  }, []);

  const value = useMemo(
    () => ({ bills, addBill, updateBill, deleteBill, toggleBill, replaceBills, clearBills }),
    [bills, addBill, updateBill, deleteBill, toggleBill, replaceBills, clearBills],
  );

  return <FixedBillsContext.Provider value={value}>{children}</FixedBillsContext.Provider>;
}

export function useFixedBills(): FixedBillsContextValue {
  const ctx = useContext(FixedBillsContext);
  if (!ctx) throw new Error('useFixedBills deve ser usado dentro de FixedBillsProvider');
  return ctx;
}
