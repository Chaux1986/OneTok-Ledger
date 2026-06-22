import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { warehouses, stockLevels, products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import Link from "next/link";

async function getWarehouses(tenantId: string) {
  const list = await db.select().from(warehouses).where(eq(warehouses.tenantId, tenantId)).orderBy(asc(warehouses.name));

  const withCounts = await Promise.all(
    list.map(async (wh) => {
      const items = await db
        .select({ quantity: stockLevels.quantity })
        .from(stockLevels)
        .innerJoin(products, eq(products.id, stockLevels.productId))
        .where(eq(stockLevels.warehouseId, wh.id));

      const totalUnits = items.reduce((s, i) => s + parseFloat(i.quantity || "0"), 0);
      return { ...wh, skuCount: items.length, totalUnits };
    })
  );

  return withCounts;
}

export default async function WarehousesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const list = await getWarehouses(session.tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouses</h1>
          <p className="text-slate-500">Storage locations for inventory</p>
        </div>
        <Link href="/dashboard/inventory/warehouses/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Warehouse</Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <WarehouseIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4">No warehouses set up yet</p>
            <Link href="/dashboard/inventory/warehouses/new">
              <Button variant="link">Add your first warehouse</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {list.map((wh) => (
            <Card key={wh.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{wh.name}</CardTitle>
                  <Badge variant={wh.isActive ? "success" : "secondary"}>{wh.code}</Badge>
                </div>
                {wh.address && <CardDescription>{wh.address}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">SKUs stocked</span>
                  <span className="font-medium">{wh.skuCount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Total units</span>
                  <span className="font-mono font-medium">{wh.totalUnits.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}