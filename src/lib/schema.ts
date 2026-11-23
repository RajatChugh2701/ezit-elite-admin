import {
  boolean,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  city: text("city"),
  passwordHash: text("password_hash").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email), index("users_role_idx").on(t.role)]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);

export const applications = pgTable("applications", {
  id: id(), name: text("name").notNull(), email: text("email").notNull(), phone: text("phone").notNull(),
  country: text("country"), city: text("city"), plan: text("plan").notNull(), eligibility: text("eligibility"),
  status: text("status").notNull().default("Pending"), rejectionReason: text("rejection_reason"), peId: uuid("pe_id"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("applications_status_idx").on(t.status), index("applications_email_idx").on(t.email)]);

export const members = pgTable("members", {
  id: id(), applicationId: uuid("application_id").unique().references(() => applications.id, { onDelete: "set null" }),
  name: text("name").notNull(), firstName: text("first_name"), lastName: text("last_name"), email: text("email").notNull(), phone: text("phone"), city: text("city"), plan: text("plan"),
  status: text("status").notNull().default("Pending Payment"), activatedAt: timestamp("activated_at", { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("members_email_unique").on(t.email), index("members_status_idx").on(t.status)]);

export const delegates = pgTable("delegates", {
  id: id(), member: text("member").notNull(), name: text("name").notNull(), email: text("email").notNull(),
  relationship: text("relationship"), permissions: text("permissions"), expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("Invited"), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("delegates_member_idx").on(t.member), index("delegates_status_idx").on(t.status)]);

export const plans = pgTable("plans", {
  id: id(), code: text("code").notNull(), name: text("name").notNull(), durationYears: text("duration_years").notNull(),
  priceInr: text("price_inr"), priceAmount: text("price_amount"), currency: text("currency").notNull().default("INR"),
  standardPrice: text("standard_price"), introPriceUntil: text("intro_price_until"), market: text("market"), eligibility: text("eligibility"),
  hoursPerYear: text("hours_per_year"), consultationsPerYear: text("consultations_per_year"),
  documentationCredit: text("documentation_credit"), description: text("description"), planType: text("plan_type"),
  entitlements: text("entitlements"), includedServices: text("included_services"), serviceLimits: text("service_limits"),
  status: text("status").notNull().default("Active"), effectiveFrom: text("effective_from"),
  version: text("version"), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("plans_code_version_idx").on(t.code, t.version), index("plans_status_idx").on(t.status)]);

export const serviceCategories = pgTable("service_categories", {
  id: id(), name: text("name").notNull(), createdAt: createdAt(),
}, (t) => [uniqueIndex("service_categories_name_unique").on(t.name)]);

export const services = pgTable("services", {
  id: id(), name: text("name").notNull(), category: text("category").notNull().references(() => serviceCategories.name, { onDelete: "restrict" }), description: text("description"),
  cities: text("cities"), durationMinutes: text("duration_minutes"), priceInr: text("price_inr"), eligibility: text("eligibility"),
  status: text("status").notNull().default("Active"), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("services_status_idx").on(t.status), index("services_category_idx").on(t.category)]);

export const pes = pgTable("pes", {
  id: id(), name: text("name").notNull(), email: text("email"), phone: text("phone"), city: text("city").notNull(),
  skills: text("skills"), shiftStart: text("shift_start"), shiftEnd: text("shift_end"), status: text("status").notNull().default("Active"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("pes_city_status_idx").on(t.city, t.status)]);

export const requests = pgTable("requests", {
  id: id(), ticket: text("ticket").notNull(), member: text("member").notNull(), service: text("service").notNull(),
  beneficiary: text("beneficiary"), city: text("city").notNull(), location: text("location"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }), durationHours: text("duration_hours"), priority: text("priority"),
  status: text("status").notNull().default("New"), quoteInr: text("quote_inr"), notes: text("notes"),
  peId: uuid("pe_id").references(() => pes.id, { onDelete: "set null" }), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("requests_city_status_idx").on(t.city, t.status), index("requests_pe_schedule_idx").on(t.peId, t.scheduledAt)]);

export const payments = pgTable("payments", {
  id: id(), member: text("member").notNull(), reference: text("reference"), kind: text("kind"), amountInr: text("amount_inr").notNull(),
  status: text("status").notNull().default("Pending"), gatewayReference: text("gateway_reference"), invoiceNumber: text("invoice_number"),
  paidAt: timestamp("paid_at", { withTimezone: true }), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("payments_status_idx").on(t.status), index("payments_member_idx").on(t.member)]);

export const invoices = pgTable("invoices", {
  id: id(), invoiceNumber: text("invoice_number").notNull(), member: text("member").notNull(), amountInr: text("amount_inr").notNull(),
  dueDate: text("due_date"), status: text("status").notNull().default("Unpaid"), paymentReference: text("payment_reference"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("invoices_number_unique").on(t.invoiceNumber), index("invoices_status_idx").on(t.status)]);

export const tableSchemas = { applications, members, delegates, plans, services, requests, pes, payments, invoices };
export type Entity = Exclude<keyof typeof tableSchemas, "delegates">;
