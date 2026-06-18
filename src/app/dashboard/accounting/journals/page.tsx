"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

function newLine(): JournalLine {
  return {
    id: crypto.randomUUID(),
    accountId: "",
    description: "",
    debit: "",
    credit: "",
  };
}

export default function NewJournalPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()]);

  // Load accounts
  useEffect(() => {
    fetch("/api/v1/accounting/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => setError("Failed to load accounts"));
  }, []);

  // Totals
  const totalDebit = lines.reduce(
    (sum, l) => sum + parseFloat(l.debit || "0"),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + parseFloat(l.credit || "0"),
    0
  );
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const updateLine = useCallback(
    (id: string, field: keyof JournalLine, value: string) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const updated = { ...l, [field]: value };
          // Clear the opposite field when entering debit or credit
          if (field === "debit" && value) updated.credit = "";
          if (field === "credit" && value) updated.debit = "";
          return updated;
        })
      );
    },
    []
  );

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const formatNumber = (val: string) => {
    const n = parseFloat(val);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };

  const submit = async (post: boolean) => {
    setError("");
    setSuccess("");

    // Validate
    const filledLines = lines.filter((l) => l.accountId);
    if (filledLines.length < 2) {
      setError("At least 2 lines with accounts are required");
      return;
    }
    if (!isBalanced) {
      setError(
        `Journal does not balance. Difference: ${difference.toFixed(2)}`
      );
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/accounting/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description,
          reference,
          post,
          lines: filledLines.map((l) => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit || "0",
            credit: l.credit || "0",
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save journal");

      setSuccess(
        `Journal ${data.journal.journalNumber} ${post ? "posted" : "saved as draft"} successfully`
      );
      setTimeout(() => router.push("/dashboard/accounting/journals"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save journal");
    } finally {
      setLoading(false);
    }
  };

  const groupedAccounts = accounts.reduce<Record<string, Account[]>>(
    (acc, account) => {
      const type = account.accountType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    },
    {}
  );

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/accounting/journals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              New Journal Entry
            </h1>
            <p className="text-slate-500">
              Create a double-entry accounting journal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => submit(false)}
            disabled={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => submit(true)}
            disabled={loading || !isBalanced}
          >
            <Send className="mr-2 h-4 w-4" />
            Post Journal
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Header Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Reference
              </label>
              <Input
                placeholder="e.g. INV-001, PO-042"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <Input
                placeholder="Journal description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Journal Lines</CardTitle>
              <CardDescription>
                Each journal must have equal debits and credits
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left font-medium text-slate-500 w-[35%]">
                    Account
                  </th>
                  <th className="pb-2 text-left font-medium text-slate-500 w-[25%]">
                    Description
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[15%]">
                    Debit (PGK)
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[15%]">
                    Credit (PGK)
                  </th>
                  <th className="pb-2 w-[5%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="group">
                    <td className="py-2 pr-3">
                      <select
                        value={line.accountId}
                        onChange={(e) =>
                          updateLine(line.id, "accountId", e.target.value)
                        }
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">— Select account —</option>
                        {Object.entries(typeLabels).map(([type, label]) =>
                          groupedAccounts[type]?.length ? (
                            <optgroup key={type} label={label}>
                              {groupedAccounts[type].map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} — {acc.name}
                                </option>
                              ))}
                            </optgroup>
                          ) : null
                        )}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.id, "description", e.target.value)
                        }
                        placeholder="Line description"
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(line.id, "debit", e.target.value)
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(line.id, "credit", e.target.value)
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 2}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals */}
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td
                    colSpan={2}
                    className="pt-3 text-right text-sm font-medium text-slate-600"
                  >
                    Totals
                  </td>
                  <td className="pt-3 pr-3 text-right font-mono font-semibold text-slate-900">
                    {totalDebit.toFixed(2)}
                  </td>
                  <td className="pt-3 pr-3 text-right font-mono font-semibold text-slate-900">
                    {totalCredit.toFixed(2)}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={2} className="pt-1 text-right text-sm text-slate-500">
                    Difference
                  </td>
                  <td
                    colSpan={2}
                    className={`pt-1 pr-3 text-right font-mono text-sm font-medium ${
                      isBalanced ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isBalanced ? (
                      <span className="flex items-center justify-end gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Balanced
                      </span>
                    ) : (
                      difference.toFixed(2)
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add another line
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance indicator */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-500">
            Total Debit:{" "}
            <span className="font-mono font-semibold text-slate-900">
              K {totalDebit.toFixed(2)}
            </span>
          </span>
          <span className="text-slate-500">
            Total Credit:{" "}
            <span className="font-mono font-semibold text-slate-900">
              K {totalCredit.toFixed(2)}
            </span>
          </span>
        </div>
        <div>
          {isBalanced ? (
            <Badge variant="success">✓ Balanced</Badge>
          ) : totalDebit === 0 && totalCredit === 0 ? (
            <Badge variant="secondary">Enter amounts</Badge>
          ) : (
            <Badge variant="destructive">
              Out of balance by K {difference.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/accounting/journals">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => submit(false)}
          disabled={loading}
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
        <Button
          onClick={() => submit(true)}
          disabled={loading || !isBalanced}
          className={isBalanced ? "" : "opacity-50"}
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Posting..." : "Post Journal"}
        </Button>
      </div>
    </div>
  );
}