"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface Reconciliation {
  id: string;
  accountName: string | null;
  reconciledAmount: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface BankAccount { id: string; accountName: string; }
interface Transaction { id: string; description: string; transactionDate: string; debit: string | null; credit: string | null; isReconciled: boolean; }
interface Invoice { id: string; invoiceNumber: string; totalAmount: string; }

export default function ReconciliationPage() {
  const [recs, setRecs] = useState<Reconciliation[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    bankAccountId: "",
    transactionId: "",
    invoiceId: "",
    reconciledAmount: "",
    status: "matched",
    notes: "",
  });

  const load = useCallback(async () => {
    const [r, a, t, i] = await Promise.all([
      fetch("/api/bank-reconciliations").then((x) => x.json()),
      fetch("/api/bank-accounts").then((x) => x.json()),
      fetch("/api/bank-transactions").then((x) => x.json()),
      fetch("/api/invoices").then((x) => x.json()),
    ]);
    setRecs(r);
    setAccounts(a);
    setTxns(t.filter((tx: Transaction) => !tx.isReconciled));
    setInvoicesList(i);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/bank-reconciliations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    load();
  };

  const fmt = (v: string) =>
    new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v));

  return (
    <>
      <PageHeader
        title="Bank Reconciliation"
        description="Match bank transactions with invoices and receipts"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Reconcile
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Notes</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No reconciliations yet.</td></tr>
            ) : (
              recs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{r.accountName || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(r.reconciledAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{r.notes || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Reconcile Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account *</label>
            <select required value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction</label>
            <select value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select unreconciled transaction</option>
              {txns.map((t) => <option key={t.id} value={t.id}>{t.transactionDate} — {t.description}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Match to Invoice</label>
            <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select invoice</option>
              {invoicesList.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {fmt(i.totalAmount)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input type="number" step="0.01" required value={form.reconciledAmount} onChange={(e) => setForm({ ...form, reconciledAmount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="matched">Matched</option>
                <option value="unmatched">Unmatched</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Reconcile</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
