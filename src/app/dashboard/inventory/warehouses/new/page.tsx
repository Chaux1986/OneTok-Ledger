"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NewWarehousePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const submit = async () => {
    if (!name) { setError("Name is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create warehouse");
      setSuccess(`Warehouse ${data.warehouse.code} created`);
      setTimeout(() => router.push("/dashboard/inventory/warehouses"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventory/warehouses">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Warehouse</h1>
          <p className="text-slate-500">Add a storage location</p>
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
        <CardHeader><CardTitle>Warehouse Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <Input placeholder="e.g. Port Moresby Main Store" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <textarea
              rows={3}
              placeholder="Street, City, Province, Papua New Guinea"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/inventory/warehouses"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save Warehouse"}
        </Button>
      </div>
    </div>
  );
}