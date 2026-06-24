"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  Users,
  Building2,
  Package,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  Landmark,
  Calculator,
  Bot,
} from "lucide-react";
import { useState } from "react";

interface ChildItem {
  title: string;
  href?: string;
  soon?: boolean;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: ChildItem[];
  badge?: string;
  soon?: boolean;
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Accounting",
    icon: BookOpen,
    children: [
      { title: "Chart of Accounts", href: "/dashboard/accounting/accounts" },
      { title: "Journals", href: "/dashboard/accounting/journals" },
      { title: "Trial Balance", href: "/dashboard/accounting/trial-balance" },
      { title: "Balance Sheet", href: "/dashboard/accounting/reports/balance-sheet" },
      { title: "Profit & Loss", href: "/dashboard/accounting/reports/profit-loss" },
      { title: "Integrity Check", href: "/dashboard/accounting/integrity-check" },
    ],
  },
  {
    title: "Sales",
    icon: FileText,
    children: [
      { title: "Customers", href: "/dashboard/sales/customers" },
      { title: "Invoices", href: "/dashboard/sales/invoices" },
      { title: "Quotes", soon: true },
      { title: "Receipts", soon: true },
    ],
  },
  {
    title: "Purchasing",
    icon: Receipt,
    children: [
      { title: "Suppliers", href: "/dashboard/purchasing/suppliers" },
      { title: "Bills", href: "/dashboard/purchasing/bills" },
      { title: "Purchase Orders", soon: true },
      { title: "Payments", soon: true },
    ],
  },
  {
    title: "Payroll",
    icon: Wallet,
    badge: "PNG",
    children: [
      { title: "Employees", href: "/dashboard/payroll/employees" },
      { title: "Pay Runs", href: "/dashboard/payroll/runs" },
      { title: "Timesheets", soon: true },
      { title: "IRC Reports", href: "/dashboard/payroll/reports/irc" },
      { title: "Super Reports", href: "/dashboard/payroll/reports/super" },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    children: [
      { title: "Products", href: "/dashboard/inventory/products" },
      { title: "Warehouses", href: "/dashboard/inventory/warehouses" },
      { title: "Stock Levels", href: "/dashboard/inventory/stock-levels" },
    ],
  },
  {
    title: "Assets",
    icon: Building2,
    children: [
      { title: "Asset Register", href: "/dashboard/assets/register" },
      { title: "Depreciation", href: "/dashboard/assets/depreciation" },
    ],
  },
  {
    title: "Banking",
    icon: Landmark,
    children: [
      { title: "Bank Accounts", href: "/dashboard/banking/accounts" },
    ],
  },
  {
    title: "CRM",
    icon: Users,
    soon: true,
    children: [
      { title: "Contacts", soon: true },
      { title: "Leads", soon: true },
    ],
  },
  {
    title: "AI Assistant",
    icon: Bot,
    soon: true,
    badge: "Soon",
  },
  {
    title: "Settings",
    icon: Settings,
    soon: true,
    children: [
      { title: "Company", href: "/dashboard/settings/company" },
      { title: "Users & Roles", soon: true },
    ],
  },
];

function ChildLink({ child, isActive }: { child: ChildItem; isActive: boolean }) {
  if (child.soon || !child.href) {
    return (
      <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed">
        <span>{child.title}</span>
        <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={child.href}
      className={cn(
        "block rounded-lg px-3 py-2 text-sm transition-colors",
        isActive ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      {child.title}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>(["Accounting"]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold">OneTok</span>
            <span className="text-lg font-light text-emerald-400"> Ledger</span>
          </div>
        </Link>
      </div>

      <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isOpen = openSections.includes(item.title);
            const isActive = item.href
              ? pathname === item.href
              : item.children?.some((c) => c.href && pathname.startsWith(c.href));

            // Top-level item with no children and marked "soon"
            if (item.soon && !item.children) {
              return (
                <li key={item.title}>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
                      {item.badge || "Soon"}
                    </span>
                  </div>
                </li>
              );
            }

            if (item.children) {
              return (
                <li key={item.title}>
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      item.soon && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 pl-11">
                      {item.children.map((child) => (
                        <li key={child.title}>
                          <ChildLink child={child} isActive={!!child.href && pathname === child.href} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.title}>
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed">
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}