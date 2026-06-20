"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  billId: string;
  billNumber: string;
  amountDue: number;
  currency: string;
}

export function BillPayButton({ billId, billNumber, amountDue, currency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [amount, setAmount] = useState(amountDue.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");

  if (amountDue <= 0) return null;

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/v1/purchasing/bills/${billId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentDate, paymentMethod, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setSuccess(`Recorded — bill is now ${data.bill.status}`);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
        Pay
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !loading && setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Pay Supplier</h3>
                <p className="text-xs text-slate-500">{billNumber} · Due {currency} {amountDue.toFixed(2)}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />{success}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Amount ({currency})</label>
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  min="0.01" max={amountDue} step="0.01"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  <input
                    type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Method</label>
                  <select
                    value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Reference</label>
                <input
                  type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank ref, cheque no."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CreditCard className="mr-1.5 h-3.5 w-3.5" />}
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}