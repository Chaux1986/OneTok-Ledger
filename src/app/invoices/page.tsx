"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string | null;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  status: string;
  description: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [lines, setLines] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [form, setForm] = useState({
    supplierId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    description: "",
  });

  const load = useCallback(async () => {
    const [inv, sup] = await Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]);
    setInvoices(inv);
    setSuppliers(sup);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lines }),
    });
    setShowModal(false);
    setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const fmt = (v: string) =>
    new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v));

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Track and manage invoices from suppliers"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New Invoice
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Issue Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Due Date</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No invoices yet.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.supplierName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.issueDate}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <select
                      value={inv.status}
                      onChange={(e) => updateStatus(inv.id, e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date *</label>
              <input type="date" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
              <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
            {lines.map((line, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_80px_120px_32px] gap-2">
                <input placeholder="Description" value={line.description} onChange={(e) => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => { const n = [...lines]; n[i].quantity = Number(e.target.value); setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" step="0.01" placeholder="Price" value={line.unitPrice} onChange={(e) => { const n = [...lines]; n[i].unitPrice = Number(e.target.value); setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setLines([...lines, { description: "", quantity: 1, unitPrice: 0 }])} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add Line</button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create Invoice</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
