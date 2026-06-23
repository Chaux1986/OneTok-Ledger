"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";

interface AssetPreview {
  id: string;
  assetNumber: string;
  name: string;
  purchasePrice: string;
  accumulatedDepreciation: string;
  usefulLife: number | null;
  monthlyDepreciation: number;
  fullyDepreciated: boolean;
  hasAccounts: boolean;
}

export default function DepreciationRunPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetPreview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/v1/assets/depreciation")
      .then((r) => r.json())
      .then((d) => {
        const list: AssetPreview[] = d.assets || [];
        setAssets(list);
        setSelected(new Set(list.filter((a) => a.monthlyDepreciation > 0 && a.hasAccounts).map((a) => a.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const eligible = assets.filter((a) => a.monthlyDepreciation > 0.01 && a.hasAccounts);
  const totalSelected = assets.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.monthlyDepreciation, 0);

  const run = async () => {
    if (selected.size === 0) { setError("Select at least one asset"); return; }
    setRunning(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDate, assetIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Depreciation run failed");
      setSuccess(`Posted K${data.totalDepreciation} depreciation across ${data.assetsProcessed} asset(s) — journal ${data.journal.journalNumber}`);
      setTimeout(() => router.push("/dashboard/assets/register"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Depreciation run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assets/register">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Run Depreciation</h1>
          <p className="text-slate-500">Post straight-line depreciation for this period</p>
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
        <CardHeader><CardTitle>Period Date</CardTitle></CardHeader>
        <CardContent>
          <input
            type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)}
            className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets Due for Depreciation</CardTitle>
          <CardDescription>{eligible.length} of {assets.length} active assets have depreciation to post</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading...</p>
          ) : assets.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No active assets found.</p>
          ) : (
            <div className="space-y-2">
              {assets.map((a) => {
                const disabled = a.monthlyDepreciation <= 0.01 || !a.hasAccounts;
                return (
                  <label
                    key={a.id}
                    className={`flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 ${
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => !disabled && toggle(a.id)}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{a.assetNumber} — {a.name}</p>
                        <p className="text-xs text-slate-500">
                          {a.fullyDepreciated
                            ? "Fully depreciated"
                            : !a.hasAccounts
                            ? "Missing GL account mapping — edit asset to set Depreciation Expense and Accumulated Depreciation accounts"
                            : `${a.usefulLife} month useful life`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-slate-700">K{a.monthlyDepreciation.toFixed(2)}</p>
                      {a.fullyDepreciated && <Badge variant="secondary">Done</Badge>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <TrendingDown className="h-4 w-4" />
          Total depreciation to post: <span className="font-mono font-semibold">K{totalSelected.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/assets/register"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={run} disabled={running || selected.size === 0}>
          <Play className="mr-2 h-4 w-4" />
          {running ? "Posting..." : `Post Depreciation (${selected.size})`}
        </Button>
      </div>
    </div>
  );
}