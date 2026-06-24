"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, FileCheck } from "lucide-react";

interface EmployeeRow {
  employeeNumber: string;
  name: string;
  taxNumber: string | null;
  missingTaxNumber: boolean;
  grossPay: number;
  salaryTax: number;
  payRunCount: number;
}

interface ReportData {
  tenant: { name?: string; businessNumber?: string };
  period: { startDate: string; endDate: string };
  employees: EmployeeRow[];
  totalGross: number;
  totalTax: number;
  employeeCount: number;
  missingTaxNumberCount: number;
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
}

export default function IrcReportPage() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(lastOfMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll/reports/irc?startDate=${startDate}&endDate=${endDate}`);
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IRC Salary & Wages Tax Report</h1>
          <p className="text-slate-500">SWT withheld, ready for remittance to the Internal Revenue Commission</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Period</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 max-w-md">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-slate-500 py-8 text-center">Loading...</p>
      ) : data ? (
        <>
          {data.missingTaxNumberCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                {data.missingTaxNumberCount} employee(s) are missing an IRC Tax File Number — add it on their employee record before lodging.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Employees</p>
                <p className="text-2xl font-bold">{data.employeeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Total Gross Pay</p>
                <p className="text-2xl font-bold">K {data.totalGross.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">SWT to Remit</p>
                <p className="text-2xl font-bold text-emerald-700">K {data.totalTax.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{data.tenant.name}</CardTitle>
              <CardDescription>
                IRC TIN: {data.tenant.businessNumber || "Not set"} · Period {data.period.startDate} to {data.period.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.employees.length === 0 ? (
                <p className="py-8 text-center text-slate-400">No payroll runs found in this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-4 py-2">Employee #</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Tax File Number</th>
                      <th className="px-4 py-2 text-right">Gross Pay</th>
                      <th className="px-4 py-2 text-right">SWT Withheld</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((e) => (
                      <tr key={e.employeeNumber} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-mono">{e.employeeNumber}</td>
                        <td className="px-4 py-2">{e.name}</td>
                        <td className="px-4 py-2">
                          {e.taxNumber || (
                            <Badge variant="warning">Missing</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{e.grossPay.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-mono">{e.salaryTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                      <td colSpan={3} className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right font-mono">{data.totalGross.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">{data.totalTax.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileCheck className="h-4 w-4" />
            This figure reflects SWT actually withheld through payroll for the selected period — cross-check against the IRC's current monthly SWT remittance form before lodging.
          </div>
        </>
      ) : null}
    </div>
  );
}