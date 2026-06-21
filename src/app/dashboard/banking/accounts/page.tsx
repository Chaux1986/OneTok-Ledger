"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, ArrowRight } from "lucide-react";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string | null;
  accountType: string;
  chartAccountCode: string;
  chartAccountName: string;
  glBalance: string;
  lastReconciledDate: string | null;
  lastReconciledBalance: string;
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/banking/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.bankAccounts || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
          <p className="text-slate-500">Set up accounts for reconciliation against your ledger</p>
        </div>
        <Link href="/dashboard/banking/accounts/new">
          <Button><Plus className="mr-2 h-4 w-4" />Set Up Bank Account</Button>
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Landmark className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4">No bank accounts set up yet</p>
            <Link href="/dashboard/banking/accounts/new">
              <Button variant="link">Link your first bank account</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((acc) => {
            const glBalance = parseFloat(acc.glBalance);
            const lastReconciled = parseFloat(acc.lastReconciledBalance || "0");
            const diff = glBalance - lastReconciled;

            return (
              <Card key={acc.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{acc.bankName}</CardTitle>
                      <CardDescription>
                        {acc.chartAccountCode} — {acc.chartAccountName}
                        {acc.accountNumber && ` · ${acc.accountNumber}`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{acc.accountType}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">GL Balance</span>
                    <span className="font-mono font-semibold">K {glBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-slate-500">Last Reconciled</span>
                    <span className="font-mono">
                      {acc.lastReconciledDate ? `K ${lastReconciled.toFixed(2)}` : "Never"}
                    </span>
                  </div>
                  <Link href={`/dashboard/banking/accounts/${acc.id}`}>
                    <Button variant="outline" className="w-full">
                      Reconcile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}