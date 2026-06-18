import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chartOfAccounts, journalLines, journals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

async function getPnLBalances(tenantId: string) {
  const rows = await db
    .select({
      id: chartOfAccounts.id,
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      accountType: chartOfAccounts.accountType,
      accountSubtype: chartOfAccounts.accountSubtype,
      totalDebit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.debit} AS NUMERIC) ELSE 0 END), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.credit} AS NUMERIC) ELSE 0 END), 0)`,
    })
    .from(chartOfAccounts)
    .leftJoin(journalLines, eq(journalLines.accountId, chartOfAccounts.id))
    .leftJoin(journals, and(eq(journals.id, journalLines.journalId), eq(journals.tenantId, tenantId)))
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isActive, true),
        sql`${chartOfAccounts.accountType} IN ('revenue', 'expense')`
      )
    )
    .groupBy(
      chartOfAccounts.id,
      chartOfAccounts.code,
      chartOfAccounts.name,
      chartOfAccounts.accountType,
      chartOfAccounts.accountSubtype
    )
    .orderBy(chartOfAccounts.code);

  return rows
    .map((row) => {
      const debit = parseFloat(row.totalDebit);
      const credit = parseFloat(row.totalCredit);
      // Revenue is credit-normal, expense is debit-normal
      const balance = row.accountType === "revenue" ? credit - debit : debit - credit;
      return { ...row, balance };
    })
    .filter((a) => a.balance !== 0);
}

const SUBTYPE_LABELS: Record<string, string> = {
  operating_revenue: "Operating Revenue",
  other_revenue: "Other Revenue",
  cost_of_sales: "Cost of Sales",
  operating_expense: "Operating Expenses",
  other_expense: "Other Expenses",
};

export default async function ProfitLossPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const balances = await getPnLBalances(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const operatingRevenue = balances.filter((b) => b.accountSubtype === "operating_revenue");
  const otherRevenue = balances.filter((b) => b.accountSubtype === "other_revenue");
  const costOfSales = balances.filter((b) => b.accountSubtype === "cost_of_sales");
  const operatingExpenses = balances.filter((b) => b.accountSubtype === "operating_expense");
  const otherExpenses = balances.filter((b) => b.accountSubtype === "other_expense");

  const totalOperatingRevenue = operatingRevenue.reduce((s, a) => s + a.balance, 0);
  const totalOtherRevenue = otherRevenue.reduce((s, a) => s + a.balance, 0);
  const totalRevenue = totalOperatingRevenue + totalOtherRevenue;

  const totalCostOfSales = costOfSales.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalOperatingRevenue - totalCostOfSales;
  const grossMargin = totalOperatingRevenue > 0 ? (grossProfit / totalOperatingRevenue) * 100 : 0;

  const totalOperatingExpenses = operatingExpenses.reduce((s, a) => s + a.balance, 0);
  const operatingProfit = grossProfit - totalOperatingExpenses;

  const totalOtherExpenses = otherExpenses.reduce((s, a) => s + a.balance, 0);
  const netProfit = operatingProfit + totalOtherRevenue - totalOtherExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const today = new Date();
  const periodLabel = today.toLocaleDateString("en-PG", { month: "long", year: "numeric" });

  const Row = ({ label, value, indent = false, bold = false, border = false }: {
    label: string; value: number; indent?: boolean; bold?: boolean; border?: boolean;
  }) => (
    <div className={`flex justify-between py-1.5 text-sm ${border ? "border-t border-slate-100 pt-2" : ""} ${bold ? "font-semibold text-slate-900" : "text-slate-700"} ${indent ? "pl-4" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(value, currency)}</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Statement</h1>
          <p className="text-slate-500">For {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/accounting/reports/balance-sheet">
            <Button variant="outline" size="sm">View Balance Sheet</Button>
          </Link>
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* Headline cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(grossProfit, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">{grossMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Net Profit</p>
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netProfit, currency)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{netMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{session.tenant.name}</CardTitle></CardHeader>
        <CardContent>
          {/* Revenue */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Revenue</p>
          {operatingRevenue.map((a) => <Row key={a.id} label={a.name} value={a.balance} indent />)}
          <Row label="Total Operating Revenue" value={totalOperatingRevenue} bold border />

          {/* COGS */}
          {costOfSales.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Cost of Sales</p>
              {costOfSales.map((a) => <Row key={a.id} label={a.name} value={a.balance} indent />)}
              <Row label="Total Cost of Sales" value={totalCostOfSales} bold border />
            </>
          )}

          <Row label="Gross Profit" value={grossProfit} bold border />

          {/* Operating Expenses */}
          {operatingExpenses.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Operating Expenses</p>
              {operatingExpenses.map((a) => <Row key={a.id} label={a.name} value={a.balance} indent />)}
              <Row label="Total Operating Expenses" value={totalOperatingExpenses} bold border />
            </>
          )}

          <Row label="Operating Profit" value={operatingProfit} bold border />

          {/* Other income/expense */}
          {(otherRevenue.length > 0 || otherExpenses.length > 0) && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Other Income & Expenses</p>
              {otherRevenue.map((a) => <Row key={a.id} label={a.name} value={a.balance} indent />)}
              {otherExpenses.map((a) => <Row key={a.id} label={a.name} value={-a.balance} indent />)}
            </>
          )}

          <div className="flex justify-between pt-3 mt-2 border-t-2 border-slate-300 text-lg font-bold">
            <span className={netProfit >= 0 ? "text-emerald-700" : "text-red-700"}>Net Profit</span>
            <span className={`font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCurrency(netProfit, currency)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}