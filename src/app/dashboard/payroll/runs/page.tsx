import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payrollRuns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Wallet } from "lucide-react";
import Link from "next/link";

async function getRuns(tenantId: string) {
  return db.select().from(payrollRuns).where(eq(payrollRuns.tenantId, tenantId)).orderBy(desc(payrollRuns.payDate));
}

export default async function PayrollRunsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const runs = await getRuns(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const totals = runs.reduce(
    (acc, r) => ({
      gross: acc.gross + parseFloat(r.totalGross || "0"),
      tax: acc.tax + parseFloat(r.totalTax || "0"),
      super: acc.super + parseFloat(r.totalSuper || "0"),
      net: acc.net + parseFloat(r.totalNet || "0"),
    }),
    { gross: 0, tax: 0, super: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pay Runs</h1>
          <p className="text-slate-500">Payroll history and PNG compliance totals</p>
        </div>
        <Link href="/dashboard/payroll/runs/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Pay Run</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Gross Paid</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.gross, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">SWT Withheld</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.tax, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Super Contributions</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.super, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Net Paid Out</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.net, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Run History</CardTitle>
          <CardDescription>{runs.length} payroll runs processed</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Wallet className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No payroll runs yet</p>
              <Link href="/dashboard/payroll/runs/new">
                <Button variant="link">Process your first pay run</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Run</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">SWT</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono font-medium">{run.payrollNumber}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(run.periodStart)} – {formatDate(run.periodEnd)}
                    </TableCell>
                    <TableCell>{formatDate(run.payDate)}</TableCell>
                    <TableCell className="text-right">{run.employeeCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(run.totalGross || "0", currency)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(run.totalTax || "0", currency)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(run.totalNet || "0", currency)}</TableCell>
                    <TableCell>
                      <Badge variant={run.status === "paid" || run.status === "approved" ? "success" : "secondary"}>
                        {run.status}
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