"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { href: "/suppliers", label: "Suppliers", icon: "🏢" },
      { href: "/invoices", label: "Invoices", icon: "📄" },
      { href: "/receipts", label: "Receipts", icon: "🧾" },
      { href: "/bank-accounts", label: "Bank Accounts", icon: "🏦" },
      { href: "/bank-transactions", label: "Transactions", icon: "💳" },
      { href: "/reconciliation", label: "Reconciliation", icon: "✅" },
    ],
  },
  {
    label: "Payroll",
    items: [
      { href: "/employees", label: "Employees", icon: "👥" },
      { href: "/payroll", label: "Payroll Runs", icon: "💰" },
      { href: "/leave", label: "Leave Management", icon: "🏖️" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: "📦" },
      { href: "/purchase-orders", label: "Purchase Orders", icon: "📋" },
      { href: "/goods-receipts", label: "Goods Receipts", icon: "📥" },
      { href: "/approvals", label: "Approvals", icon: "🔐" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <span className="text-2xl">🇵🇬</span>
        <div>
          <h1 className="text-sm font-bold text-slate-900">PNG Business Suite</h1>
          <p className="text-[10px] text-slate-500">Accounting · Payroll · Ops</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-indigo-50 font-medium text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="text-[10px] text-slate-400 text-center">© 2024 PNG Business Suite</p>
      </div>
    </aside>
  );
}
