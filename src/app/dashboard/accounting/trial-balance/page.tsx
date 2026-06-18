import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chartOfAccounts, journalLines, journals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"];
const TYPE_LABELS: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};
const DEBIT_NORMAL = ["asset", "expense"];

async function getTrialBalance(tenantId: string) {
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
    .leftJoin(
      journals,
      and(
        eq(journals.id, journalLines.journalId),
        eq(journals.tenantId, tenantId)
      )
    )
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isActive, true)
      )
    )
    .groupBy(
      chartOfAccounts.id,
      chartOfAccounts.code,
      chartOfAccounts.name,
      chartOfAccounts.accountType,
      chartOfAccounts.accountSubtype,
      chartOfAccounts.openingBalance
    )
    .orderBy(chartOfAccounts.code);

  const accounts = rows
    .map((row) => {
      const opening = parseFloat(row.openingBalance || "0");
      const debit = parseFloat(row.totalDebit);
      const credit = parseFloat(row.totalCredit);
      const isDebitNormal = DEBIT_NORMAL.includes(row.accountType);
      const netMovement = debit - credit;
      const balance = isDebitNormal ? opening + netMovement : opening - netMovement;

      return {
        ...row,
        totalDebit: debit,
        totalCredit: credit,
        balance,
        trialDebit: isDebitNormal && balance > 0 ? balance : 0,
        trialCredit: !isDebitNormal && balance > 0 ? balance : 0,
      };
    })
    .filter((a) => a.totalDebit > 0 || a.totalCredit > 0);

  const totalDebit = accounts.reduce((s, a) => s + a.trialDebit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.trialCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { accounts, totalDebit, totalCredit, isBalanced };
}

export default async function TrialBalancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { accounts, totalDebit, totalCredit, isBalanced } =
    await getTrialBalance(session.tenant.id);

  const currency = session.tenant.currency || "PGK";
  const grouped = TYPE_ORDER.reduce<Record<string, typeof accounts>>(
    (acc, type) => {
      acc[type] = accounts.filter((a) => a.accountType === type);
      return acc;
    },
    {}
  );

  const today = new Date().toLocaleDateString("en-PG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trial Balance</h1>
          <p className="text-slate-500">As at {today}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Balance Status */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          isBalanced
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        {isBalanced ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600" />
        )}
        <div>
          <p
            className={`font-medium ${
              isBalanced ? "text-emerald-900" : "text-red-900"
            }`}
          >
            {isBalanced
              ? "Ledger is in balance"
              : "Ledger is out of balance"}
          </p>
          <p
            className={`text-sm ${
              isBalanced ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {isBalanced
              ? `Total debits and credits both equal ${formatCurrency(totalDebit, currency)}`
              : `Difference of ${formatCurrency(Math.abs(totalDebit - totalCredit), currency)} detected`}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={isBalanced ? "success" : "destructive"}>
            {isBalanced ? "✓ Balanced" : "✗ Unbalanced"}
          </Badge>
        </div>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{session.tenant.name}</CardTitle>
          <CardDescription>
            Trial Balance — {today} — All amounts in {currency}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-medium text-slate-600 w-24">
                  Code
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Account Name
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600 w-36">
                  Debit
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600 w-36">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {TYPE_ORDER.map((type) => {
                const typeAccounts = grouped[type];
                if (!typeAccounts?.length) return null;

                const typeDebit = typeAccounts.reduce(
                  (s, a) => s + a.trialDebit,
                  0
                );
                const typeCredit = typeAccounts.reduce(
                  (s, a) => s + a.trialCredit,
                  0
                );

                return (
                  <tbody key={type}>
                    {/* Section header */}
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td
                        colSpan={4}
                        className="px-6 py-2 font-semibold text-slate-700 text-xs uppercase tracking-wide"
                      >
                        {TYPE_LABELS[type]}
                      </td>
                    </tr>

                    {/* Account rows */}
                    {typeAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-2.5 font-mono text-slate-500 text-xs">
                          {account.code}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">
                          {account.name}
                        </td>
                        <td className="px-6 py-2.5 text-right font-mono text-slate-900">
                          {account.trialDebit > 0
                            ? account.trialDebit.toFixed(2)
                            : ""}
                        </td>
                        <td className="px-6 py-2.5 text-right font-mono text-slate-900">
                          {account.trialCredit > 0
                            ? account.trialCredit.toFixed(2)
                            : ""}
                        </td>
                      </tr>
                    ))}

                    {/* Section subtotal */}
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td colSpan={2} className="px-6 py-2 text-right text-xs font-medium text-slate-500">
                        {TYPE_LABELS[type]} subtotal
                      </td>
                      <td className="px-6 py-2 text-right font-mono text-sm font-medium text-slate-700">
                        {typeDebit > 0 ? typeDebit.toFixed(2) : ""}
                      </td>
                      <td className="px-6 py-2 text-right font-mono text-sm font-medium text-slate-700">
                        {typeCredit > 0 ? typeCredit.toFixed(2) : ""}
                      </td>
                    </tr>
                  </tbody>
                );
              })}
            </tbody>

            {/* Grand totals */}
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50">
                <td
                  colSpan={2}
                  className="px-6 py-4 font-bold text-slate-900 uppercase tracking-wide text-sm"
                >
                  Total
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(totalDebit, currency)}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(totalCredit, currency)}
                </td>
              </tr>
              {!isBalanced && (
                <tr className="bg-red-50">
                  <td
                    colSpan={2}
                    className="px-6 py-2 text-right text-sm font-medium text-red-700"
                  >
                    Difference
                  </td>
                  <td
                    colSpan={2}
                    className="px-6 py-2 text-right font-mono text-sm font-bold text-red-700"
                  >
                    {formatCurrency(Math.abs(totalDebit - totalCredit), currency)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Summary by type */}
      <div className="grid gap-4 md:grid-cols-5">
        {TYPE_ORDER.map((type) => {
          const typeAccounts = grouped[type] || [];
          const total = typeAccounts.reduce((s, a) => s + a.balance, 0);
          return (
            <Card key={type}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {TYPE_LABELS[type]}
                </p>
                <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {total.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {typeAccounts.length} accounts
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}