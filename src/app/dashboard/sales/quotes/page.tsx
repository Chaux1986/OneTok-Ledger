"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText } from "lucide-react";

interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  expiryDate: string;
  status: string;
  total: string;
  customerName: string;
  customerCode: string;
  convertedInvoiceId: string | null;
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "info" | "secondary"> = {
  converted: "success",
  accepted: "success",
  sent: "info",
  declined: "destructive",
  expired: "destructive",
  draft: "secondary",
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/sales/quotes")
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes || []))
      .finally(() => setLoading(false));
  }, []);

  const totalValue = quotes.reduce((s, q) => s + parseFloat(q.total || "0"), 0);
  const convertedCount = quotes.filter((q) => q.status === "converted").length;
  const openCount = quotes.filter((q) => q.status === "sent" || q.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-500">Sales quotes and conversion to invoices</p>
        </div>
        <Link href="/dashboard/sales/quotes/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Quote</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Quoted</p>
            <p className="text-2xl font-bold">K {totalValue.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">{quotes.length} quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Open Quotes</p>
            <p className="text-2xl font-bold text-amber-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Converted to Invoice</p>
            <p className="text-2xl font-bold text-emerald-600">{convertedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
          <CardDescription>{quotes.length} quotes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading...</p>
          ) : quotes.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No quotes yet</p>
              <Link href="/dashboard/sales/quotes/new">
                <Button variant="link">Create your first quote</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/dashboard/sales/quotes/${q.id}`} className="hover:text-emerald-600 hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{q.customerName}</p>
                      <p className="text-xs text-slate-500">{q.customerCode}</p>
                    </TableCell>
                    <TableCell>{q.date}</TableCell>
                    <TableCell>{q.expiryDate}</TableCell>
                    <TableCell className="text-right font-mono">K {parseFloat(q.total || "0").toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[q.status] || "secondary"}>{q.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}