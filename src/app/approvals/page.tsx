"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";

interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  stepNumber: number;
  approverName: string;
  status: string;
  comments: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/approvals");
    setApprovals(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (id: string, status: string) => {
    const comments = status === "rejected" ? prompt("Reason for rejection:") : null;
    await fetch(`/api/approvals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comments }),
    });
    load();
  };

  const entityTypeLabels: Record<string, string> = {
    purchase_order: "📋 Purchase Order",
    leave_request: "🏖️ Leave Request",
    invoice: "📄 Invoice",
  };

  return (
    <>
      <PageHeader
        title="Approval Workflows"
        description="Review and approve pending requests across all modules"
      />

      {/* Pending Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{approvals.filter((a) => a.status === "pending").length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-xs text-green-600 font-medium">Approved</p>
          <p className="text-2xl font-bold text-green-700">{approvals.filter((a) => a.status === "approved").length}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-600 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-700">{approvals.filter((a) => a.status === "rejected").length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Step</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Approver</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Comments</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Created</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approvals.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No approval workflows yet. They are created automatically when POs or leave requests need approval.</td></tr>
            ) : (
              approvals.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{entityTypeLabels[a.entityType] || a.entityType}</td>
                  <td className="px-4 py-3 text-slate-600">Step {a.stepNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{a.approverName}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{a.comments || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 space-x-2">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => handleDecision(a.id, "approved")} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200">Approve</button>
                        <button onClick={() => handleDecision(a.id, "rejected")} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
