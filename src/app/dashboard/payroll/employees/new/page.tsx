"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", middleName: "", dateOfBirth: "", gender: "",
    nationalId: "", taxNumber: "", email: "", phone: "", mobile: "",
    address: "", emergencyContact: "",
    startDate: new Date().toISOString().split("T")[0],
    position: "", department: "", employmentType: "full_time",
    salaryType: "fortnightly", baseSalary: "",
    bankName: "", bankBsb: "", bankAccount: "",
    superFund: "nasfund", superMemberNumber: "",
  });

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const submit = async () => {
    if (!form.firstName || !form.lastName) { setError("First and last name are required"); return; }
    if (!form.startDate) { setError("Start date is required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/payroll/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create employee");
      setSuccess(`Employee ${data.employee.employeeNumber} created successfully`);
      setTimeout(() => router.push("/dashboard/payroll/employees"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/payroll/employees">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Employee</h1>
          <p className="text-slate-500">Add an employee to payroll</p>
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
        <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Middle Name</label>
              <Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">National ID</label>
              <Input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">IRC Tax File Number</label>
              <Input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Mobile</label>
              <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Start Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Employment Type</label>
              <select value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="casual">Casual</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Position</label>
              <Input placeholder="e.g. Accountant" value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Department</label>
              <Input placeholder="e.g. Finance" value={form.department} onChange={(e) => set("department", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Salary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Salary Frequency</label>
              <select value={form.salaryType} onChange={(e) => set("salaryType", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Base Salary (PGK) <span className="text-red-500">*</span></label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Banking & Superannuation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Bank Name</label>
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Branch/BSB</label>
              <Input value={form.bankBsb} onChange={(e) => set("bankBsb", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Account Number</label>
              <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Super Fund</label>
              <select value={form.superFund} onChange={(e) => set("superFund", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                <option value="nasfund">Nasfund</option>
                <option value="nambawan">Nambawan Super</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Super Member Number</label>
              <Input value={form.superMemberNumber} onChange={(e) => set("superMemberNumber", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/payroll/employees"><Button variant="ghost">Cancel</Button></Link>
        <Button onClick={submit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />{loading ? "Saving..." : "Save Employee"}
        </Button>
      </div>
    </div>
  );
}