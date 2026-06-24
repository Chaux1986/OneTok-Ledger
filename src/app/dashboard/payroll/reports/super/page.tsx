"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface EmployeeRow {
  employeeNumber: string;
  name: string;
  superFund: string | null;
  memberNumber: string | null;
  missingMemberNumber: boolean;
  grossPay: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  payRunCount: number;
}

interface FundSummary {
  employees: EmployeeRow[];
  totalGross: number;
  totalEmployee: number;
  totalEmployer: number;
  total: number;
}

interface ReportData {
  tenant: { name?: string; businessNumber?: string };
  period: { startDate: string; endDate: string };
  nasfund: FundSummary;
  nambawan: FundSummary;
  grandTotal: number;
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
}

function FundTable({ title, fund, color }: { title: string; fund: FundSummary; color: "info" | "success" }) {
  const missing = fund.employees.filter((e) => e.missingMemberNumber).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge variant={color}>{fund.employees.length} members</Badge>
        </div>
        <CardDescription>Employee 6% + Employer 8.4% = 14.4% of gross pay</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {missing > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {missing} member(s) missing a super member number
          </div>
        )}
        {fund.employees.length === 0 ? (
          <p className="py-8 text-center text-slate-400">No members in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Member #</th>
                <th className="px-4 py-2 text-right">Gross Pay</th>
                <th className="px-4 py-2 text-right">Employee 6%</th>
                <th className="px-4 py-2 text-right">Employer 8.4%</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {fund.employees.map((e) => (
                <tr key={e.employeeNumber} className="border-b border-slate-50">
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">
                    {e.memberNumber || <Badge variant="warning">Missing</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{e.grossPay.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.employeeContribution.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.employerContribution.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">{e.totalContribution.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                <td colSpan={2} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono">{fund.totalGross.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{fund.totalEmployee.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{fund.totalEmployer.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{fund.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperReportPage() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(lastOfMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll/reports/super?startDate=${startDate}&endDate=${endDate}`);
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Superannuation Contribution Report</h1>
          <p className="text-slate-500">Nasfund and Nambawan Super, ready for remittance</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Nasfund Total</p>
                <p className="text-2xl font-bold">K {data.nasfund.total.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Nambawan Total</p>
                <p className="text-2xl font-bold">K {data.nambawan.total.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Grand Total</p>
                <p className="text-2xl font-bold text-emerald-700">K {data.grandTotal.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <FundTable title="Nasfund" fund={data.nasfund} color="info" />
          <FundTable title="Nambawan Super" fund={data.nambawan} color="success" />
        </>
      ) : null}
    </div>
  );
}