"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface PO {
  id: string;
  poNumber: string;
  supplierName: string | null;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  subtotal: string | null;
  totalAmount: string | null;
}

interface Supplier { id: string; name: string; }
interface Item { id: string; sku: string; name: string; unitCost: string; }

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDate: "",
    notes: "",
  });
  const [lines, setLines] = useState([{ inventoryItemId: "", quantity: 1, unitPrice: 0 }]);

  const load = useCallback(async () => {
    const [o, s, i] = await Promise.all([
      fetch("/api/purchase-orders").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
    ]);
    setOrders(o);
    setSuppliers(s);
    setItems(i);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lines }),
    });
    setShowModal(false);
    setLines([{ inventoryItemId: "", quantity: 1, unitPrice: 0 }]);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedBy: "Admin" }),
    });
    load();
  };

  const fmt = (v: string | null) =>
    v ? new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v)) : "K0.00";

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders with approval workflows"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New PO
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">PO #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Order Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Expected</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No purchase orders yet.</td></tr>
            ) : (
              orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{po.poNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{po.supplierName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{po.orderDate}</td>
                  <td className="px-4 py-3 text-slate-600">{po.expectedDate || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(po.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3">
                    <select
                      value={po.status}
                      onChange={(e) => updateStatus(po.id, e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="sent">Sent</option>
                      <option value="partially_received">Partially Received</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Order" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
              <select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Date *</label>
              <input type="date" required value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
              <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Order Lines</label>
            {lines.map((line, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_80px_120px_32px] gap-2">
                <select value={line.inventoryItemId} onChange={(e) => { const n = [...lines]; n[i].inventoryItemId = e.target.value; const item = items.find((it) => it.id === e.target.value); if (item) n[i].unitPrice = parseFloat(item.unitCost); setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select item</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}
                </select>
                <input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => { const n = [...lines]; n[i].quantity = Number(e.target.value); setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" step="0.01" placeholder="Price" value={line.unitPrice} onChange={(e) => { const n = [...lines]; n[i].unitPrice = Number(e.target.value); setLines(n); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setLines([...lines, { inventoryItemId: "", quantity: 1, unitPrice: 0 }])} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add Line</button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create PO</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
