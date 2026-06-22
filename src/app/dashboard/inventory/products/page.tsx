import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, stockLevels } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Package, AlertTriangle } from "lucide-react";
import Link from "next/link";

async function getProducts(tenantId: string) {
  const list = await db.select().from(products).where(eq(products.tenantId, tenantId)).orderBy(asc(products.name));

  const withStock = await Promise.all(
    list.map(async (p) => {
      const levels = await db.select({ quantity: stockLevels.quantity }).from(stockLevels).where(eq(stockLevels.productId, p.id));
      const totalQuantity = levels.reduce((s, l) => s + parseFloat(l.quantity || "0"), 0);
      return { ...p, totalQuantity };
    })
  );

  return withStock;
}

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const list = await getProducts(session.tenant.id);
  const currency = session.tenant.currency || "PGK";

  const totalValue = list.reduce((s, p) => s + p.totalQuantity * parseFloat(p.costPrice || "0"), 0);
  const lowStockCount = list.filter((p) => p.totalQuantity <= (p.reorderLevel || 0) && p.reorderLevel && p.reorderLevel > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your product catalog and stock</p>
        </div>
        <Link href="/dashboard/inventory/products/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Product</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Products</p>
            <p className="text-2xl font-bold">{list.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Inventory Value (Cost)</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-amber-600" : ""}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>{list.length} products in catalog</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No products yet</p>
              <Link href="/dashboard/inventory/products/new">
                <Button variant="link">Add your first product</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const lowStock = p.reorderLevel && p.reorderLevel > 0 && p.totalQuantity <= p.reorderLevel;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-medium">
                        <Link href={`/dashboard/inventory/products/${p.id}`} className="hover:text-emerald-600 hover:underline">
                          {p.sku}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        {p.description && <p className="text-xs text-slate-500 truncate max-w-xs">{p.description}</p>}
                      </TableCell>
                      <TableCell>{p.category || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.costPrice || "0", currency)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.sellPrice || "0", currency)}</TableCell>
                      <TableCell className="text-right font-mono">{p.totalQuantity.toFixed(0)} {p.unit}</TableCell>
                      <TableCell>
                        {!p.isActive ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : lowStock ? (
                          <Badge variant="warning">
                            <AlertTriangle className="mr-1 h-3 w-3" />Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
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