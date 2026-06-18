"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bsbCode: string | null;
  currency: string;
  currentBalance: string;
  isActive: boolean;
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    bsbCode: "",
    currency: "PGK",
    currentBalance: "0",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/bank-accounts");
    setAccounts(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ accountName: "", accountNumber: "", bankName: "", bsbCode: "", currency: "PGK", currentBalance: "0" });
    load();
  };

  const fmt = (v: string) =>
    new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v));

  return (
    <>
      <PageHeader
        title="Bank Accounts"
        description="Manage your business bank accounts"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Add Account
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
            No bank accounts yet. Add your first account.
          </div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">{a.accountName}</p>
                  <p className="text-sm text-slate-500">{a.bankName}</p>
                </div>
                <span className="text-2xl">🏦</span>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xs text-slate-500">Account: {a.accountNumber}</p>
                {a.bsbCode && <p className="text-xs text-slate-500">BSB: {a.bsbCode}</p>}
                <p className="text-xs text-slate-500">Currency: {a.currency}</p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">{fmt(a.currentBalance)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Bank Account">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
            <input required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
              <input required value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
              <input required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BSB Code</label>
              <input value={form.bsbCode} onChange={(e) => setForm({ ...form, bsbCode: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
              <input type="number" step="0.01" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save Account</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
