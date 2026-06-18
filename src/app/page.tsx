import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Users,
  Package,
  Wallet,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Building2,
  Truck,
  HardHat,
  Church,
  Landmark,
  Bot,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Financial ERP",
    description:
      "Complete general ledger, chart of accounts, journals, and financial statements with real-time reporting.",
  },
  {
    icon: Wallet,
    title: "PNG Payroll",
    description:
      "Fully compliant with IRC Salary & Wages Tax, Nasfund, and Nambawan Super requirements.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description:
      "Multi-warehouse stock control, transfers, barcode scanning, and automated reordering.",
  },
  {
    icon: Users,
    title: "CRM & Sales",
    description:
      "Customer management, quotes, invoicing, and accounts receivable with payment tracking.",
  },
  {
    icon: BarChart3,
    title: "Reporting & Analytics",
    description:
      "Real-time dashboards, financial reports, tax reports, and custom report builder.",
  },
  {
    icon: Shield,
    title: "Compliance Engine",
    description:
      "Automated tax calculations, compliance validation, and audit-ready documentation.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Intelligent bookkeeping assistant with OCR, bank matching, and expense classification.",
  },
  {
    icon: Zap,
    title: "Bank Integration",
    description:
      "Connect to PNG banks for automatic transaction imports and reconciliation.",
  },
];

const industries = [
  { icon: HardHat, name: "Mining Contractors" },
  { icon: Building2, name: "Construction" },
  { icon: Truck, name: "Logistics" },
  { icon: Landmark, name: "Government" },
  { icon: Church, name: "Churches & NGOs" },
  { icon: Globe, name: "Professional Services" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">OneTok</span>
              <span className="text-xl font-light text-emerald-600">Ledger</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-slate-600 hover:text-slate-900">
                Features
              </Link>
              <Link href="#industries" className="text-sm text-slate-600 hover:text-slate-900">
                Industries
              </Link>
              <Link href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">
                Pricing
              </Link>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
                Sign In
              </Link>
              <Link href="/register">
                <Button>Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              🇵🇬 Built for Papua New Guinea
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Enterprise Financial Management
              <br />
              <span className="text-emerald-400">Made Simple</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10">
              OneTok Ledger is PNG&apos;s first cloud-native enterprise ERP platform.
              Complete accounting, payroll, inventory, and compliance management
              built specifically for PNG businesses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start 30-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Explore Features
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                IRC Compliant
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Nasfund Ready
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Nambawan Super Ready
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Multi-Currency
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Complete Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From accounting to payroll, inventory to CRM — OneTok Ledger provides
              all the tools you need in one integrated platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 mb-4">
                  <feature.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Built for PNG
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Trusted Across Industries
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              OneTok Ledger serves businesses of all sizes across Papua New Guinea,
              from SMEs to large enterprises.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="flex flex-col items-center p-6 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-colors"
              >
                <industry.icon className="h-8 w-8 text-emerald-600 mb-3" />
                <span className="text-sm font-medium text-slate-700 text-center">
                  {industry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PNG Compliance Section */}
      <section className="py-20 bg-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                PNG Tax Compliance
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                100% Compliant with PNG Regulations
              </h2>
              <p className="text-lg text-emerald-100 mb-8">
                OneTok Ledger is built from the ground up to meet all Papua New Guinea
                tax and regulatory requirements. Never worry about compliance again.
              </p>

              <div className="space-y-4">
                {[
                  "Internal Revenue Commission (IRC) - Salary & Wages Tax",
                  "GST Registration and Reporting",
                  "Nasfund Superannuation Contributions",
                  "Nambawan Super Contributions",
                  "Department of Labour Requirements",
                  "Withholding Tax Compliance",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <div className="text-6xl mb-4">🇵🇬</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Made in PNG, for PNG
                </h3>
                <p className="text-emerald-100">
                  OneTok Technologies Ltd is proud to deliver enterprise-grade
                  financial software built specifically for Papua New Guinea&apos;s
                  unique business environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Join hundreds of PNG businesses already using OneTok Ledger to
            streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Schedule a Demo
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            30-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">OneTok</span>
                <span className="text-xl font-light text-emerald-400">Ledger</span>
              </Link>
              <p className="text-slate-400 text-sm">
                Enterprise ERP Platform for Papua New Guinea businesses.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white">Features</Link></li>
                <li><Link href="#" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Integrations</Link></li>
                <li><Link href="#" className="hover:text-white">API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                <li><Link href="#" className="hover:text-white">Partners</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © 2024 OneTok Technologies Ltd. All rights reserved.
            </p>
            <p className="text-sm text-slate-400">
              Client: Monle-ESR Services Ltd
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
