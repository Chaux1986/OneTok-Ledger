import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assets, employees } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Building2 } from "lucide-react";
import Link from "next/link";

async function getAssets(tenantId: string) {
  return db
    .select({
      id: assets.id,
      assetNumber: assets.assetNumber,
      name: assets.name,
      category: assets.category,
      purchaseDate: assets.purchaseDate,
      purchasePrice: assets.purchasePrice,
      currentValue: assets.currentValue,
      accumulatedDepreciation: assets.accumulatedDepreciation,
      usefulLife: assets.usefulLife,
      status: assets.status,
      assignedFirstName: employees.firstName,
      assignedLastName: employees.lastName,
    })
    .from(assets)
    .leftJoin(employees, eq(assets.assignedTo, employees.id))
    .where(eq(assets.tenantId, tenantId))
    .orderBy(asc(assets.assetNumber));
}

export default async function AssetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const list = await getAssets(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const totalCost = list.reduce((s, a) => s + parseFloat(a.purchasePrice || "0"), 0);
  const totalAccumDep = list.reduce((s, a) => s + parseFloat(a.accumulatedDepreciation || "0"), 0);
  const totalNetValue = list.reduce((s, a) => s + parseFloat(a.currentValue || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Register</h1>
          <p className="text-slate-500">Fixed assets and depreciation tracking</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/assets/depreciation">
            <Button variant="outline">Run Depreciation</Button>
          </Link>
          <Link href="/dashboard/assets/register/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCost, currency)}</p>
            <p className="text-xs text-slate-400 mt-1">{list.length} assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Accumulated Depreciation</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalAccumDep, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Net Book Value</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalNetValue, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
          <CardDescription>{list.length} fixed assets</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No assets registered yet</p>
              <Link href="/dashboard/assets/register/new">
                <Button variant="link">Add your first asset</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Accum. Depr.</TableHead>
                  <TableHead className="text-right">Net Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-medium">{a.assetNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{a.name}</p>
                      {a.assignedFirstName && (
                        <p className="text-xs text-slate-500">Assigned: {a.assignedFirstName} {a.assignedLastName}</p>
                      )}
                    </TableCell>
                    <TableCell>{a.category || "-"}</TableCell>
                    <TableCell>{a.purchaseDate ? formatDate(a.purchaseDate) : "-"}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(a.purchasePrice || "0", currency)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {formatCurrency(a.accumulatedDepreciation || "0", currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(a.currentValue || "0", currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "active" ? "success" : "secondary"}>{a.status}</Badge>
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