"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  notes: string | null;
  terms: string | null;
  customerName?: string;
  reference?: string;
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "info" | "secondary"> = {
  paid: "success", overdue: "destructive", sent: "info", partial: "warning", draft: "secondary", void: "secondary",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    fetch(`/api/v1/sales/invoices/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setInvoice(d.invoice);
        setPaymentAmount(d.invoice?.amountDue || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const recordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { setError("Enter a valid payment amount"); return; }
    setPaying(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/v1/sales/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentDate,
          paymentMethod,
          reference: paymentRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setSuccess(`Payment of K${parseFloat(paymentAmount).toFixed(2)} recorded. Invoice is now ${data.invoice.status}.`);
      setInvoice((prev) => prev ? { ...prev, ...data.invoice } : prev);
      setShowPayment(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!invoice) return <div className="p-8 text-slate-500">Invoice not found.</div>;

  const amountDue = parseFloat(invoice.amountDue || "0");
  const canPay = invoice.status !== "paid" && invoice.status !== "void" && amountDue > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales/invoices">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
            <p className="text-slate-500">{invoice.customerName || "Customer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[invoice.status] || "secondary"}>{invoice.status}</Badge>
          {canPay && (
            <Button onClick={() => setShowPayment(true)}>
              <CreditCard className="mr-2 h-4 w-4" />Record Payment
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
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice Date</span>
              <span className="font-medium">{invoice.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Due Date</span>
              <span className={`font-medium ${invoice.status === "overdue" ? "text-red-600" : ""}`}>{invoice.dueDate}</span>
            </div>
            {invoice.reference && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reference</span>
                <span className="font-medium">{invoice.reference}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono">K {parseFloat(invoice.subtotal || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST</span>
              <span className="font-mono">K {parseFloat(invoice.taxTotal || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total</span>
              <span className="font-mono">K {parseFloat(invoice.total || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-mono text-emerald-600">K {parseFloat(invoice.amountPaid || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className={amountDue > 0 ? "text-amber-700" : "text-emerald-700"}>Amount Due</span>
              <span className={`font-mono ${amountDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                K {amountDue.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showPayment && (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Amount due: K{amountDue.toFixed(2)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Amount (PGK) <span className="text-red-500">*</span></label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01" max={amountDue} step="0.01"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Payment Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Reference</label>
                <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Bank ref, cheque no."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
              <Button onClick={recordPayment} disabled={paying}>
                <CreditCard className="mr-2 h-4 w-4" />
                {paying ? "Recording..." : `Record K${parseFloat(paymentAmount || "0").toFixed(2)} Payment`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}    