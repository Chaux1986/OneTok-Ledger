"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  tenant?: {
    name: string;
    status: string;
  };
}

export function Header({ user, tenant }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="fixed right-0 top-0 z-30 h-16 w-[calc(100%-16rem)] border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search transactions, customers, invoices..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {tenant?.status === "trial" && (
            <Badge variant="warning">Trial Period</Badge>
          )}

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              3
            </span>
          </Button>

          <div className="h-8 w-px bg-slate-200" />

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <span className="text-sm font-semibold text-emerald-700">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">{tenant?.name}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
                <a
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  Profile
                </a>
                <a
                  href="/dashboard/settings/company"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4" />
                  Company Settings
                </a>
                <a
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
