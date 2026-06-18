"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  baseSalary: string;
  salaryFrequency: string;
  hireDate: string;
  nasfundNumber: string | null;
  nambawanSuperNumber: string | null;
  isActive: boolean;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    hireDate: new Date().toISOString().split("T")[0],
    department: "",
    position: "",
    baseSalary: "",
    salaryFrequency: "fortnightly",
    taxFileNumber: "",
    nasfundNumber: "",
    nambawanSuperNumber: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/employees");
    setEmployees(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({
      firstName: "", lastName: "", email: "", phone: "",
      hireDate: new Date().toISOString().split("T")[0],
      department: "", position: "", baseSalary: "",
      salaryFrequency: "fortnightly", taxFileNumber: "",
      nasfundNumber: "", nambawanSuperNumber: "",
      bankAccountName: "", bankAccountNumber: "", bankName: "",
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    load();
  };

  const fmt = (v: string) =>
    new Intl.NumberFormat("en-PG", { style: "currency", currency: "PGK" }).format(parseFloat(v));

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage employee records for PNG payroll compliance"
        action={
          <button onClick={() => setShowModal(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + Add Employee
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Position</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Base Salary</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Super Fund</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No employees yet. Add your first employee.</td></tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">{e.employeeNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{e.firstName} {e.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{e.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{e.position || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(e.baseSalary)}<span className="text-xs text-slate-400 ml-1">/{e.salaryFrequency}</span></td>
                  <td className="px-4 py-3">
                    {e.nambawanSuperNumber ? (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Nambawan</span>
                    ) : e.nasfundNumber ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Nasfund</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Employee" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date *</label>
              <input type="date" required value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary (PGK) *</label>
              <input type="number" step="0.01" required value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pay Frequency</label>
              <select value={form.salaryFrequency} onChange={(e) => setForm({ ...form, salaryFrequency: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">PNG Tax & Super</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IRC Tax File #</label>
              <input value={form.taxFileNumber} onChange={(e) => setForm({ ...form, taxFileNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nasfund #</label>
              <input value={form.nasfundNumber} onChange={(e) => setForm({ ...form, nasfundNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nambawan Super #</label>
              <input value={form.nambawanSuperNumber} onChange={(e) => setForm({ ...form, nambawanSuperNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">Bank Details</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
              <input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
              <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save Employee</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
