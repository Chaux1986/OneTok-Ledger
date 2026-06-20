import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bills, suppliers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Download, Receipt } from "lucide-react";
import Link from "next/link";
import { BillPayButton } from "@/components/payments/bill-pay-button";

async function getBills(tenantId: string) {
  return db
    .select({
      id: bills.id,
      billNumber: bills.billNumber,
      supplierInvoiceNumber: bills.supplierInvoiceNumber,
      date: bills.date,
      dueDate: bills.dueDate,
      status: bills.status,
      total: bills.total,
      amountPaid: bills.amountPaid,
      amountDue: bills.amountDue,
      supplierName: suppliers.name,
      supplierCode: suppliers.code,
    })
    .from(bills)
    .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
    .where(eq(bills.tenantId, tenantId))
    .orderBy(desc(bills.date), desc(bills.createdAt))
    .limit(100);
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  paid: "success",
  approved: "warning",
  partial: "warning",
  draft: "secondary",
  void: "secondary",
};

export default async function BillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const billList = await getBills(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const totals = billList.reduce(
    (acc, bill) => ({
      outstanding: acc.outstanding + parseFloat(bill.amountDue || "0"),
      total: acc.total + parseFloat(bill.total || "0"),
    }),
    { outstanding: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-500">Manage supplier bills and accounts payable</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Link href="/dashboard/purchasing/bills/new">
            <Button><Plus className="mr-2 h-4 w-4" />New Bill</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Billed</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.total, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">{billList.length} bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.outstanding, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">Amount payable</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Draft Bills</p>
            <p className="text-2xl font-bold">{billList.filter((b) => b.status === "draft").length}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>{billList.length} bills</CardDescription>
        </CardHeader>
        <CardContent>
          {billList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Receipt className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No bills yet</p>
              <Link href="/dashboard/purchasing/bills/new">
                <Button variant="link">Record your first bill</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Supplier Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billList.map((bill) => {
                  const amountDue = parseFloat(bill.amountDue || "0");
                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono font-medium">
                        <Link href={`/dashboard/purchasing/bills/${bill.id}`} className="hover:text-emerald-600 hover:underline">
                          {bill.billNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{bill.supplierName}</p>
                        <p className="text-xs text-slate-500">{bill.supplierCode}</p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{bill.supplierInvoiceNumber || "-"}</TableCell>
                      <TableCell>{bill.date ? formatDate(bill.date) : "-"}</TableCell>
                      <TableCell>{bill.dueDate ? formatDate(bill.dueDate) : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(bill.total || "0", currency)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {amountDue > 0 ? formatCurrency(bill.amountDue || "0", currency) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[bill.status || "draft"] || "secondary"}>{bill.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {amountDue > 0 && bill.status !== "draft" ? (
                          <BillPayButton
                            billId={bill.id}
                            billNumber={bill.billNumber}
                            amountDue={amountDue}
                            currency={currency}
                          />
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}