/**
 * Papua New Guinea IRC Salary & Wages Tax (SWT) Calculator
 * Resident individual rates.
 *
 * Source: Income Tax (Salary or Wages Tax) (Rates) (2024 Budget) (Amendment) Act,
 * which made the K20,000 tax-free threshold permanent and removed the 22%
 * bracket for residents. Confirmed unchanged through the 2026 Budget.
 *
 * Annual brackets (Resident):
 * K0       – K20,000   → 0%
 * K20,001  – K33,000   → 30%
 * K33,001  – K70,000   → 35%
 * K70,001  – K250,000  → 40%
 * K250,001+            → 42%
 *
 * IMPORTANT: Salary & Wages Tax is fundamentally calculated on a FORTNIGHTLY
 * basis under PNG law (the official IRC table is an Annexure to the Act, not
 * a simple division of the annual table). The fortnightly thresholds below
 * are derived by dividing the annual thresholds by 26, which is accurate for
 * most cases but may differ by small rounding amounts from the IRC's
 * official published Annexure 1 table. For payroll runs with material
 * compliance consequences, cross-check totals against the current IRC
 * fortnightly table before lodging.
 */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  cumulative: number;
}

// Annual tax brackets (PNG IRC Resident) — confirmed current as of 2026
const ANNUAL_BRACKETS: TaxBracket[] = [
  { min: 0, max: 20000, rate: 0, cumulative: 0 },
  { min: 20000, max: 33000, rate: 0.3, cumulative: 0 },
  { min: 33000, max: 70000, rate: 0.35, cumulative: 3900 },
  { min: 70000, max: 250000, rate: 0.4, cumulative: 16850 },
  { min: 250000, max: Infinity, rate: 0.42, cumulative: 88850 },
];

// Fortnightly tax brackets — derived from annual ÷ 26
const FORTNIGHTLY_BRACKETS: TaxBracket[] = [
  { min: 0, max: 769.23, rate: 0, cumulative: 0 },
  { min: 769.23, max: 1269.23, rate: 0.3, cumulative: 0 },
  { min: 1269.23, max: 2692.31, rate: 0.35, cumulative: 150.0 },
  { min: 2692.31, max: 9615.38, rate: 0.4, cumulative: 648.08 },
  { min: 9615.38, max: Infinity, rate: 0.42, cumulative: 3417.31 },
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
export function calculateNasfund(grossPay: number): { employee: number; employer: number } {
  return {
    employee: Math.round(grossPay * 0.06 * 100) / 100,
    employer: Math.round(grossPay * 0.084 * 100) / 100,
  };
}

/**
 * Nambawan Super
 * Employee contribution: 6% of gross
 * Employer contribution: 8.4% of gross
 */
export function calculateNambawanSuper(grossPay: number): { employee: number; employer: number } {
  return {
    employee: Math.round(grossPay * 0.06 * 100) / 100,
    employer: Math.round(grossPay * 0.084 * 100) / 100,
  };
}

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
  superFund: "nasfund" | "nambawan" | null;
}): PayslipCalculation {
  const { baseSalary, salaryFrequency, overtime = 0, allowances = 0, deductions = 0, superFund } = params;

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
  } else if (superFund === "nambawan") {
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

export const PNG_LEAVE_ENTITLEMENTS = {
  annual: 14,
  sick: 14,
  maternity: 42,
  paternity: 5,
  compassionate: 5,
  unpaid: 0,
};