"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface Receipt {
  id: string;
  receiptNumber: string;
  supplierName: string | null;
  receiptDate: string;
  amount: string;
  description: string | null;
  status: string;
}

interface Supplier { id: string; name: string; }

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    receiptDate: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
  });

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      fetch("/api/receipts").then((x) => x.json()),
      fetch("/api/suppliers").then((x) => x.json()),
    ]);
    setReceipts(r);
    setSuppliers(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/receipts", {
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
        title="Receipts"
        description="Track payment receipts"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New Receipt
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Receipt #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No receipts yet.</td></tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.receiptNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{r.supplierName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.receiptDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(r.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Receipt">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" required value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save Receipt</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
