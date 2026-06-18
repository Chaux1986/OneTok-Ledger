import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices, customers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Download, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getInvoices(tenantId: string) {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      dueDate: invoices.dueDate,
      status: invoices.status,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountDue: invoices.amountDue,
      customerName: customers.name,
      customerCode: customers.code,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.date), desc(invoices.createdAt))
    .limit(100);
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "info" | "secondary"> = {
  paid: "success",
  overdue: "destructive",
  sent: "info",
  partial: "warning",
  draft: "secondary",
  void: "secondary",
};

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const invoiceList = await getInvoices(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const totals = invoiceList.reduce(
    (acc, inv) => ({
      outstanding: acc.outstanding + parseFloat(inv.amountDue || "0"),
      overdue: acc.overdue + (inv.status === "overdue" ? parseFloat(inv.amountDue || "0") : 0),
      total: acc.total + parseFloat(inv.total || "0"),
    }),
    { outstanding: 0, overdue: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage customer invoices and receivables</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Link href="/dashboard/sales/invoices/new">
            <Button><Plus className="mr-2 h-4 w-4" />New Invoice</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.total, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">{invoiceList.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.outstanding, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">Amount due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.overdue, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>{invoiceList.length} invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No invoices yet</p>
              <Link href="/dashboard/sales/invoices/new">
                <Button variant="link">Create your first invoice</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/dashboard/sales/invoices/${inv.id}`} className="hover:text-emerald-600 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{inv.customerName}</p>
                      <p className="text-xs text-slate-500">{inv.customerCode}</p>
                    </TableCell>
                    <TableCell>{inv.date ? formatDate(inv.date) : "-"}</TableCell>
                    <TableCell>
                      <span className={inv.status === "overdue" ? "text-red-600 font-medium" : ""}>
                        {inv.dueDate ? formatDate(inv.dueDate) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(inv.total || "0", currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(inv.amountDue || "0") > 0
                        ? formatCurrency(inv.amountDue || "0", currency)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.status || "draft"] || "secondary"}>
                        {inv.status}
                      </Badge>
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