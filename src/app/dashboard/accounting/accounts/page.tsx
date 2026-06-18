import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chartOfAccounts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Plus, Download, Upload, Settings } from "lucide-react";
import Link from "next/link";
import { SetupAccountsButton } from "./setup-button";

async function getAccounts(tenantId: string) {
  return db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId))
    .orderBy(asc(chartOfAccounts.code));
}

export default async function ChartOfAccountsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const accounts = await getAccounts(session.tenant.id);

  const accountsByType = {
    asset: accounts.filter((a) => a.accountType === "asset"),
    liability: accounts.filter((a) => a.accountType === "liability"),
    equity: accounts.filter((a) => a.accountType === "equity"),
    revenue: accounts.filter((a) => a.accountType === "revenue"),
    expense: accounts.filter((a) => a.accountType === "expense"),
  };

  const totals = {
    asset: accountsByType.asset.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0
    ),
    liability: accountsByType.liability.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0
    ),
    equity: accountsByType.equity.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0
    ),
    revenue: accountsByType.revenue.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0
    ),
    expense: accountsByType.expense.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500">
            Manage your accounts structure for {session.tenant.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Link href="/dashboard/accounting/accounts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Setup Section if no accounts */}
      {accounts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">No Accounts Configured</h3>
            <p className="mt-2 text-slate-500 max-w-md mx-auto">
              Get started by setting up your chart of accounts. You can use our
              PNG-compliant default template or create custom accounts.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <SetupAccountsButton />
              <Link href="/dashboard/accounting/accounts/new">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Custom
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {accounts.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Assets</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totals.asset, session.tenant.currency || "PGK")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {accountsByType.asset.length} accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Liabilities</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.abs(totals.liability), session.tenant.currency || "PGK")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {accountsByType.liability.length} accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Equity</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(Math.abs(totals.equity), session.tenant.currency || "PGK")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {accountsByType.equity.length} accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(Math.abs(totals.revenue), session.tenant.currency || "PGK")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {accountsByType.revenue.length} accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Expenses</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(totals.expense, session.tenant.currency || "PGK")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {accountsByType.expense.length} accounts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>
                {accounts.length} accounts configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All ({accounts.length})</TabsTrigger>
                  <TabsTrigger value="asset">
                    Assets ({accountsByType.asset.length})
                  </TabsTrigger>
                  <TabsTrigger value="liability">
                    Liabilities ({accountsByType.liability.length})
                  </TabsTrigger>
                  <TabsTrigger value="equity">
                    Equity ({accountsByType.equity.length})
                  </TabsTrigger>
                  <TabsTrigger value="revenue">
                    Revenue ({accountsByType.revenue.length})
                  </TabsTrigger>
                  <TabsTrigger value="expense">
                    Expenses ({accountsByType.expense.length})
                  </TabsTrigger>
                </TabsList>

                {["all", "asset", "liability", "equity", "revenue", "expense"].map(
                  (type) => (
                    <TabsContent key={type} value={type}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Subtype</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(type === "all"
                            ? accounts
                            : accountsByType[type as keyof typeof accountsByType]
                          ).map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono font-medium">
                                {account.code}
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/dashboard/accounting/accounts/${account.id}`}
                                  className="hover:text-emerald-600 hover:underline"
                                >
                                  {account.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    account.accountType === "asset"
                                      ? "success"
                                      : account.accountType === "liability"
                                      ? "destructive"
                                      : account.accountType === "equity"
                                      ? "info"
                                      : account.accountType === "revenue"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {account.accountType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {account.accountSubtype?.replace(/_/g, " ") || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(
                                  account.currentBalance || "0",
                                  session.tenant.currency || "PGK"
                                )}
                              </TableCell>
                              <TableCell>
                                {account.isActive ? (
                                  <Badge variant="success">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  )
                )}
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
