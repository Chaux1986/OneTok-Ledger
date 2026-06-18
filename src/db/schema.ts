// OneTok Ledger™ Enterprise ERP Platform
// Database Schema - Multi-Tenant Event Sourcing Architecture
// Owner: OneTok Technologies Ltd | Client: Monle-ESR Services Ltd

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "trial",
  "cancelled",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "accountant",
  "payroll_officer",
  "inventory_manager",
  "sales_rep",
  "viewer",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const accountSubtypeEnum = pgEnum("account_subtype", [
  "current_asset",
  "fixed_asset",
  "current_liability",
  "long_term_liability",
  "equity",
  "operating_revenue",
  "other_revenue",
  "operating_expense",
  "other_expense",
  "cost_of_sales",
]);

export const journalStatusEnum = pgEnum("journal_status", [
  "draft",
  "posted",
  "reversed",
  "void",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partial",
  "paid",
  "overdue",
  "void",
]);

export const billStatusEnum = pgEnum("bill_status", [
  "draft",
  "approved",
  "partial",
  "paid",
  "void",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processing",
  "approved",
  "paid",
  "void",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "account_created",
  "account_updated",
  "journal_posted",
  "journal_reversed",
  "invoice_created",
  "invoice_sent",
  "invoice_paid",
  "bill_created",
  "bill_paid",
  "payroll_processed",
  "employee_created",
  "stock_adjusted",
  "purchase_order_created",
  "asset_created",
  "asset_depreciated",
  "customer_created",
  "supplier_created",
  "user_login",
  "user_logout",
  "settings_changed",
]);

// ============================================================================
// AUTH SCHEMA - Multi-Tenant Authentication
// ============================================================================

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    tradingName: varchar("trading_name", { length: 255 }),
    businessNumber: varchar("business_number", { length: 50 }), // IRC/TIN
    gstNumber: varchar("gst_number", { length: 50 }),
    industry: varchar("industry", { length: 100 }),
    country: varchar("country", { length: 2 }).default("PG"),
    currency: varchar("currency", { length: 3 }).default("PGK"),
    timezone: varchar("timezone", { length: 50 }).default("Pacific/Port_Moresby"),
    financialYearEnd: integer("financial_year_end").default(12), // Month
    status: tenantStatusEnum("status").default("trial"),
    logoUrl: text("logo_url"),
    address: text("address"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    website: varchar("website", { length: 255 }),
    settings: jsonb("settings").default({}),
    subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("starter"),
    subscriptionEndsAt: timestamp("subscription_ends_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tenants_slug_idx").on(table.slug),
    index("tenants_status_idx").on(table.status),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    role: userRoleEnum("role").default("viewer").notNull(),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    mfaEnabled: boolean("mfa_enabled").default(false),
    mfaSecret: varchar("mfa_secret", { length: 255 }),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("users_tenant_email_unique").on(table.tenantId, table.email),
    index("users_tenant_idx").on(table.tenantId),
    index("users_email_idx").on(table.email),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    token: varchar("token", { length: 500 }).notNull().unique(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_token_idx").on(table.token),
  ]
);

// ============================================================================
// EVENT SOURCING - Immutable Ledger
// ============================================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    eventData: jsonb("event_data").notNull(),
    metadata: jsonb("metadata").default({}),
    version: integer("version").notNull(),
    userId: uuid("user_id").references(() => users.id),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("events_tenant_idx").on(table.tenantId),
    index("events_aggregate_idx").on(table.aggregateId, table.aggregateType),
    index("events_type_idx").on(table.eventType),
    index("events_occurred_idx").on(table.occurredAt),
  ]
);

// ============================================================================
// AUDIT SCHEMA - Compliance Tracking
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_tenant_idx").on(table.tenantId),
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_created_idx").on(table.createdAt),
  ]
);

// ============================================================================
// LEDGER SCHEMA - Chart of Accounts & General Ledger
// ============================================================================

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    accountType: accountTypeEnum("account_type").notNull(),
    accountSubtype: accountSubtypeEnum("account_subtype"),
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").default(true).notNull(),
    isSystemAccount: boolean("is_system_account").default(false),
    taxCode: varchar("tax_code", { length: 20 }),
    bankAccountNumber: varchar("bank_account_number", { length: 50 }),
    openingBalance: decimal("opening_balance", { precision: 18, scale: 2 }).default("0"),
    currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("coa_tenant_code_unique").on(table.tenantId, table.code),
    index("coa_tenant_idx").on(table.tenantId),
    index("coa_type_idx").on(table.accountType),
  ]
);

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isClosed: boolean("is_closed").default(false),
    closedAt: timestamp("closed_at"),
    closedBy: uuid("closed_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("fiscal_tenant_idx").on(table.tenantId),
  ]
);

