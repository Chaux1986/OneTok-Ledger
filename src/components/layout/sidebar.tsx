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
  ShoppingCart,
  Wallet,
  PiggyBank,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  Landmark,
  Calculator,
  FileSpreadsheet,
  Truck,
  UserCog,
  Shield,
  Bot,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
  badge?: string;
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
      { title: "Financial Statements", href: "/dashboard/accounting/reports" },
    ],
  },
  {
    title: "Sales",
    icon: FileText,
    children: [
      { title: "Customers", href: "/dashboard/sales/customers" },
      { title: "Invoices", href: "/dashboard/sales/invoices" },
      { title: "Quotes", href: "/dashboard/sales/quotes" },
      { title: "Receipts", href: "/dashboard/sales/receipts" },
    ],
  },
  {
    title: "Purchases",
    icon: Receipt,
    children: [
      { title: "Suppliers", href: "/dashboard/purchases/suppliers" },
      { title: "Bills", href: "/dashboard/purchases/bills" },
      { title: "Purchase Orders", href: "/dashboard/purchases/orders" },
      { title: "Payments", href: "/dashboard/purchases/payments" },
    ],
  },
  {
    title: "Payroll",
    icon: Wallet,
    badge: "PNG",
    children: [
      { title: "Employees", href: "/dashboard/payroll/employees" },
      { title: "Pay Runs", href: "/dashboard/payroll/runs" },
      { title: "Timesheets", href: "/dashboard/payroll/timesheets" },
      { title: "IRC Reports", href: "/dashboard/payroll/irc" },
      { title: "Super Reports", href: "/dashboard/payroll/super" },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    children: [
      { title: "Products", href: "/dashboard/inventory/products" },
      { title: "Warehouses", href: "/dashboard/inventory/warehouses" },
      { title: "Stock Levels", href: "/dashboard/inventory/stock" },
      { title: "Adjustments", href: "/dashboard/inventory/adjustments" },
    ],
  },
  {
    title: "Assets",
    icon: Building2,
    children: [
      { title: "Asset Register", href: "/dashboard/assets/register" },
      { title: "Depreciation", href: "/dashboard/assets/depreciation" },
      { title: "Maintenance", href: "/dashboard/assets/maintenance" },
    ],
  },
  {
    title: "Banking",
    icon: Landmark,
    children: [
      { title: "Bank Accounts", href: "/dashboard/banking/accounts" },
      { title: "Transactions", href: "/dashboard/banking/transactions" },
      { title: "Reconciliation", href: "/dashboard/banking/reconciliation" },
    ],
  },
  {
    title: "CRM",
    icon: Users,
    children: [
      { title: "Contacts", href: "/dashboard/crm/contacts" },
      { title: "Leads", href: "/dashboard/crm/leads" },
      { title: "Opportunities", href: "/dashboard/crm/opportunities" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    children: [
      { title: "Financial Reports", href: "/dashboard/reports/financial" },
      { title: "Payroll Reports", href: "/dashboard/reports/payroll" },
      { title: "Tax Reports", href: "/dashboard/reports/tax" },
      { title: "Custom Reports", href: "/dashboard/reports/custom" },
    ],
  },
  {
    title: "AI Assistant",
    icon: Bot,
    href: "/dashboard/ai",
    badge: "New",
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "Company", href: "/dashboard/settings/company" },
      { title: "Users", href: "/dashboard/settings/users" },
      { title: "Roles", href: "/dashboard/settings/roles" },
      { title: "Integrations", href: "/dashboard/settings/integrations" },
      { title: "Compliance", href: "/dashboard/settings/compliance" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>(["Accounting"]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
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
              : item.children?.some((c) => pathname.startsWith(c.href));

            if (item.children) {
              return (
                <li key={item.title}>
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 pl-11">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === child.href
                                ? "bg-emerald-600 text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                          >
                            {child.title}
                          </Link>
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
                    pathname === item.href
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
          <Link
            href="/dashboard/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
