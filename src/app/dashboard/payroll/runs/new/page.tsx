"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, AlertCircle, CheckCircle2, Calculator } from "lucide-react";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string | null;
  baseSalary: string;
  salaryType: string;
  superFund: string | null;
}

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 13);

  const [periodStart, setPeriodStart] = useState(fourteenDaysAgo.toISOString().split("T")[0]);
  const [periodEnd, setPeriodEnd] = useState(today.toISOString().split("T")[0]);
  const [payDate, setPayDate] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/v1/payroll/employees")
      .then((r) => r.json())
      .then((d) => {
        setEmployees(d.employees || []);
        setSelected(new Set((d.employees || []).map((e: Employee) => e.id)));
      });
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Simple fortnightly gross preview (does not replicate exact tax calc, just an estimate for UI)
  const estimateFortnightly = (emp: Employee) => {
    const salary = parseFloat(emp.baseSalary || "0");
    if (emp.salaryType === "annual") return salary / 26;
    if (emp.salaryType === "monthly") return (salary * 12) / 26;
    return salary;
  };

  const selectedEmployees = employees.filter((e) => selected.has(e.id));
  const totalGrossEstimate = selectedEmployees.reduce((s, e) => s + estimateFortnightly(e), 0);

  const submit = async () => {
    if (selected.size === 0) { setError("Select at least one employee"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart, periodEnd, payDate,
          employeeIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process payroll");
      setSuccess(`Payroll ${data.payrollRun.payrollNumber} processed for ${selected.size} employee(s)`);
      setTimeout(() => router.push("/dashboard/payroll/runs"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/payroll/employees">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Payroll Run</h1>
          <p className="text-slate-500">Calculate SWT, Nasfund/Nambawan, and process payslips</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Pay Period</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Pay Date</label>
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Employees</CardTitle>
          <CardDescription>{selected.size} of {employees.length} selected · Est. gross K{totalGrossEstimate.toFixed(2)}</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p>No active employees found.</p>
              <Link href="/dashboard/payroll/employees/new">
                <Button variant="link">Add an employee first</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(emp.id)}
                      onChange={() => toggle(emp.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-slate-500">{emp.employeeNumber} · {emp.position || "No position set"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-slate-700">K{estimateFortnightly(emp).toFixed(2)} / fortnight</p>
                    {emp.superFund && (
                      <Badge variant={emp.superFund === "nasfund" ? "info" : "success"}>
                        {emp.superFund === "nasfund" ? "Nasfund" : "Nambawan"}
                      </Badge>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calculator className="h-4 w-4" />
          SWT, Nasfund (6%/8.4%), and Nambawan Super will be calculated automatically per employee
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/payroll/employees"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading || selected.size === 0}>
          <Play className="mr-2 h-4 w-4" />
          {loading ? "Processing..." : `Process Payroll (${selected.size})`}
        </Button>
      </div>
    </div>
  );
}