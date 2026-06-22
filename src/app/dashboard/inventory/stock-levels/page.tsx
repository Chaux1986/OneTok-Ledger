"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit3, X, CheckCircle2, AlertCircle, Loader2, Boxes } from "lucide-react";

interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  productSku: string;
  productName: string;
  productUnit: string;
  costPrice: string;
  warehouseCode: string;
  warehouseName: string;
}

export default function StockLevelsPage() {
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<StockLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/stock-levels");
      const data = await res.json();
      setLevels(data.stockLevels || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = "PGK";
  const totalValue = levels.reduce((s, l) => s + parseFloat(l.quantity || "0") * parseFloat(l.costPrice || "0"), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Levels</h1>
        <p className="text-slate-500">Quantity on hand by product and warehouse</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Stock Lines</p>
            <p className="text-2xl font-bold">{levels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Value (Cost)</p>
            <p className="text-2xl font-bold">K {totalValue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock on Hand</CardTitle>
          <CardDescription>Click adjust to correct a quantity — the value difference posts to the ledger automatically</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : levels.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Boxes className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No stock recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value (Cost)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono">{l.productSku}</TableCell>
                    <TableCell className="font-medium">{l.productName}</TableCell>
                    <TableCell>{l.warehouseCode} — {l.warehouseName}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(l.quantity).toFixed(0)} {l.productUnit}</TableCell>
                    <TableCell className="text-right font-mono">
                      K {(parseFloat(l.quantity) * parseFloat(l.costPrice || "0")).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setAdjusting(l)}>
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {adjusting && (
        <AdjustModal level={adjusting} onClose={() => setAdjusting(null)} onSuccess={() => { setAdjusting(null); load(); }} />
      )}
    </div>
  );
}

function AdjustModal({ level, onClose, onSuccess }: { level: StockLevel; onClose: () => void; onSuccess: () => void }) {
  const [newQuantity, setNewQuantity] = useState(level.quantity);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const oldQty = parseFloat(level.quantity);
  const newQty = parseFloat(newQuantity || "0");
  const diff = newQty - oldQty;
  const valueDiff = diff * parseFloat(level.costPrice || "0");

  const submit = async () => {
    if (!reason) { setError("Reason is required"); return; }
    if (isNaN(newQty) || newQty < 0) { setError("Enter a valid quantity"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/inventory/stock-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: level.productId,
          warehouseId: level.warehouseId,
          newQuantity: newQuantity,
          reason,
          date,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");
      setSuccess("Stock adjusted" + (data.journalId ? " and posted to the ledger" : ""));
      setTimeout(onSuccess, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !loading && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Adjust Stock</h3>
            <p className="text-xs text-slate-500">{level.productName} · {level.warehouseName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
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
            <label className="text-xs font-medium text-slate-600">Current Quantity</label>
            <p className="font-mono text-sm text-slate-500">{oldQty.toFixed(0)} {level.productUnit}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">New Quantity</label>
            <input
              type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)}
              min="0" step="1"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Reason</label>
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stocktake count, damaged goods"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {Math.abs(diff) > 0 && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {diff > 0 ? "Increase" : "Decrease"} of {Math.abs(diff).toFixed(0)} units · Value impact: K {Math.abs(valueDiff).toFixed(2)}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Edit3 className="mr-1.5 h-3.5 w-3.5" />}
            {loading ? "Saving..." : "Save Adjustment"}
          </Button>
        </div>
      </div>
    </div>
  );
}