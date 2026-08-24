import { useRef, useState } from 'react';
import type { FixedBill, Investment, Transaction } from '../../types';
import { TransactionForm } from './TransactionForm';
import { InvestmentForm } from './InvestmentForm';
import { FixedBillForm } from './FixedBillForm';
import { TransactionsTable } from './TransactionsTable';
import { InvestmentsTable } from './InvestmentsTable';
import { FixedBillsTable } from './FixedBillsTable';

export function ManageView() {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const txAnchor = useRef<HTMLElement>(null);
  const invAnchor = useRef<HTMLElement>(null);
  const billAnchor = useRef<HTMLElement>(null);

  const startEditTx = (t: Transaction) => {
    setEditingTx(t);
    txAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startEditInv = (inv: Investment) => {
    setEditingInv(inv);
    invAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startEditBill = (bill: FixedBill) => {
    setEditingBill(bill);
    billAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 xl:grid-cols-2 sm:gap-5">
        <TransactionForm ref={txAnchor} editing={editingTx} onDoneEditing={() => setEditingTx(null)} />
        <InvestmentForm ref={invAnchor} editing={editingInv} onDoneEditing={() => setEditingInv(null)} />
      </div>
      <FixedBillForm ref={billAnchor} editing={editingBill} onDoneEditing={() => setEditingBill(null)} />
      <FixedBillsTable onEdit={startEditBill} />
      <TransactionsTable onEdit={startEditTx} />
      <InvestmentsTable onEdit={startEditInv} />
    </div>
  );
}
