"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Link2, CheckCircle2, AlertCircle, X, RefreshCw,
} from "lucide-react";

interface BankAccount {
  id: string;
  bankName: string;
  chartAccountId: string;
  chartAccountCode: string;
  chartAccountName: string;
  glBalance: string;
}

interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  reference: string | null;
  debit: string;
  credit: string;
  status: string;
}

interface GlLine {
  id: string;
  description: string | null;
  debit: string;
  credit: string;
  journalNumber: string;
  journalDate: string;
  journalDescription: string | null;
}

export default function ReconcileAccountPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [glLines, setGlLines] = useState<GlLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txDesc, setTxDesc] = useState("");
  const [txRef, setTxRef] = useState("");
  const [txDebit, setTxDebit] = useState("");
  const [txCredit, setTxCredit] = useState("");
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accRes = await fetch("/api/v1/banking/accounts");
      const accData = await accRes.json();
      const acc = (accData.bankAccounts || []).find((a: BankAccount) => a.id === id);
      setAccount(acc || null);

      const txRes = await fetch(`/api/v1/banking/transactions?bankAccountId=${id}&status=unreconciled`);
      const txData = await txRes.json();
      setTransactions(txData.transactions || []);

      if (acc) {
        const glRes = await fetch(`/api/v1/banking/gl-lines?chartAccountId=${acc.chartAccountId}`);
        const glData = await glRes.json();
        setGlLines(glData.lines || []);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTransaction = async () => {
    if (!txDesc || (!txDebit && !txCredit)) { setError("Description and an amount are required"); return; }
    setAdding(true); setError("");
    try {
      const res = await fetch("/api/v1/banking/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: id,
          transactionDate: txDate,
          description: txDesc,
          reference: txRef,
          debit: txDebit || "0",
          credit: txCredit || "0",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add transaction");
      setTxDesc(""); setTxRef(""); setTxDebit(""); setTxCredit("");
      setShowAddForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setAdding(false);
    }
  };

  const matchSelected = async () => {
    if (!selectedTx || !selectedLine) return;
    setMatching(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/v1/banking/transactions/${selectedTx}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalLineId: selectedLine }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match failed");
      setSuccess("Matched and reconciled");
      setSelectedTx(null);
      setSelectedLine(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setMatching(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!account) return <div className="p-8 text-slate-500">Bank account not found.</div>;

  const selectedTxObj = transactions.find((t) => t.id === selectedTx);
  const selectedLineObj = glLines.find((l) => l.id === selectedLine);
  const amountsMatch =
    selectedTxObj && selectedLineObj &&
    Math.abs(parseFloat(selectedTxObj.debit) - parseFloat(selectedLineObj.debit)) < 0.01 &&
    Math.abs(parseFloat(selectedTxObj.credit) - parseFloat(selectedLineObj.credit)) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/banking/accounts">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{account.bankName}</h1>
            <p className="text-slate-500">{account.chartAccountCode} — {account.chartAccountName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Statement Line
          </Button>
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

      {showAddForm && (
        <Card className="border-emerald-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add Bank Statement Line</CardTitle>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Reference</label>
                <input type="text" value={txRef} onChange={(e) => setTxRef(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input type="text" value={txDesc} onChange={(e) => setTxDesc(e.target.value)}
                placeholder="As shown on the bank statement"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Money In (Debit)</label>
                <input type="number" value={txDebit} onChange={(e) => { setTxDebit(e.target.value); setTxCredit(""); }}
                  min="0" step="0.01" placeholder="0.00"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Money Out (Credit)</label>
                <input type="number" value={txCredit} onChange={(e) => { setTxCredit(e.target.value); setTxDebit(""); }}
                  min="0" step="0.01" placeholder="0.00"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={addTransaction} disabled={adding}>
                {adding ? "Adding..." : "Add Line"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match action bar */}
      {(selectedTx || selectedLine) && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sticky top-0 z-10">
          <div className="text-sm text-emerald-800">
            {selectedTx && selectedLine ? (
              <span className={amountsMatch ? "" : "text-red-700 font-medium"}>
                {amountsMatch ? "Amounts match — ready to reconcile" : "Amounts don't match — select different items"}
              </span>
            ) : (
              <span>Select one bank line and one GL line to match them</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTx(null); setSelectedLine(null); }}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={matchSelected}
              disabled={!selectedTx || !selectedLine || !amountsMatch || matching}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {matching ? "Matching..." : "Match & Reconcile"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bank statement side */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Statement</CardTitle>
            <CardDescription>{transactions.length} unreconciled lines</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No unreconciled bank lines</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <label
                    key={tx.id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      selectedTx === tx.id ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bank-tx"
                        checked={selectedTx === tx.id}
                        onChange={() => setSelectedTx(tx.id)}
                        className="h-4 w-4 text-emerald-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                        <p className="text-xs text-slate-500">{tx.transactionDate} {tx.reference && `· ${tx.reference}`}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm">
                      {parseFloat(tx.debit) > 0 ? (
                        <span className="text-emerald-600">+{parseFloat(tx.debit).toFixed(2)}</span>
                      ) : (
                        <span className="text-red-600">-{parseFloat(tx.credit).toFixed(2)}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GL side */}
        <Card>
          <CardHeader>
            <CardTitle>General Ledger</CardTitle>
            <CardDescription>{glLines.length} unreconciled posted lines</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {glLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No unreconciled GL lines</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {glLines.map((line) => (
                  <label
                    key={line.id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      selectedLine === line.id ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="gl-line"
                        checked={selectedLine === line.id}
                        onChange={() => setSelectedLine(line.id)}
                        className="h-4 w-4 text-emerald-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {line.description || line.journalDescription || "—"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{line.journalNumber} · {line.journalDate}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm">
                      {parseFloat(line.debit) > 0 ? (
                        <span className="text-emerald-600">+{parseFloat(line.debit).toFixed(2)}</span>
                      ) : (
                        <span className="text-red-600">-{parseFloat(line.credit).toFixed(2)}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}