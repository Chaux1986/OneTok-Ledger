"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRightCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface QuoteLine {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
  accountName: string | null;
}

interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  expiryDate: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  terms: string | null;
  customerName?: string;
  convertedInvoiceId: string | null;
  lines: QuoteLine[];
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "info" | "secondary"> = {
  converted: "success",
  accepted: "success",
  sent: "info",
  declined: "destructive",
  expired: "destructive",
  draft: "secondary",
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newInvoiceId, setNewInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/sales/quotes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setQuote(d.quote);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const convert = async () => {
    setConverting(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/v1/sales/quotes/${id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      setSuccess(`Converted to invoice ${data.invoice.invoiceNumber} and posted to the ledger`);
      setNewInvoiceId(data.invoice.id);
      setQuote((prev) => prev ? { ...prev, status: "converted", convertedInvoiceId: data.invoice.id } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!quote) return <div className="p-8 text-slate-500">Quote not found.</div>;

  const canConvert = quote.status !== "converted" && quote.status !== "declined" && quote.status !== "expired";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales/quotes">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{quote.quoteNumber}</h1>
            <p className="text-slate-500">{quote.customerName || "Customer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[quote.status] || "secondary"}>{quote.status}</Badge>
          {canConvert && (
            <Button onClick={convert} disabled={converting}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              {converting ? "Converting..." : "Convert to Invoice"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}</span>
          {newInvoiceId && (
            <Link href={`/dashboard/sales/invoices/${newInvoiceId}`}>
              <Button size="sm" variant="outline">View Invoice</Button>
            </Link>
          )}
        </div>
      )}

      {quote.convertedInvoiceId && !success && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <span>This quote has already been converted to an invoice.</span>
          <Link href={`/dashboard/sales/invoices/${quote.convertedInvoiceId}`}>
            <Button size="sm" variant="outline">View Invoice</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Quote Date</span>
              <span className="font-medium">{quote.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Expires</span>
              <span className="font-medium">{quote.expiryDate}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono">K {parseFloat(quote.subtotal || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST</span>
              <span className="font-mono">K {parseFloat(quote.taxTotal || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total</span>
              <span className="font-mono">K {parseFloat(quote.total || "0").toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {quote.lines && quote.lines.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Account</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quote.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-2">{line.description}</td>
                    <td className="py-2 text-slate-500">{line.accountName || (
                      <span className="text-amber-600">Not set</span>
                    )}</td>
                    <td className="py-2 text-right font-mono">{parseFloat(line.quantity).toFixed(0)}</td>
                    <td className="py-2 text-right font-mono">K {parseFloat(line.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">K {parseFloat(line.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {quote.notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}