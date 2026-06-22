"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface Account { id: string; code: string; name: string; accountType: string; }
interface Warehouse { id: string; code: string; name: string; }

export default function NewProductPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", category: "", unit: "each",
    costPrice: "", sellPrice: "", taxRate: "10",
    reorderLevel: "0", reorderQuantity: "0",
    incomeAccountId: "", expenseAccountId: "", assetAccountId: "",
    initialQuantity: "", initialWarehouseId: "",
  });

  useEffect(() => {
    fetch("/api/v1/accounting/accounts").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
    fetch("/api/v1/inventory/warehouses").then((r) => r.json()).then((d) => setWarehouses(d.warehouses || []));
  }, []);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const revenueAccounts = accounts.filter((a) => a.accountType === "revenue");
  const expenseAccounts = accounts.filter((a) => a.accountType === "expense");
  const assetAccounts = accounts.filter((a) => a.accountType === "asset");

  const submit = async () => {
    if (!form.name) { setError("Product name is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          reorderLevel: parseInt(form.reorderLevel) || 0,
          reorderQuantity: parseInt(form.reorderQuantity) || 0,
          incomeAccountId: form.incomeAccountId || undefined,
          expenseAccountId: form.expenseAccountId || undefined,
          assetAccountId: form.assetAccountId || undefined,
          initialWarehouseId: form.initialWarehouseId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");
      setSuccess(`Product ${data.product.sku} created successfully`);
      setTimeout(() => router.push("/dashboard/inventory/products"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventory/products">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Product</h1>
          <p className="text-slate-500">Add an item to your catalog</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Input placeholder="e.g. Hardware, Office Supplies" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="each">Each</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram</option>
                <option value="litre">Litre</option>
                <option value="metre">Metre</option>
                <option value="carton">Carton</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Cost Price (PGK)</label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Sell Price (PGK)</label>
              <Input type="number" min="0" step="0.01" value={form.sellPrice} onChange={(e) => set("sellPrice", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">GST Rate (%)</label>
              <select value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="0">0%</option>
                <option value="10">10%</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Reorder Level</label>
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Reorder Quantity</label>
              <Input type="number" min="0" value={form.reorderQuantity} onChange={(e) => set("reorderQuantity", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL Account Mapping</CardTitle>
          <CardDescription>Optional — links this product to the right ledger accounts for sales and stock value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Income Account</label>
              <select value={form.incomeAccountId} onChange={(e) => set("incomeAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Expense / COGS Account</label>
              <select value={form.expenseAccountId} onChange={(e) => set("expenseAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Inventory Asset Account</label>
              <select value={form.assetAccountId} onChange={(e) => set("assetAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening Stock</CardTitle>
          <CardDescription>Optional — set an initial quantity in a warehouse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Warehouse</label>
              <select value={form.initialWarehouseId} onChange={(e) => set("initialWarehouseId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— Select warehouse —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Initial Quantity</label>
              <Input type="number" min="0" value={form.initialQuantity} onChange={(e) => set("initialQuantity", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/inventory/products"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </div>
  );
}