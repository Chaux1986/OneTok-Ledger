"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    tradingName: "",
    email: "",
    phone: "",
    mobile: "",
    taxNumber: "",
    creditLimit: "",
    paymentTermDays: "30",
    billingAddress: "",
    shippingAddress: "",
    notes: "",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const submit = async () => {
    if (!form.name) { setError("Customer name is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/sales/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentTermDays: parseInt(form.paymentTermDays) || 30,
          creditLimit: form.creditLimit || "0",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      setSuccess(`Customer ${data.customer.code} created successfully`);
      setTimeout(() => router.push("/dashboard/sales/customers"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/sales/customers">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Customer</h1>
          <p className="text-slate-500">Add a customer to your accounts receivable</p>
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
        <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Legal Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Hela Resources Ltd" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Trading Name</label>
              <Input placeholder="If different from legal name" value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">IRC Tax Number (TIN)</label>
              <Input placeholder="e.g. 1234567890" value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" placeholder="accounts@company.com.pg" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input placeholder="+675 xxx xxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Mobile</label>
              <Input placeholder="+675 7xxx xxxx" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Credit & Payment Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Credit Limit (PGK)</label>
              <Input type="number" placeholder="0.00" min="0" step="0.01" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Payment Terms (days)</label>
              <select
                value={form.paymentTermDays}
                onChange={(e) => set("paymentTermDays", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="45">45 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Billing Address</label>
            <textarea
              rows={3}
              placeholder="Street, City, Province, Papua New Guinea"
              value={form.billingAddress}
              onChange={(e) => set("billingAddress", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Shipping Address <span className="text-slate-400 font-normal">(if different)</span></label>
            <textarea
              rows={3}
              placeholder="Street, City, Province, Papua New Guinea"
              value={form.shippingAddress}
              onChange={(e) => set("shippingAddress", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            rows={3}
            placeholder="Internal notes about this customer..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/sales/customers">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </div>
  );
}