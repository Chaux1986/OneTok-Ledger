/**
 * Papua New Guinea IRC Tax Calculator
 * Based on PNG IRC salary/wage tax rates (resident rates).
 *
 * 2024 Fortnightly Tax Table (Resident):
 * K0       – K769      → 0%
 * K769.01  – K1,538    → 22%
 * K1,538.01– K2,115    → 30%
 * K2,115.01– K3,461    → 35%
 * K3,461.01– K5,384    → 40%
 * K5,384.01+           → 42%
 *
 * Annual brackets (derived from fortnightly × 26):
 * K0       – K20,000   → 0%
 * K20,001  – K33,000   → 22%
 * K33,001  – K70,000   → 30%
 * K70,001  – K250,000  → 35%
 * K250,001+            → 42%
 */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  cumulative: number;
}

// Annual tax brackets (PNG IRC Resident)
const ANNUAL_BRACKETS: TaxBracket[] = [
  { min: 0, max: 20000, rate: 0, cumulative: 0 },
  { min: 20000, max: 33000, rate: 0.22, cumulative: 0 },
  { min: 33000, max: 70000, rate: 0.3, cumulative: 2860 },
  { min: 70000, max: 250000, rate: 0.35, cumulative: 13960 },
  { min: 250000, max: Infinity, rate: 0.42, cumulative: 76960 },
];

// Fortnightly tax brackets (PNG IRC Resident)
const FORTNIGHTLY_BRACKETS: TaxBracket[] = [
  { min: 0, max: 769, rate: 0, cumulative: 0 },
  { min: 769, max: 1538, rate: 0.22, cumulative: 0 },
  { min: 1538, max: 2115, rate: 0.30, cumulative: 169.18 },
  { min: 2115, max: 3461, rate: 0.35, cumulative: 342.28 },
  { min: 3461, max: 5384, rate: 0.40, cumulative: 813.38 },
  { min: 5384, max: Infinity, rate: 0.42, cumulative: 1582.58 },
];

export function calculateIrcTaxAnnual(annualGross: number): number {
  if (annualGross <= 0) return 0;

  for (let i = ANNUAL_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = ANNUAL_BRACKETS[i];
    if (annualGross > bracket.min) {
      return bracket.cumulative + (annualGross - bracket.min) * bracket.rate;
    }
  }
  return 0;
}

export function calculateIrcTaxFortnightly(fortnightlyGross: number): number {
  if (fortnightlyGross <= 0) return 0;

  for (let i = FORTNIGHTLY_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = FORTNIGHTLY_BRACKETS[i];
    if (fortnightlyGross > bracket.min) {
      return bracket.cumulative + (fortnightlyGross - bracket.min) * bracket.rate;
    }
  }
  return 0;
}

/**
 * Nasfund (National Superannuation Fund)
 * Employee contribution: 6% of gross
 * Employer contribution: 8.4% of gross
 */
export function calculateNasfund(grossPay: number): {
  employee: number;
  employer: number;
} {
  return {
    employee: Math.round(grossPay * 0.06 * 100) / 100,
    employer: Math.round(grossPay * 0.084 * 100) / 100,
  };
}

/**
 * Nambawan Super
 * Employee contribution: 6% of gross
 * Employer contribution: 8.4% of gross
 * (Same rates as Nasfund - employee chooses one fund)
 */
export function calculateNambawanSuper(grossPay: number): {
  employee: number;
  employer: number;
} {
  return {
    employee: Math.round(grossPay * 0.06 * 100) / 100,
    employer: Math.round(grossPay * 0.084 * 100) / 100,
  };
}

/**
 * Full payslip calculation
 */
export interface PayslipCalculation {
  grossPay: number;
  basePay: number;
  overtime: number;
  allowances: number;
  ircTax: number;
  nasfundEmployee: number;
  nasfundEmployer: number;
  nambawanEmployee: number;
  nambawanEmployer: number;
  totalDeductions: number;
  netPay: number;
}

export function calculatePayslip(params: {
  baseSalary: number;
  salaryFrequency: string;
  overtime?: number;
  allowances?: number;
  deductions?: number;
  superFund: "nasfund" | "nambawan";
}): PayslipCalculation {
  const { baseSalary, salaryFrequency, overtime = 0, allowances = 0, deductions = 0, superFund } = params;

  // Convert to fortnightly for calculations
  let fortnightlyBase: number;
  switch (salaryFrequency) {
    case "annual":
      fortnightlyBase = baseSalary / 26;
      break;
    case "monthly":
      fortnightlyBase = (baseSalary * 12) / 26;
      break;
    case "fortnightly":
    default:
      fortnightlyBase = baseSalary;
  }

  const grossPay = fortnightlyBase + overtime + allowances;
  const ircTax = Math.round(calculateIrcTaxFortnightly(grossPay) * 100) / 100;

  let nasfundEmployee = 0,
    nasfundEmployer = 0,
    nambawanEmployee = 0,
    nambawanEmployer = 0;

  if (superFund === "nasfund") {
    const nasfund = calculateNasfund(grossPay);
    nasfundEmployee = nasfund.employee;
    nasfundEmployer = nasfund.employer;
  } else {
    const nambawan = calculateNambawanSuper(grossPay);
    nambawanEmployee = nambawan.employee;
    nambawanEmployer = nambawan.employer;
  }

  const totalDeductions = ircTax + nasfundEmployee + nambawanEmployee + deductions;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  return {
    grossPay: Math.round(grossPay * 100) / 100,
    basePay: Math.round(fortnightlyBase * 100) / 100,
    overtime,
    allowances,
    ircTax,
    nasfundEmployee,
    nasfundEmployer,
    nambawanEmployee,
    nambawanEmployer,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay,
  };
}

/**
 * PNG Leave entitlements per year
 */
export const PNG_LEAVE_ENTITLEMENTS = {
  annual: 14, // 14 days per year (after 1 year service)
  sick: 14,   // 14 days per year
  maternity: 42, // 6 weeks
  paternity: 5,
  compassionate: 5,
  unpaid: 0,
};
