"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

export default function NewBankAccountPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [chartAccountId, setChartAccountId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("checking");

  useEffect(() => {
    fetch("/api/v1/accounting/accounts")
      .then((r) => r.json())
      .then((d) =>
        setAccounts((d.accounts || []).filter((a: Account) => a.accountType === "asset"))
      );
  }, []);

  const submit = async () => {
    if (!chartAccountId) { setError("Select a GL account"); return; }
    if (!bankName) { setError("Bank name is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/banking/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartAccountId, bankName, accountNumber, accountType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set up bank account");
      setSuccess("Bank account set up successfully");
      setTimeout(() => router.push("/dashboard/banking/accounts"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up bank account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/banking/accounts">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Set Up Bank Account</h1>
          <p className="text-slate-500">Link a GL cash account for reconciliation</p>
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
        <CardHeader>
          <CardTitle>Link to General Ledger</CardTitle>
          <CardDescription>
            Choose which GL account (e.g. Cash at Bank - BSP) this bank account corresponds to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">GL Account <span className="text-red-500">*</span></label>
            <select
              value={chartAccountId}
              onChange={(e) => setChartAccountId(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              <option value="">— Select asset account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Bank Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Bank South Pacific" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Account Number</label>
              <Input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1 max-w-xs">
            <label className="text-sm font-medium text-slate-700">Account Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/banking/accounts"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Set Up Account"}
        </Button>
      </div>
    </div>
  );
}