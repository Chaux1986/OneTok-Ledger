import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chartOfAccounts, journalLines, journals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

const DEBIT_NORMAL = ["asset", "expense"];

async function getBalances(tenantId: string, asOfDate?: string) {
  const dateFilter = asOfDate
    ? and(eq(journals.tenantId, tenantId), eq(journals.status, "posted"), sql`${journals.date} <= ${asOfDate}`)
    : and(eq(journals.tenantId, tenantId), eq(journals.status, "posted"));

  const rows = await db
    .select({
      id: chartOfAccounts.id,
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      accountType: chartOfAccounts.accountType,
      accountSubtype: chartOfAccounts.accountSubtype,
      openingBalance: chartOfAccounts.openingBalance,
      totalDebit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.debit} AS NUMERIC) ELSE 0 END), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.credit} AS NUMERIC) ELSE 0 END), 0)`,
    })
    .from(chartOfAccounts)
    .leftJoin(journalLines, eq(journalLines.accountId, chartOfAccounts.id))
    .leftJoin(journals, and(eq(journals.id, journalLines.journalId), eq(journals.tenantId, tenantId)))
    .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true)))
    .groupBy(
      chartOfAccounts.id,
      chartOfAccounts.code,
      chartOfAccounts.name,
      chartOfAccounts.accountType,
      chartOfAccounts.accountSubtype,
      chartOfAccounts.openingBalance
    )
    .orderBy(chartOfAccounts.code);

  return rows
    .map((row) => {
      const opening = parseFloat(row.openingBalance || "0");
      const debit = parseFloat(row.totalDebit);
      const credit = parseFloat(row.totalCredit);
      const isDebitNormal = DEBIT_NORMAL.includes(row.accountType);
      const netMovement = debit - credit;
      const balance = isDebitNormal ? opening + netMovement : opening - netMovement;
      return { ...row, balance };
    })
    .filter((a) => a.balance !== 0);
}

const SUBTYPE_LABELS: Record<string, string> = {
  current_asset: "Current Assets",
  fixed_asset: "Fixed Assets",
  current_liability: "Current Liabilities",
  long_term_liability: "Long-Term Liabilities",
  equity: "Equity",
};

export default async function BalanceSheetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const balances = await getBalances(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const assets = balances.filter((b) => b.accountType === "asset");
  const liabilities = balances.filter((b) => b.accountType === "liability");
  const equity = balances.filter((b) => b.accountType === "equity");
  const revenue = balances.filter((b) => b.accountType === "revenue");
  const expenses = balances.filter((b) => b.accountType === "expense");

  // Retained earnings = current period net income, rolled into equity
  const netIncome = revenue.reduce((s, a) => s + Math.abs(a.balance), 0) - expenses.reduce((s, a) => s + a.balance, 0);

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquityBase = equity.reduce((s, a) => s + a.balance, 0);
  const totalEquity = totalEquityBase + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  const groupBySubtype = (accounts: typeof assets) => {
    const groups: Record<string, typeof assets> = {};
    for (const acc of accounts) {
      const key = acc.accountSubtype || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(acc);
    }
    return groups;
  };

  const today = new Date().toLocaleDateString("en-PG", { day: "numeric", month: "long", year: "numeric" });

  const renderSection = (accounts: typeof assets, isNegativeDisplay = false) => {
    const grouped = groupBySubtype(accounts);
    return Object.entries(grouped).map(([subtype, accs]) => (
      <div key={subtype} className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          {SUBTYPE_LABELS[subtype] || subtype}
        </p>
        {accs.map((acc) => (
          <div key={acc.id} className="flex justify-between py-1.5 text-sm border-b border-slate-50">
            <span className="text-slate-700">{acc.name}</span>
            <span className="font-mono text-slate-900">
              {formatCurrency(isNegativeDisplay ? Math.abs(acc.balance) : acc.balance, currency)}
            </span>
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
          <p className="text-slate-500">As at {today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/accounting/reports/profit-loss">
            <Button variant="outline" size="sm">View P&L</Button>
          </Link>
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>
      </div>

      <div className={`flex items-center gap-3 rounded-lg border p-4 ${isBalanced ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        {isBalanced ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
        <div>
          <p className={`font-medium ${isBalanced ? "text-emerald-900" : "text-red-900"}`}>
            {isBalanced ? "Balance sheet balances" : "Balance sheet does not balance"}
          </p>
          <p className={`text-sm ${isBalanced ? "text-emerald-700" : "text-red-700"}`}>
            Assets {formatCurrency(totalAssets, currency)} {isBalanced ? "=" : "≠"} Liabilities + Equity {formatCurrency(totalLiabilitiesAndEquity, currency)}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={isBalanced ? "success" : "destructive"}>{isBalanced ? "✓ Balanced" : "✗ Unbalanced"}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No asset balances</p>
            ) : (
              renderSection(assets)
            )}
            <div className="flex justify-between pt-3 border-t-2 border-slate-200 font-bold text-slate-900">
              <span>Total Assets</span>
              <span className="font-mono">{formatCurrency(totalAssets, currency)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities + Equity */}
        <Card>
          <CardHeader><CardTitle>Liabilities & Equity</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-slate-700 mb-2">Liabilities</p>
            {liabilities.length === 0 ? (
              <p className="text-sm text-slate-400 py-2 mb-2">No liability balances</p>
            ) : (
              renderSection(liabilities)
            )}
            <div className="flex justify-between py-2 border-t border-slate-100 font-medium text-slate-800 mb-4">
              <span>Total Liabilities</span>
              <span className="font-mono">{formatCurrency(totalLiabilities, currency)}</span>
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-2">Equity</p>
            {equity.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No equity balances</p>
            ) : (
              renderSection(equity)
            )}
            <div className="flex justify-between py-1.5 text-sm border-b border-slate-50">
              <span className="text-slate-700">Current Year Earnings</span>
              <span className="font-mono text-slate-900">{formatCurrency(netIncome, currency)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-100 font-medium text-slate-800 mb-4">
              <span>Total Equity</span>
              <span className="font-mono">{formatCurrency(totalEquity, currency)}</span>
            </div>

            <div className="flex justify-between pt-3 border-t-2 border-slate-200 font-bold text-slate-900">
              <span>Total Liabilities & Equity</span>
              <span className="font-mono">{formatCurrency(totalLiabilitiesAndEquity, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}