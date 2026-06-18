import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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
import { formatCurrency } from "@/lib/utils";
import { Plus, Download, Users } from "lucide-react";
import Link from "next/link";

async function getEmployees(tenantId: string) {
  return db
    .select()
    .from(employees)
    .where(eq(employees.tenantId, tenantId))
    .orderBy(asc(employees.lastName), asc(employees.firstName));
}

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Check permission
  if (!["owner", "admin", "payroll_officer"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const employeeList = await getEmployees(session.tenant.id);

  const activeCount = employeeList.filter((e) => e.isActive).length;
  const totalSalaries = employeeList
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + parseFloat(e.baseSalary || "0"), 0);

  const superFundCounts = employeeList.reduce(
    (acc, e) => {
      if (e.superFund === "nasfund") acc.nasfund++;
      else if (e.superFund === "nambawan") acc.nambawan++;
      return acc;
    },
    { nasfund: 0, nambawan: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">
            Manage employee records and payroll information
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/dashboard/payroll/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Active Employees</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Monthly Salaries</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalSalaries / 12, session.tenant.currency || "PGK")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Nasfund Members</p>
            <p className="text-2xl font-bold">{superFundCounts.nasfund}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Nambawan Members</p>
            <p className="text-2xl font-bold">{superFundCounts.nambawan}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            {employeeList.length} employees in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4">No employees yet</p>
              <Link href="/dashboard/payroll/employees/new">
                <Button variant="link">Add your first employee</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Super Fund</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeList.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/dashboard/payroll/employees/${employee.id}`}
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {employee.employeeNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>
                      {employee.superFund ? (
                        <Badge
                          variant={
                            employee.superFund === "nasfund"
                              ? "info"
                              : "success"
                          }
                        >
                          {employee.superFund === "nasfund"
                            ? "Nasfund"
                            : "Nambawan"}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(
                        employee.baseSalary || "0",
                        session.tenant.currency || "PGK"
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PNG Compliance Notice */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🇵🇬</span>
            <div>
              <h4 className="font-semibold text-emerald-900">
                PNG Payroll Compliance
              </h4>
              <p className="text-sm text-emerald-700">
                OneTok Ledger automatically calculates IRC Salary & Wages Tax,
                Nasfund (6% employee + 8.4% employer), and Nambawan Super
                contributions according to current PNG regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