export const journals = pgTable(
  "journals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    journalNumber: varchar("journal_number", { length: 50 }).notNull(),
    date: date("date").notNull(),
    description: text("description"),
    reference: varchar("reference", { length: 100 }),
    status: journalStatusEnum("status").default("draft").notNull(),
    totalDebit: decimal("total_debit", { precision: 18, scale: 2 }).default("0"),
    totalCredit: decimal("total_credit", { precision: 18, scale: 2 }).default("0"),
    fiscalPeriodId: uuid("fiscal_period_id").references(() => fiscalPeriods.id),
    reversalOf: uuid("reversal_of"),
    reversedBy: uuid("reversed_by"),
    postedAt: timestamp("posted_at"),
    postedBy: uuid("posted_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("journals_tenant_number_unique").on(table.tenantId, table.journalNumber),
    index("journals_tenant_idx").on(table.tenantId),
    index("journals_date_idx").on(table.date),
    index("journals_status_idx").on(table.status),
  ]
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalId: uuid("journal_id").references(() => journals.id).notNull(),
    accountId: uuid("account_id").references(() => chartOfAccounts.id).notNull(),
    description: text("description"),
    debit: decimal("debit", { precision: 18, scale: 2 }).default("0"),
    credit: decimal("credit", { precision: 18, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 18, scale: 2 }).default("0"),
    taxCode: varchar("tax_code", { length: 20 }),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("journal_lines_journal_idx").on(table.journalId),
    index("journal_lines_account_idx").on(table.accountId),
  ]
);

// ============================================================================
// ACCOUNTS RECEIVABLE - Customers & Invoices
// ============================================================================

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    tradingName: varchar("trading_name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    mobile: varchar("mobile", { length: 50 }),
    fax: varchar("fax", { length: 50 }),
    website: varchar("website", { length: 255 }),
    taxNumber: varchar("tax_number", { length: 50 }),
    creditLimit: decimal("credit_limit", { precision: 18, scale: 2 }).default("0"),
    paymentTermDays: integer("payment_term_days").default(30),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    notes: text("notes"),
    accountId: uuid("account_id").references(() => chartOfAccounts.id),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("customers_tenant_code_unique").on(table.tenantId, table.code),
    index("customers_tenant_idx").on(table.tenantId),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id).notNull(),
    date: date("date").notNull(),
    dueDate: date("due_date").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    reference: varchar("reference", { length: 100 }),
    subtotal: decimal("subtotal", { precision: 18, scale: 2 }).default("0"),
    taxTotal: decimal("tax_total", { precision: 18, scale: 2 }).default("0"),
    total: decimal("total", { precision: 18, scale: 2 }).default("0"),
    amountPaid: decimal("amount_paid", { precision: 18, scale: 2 }).default("0"),
    amountDue: decimal("amount_due", { precision: 18, scale: 2 }).default("0"),
    notes: text("notes"),
    terms: text("terms"),
    journalId: uuid("journal_id").references(() => journals.id),
    createdBy: uuid("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("invoices_tenant_number_unique").on(table.tenantId, table.invoiceNumber),
    index("invoices_tenant_idx").on(table.tenantId),
    index("invoices_customer_idx").on(table.customerId),
    index("invoices_status_idx").on(table.status),
  ]
);

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 4 }).default("1"),
    unitPrice: decimal("unit_price", { precision: 18, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 5, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 18, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 18, scale: 2 }).default("0"),
    accountId: uuid("account_id").references(() => chartOfAccounts.id),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoice_lines_invoice_idx").on(table.invoiceId),
  ]
);

