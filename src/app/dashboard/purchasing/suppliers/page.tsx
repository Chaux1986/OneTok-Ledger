import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Download, Truck, Mail, Phone } from "lucide-react";
import Link from "next/link";

async function getSuppliers(tenantId: string) {
  return db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).orderBy(asc(suppliers.name));
}

export default async function SuppliersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supplierList = await getSuppliers(session.tenant.id);
  const activeCount = supplierList.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-slate-500">Manage your supplier database and accounts payable</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Link href="/dashboard/purchasing/suppliers/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Suppliers</p>
            <p className="text-2xl font-bold">{supplierList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Active Suppliers</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Avg Payment Terms</p>
            <p className="text-2xl font-bold">
              {supplierList.length > 0
                ? Math.round(supplierList.reduce((s, c) => s + (c.paymentTermDays || 30), 0) / supplierList.length)
                : 0} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>{supplierList.length} suppliers in your database</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Truck className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No suppliers yet</p>
              <Link href="/dashboard/purchasing/suppliers/new">
                <Button variant="link">Add your first supplier</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tax Number</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierList.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/dashboard/purchasing/suppliers/${supplier.id}`} className="hover:text-emerald-600 hover:underline">
                        {supplier.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{supplier.name}</p>
                      {supplier.tradingName && <p className="text-sm text-slate-500">t/a {supplier.tradingName}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Mail className="h-3 w-3" />{supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Phone className="h-3 w-3" />{supplier.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.taxNumber || "-"}</TableCell>
                    <TableCell>{supplier.paymentTermDays} days</TableCell>
                    <TableCell className="text-sm">
                      {supplier.bankName ? (
                        <div>
                          <p>{supplier.bankName}</p>
                          <p className="text-slate-500 font-mono text-xs">{supplier.bankAccount}</p>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {supplier.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
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