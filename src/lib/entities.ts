import type { Entity } from "./schema";
export type { Entity } from "./schema";

export const permissions = ["dashboard", "members", "plans", "services", "requests", "dispatch", "payments", "reports"] as const;
export const entityConfig: Record<Entity, { table: string; fields: string[]; required: string[]; status?: string[]; numbers?: string[] }> = {
  applications: { table: "applications", fields: ["name","email","phone","country","city","plan","eligibility","status","rejection_reason"], required: ["name","email","phone","plan"], status: ["Pending","Approved","Rejected"] },
  members: { table: "members", fields: ["name","first_name","last_name","email","phone","city","plan","status","activated_at"], required: ["first_name","last_name","email"], status: ["Pending Payment","Active","Suspended","Cancelled"] },
  plans: { table: "plans", fields: ["code","name","duration_years","price_inr","price_amount","currency","standard_price","intro_price_until","market","eligibility","hours_per_year","consultations_per_year","documentation_credit","description","plan_type","entitlements","included_services","service_limits","status","effective_from","version"], required: ["code","name","duration_years","price_amount","currency","market"], status: ["Active","Inactive","Draft"], numbers: ["duration_years","price_inr","price_amount","standard_price","hours_per_year","consultations_per_year","documentation_credit"] },
  services: { table: "services", fields: ["name","category","description","cities","duration_minutes","price_inr","eligibility","status"], required: ["name","category"], status: ["Active","Inactive"], numbers: ["duration_minutes","price_inr"] },
  requests: { table: "requests", fields: ["ticket","member","service","beneficiary","city","location","scheduled_at","duration_hours","priority","status","quote_inr","notes","pe_id"], required: ["member","service","city"], status: ["New","Pending Approval","Assigned","Confirmed","In Progress","Completed","Cancelled"], numbers: ["duration_hours","quote_inr"] },
  pes: { table: "pes", fields: ["name","email","phone","city","skills","shift_start","shift_end","status"], required: ["name","city"], status: ["Active","Inactive","On leave"] },
  payments: { table: "payments", fields: ["member","reference","kind","amount_inr","status","gateway_reference","invoice_number","paid_at"], required: ["member","amount_inr"], status: ["Pending","Paid","Failed","Refunded"], numbers: ["amount_inr"] },
  invoices: { table: "invoices", fields: ["invoice_number","member","amount_inr","due_date","status","payment_reference"], required: ["invoice_number","member","amount_inr"], status: ["Unpaid","Paid","Overdue","Void"], numbers: ["amount_inr"] },
};

export const labels: Record<string, string> = {
  dashboard: "Overview", members: "Members", applications: "Applications",
  plans: "Membership plans", services: "Service catalogue", requests: "Requests & bookings",
  dispatch: "Users", pes: "Users", payments: "Payments & invoices",
  reports: "Reports & audit",
};

export function permissionFor(entity: Entity): string {
  if (entity === "applications") return "members";
  if (entity === "pes") return "dispatch";
  if (entity === "invoices") return "payments";
  return entity;
}
