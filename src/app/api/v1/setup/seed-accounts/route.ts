import { NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

const PNG_SME_ACCOUNTS = [
  // ============================================================
  // ASSETS — 1000s
  // ============================================================
  { code: "1000", name: "Current Assets", accountType: "asset", accountSubtype: "current_asset", isSystemAccount: true },
  { code: "1100", name: "Cash at Bank - BSP", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1101", name: "Cash at Bank - ANZ", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1102", name: "Cash at Bank - Westpac", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1110", name: "Petty Cash", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1200", name: "Accounts Receivable", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000", isSystemAccount: true },
  { code: "1210", name: "Trade Debtors", accountType: "asset", accountSubtype: "current_asset", parentCode: "1200" },
  { code: "1220", name: "Other Debtors", accountType: "asset", accountSubtype: "current_asset", parentCode: "1200" },
  { code: "1300", name: "Inventory", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1310", name: "Stock on Hand", accountType: "asset", accountSubtype: "current_asset", parentCode: "1300" },
  { code: "1400", name: "Prepayments & Other Current Assets", accountType: "asset", accountSubtype: "current_asset", parentCode: "1000" },
  { code: "1410", name: "Prepaid Expenses", accountType: "asset", accountSubtype: "current_asset", parentCode: "1400" },
  { code: "1420", name: "GST Input Tax Credit", accountType: "asset", accountSubtype: "current_asset", parentCode: "1400", isSystemAccount: true, taxCode: "GST" },
  { code: "1430", name: "Income Tax Instalments", accountType: "asset", accountSubtype: "current_asset", parentCode: "1400" },

  { code: "1500", name: "Fixed Assets", accountType: "asset", accountSubtype: "fixed_asset", isSystemAccount: true },
  { code: "1510", name: "Land & Buildings", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1520", name: "Plant & Equipment", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1521", name: "Accumulated Depreciation - Plant & Equipment", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1530", name: "Motor Vehicles", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1531", name: "Accumulated Depreciation - Motor Vehicles", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1540", name: "Furniture & Fittings", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1541", name: "Accumulated Depreciation - Furniture & Fittings", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1550", name: "Computer Equipment", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },
  { code: "1551", name: "Accumulated Depreciation - Computer Equipment", accountType: "asset", accountSubtype: "fixed_asset", parentCode: "1500" },

  // ============================================================
  // LIABILITIES — 2000s
  // ============================================================
  { code: "2000", name: "Current Liabilities", accountType: "liability", accountSubtype: "current_liability", isSystemAccount: true },
  { code: "2100", name: "Accounts Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2000", isSystemAccount: true },
  { code: "2110", name: "Trade Creditors", accountType: "liability", accountSubtype: "current_liability", parentCode: "2100" },
  { code: "2120", name: "Accrued Expenses", accountType: "liability", accountSubtype: "current_liability", parentCode: "2100" },
  { code: "2200", name: "Tax Liabilities", accountType: "liability", accountSubtype: "current_liability", parentCode: "2000", isSystemAccount: true },
  { code: "2210", name: "GST Collected", accountType: "liability", accountSubtype: "current_liability", parentCode: "2200", isSystemAccount: true, taxCode: "GST" },
  { code: "2220", name: "Salary & Wages Tax Payable (SWT)", accountType: "liability", accountSubtype: "current_liability", parentCode: "2200", isSystemAccount: true },
  { code: "2230", name: "Income Tax Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2200" },
  { code: "2240", name: "Withholding Tax Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2200" },
  { code: "2300", name: "Superannuation Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2000", isSystemAccount: true },
  { code: "2310", name: "Nasfund Contributions Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2300" },
  { code: "2320", name: "Nambawan Super Contributions Payable", accountType: "liability", accountSubtype: "current_liability", parentCode: "2300" },
  { code: "2400", name: "Other Current Liabilities", accountType: "liability", accountSubtype: "current_liability", parentCode: "2000" },
  { code: "2410", name: "Loans - Current Portion", accountType: "liability", accountSubtype: "current_liability", parentCode: "2400" },
  { code: "2420", name: "Employee Leave Accrual", accountType: "liability", accountSubtype: "current_liability", parentCode: "2400" },

  { code: "2500", name: "Long-Term Liabilities", accountType: "liability", accountSubtype: "long_term_liability", isSystemAccount: true },
  { code: "2510", name: "Bank Loans", accountType: "liability", accountSubtype: "long_term_liability", parentCode: "2500" },
  { code: "2520", name: "Finance Lease Liabilities", accountType: "liability", accountSubtype: "long_term_liability", parentCode: "2500" },

  // ============================================================
  // EQUITY — 3000s
  // ============================================================
  { code: "3000", name: "Equity", accountType: "equity", accountSubtype: "equity", isSystemAccount: true },
  { code: "3100", name: "Paid Up Capital", accountType: "equity", accountSubtype: "equity", parentCode: "3000" },
  { code: "3200", name: "Retained Earnings", accountType: "equity", accountSubtype: "equity", parentCode: "3000", isSystemAccount: true },
  { code: "3300", name: "Current Year Earnings", accountType: "equity", accountSubtype: "equity", parentCode: "3000", isSystemAccount: true },
  { code: "3400", name: "Drawings", accountType: "equity", accountSubtype: "equity", parentCode: "3000" },

  // ============================================================
  // REVENUE — 4000s
  // ============================================================
  { code: "4000", name: "Revenue", accountType: "revenue", accountSubtype: "operating_revenue", isSystemAccount: true },
  { code: "4100", name: "Sales Revenue", accountType: "revenue", accountSubtype: "operating_revenue", parentCode: "4000", isSystemAccount: true },
  { code: "4110", name: "Sales - Goods", accountType: "revenue", accountSubtype: "operating_revenue", parentCode: "4100", taxCode: "GST" },
  { code: "4120", name: "Sales - Services", accountType: "revenue", accountSubtype: "operating_revenue", parentCode: "4100", taxCode: "GST" },
  { code: "4130", name: "Sales - Exports", accountType: "revenue", accountSubtype: "operating_revenue", parentCode: "4100" },
  { code: "4200", name: "Other Revenue", accountType: "revenue", accountSubtype: "other_revenue", parentCode: "4000" },
  { code: "4210", name: "Interest Income", accountType: "revenue", accountSubtype: "other_revenue", parentCode: "4200" },
  { code: "4220", name: "Rental Income", accountType: "revenue", accountSubtype: "other_revenue", parentCode: "4200", taxCode: "GST" },
  { code: "4230", name: "Gain on Disposal of Assets", accountType: "revenue", accountSubtype: "other_revenue", parentCode: "4200" },
  { code: "4240", name: "Miscellaneous Income", accountType: "revenue", accountSubtype: "other_revenue", parentCode: "4200" },

  // ============================================================
  // COST OF SALES — 5000s
  // ============================================================
  { code: "5000", name: "Cost of Sales", accountType: "expense", accountSubtype: "cost_of_sales", isSystemAccount: true },
  { code: "5100", name: "Cost of Goods Sold", accountType: "expense", accountSubtype: "cost_of_sales", parentCode: "5000" },
  { code: "5110", name: "Purchases", accountType: "expense", accountSubtype: "cost_of_sales", parentCode: "5100", taxCode: "GST" },
  { code: "5120", name: "Freight & Cartage Inwards", accountType: "expense", accountSubtype: "cost_of_sales", parentCode: "5100" },
  { code: "5130", name: "Direct Labour", accountType: "expense", accountSubtype: "cost_of_sales", parentCode: "5100" },
  { code: "5140", name: "Subcontractors", accountType: "expense", accountSubtype: "cost_of_sales", parentCode: "5100" },

  // ============================================================
  // OPERATING EXPENSES — 6000s
  // ============================================================
  { code: "6000", name: "Operating Expenses", accountType: "expense", accountSubtype: "operating_expense", isSystemAccount: true },

  { code: "6100", name: "Payroll Expenses", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6110", name: "Salaries & Wages", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6120", name: "Overtime", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6130", name: "Leave Entitlements", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6140", name: "Superannuation - Employer Contributions", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6150", name: "Staff Allowances", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6160", name: "Recruitment Expenses", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },
  { code: "6170", name: "Training & Development", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6100" },

  { code: "6200", name: "Office & Administration", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6210", name: "Rent & Lease", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200", taxCode: "GST" },
  { code: "6220", name: "Office Supplies & Stationery", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200", taxCode: "GST" },
  { code: "6230", name: "Telephone & Internet", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200", taxCode: "GST" },
  { code: "6240", name: "Postage & Courier", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200" },
  { code: "6250", name: "Printing & Reproduction", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200", taxCode: "GST" },
  { code: "6260", name: "Computer & Software", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200", taxCode: "GST" },
  { code: "6270", name: "Subscriptions & Memberships", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6200" },

  { code: "6300", name: "Vehicle & Travel", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6310", name: "Fuel & Oil", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6300", taxCode: "GST" },
  { code: "6320", name: "Vehicle Maintenance & Repairs", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6300", taxCode: "GST" },
  { code: "6330", name: "Travel & Accommodation", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6300" },
  { code: "6340", name: "Airfares", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6300" },
  { code: "6350", name: "Meals & Entertainment", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6300" },

  { code: "6400", name: "Marketing & Sales", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6410", name: "Advertising", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6400", taxCode: "GST" },
  { code: "6420", name: "Marketing & Promotions", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6400", taxCode: "GST" },
  { code: "6430", name: "Sponsorships & Donations", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6400" },

  { code: "6500", name: "Professional Services", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6510", name: "Accounting & Audit Fees", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6500", taxCode: "GST" },
  { code: "6520", name: "Legal Fees", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6500", taxCode: "GST" },
  { code: "6530", name: "Consulting Fees", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6500", taxCode: "GST" },
  { code: "6540", name: "Security Services", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6500", taxCode: "GST" },

  { code: "6600", name: "Utilities & Facilities", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6610", name: "Electricity", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6600", taxCode: "GST" },
  { code: "6620", name: "Water & Sewerage", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6600" },
  { code: "6630", name: "Cleaning & Maintenance", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6600", taxCode: "GST" },
  { code: "6640", name: "Security & Alarm", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6600", taxCode: "GST" },

  { code: "6700", name: "Insurance", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6710", name: "General Insurance", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6700" },
  { code: "6720", name: "Vehicle Insurance", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6700" },
  { code: "6730", name: "Workers Compensation", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6700" },
  { code: "6740", name: "Directors & Officers Insurance", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6700" },

  { code: "6800", name: "Finance Costs", accountType: "expense", accountSubtype: "other_expense", parentCode: "6000" },
  { code: "6810", name: "Bank Charges & Fees", accountType: "expense", accountSubtype: "other_expense", parentCode: "6800" },
  { code: "6820", name: "Interest Expense", accountType: "expense", accountSubtype: "other_expense", parentCode: "6800" },
  { code: "6830", name: "Merchant Fees", accountType: "expense", accountSubtype: "other_expense", parentCode: "6800" },

  { code: "6900", name: "Depreciation & Amortisation", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6910", name: "Depreciation - Plant & Equipment", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6900" },
  { code: "6920", name: "Depreciation - Motor Vehicles", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6900" },
  { code: "6930", name: "Depreciation - Furniture & Fittings", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6900" },
  { code: "6940", name: "Depreciation - Computer Equipment", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6900" },

  { code: "6950", name: "Miscellaneous Expenses", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6000" },
  { code: "6951", name: "Sundry Expenses", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6950" },
  { code: "6952", name: "Loss on Disposal of Assets", accountType: "expense", accountSubtype: "other_expense", parentCode: "6950" },
  { code: "6953", name: "Bad Debts Written Off", accountType: "expense", accountSubtype: "operating_expense", parentCode: "6950" },
  { code: "6954", name: "Fines & Penalties", accountType: "expense", accountSubtype: "other_expense", parentCode: "6950" },
] as const;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners and admins can seed accounts
    if (!["owner", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.tenant.id;

    // Check if accounts already exist
    const existing = await db
      .select({ code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Chart of accounts already exists for this tenant" },
        { status: 409 }
      );
    }

    // First pass: insert all accounts without parentId
    const codeToId = new Map<string, string>();

    for (const account of PNG_SME_ACCOUNTS) {
      const [inserted] = await db
        .insert(chartOfAccounts)
        .values({
          tenantId,
          code: account.code,
          name: account.name,
          accountType: account.accountType as "asset" | "liability" | "equity" | "revenue" | "expense",
          accountSubtype: account.accountSubtype as "current_asset" | "fixed_asset" | "current_liability" | "long_term_liability" | "equity" | "operating_revenue" | "other_revenue" | "operating_expense" | "other_expense" | "cost_of_sales",
          isActive: true,
          isSystemAccount: "isSystemAccount" in account ? account.isSystemAccount : false,
          taxCode: "taxCode" in account ? account.taxCode : null,
        })
        .returning({ id: chartOfAccounts.id, code: chartOfAccounts.code });

      codeToId.set(inserted.code, inserted.id);
    }

    // Second pass: update parentId references
    for (const account of PNG_SME_ACCOUNTS) {
      if ("parentCode" in account && account.parentCode) {
        const parentId = codeToId.get(account.parentCode);
        const accountId = codeToId.get(account.code);
        if (parentId && accountId) {
          await db
            .update(chartOfAccounts)
            .set({ parentId })
            .where(
              and(
                eq(chartOfAccounts.id, accountId),
                eq(chartOfAccounts.tenantId, tenantId)
              )
            );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `PNG SME Standard Chart of Accounts created`,
      count: PNG_SME_ACCOUNTS.length,
    });
  } catch (error) {
    console.error("Seed accounts error:", error);
    return NextResponse.json(
      { error: "Failed to seed chart of accounts" },
      { status: 500 }
    );
  }
}