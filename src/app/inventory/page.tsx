"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";

interface Item {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unitCost: string;
  quantityOnHand: number;
  reorderLevel: number;
  isActive: boolean;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unit: "each",
    unitCost: "0",
    quantityOnHand: 0,
    reorderLevel: 10,
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory");
    setItems(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ sku: "", name: "", description: "", category: "", unit: "each", unitCost: "0", quantityOnHand: 0, reorderLevel: 10 });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  };

  const fmt = (v: string) =>
    new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v));

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Track stock levels, costs, and reorder points"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Add Item
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Unit</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">On Hand</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Reorder</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No inventory items yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">{item.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right">{fmt(item.unitCost)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${item.quantityOnHand <= item.reorderLevel ? "text-red-600" : "text-slate-900"}`}>
                    {item.quantityOnHand}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.reorderLevel}</td>
                  <td className="px-4 py-3">
                    {item.quantityOnHand <= item.reorderLevel ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Low Stock</span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">In Stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Inventory Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
              <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="each">Each</option>
                <option value="kg">Kilogram</option>
                <option value="litre">Litre</option>
                <option value="metre">Metre</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (PGK)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qty On Hand</label>
              <input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
              <input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save Item</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
