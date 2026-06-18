"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, Loader2, CheckCircle } from "lucide-react";

const industries = [
  "Mining & Resources",
  "Construction",
  "Retail & Wholesale",
  "Professional Services",
  "Logistics & Transport",
  "Agriculture",
  "Manufacturing",
  "Hospitality",
  "Healthcare",
  "Education",
  "Non-Profit",
  "Government",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    industry: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          industry: formData.industry,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Info */}
        <div className="hidden lg:block text-white">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold">OneTok</span>
              <span className="text-2xl font-light text-emerald-400"> Ledger</span>
            </div>
          </Link>

          <h1 className="text-4xl font-bold mb-4">
            Papua New Guinea&apos;s Premier
            <span className="text-emerald-400"> Enterprise ERP</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Complete financial management built for PNG businesses. Compliant with
            IRC, Nasfund, and Nambawan Super requirements.
          </p>

          <div className="space-y-4">
            {[
              "Full General Ledger & Financial Reporting",
              "PNG Tax Compliant Payroll System",
              "Inventory & Asset Management",
              "Multi-user with Role-based Access",
              "Bank Reconciliation & Banking Integration",
              "AI-powered Financial Assistant",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-slate-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-lg bg-white/10 border border-white/20">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">30-day free trial</span>
              {" "}• No credit card required • Cancel anytime
            </p>
          </div>
        </div>

        {/* Right side - Form */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
                <Calculator className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Start your free trial</CardTitle>
            <CardDescription>
              Create your account and set up your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <Input
                label="Company Name"
                placeholder="Your Business Ltd"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Industry
                </label>
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                >
                  <option value="">Select industry...</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-emerald-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-emerald-600 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
