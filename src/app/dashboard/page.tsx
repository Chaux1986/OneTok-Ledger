import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chartOfAccounts, invoices, bills, customers, suppliers, employees, journals } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData(tenantId: string) {
  // Get account balances by type
  const accountBalances = await db
    .select({
      accountType: chartOfAccounts.accountType,
      totalBalance: sql<string>`COALESCE(SUM(${chartOfAccounts.currentBalance}), 0)`,
    })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isActive, true)
      )
    )
    .groupBy(chartOfAccounts.accountType);

  const assets = parseFloat(
    accountBalances.find((b) => b.accountType === "asset")?.totalBalance || "0"
  );
  const liabilities = parseFloat(
    accountBalances.find((b) => b.accountType === "liability")?.totalBalance || "0"
  );
  const revenue = parseFloat(
    accountBalances.find((b) => b.accountType === "revenue")?.totalBalance || "0"
  );
  const expenses = parseFloat(
    accountBalances.find((b) => b.accountType === "expense")?.totalBalance || "0"
  );

  // Get counts
  const [invoiceStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      outstanding: sql<string>`COALESCE(SUM(${invoices.amountDue}), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));

  const [billStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      outstanding: sql<string>`COALESCE(SUM(${bills.amountDue}), 0)`,
    })
    .from(bills)
    .where(eq(bills.tenantId, tenantId));

  const [customerCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

  const [supplierCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(suppliers)
    .where(eq(suppliers.tenantId, tenantId));

  const [employeeCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));

  const [accountCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(chartOfAccounts)
    .where(
      and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true))
    );

  // Get recent journals
  const recentJournals = await db
    .select()
    .from(journals)
    .where(eq(journals.tenantId, tenantId))
    .orderBy(desc(journals.createdAt))
    .limit(5);

  // Get recent invoices
  const recentInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      status: invoices.status,
      dueDate: invoices.dueDate,
      customerName: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt))
    .limit(5);

  return {
    financials: {
      assets,
      liabilities,
      netAssets: assets - liabilities,
      revenue: Math.abs(revenue),
      expenses,
      netProfit: Math.abs(revenue) - expenses,
    },
    stats: {
      invoices: invoiceStats?.total || 0,
      invoicesOutstanding: parseFloat(invoiceStats?.outstanding || "0"),
      bills: billStats?.total || 0,
      billsOutstanding: parseFloat(billStats?.outstanding || "0"),
      customers: customerCount?.count || 0,
      suppliers: supplierCount?.count || 0,
      employees: employeeCount?.count || 0,
      accounts: accountCount?.count || 0,
    },
    recentJournals,
    recentInvoices,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await getDashboardData(session.tenant.id);
  const hasAccounts = data.stats.accounts > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session.user.firstName}
          </h1>
          <p className="text-slate-500">
            Here&apos;s what&apos;s happening with {session.tenant.name} today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/sales/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
          <Link href="/dashboard/accounting/journals/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New Journal
            </Button>
          </Link>
        </div>
      </div>

      {/* Setup Banner */}
      {!hasAccounts && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Complete your setup</p>
                <p className="text-sm text-amber-700">
                  Set up your chart of accounts to start tracking finances
                </p>
              </div>
            </div>
            <Link href="/dashboard/accounting/accounts">
              <Button variant="warning" size="sm">
                Set Up Accounts
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Assets</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.financials.assets, session.tenant.currency || "PGK")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-emerald-500" />
              <span className="text-emerald-600">+12.5%</span>
              <span className="ml-1 text-slate-500">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Net Profit</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.financials.netProfit, session.tenant.currency || "PGK")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {data.financials.netProfit >= 0 ? (
                <>
                  <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600">Profitable</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                  <span className="text-red-600">Loss</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Receivables</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.stats.invoicesOutstanding, session.tenant.currency || "PGK")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">{data.stats.invoices} invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Payables</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.stats.billsOutstanding, session.tenant.currency || "PGK")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">{data.stats.bills} bills</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.customers}</p>
              <p className="text-sm text-slate-500">Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.suppliers}</p>
              <p className="text-sm text-slate-500">Suppliers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.employees}</p>
              <p className="text-sm text-slate-500">Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.accounts}</p>
              <p className="text-sm text-slate-500">Accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Journals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Journals</CardTitle>
                <CardDescription>Latest accounting entries</CardDescription>
              </div>
              <Link href="/dashboard/accounting/journals">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentJournals.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Clock className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2">No journal entries yet</p>
                <Link href="/dashboard/accounting/journals/new">
                  <Button variant="link" size="sm">
                    Create your first journal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentJournals.map((journal) => (
                  <div
                    key={journal.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{journal.journalNumber}</p>
                      <p className="text-sm text-slate-500">
                        {journal.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(journal.totalDebit || "0", session.tenant.currency || "PGK")}
                      </p>
                      <Badge
                        variant={
                          journal.status === "posted"
                            ? "success"
                            : journal.status === "draft"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {journal.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest customer invoices</CardDescription>
              </div>
              <Link href="/dashboard/sales/invoices">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2">No invoices yet</p>
                <Link href="/dashboard/sales/invoices/new">
                  <Button variant="link" size="sm">
                    Create your first invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-slate-500">
                        {invoice.customerName || "Unknown Customer"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.total || "0", session.tenant.currency || "PGK")}
                      </p>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "success"
                            : invoice.status === "overdue"
                            ? "destructive"
                            : invoice.status === "sent"
                            ? "info"
                            : "secondary"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PNG Compliance Banner */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <span className="text-2xl">🇵🇬</span>
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900">PNG Tax Compliance</h3>
                <p className="text-sm text-emerald-700">
                  OneTok Ledger is compliant with IRC, Nasfund, and Nambawan Super requirements
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="success">IRC Ready</Badge>
              <Badge variant="success">Nasfund Ready</Badge>
              <Badge variant="success">Nambawan Ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
