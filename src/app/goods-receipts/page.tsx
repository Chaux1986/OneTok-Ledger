"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface GR {
  id: string;
  grNumber: string;
  poNumber: string | null;
  receivedDate: string;
  status: string;
  receivedBy: string | null;
  notes: string | null;
}

interface PO { id: string; poNumber: string; status: string; }

export default function GoodsReceiptsPage() {
  const [grs, setGrs] = useState<GR[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    purchaseOrderId: "",
    receivedDate: new Date().toISOString().split("T")[0],
    receivedBy: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [g, p] = await Promise.all([
      fetch("/api/goods-receipts").then((r) => r.json()),
      fetch("/api/purchase-orders").then((r) => r.json()),
    ]);
    setGrs(g);
    setPos(p.filter((po: PO) => po.status === "approved" || po.status === "sent" || po.status === "partially_received"));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "accepted" }),
    });
    setShowModal(false);
    load();
  };

  return (
    <>
      <PageHeader
        title="Goods Receipts"
        description="Record goods received against purchase orders"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Receive Goods
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">GR #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">PO #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Received Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Received By</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No goods receipts yet.</td></tr>
            ) : (
              grs.map((gr) => (
                <tr key={gr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{gr.grNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{gr.poNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{gr.receivedDate}</td>
                  <td className="px-4 py-3 text-slate-600">{gr.receivedBy || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={gr.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{gr.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Receive Goods">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Order *</label>
            <select required value={form.purchaseOrderId} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select PO</option>
              {pos.map((po) => <option key={po.id} value={po.id}>{po.poNumber}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Received Date *</label>
              <input type="date" required value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
              <input value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Record Receipt</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
