"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface Customer { id: string; code: string; name: string; paymentTermDays: number; }
interface Account { id: string; code: string; name: string; accountType: string; }
interface QuoteLine {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  accountId: string;
}

function newLine(): QuoteLine {
  return { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "", taxRate: "10", accountId: "" };
}

export default function NewQuotePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("This quote is valid for 30 days from the date of issue.");
  const [lines, setLines] = useState<QuoteLine[]>([newLine()]);

  useEffect(() => {
    fetch("/api/v1/sales/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || []));
    fetch("/api/v1/accounting/accounts").then((r) => r.json()).then((d) =>
      setAccounts((d.accounts || []).filter((a: Account) => a.accountType === "revenue"))
    );
  }, []);

  const updateLine = (id: string, field: keyof QuoteLine, value: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const lineCalcs = lines.map((l) => {
    const qty = parseFloat(l.quantity || "0");
    const price = parseFloat(l.unitPrice || "0");
    const taxRate = parseFloat(l.taxRate || "0");
    const subtotal = qty * price;
    const taxAmount = subtotal * (taxRate / 100);
    return { subtotal, taxAmount, lineTotal: subtotal + taxAmount };
  });

  const subtotal = lineCalcs.reduce((s, l) => s + l.subtotal, 0);
  const taxTotal = lineCalcs.reduce((s, l) => s + l.taxAmount, 0);
  const total = subtotal + taxTotal;

  const submit = async (send: boolean) => {
    if (!customerId) { setError("Please select a customer"); return; }
    if (!date || !expiryDate) { setError("Date and expiry date are required"); return; }
    const filledLines = lines.filter((l) => l.description && l.unitPrice);
    if (filledLines.length === 0) { setError("At least one line item is required"); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/sales/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId, date, expiryDate, reference, notes, terms,
          status: send ? "sent" : "draft",
          lines: filledLines.map((l, i) => ({
            description: l.description,
            quantity: l.quantity || "1",
            unitPrice: l.unitPrice,
            taxRate: l.taxRate || "0",
            accountId: l.accountId || undefined,
            sortOrder: i,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quote");
      setSuccess(`Quote ${data.quote.quoteNumber} ${send ? "sent" : "saved"} successfully`);
      setTimeout(() => router.push("/dashboard/sales/quotes"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales/quotes">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Quote</h1>
            <p className="text-slate-500">Create a sales quote</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => submit(false)} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />Save Draft
          </Button>
          <Button onClick={() => submit(true)} disabled={loading}>
            <Send className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save & Send"}
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

      <Card>
        <CardHeader><CardTitle>Quote Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Customer <span className="text-red-500">*</span></label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Reference</label>
              <Input placeholder="e.g. RFQ-001" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Quote Date <span className="text-red-500">*</span></label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Expiry Date <span className="text-red-500">*</span></label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>What you're quoting for</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="mr-2 h-4 w-4" />Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left font-medium text-slate-500 w-[30%]">Description</th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[10%]">Qty</th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[15%]">Unit Price</th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[10%]">GST %</th>
                  <th className="pb-2 text-left font-medium text-slate-500 w-[25%]">Account</th>
                  <th className="pb-2 text-right font-medium text-slate-500 w-[10%]">Total</th>
                  <th className="pb-2 w-[5%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lines.map((line, idx) => {
                  const calc = lineCalcs[idx];
                  return (
                    <tr key={line.id} className="group">
                      <td className="py-2 pr-3">
                        <input type="text" value={line.description}
                          onChange={(e) => updateLine(line.id, "description", e.target.value)}
                          placeholder="Description of goods or services"
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                          min="0" step="1"
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                          min="0" step="0.01" placeholder="0.00"
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="py-2 pr-3">
                        <select value={line.taxRate}
                          onChange={(e) => updateLine(line.id, "taxRate", e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                          <option value="0">0%</option>
                          <option value="10">10% GST</option>
                          <option value="15">15% GST</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select value={line.accountId}
                          onChange={(e) => updateLine(line.id, "accountId", e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                          <option value="">— Revenue account —</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-slate-900">
                        {calc.lineTotal.toFixed(2)}
                      </td>
                      <td className="py-2">
                        <button onClick={() => removeLine(line.id)} disabled={lines.length <= 1}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span className="font-mono">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>GST</span><span className="font-mono">{taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Total (PGK)</span><span className="font-mono text-lg">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Notes to Customer</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Terms</label>
            <textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/sales/quotes"><Button variant="ghost">Cancel</Button></Link>
        <Button variant="outline" onClick={() => submit(false)} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />Save Draft
        </Button>
        <Button onClick={() => submit(true)} disabled={loading}>
          <Send className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save & Send"}
        </Button>
      </div>
    </div>
  );
}