// ============================================================================
// ACCOUNTS PAYABLE - Suppliers & Bills
// ============================================================================

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    tradingName: varchar("trading_name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    mobile: varchar("mobile", { length: 50 }),
    fax: varchar("fax", { length: 50 }),
    website: varchar("website", { length: 255 }),
    taxNumber: varchar("tax_number", { length: 50 }),
    bankName: varchar("bank_name", { length: 100 }),
    bankBsb: varchar("bank_bsb", { length: 20 }),
    bankAccount: varchar("bank_account", { length: 50 }),
    paymentTermDays: integer("payment_term_days").default(30),
    address: text("address"),
    notes: text("notes"),
    accountId: uuid("account_id").references(() => chartOfAccounts.id),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("suppliers_tenant_code_unique").on(table.tenantId, table.code),
    index("suppliers_tenant_idx").on(table.tenantId),
  ]
);

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    billNumber: varchar("bill_number", { length: 50 }).notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id).notNull(),
    supplierInvoiceNumber: varchar("supplier_invoice_number", { length: 100 }),
    date: date("date").notNull(),
    dueDate: date("due_date").notNull(),
    status: billStatusEnum("status").default("draft").notNull(),
    subtotal: decimal("subtotal", { precision: 18, scale: 2 }).default("0"),
    taxTotal: decimal("tax_total", { precision: 18, scale: 2 }).default("0"),
    total: decimal("total", { precision: 18, scale: 2 }).default("0"),
    amountPaid: decimal("amount_paid", { precision: 18, scale: 2 }).default("0"),
    amountDue: decimal("amount_due", { precision: 18, scale: 2 }).default("0"),
    notes: text("notes"),
    journalId: uuid("journal_id").references(() => journals.id),
    createdBy: uuid("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bills_tenant_number_unique").on(table.tenantId, table.billNumber),
    index("bills_tenant_idx").on(table.tenantId),
    index("bills_supplier_idx").on(table.supplierId),
  ]
);

export const billLines = pgTable(
  "bill_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id").references(() => bills.id).notNull(),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 4 }).default("1"),
    unitPrice: decimal("unit_price", { precision: 18, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 18, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 18, scale: 2 }).default("0"),
    accountId: uuid("account_id").references(() => chartOfAccounts.id),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("bill_lines_bill_idx").on(table.billId),
  ]
);

// ============================================================================
// PAYROLL SCHEMA - PNG Compliant
// ============================================================================

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    employeeNumber: varchar("employee_number", { length: 50 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 20 }),
    nationalId: varchar("national_id", { length: 50 }), // PNG National ID
    taxNumber: varchar("tax_number", { length: 50 }), // IRC Tax Number
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    mobile: varchar("mobile", { length: 50 }),
    address: text("address"),
    emergencyContact: text("emergency_contact"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    position: varchar("position", { length: 100 }),
    department: varchar("department", { length: 100 }),
    employmentType: varchar("employment_type", { length: 50 }).default("full_time"),
    salaryType: varchar("salary_type", { length: 20 }).default("salary"), // salary/hourly
    baseSalary: decimal("base_salary", { precision: 18, scale: 2 }).default("0"),
    hourlyRate: decimal("hourly_rate", { precision: 18, scale: 2 }).default("0"),
    bankName: varchar("bank_name", { length: 100 }),
    bankBsb: varchar("bank_bsb", { length: 20 }),
    bankAccount: varchar("bank_account", { length: 50 }),
    superFund: varchar("super_fund", { length: 50 }), // Nasfund/Nambawan Super
    superMemberNumber: varchar("super_member_number", { length: 50 }),
    annualLeaveBalance: decimal("annual_leave_balance", { precision: 8, scale: 2 }).default("0"),
    sickLeaveBalance: decimal("sick_leave_balance", { precision: 8, scale: 2 }).default("0"),
    isActive: boolean("is_active").default(true),
    userId: uuid("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("employees_tenant_number_unique").on(table.tenantId, table.employeeNumber),
    index("employees_tenant_idx").on(table.tenantId),
  ]
);

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    payrollNumber: varchar("payroll_number", { length: 50 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    payDate: date("pay_date").notNull(),
    status: payrollStatusEnum("status").default("draft").notNull(),
    totalGross: decimal("total_gross", { precision: 18, scale: 2 }).default("0"),
    totalTax: decimal("total_tax", { precision: 18, scale: 2 }).default("0"),
    totalSuper: decimal("total_super", { precision: 18, scale: 2 }).default("0"),
    totalDeductions: decimal("total_deductions", { precision: 18, scale: 2 }).default("0"),
    totalNet: decimal("total_net", { precision: 18, scale: 2 }).default("0"),
    employeeCount: integer("employee_count").default(0),
    journalId: uuid("journal_id").references(() => journals.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    processedBy: uuid("processed_by").references(() => users.id),
    processedAt: timestamp("processed_at"),
    createdBy: uuid("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("payroll_runs_tenant_number_unique").on(table.tenantId, table.payrollNumber),
    index("payroll_runs_tenant_idx").on(table.tenantId),
    index("payroll_runs_status_idx").on(table.status),
  ]
);

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payrollRunId: uuid("payroll_run_id").references(() => payrollRuns.id).notNull(),
    employeeId: uuid("employee_id").references(() => employees.id).notNull(),
    grossPay: decimal("gross_pay", { precision: 18, scale: 2 }).default("0"),
    basePay: decimal("base_pay", { precision: 18, scale: 2 }).default("0"),
    overtime: decimal("overtime", { precision: 18, scale: 2 }).default("0"),
    allowances: decimal("allowances", { precision: 18, scale: 2 }).default("0"),
    bonuses: decimal("bonuses", { precision: 18, scale: 2 }).default("0"),
    salaryTax: decimal("salary_tax", { precision: 18, scale: 2 }).default("0"), // PNG IRC Salary & Wages Tax
    superannuation: decimal("superannuation", { precision: 18, scale: 2 }).default("0"),
    otherDeductions: decimal("other_deductions", { precision: 18, scale: 2 }).default("0"),
    netPay: decimal("net_pay", { precision: 18, scale: 2 }).default("0"),
    hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }),
    overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }),
    leaveHours: decimal("leave_hours", { precision: 8, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payslips_payroll_idx").on(table.payrollRunId),
    index("payslips_employee_idx").on(table.employeeId),
  ]
);

