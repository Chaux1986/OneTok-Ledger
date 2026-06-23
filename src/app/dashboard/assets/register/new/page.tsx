"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface Account { id: string; code: string; name: string; accountType: string; }
interface Employee { id: string; firstName: string; lastName: string; }

export default function NewAssetPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", category: "", location: "", serialNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "", usefulLife: "60", salvageValue: "0",
    assetAccountId: "", depreciationAccountId: "", accumulatedDepreciationAccountId: "",
    assignedTo: "",
  });

  useEffect(() => {
    fetch("/api/v1/accounting/accounts").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
    fetch("/api/v1/payroll/employees").then((r) => r.json()).then((d) => setEmployees(d.employees || []));
  }, []);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const assetAccounts = accounts.filter((a) => a.accountType === "asset");
  const expenseAccounts = accounts.filter((a) => a.accountType === "expense");

  const submit = async () => {
    if (!form.name) { setError("Asset name is required"); return; }
    if (!form.purchasePrice) { setError("Purchase price is required"); return; }
    if (!form.usefulLife || parseInt(form.usefulLife) < 1) { setError("Useful life (months) is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/assets/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          usefulLife: parseInt(form.usefulLife),
          assetAccountId: form.assetAccountId || undefined,
          depreciationAccountId: form.depreciationAccountId || undefined,
          accumulatedDepreciationAccountId: form.accumulatedDepreciationAccountId || undefined,
          assignedTo: form.assignedTo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create asset");
      setSuccess(`Asset ${data.asset.assetNumber} registered successfully`);
      setTimeout(() => router.push("/dashboard/assets/register"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    } finally {
      setLoading(false);
    }
  };

  const monthlyPreview = (() => {
    const cost = parseFloat(form.purchasePrice || "0");
    const salvage = parseFloat(form.salvageValue || "0");
    const life = parseInt(form.usefulLife || "0");
    if (!cost || !life) return 0;
    return Math.max(cost - salvage, 0) / life;
  })();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assets/register">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Asset</h1>
          <p className="text-slate-500">Register a fixed asset for depreciation tracking</p>
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
        <CardHeader><CardTitle>Asset Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Toyota Hilux - 2026" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Input placeholder="e.g. Motor Vehicles" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Location</label>
              <Input placeholder="e.g. Port Moresby Office" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Serial Number</label>
              <Input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Assigned To</label>
            <select value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
              <option value="">— Unassigned —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost & Depreciation</CardTitle>
          <CardDescription>Straight-line method over the useful life in months</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Purchase Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Purchase Price (PGK) <span className="text-red-500">*</span></label>
              <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Useful Life (months) <span className="text-red-500">*</span></label>
              <Input type="number" min="1" value={form.usefulLife} onChange={(e) => set("usefulLife", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Salvage Value (PGK)</label>
              <Input type="number" min="0" step="0.01" value={form.salvageValue} onChange={(e) => set("salvageValue", e.target.value)} />
            </div>
          </div>
          {monthlyPreview > 0 && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Estimated monthly depreciation: <span className="font-mono font-medium">K {monthlyPreview.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL Account Mapping</CardTitle>
          <CardDescription>Required for depreciation to post automatically to the ledger</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Asset Account</label>
              <select value={form.assetAccountId} onChange={(e) => set("assetAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Depreciation Expense</label>
              <select value={form.depreciationAccountId} onChange={(e) => set("depreciationAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Accumulated Depreciation</label>
              <select value={form.accumulatedDepreciationAccountId} onChange={(e) => set("accumulatedDepreciationAccountId", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">— None —</option>
                {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/assets/register"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save Asset"}
        </Button>
      </div>
    </div>
  );
}