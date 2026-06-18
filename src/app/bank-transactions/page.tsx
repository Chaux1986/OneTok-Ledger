"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";

interface Transaction {
  id: string;
  accountName: string | null;
  transactionDate: string;
  description: string;
  debit: string | null;
  credit: string | null;
  balance: string | null;
  reference: string | null;
  isReconciled: boolean;
}

interface BankAccount { id: string; accountName: string; }

export default function BankTransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    bankAccountId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
    debit: "",
    credit: "",
    reference: "",
  });

  const load = useCallback(async () => {
    const [t, a] = await Promise.all([
      fetch("/api/bank-transactions").then((r) => r.json()),
      fetch("/api/bank-accounts").then((r) => r.json()),
    ]);
    setTxns(t);
    setAccounts(a);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    load();
  };

  const fmt = (v: string | null) =>
    v && parseFloat(v) > 0
      ? new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v))
      : "—";

  return (
    <>
      <PageHeader
        title="Bank Transactions"
        description="Record and track banking transactions"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Add Transaction
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Debit</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Credit</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Ref</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reconciled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No transactions yet.</td></tr>
            ) : (
              txns.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{t.transactionDate}</td>
                  <td className="px-4 py-3 text-slate-600">{t.accountName || "—"}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.description}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(t.debit)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(t.credit)}</td>
                  <td className="px-4 py-3 text-slate-500">{t.reference || "—"}</td>
                  <td className="px-4 py-3">{t.isReconciled ? <span className="text-green-600">✓</span> : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account *</label>
            <select required value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" required value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Debit (PGK)</label>
              <input type="number" step="0.01" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit (PGK)</label>
              <input type="number" step="0.01" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save Transaction</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