// ============================================================================
// INVENTORY SCHEMA
// ============================================================================

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("warehouses_tenant_code_unique").on(table.tenantId, table.code),
    index("warehouses_tenant_idx").on(table.tenantId),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    unit: varchar("unit", { length: 20 }).default("each"),
    costPrice: decimal("cost_price", { precision: 18, scale: 2 }).default("0"),
    sellPrice: decimal("sell_price", { precision: 18, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    reorderLevel: integer("reorder_level").default(0),
    reorderQuantity: integer("reorder_quantity").default(0),
    isActive: boolean("is_active").default(true),
    isSellable: boolean("is_sellable").default(true),
    isPurchasable: boolean("is_purchasable").default(true),
    incomeAccountId: uuid("income_account_id").references(() => chartOfAccounts.id),
    expenseAccountId: uuid("expense_account_id").references(() => chartOfAccounts.id),
    assetAccountId: uuid("asset_account_id").references(() => chartOfAccounts.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("products_tenant_sku_unique").on(table.tenantId, table.sku),
    index("products_tenant_idx").on(table.tenantId),
  ]
);

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id).notNull(),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 4 }).default("0"),
    reservedQuantity: decimal("reserved_quantity", { precision: 18, scale: 4 }).default("0"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("stock_levels_product_warehouse_unique").on(table.productId, table.warehouseId),
    index("stock_levels_product_idx").on(table.productId),
    index("stock_levels_warehouse_idx").on(table.warehouseId),
  ]
);

// ============================================================================
// ASSET MANAGEMENT
// ============================================================================

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    assetNumber: varchar("asset_number", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    location: varchar("location", { length: 255 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    purchaseDate: date("purchase_date"),
    purchasePrice: decimal("purchase_price", { precision: 18, scale: 2 }).default("0"),
    currentValue: decimal("current_value", { precision: 18, scale: 2 }).default("0"),
    accumulatedDepreciation: decimal("accumulated_depreciation", { precision: 18, scale: 2 }).default("0"),
    depreciationMethod: varchar("depreciation_method", { length: 50 }).default("straight_line"),
    usefulLife: integer("useful_life"), // months
    salvageValue: decimal("salvage_value", { precision: 18, scale: 2 }).default("0"),
    status: varchar("status", { length: 50 }).default("active"),
    assetAccountId: uuid("asset_account_id").references(() => chartOfAccounts.id),
    depreciationAccountId: uuid("depreciation_account_id").references(() => chartOfAccounts.id),
    accumulatedDepreciationAccountId: uuid("accumulated_depreciation_account_id").references(() => chartOfAccounts.id),
    assignedTo: uuid("assigned_to").references(() => employees.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("assets_tenant_number_unique").on(table.tenantId, table.assetNumber),
    index("assets_tenant_idx").on(table.tenantId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  events: many(events),
  accounts: many(chartOfAccounts),
  customers: many(customers),
  suppliers: many(suppliers),
  employees: many(employees),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
}));

export const journalsRelations = relations(journals, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [journals.tenantId],
    references: [tenants.id],
  }),
  lines: many(journalLines),
  createdByUser: one(users, {
    fields: [journals.createdBy],
    references: [users.id],
  }),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journal: one(journals, {
    fields: [journalLines.journalId],
    references: [journals.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lines: many(invoiceLines),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [bills.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [bills.supplierId],
    references: [suppliers.id],
  }),
  lines: many(billLines),
}));
