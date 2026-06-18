"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface PayrollRun {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: string;
  totalGross: string | null;
  totalTax: string | null;
  totalNasfund: string | null;
  totalNambawan: string | null;
  totalNet: string | null;
}

interface Payslip {
  id: string;
  employeeName: string | null;
  employeeLastName: string | null;
  employeeNumber: string | null;
  grossPay: string;
  basePay: string;
  ircTax: string;
  nasfundEmployee: string;
  nambawanEmployee: string;
  netPay: string;
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRun, setSelectedRun] = useState<(PayrollRun & { payslips: Payslip[] }) | null>(null);
  const [form, setForm] = useState({
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/payroll");
    setRuns(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    load();
  };

  const viewPayslips = async (id: string) => {
    const res = await fetch(`/api/payroll/${id}`);
    const data = await res.json();
    setSelectedRun(data);
    setShowDetail(true);
  };

  const finalizeRun = async (id: string) => {
    await fetch(`/api/payroll/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finalized" }),
    });
    load();
  };

  const fmt = (v: string | null) =>
    v ? new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v)) : "K0.00";

  return (
    <>
      <PageHeader
        title="Payroll Runs"
        description="Process payroll with PNG IRC tax, Nasfund & Nambawan Super calculations"
        action={
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Run Payroll
          </button>
        }
      />

      {/* Payroll Info Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">IRC Tax Rate</p>
          <p className="text-sm font-medium text-slate-700 mt-1">0% (≤K769) → 22% → 30% → 35% → 40% → 42%</p>
          <p className="text-[10px] text-slate-400 mt-1">Fortnightly resident rates</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Nasfund Contributions</p>
          <p className="text-sm font-medium text-slate-700 mt-1">Employee: 6% · Employer: 8.4%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Nambawan Super</p>
          <p className="text-sm font-medium text-slate-700 mt-1">Employee: 6% · Employer: 8.4%</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Period</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Pay Date</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Gross</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">IRC Tax</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Super</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Net</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No payroll runs yet. Run your first payroll.</td></tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{r.payPeriodStart} → {r.payPeriodEnd}</td>
                  <td className="px-4 py-3 text-slate-600">{r.payDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(r.totalGross)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(r.totalTax)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmt(parseFloat(r.totalNasfund || "0") + parseFloat(r.totalNambawan || "0") + "")}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(r.totalNet)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => viewPayslips(r.id)} className="text-indigo-600 hover:text-indigo-700 text-xs">View</button>
                    {r.status === "draft" && (
                      <button onClick={() => finalizeRun(r.id)} className="text-green-600 hover:text-green-700 text-xs">Finalize</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Payroll Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Run Payroll">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-slate-500">This will calculate payslips for all active employees using PNG IRC tax tables, Nasfund, and Nambawan Super rates.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period Start *</label>
              <input type="date" required value={form.payPeriodStart} onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period End *</label>
              <input type="date" required value={form.payPeriodEnd} onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Date *</label>
            <input type="date" required value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Process Payroll</button>
          </div>
        </form>
      </Modal>

      {/* Payslip Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Payslips — ${selectedRun?.payPeriodStart || ""} to ${selectedRun?.payPeriodEnd || ""}`} wide>
        {selectedRun?.payslips && selectedRun.payslips.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Employee</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Gross</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">IRC Tax</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Nasfund</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Nambawan</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedRun.payslips.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">{p.employeeName} {p.employeeLastName}</td>
                  <td className="px-3 py-2 text-right">{fmt(p.grossPay)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmt(p.ircTax)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(p.nasfundEmployee)}</td>
                  <td className="px-3 py-2 text-right text-purple-600">{fmt(p.nambawanEmployee)}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(p.netPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400">No payslips in this run.</p>
        )}
      </Modal>
    </>
  );
}
