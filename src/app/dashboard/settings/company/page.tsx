"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, CheckCircle2, Building2 } from "lucide-react";

interface Tenant {
  name: string;
  tradingName: string | null;
  slug: string;
  businessNumber: string | null;
  gstNumber: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  financialYearEnd: number | null;
  status: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  subscriptionPlan: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CompanySettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "", tradingName: "", businessNumber: "", gstNumber: "",
    industry: "", country: "PG", currency: "PGK", timezone: "Pacific/Port_Moresby",
    financialYearEnd: "12", address: "", phone: "", email: "", website: "",
  });

  useEffect(() => {
    fetch("/api/v1/settings/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.tenant) {
          setTenant(d.tenant);
          setForm({
            name: d.tenant.name || "",
            tradingName: d.tenant.tradingName || "",
            businessNumber: d.tenant.businessNumber || "",
            gstNumber: d.tenant.gstNumber || "",
            industry: d.tenant.industry || "",
            country: d.tenant.country || "PG",
            currency: d.tenant.currency || "PGK",
            timezone: d.tenant.timezone || "Pacific/Port_Moresby",
            financialYearEnd: String(d.tenant.financialYearEnd || 12),
            address: d.tenant.address || "",
            phone: d.tenant.phone || "",
            email: d.tenant.email || "",
            website: d.tenant.website || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const save = async () => {
    if (!form.name) { setError("Company name is required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          financialYearEnd: parseInt(form.financialYearEnd),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save company settings");
      setTenant(data.tenant);
      setSuccess("Company settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
          <p className="text-slate-500">Your business details, used across invoices and compliance reports</p>
        </div>
        {tenant && (
          <Badge variant={tenant.status === "active" ? "success" : "secondary"}>
            {tenant.subscriptionPlan} · {tenant.status}
          </Badge>
        )}
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

      {!form.businessNumber && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No IRC Tax Identification Number (TIN) set — add it below so your compliance reports show the correct business number for lodging.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            <CardTitle>Business Identity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Legal Company Name <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Trading Name</label>
              <Input placeholder="If different from legal name" value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">IRC Tax Identification Number (TIN)</label>
              <Input placeholder="e.g. 501234567" value={form.businessNumber} onChange={(e) => set("businessNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">GST Registration Number</label>
              <Input value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Industry</label>
            <Input placeholder="e.g. Retail, Construction, Mining Services" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Website</label>
            <Input placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <textarea rows={3} placeholder="Street, City, Province, Papua New Guinea"
              value={form.address} onChange={(e) => set("address", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Regional Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="PGK">PGK — Papua New Guinea Kina</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Timezone</label>
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="Pacific/Port_Moresby">Port Moresby (AEST+0)</option>
                <option value="Australia/Brisbane">Brisbane</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Financial Year End</label>
              <select value={form.financialYearEnd} onChange={(e) => set("financialYearEnd", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}