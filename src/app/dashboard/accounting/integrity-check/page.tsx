"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

interface JournalIssue {
  type: "unbalanced" | "header_mismatch" | "no_lines";
  message: string;
}

interface JournalProblem {
  id: string;
  journalNumber: string;
  date: string;
  description: string | null;
  status: string;
  storedTotalDebit: number;
  storedTotalCredit: number;
  actualLineDebit: number;
  actualLineCredit: number;
  lineCount: number;
  issues: JournalIssue[];
}

interface CheckResult {
  checkedAt: string;
  totalJournals: number;
  journalsWithIssues: number;
  isHealthy: boolean;
  overallLedgerDebit: number;
  overallLedgerCredit: number;
  overallBalanced: boolean;
  problems: JournalProblem[];
}

const ISSUE_LABELS: Record<string, string> = {
  unbalanced: "Unbalanced journal",
  header_mismatch: "Header/line mismatch",
  no_lines: "No line items",
};

export default function IntegrityCheckPage() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/accounting/integrity-check");
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ledger Integrity Check</h1>
          <p className="text-slate-500">Scans every journal entry for balance and data consistency issues</p>
        </div>
        <Button variant="outline" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {loading ? "Scanning..." : "Run Check"}
        </Button>
      </div>

      {loading && !result ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-300" />
            <p className="mt-3">Scanning all journals...</p>
          </CardContent>
        </Card>
      ) : result ? (
        <>
          <div
            className={`flex items-center gap-3 rounded-lg border p-4 ${
              result.isHealthy ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}
          >
            {result.isHealthy ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className={`font-semibold ${result.isHealthy ? "text-emerald-900" : "text-red-900"}`}>
                {result.isHealthy
                  ? "Ledger is healthy — every journal balances"
                  : `${result.journalsWithIssues} journal(s) need attention`}
              </p>
              <p className={`text-sm ${result.isHealthy ? "text-emerald-700" : "text-red-700"}`}>
                Checked {result.totalJournals} journals · Last run {new Date(result.checkedAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant={result.isHealthy ? "success" : "destructive"}>
                {result.isHealthy ? "✓ Healthy" : "✗ Issues Found"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Journals Checked</p>
                <p className="text-2xl font-bold">{result.totalJournals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Ledger Total (Dr / Cr)</p>
                <p className="text-lg font-bold font-mono">
                  {result.overallLedgerDebit.toFixed(2)} / {result.overallLedgerCredit.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Overall Balance</p>
                <p className={`text-lg font-bold ${result.overallBalanced ? "text-emerald-600" : "text-red-600"}`}>
                  {result.overallBalanced ? "Balanced" : "Out of Balance"}
                </p>
              </CardContent>
            </Card>
          </div>

          {!result.isHealthy && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900">Problem Journals</CardTitle>
                <CardDescription>
                  Each entry below has a structural issue that should be corrected manually, ideally by adding the
                  missing line or fixing the account selected, then re-running this check.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.problems.map((p) => (
                  <div key={p.id} className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">{p.journalNumber}</span>
                        <Badge variant="secondary">{p.status}</Badge>
                        <span className="text-sm text-slate-500">{p.date}</span>
                      </div>
                    </div>
                    {p.description && <p className="text-sm text-slate-600 mb-2">{p.description}</p>}

                    <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                      <div>
                        <p className="text-slate-500">Stored header totals</p>
                        <p className="font-mono text-slate-800">
                          Dr {p.storedTotalDebit.toFixed(2)} / Cr {p.storedTotalCredit.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Actual line totals ({p.lineCount} lines)</p>
                        <p className="font-mono text-slate-800">
                          Dr {p.actualLineDebit.toFixed(2)} / Cr {p.actualLineCredit.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {p.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-red-800">{ISSUE_LABELS[issue.type]}:</span>{" "}
                            <span className="text-red-700">{issue.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}