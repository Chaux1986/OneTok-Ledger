"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/modal";

interface LeaveRequest {
  id: string;
  employeeName: string | null;
  employeeLastName: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  status: string;
  approvedBy: string | null;
}

interface Employee { id: string; firstName: string; lastName: string; }

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "annual",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });

  const load = useCallback(async () => {
    const [r, e] = await Promise.all([
      fetch("/api/leave").then((x) => x.json()),
      fetch("/api/employees").then((x) => x.json()),
    ]);
    setRequests(r);
    setEmployees(e);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedBy: "Admin" }),
    });
    load();
  };

  const leaveTypeLabels: Record<string, string> = {
    annual: "🏖️ Annual",
    sick: "🤒 Sick",
    maternity: "🤱 Maternity",
    paternity: "👨‍👧 Paternity",
    compassionate: "💐 Compassionate",
    unpaid: "📝 Unpaid",
  };

  return (
    <>
      <PageHeader
        title="Leave Management"
        description="PNG leave entitlements: 14 days annual, 14 days sick, 6 weeks maternity"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Request Leave
          </button>
        }
      />

      {/* Leave Entitlements Info */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { type: "Annual", days: "14 days", icon: "🏖️" },
          { type: "Sick", days: "14 days", icon: "🤒" },
          { type: "Maternity", days: "42 days", icon: "🤱" },
          { type: "Paternity", days: "5 days", icon: "👨‍👧" },
          { type: "Compassionate", days: "5 days", icon: "💐" },
          { type: "Unpaid", days: "As needed", icon: "📝" },
        ].map((l) => (
          <div key={l.type} className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
            <span className="text-xl">{l.icon}</span>
            <p className="text-xs font-medium text-slate-700 mt-1">{l.type}</p>
            <p className="text-xs text-slate-400">{l.days}/yr</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Period</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Days</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reason</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No leave requests yet.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.employeeName} {r.employeeLastName}</td>
                  <td className="px-4 py-3">{leaveTypeLabels[r.leaveType] || r.leaveType}</td>
                  <td className="px-4 py-3 text-slate-600">{r.startDate} → {r.endDate}</td>
                  <td className="px-4 py-3 text-slate-600">{r.days}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.reason || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 space-x-2">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => updateStatus(r.id, "approved")} className="text-green-600 hover:text-green-700 text-xs">Approve</button>
                        <button onClick={() => updateStatus(r.id, "rejected")} className="text-red-500 hover:text-red-700 text-xs">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
            <select required value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="compassionate">Compassionate Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End *</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Days *</label>
              <input type="number" step="0.5" required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Submit Request</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
