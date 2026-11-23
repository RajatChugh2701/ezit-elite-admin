import "server-only";
import type { PoolClient } from "pg";

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const result = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(result.getTime()) ? null : result;
}
function duration(value: unknown): number {
  const hours = Number(value || 1);
  if (!Number.isFinite(hours) || hours <= 0) throw new Error("Booked work duration must be greater than zero");
  return hours;
}
function localClock(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
function checkShift(pe: { shift_start: string | null; shift_end: string | null }, start: Date) {
  if (pe.shift_start && pe.shift_end) {
    const clock = localClock(start);
    if (!(pe.shift_start <= clock && clock < pe.shift_end)) throw new Error("Appointment is outside the PE shift (India time)");
  }
}
export async function checkBookingUpdate(client: PoolClient, old: Record<string, unknown>, updates: Record<string, unknown>, id: string): Promise<string | null> {
  try {
    const pe = await client.query("SELECT city,shift_start,shift_end,status FROM pes WHERE id=$1", [old.pe_id]);
    if (!pe.rowCount || pe.rows[0].status !== "Active") return "Assigned PE is no longer active";
    const city = String(updates.city ?? old.city ?? "");
    if (pe.rows[0].city && city && pe.rows[0].city.toLowerCase() !== city.toLowerCase()) return "PE city does not match the service city";
    const start = asDate(updates.scheduled_at ?? old.scheduled_at);
    if (!start) return null;
    const hours = duration(updates.duration_hours ?? old.duration_hours);
    checkShift(pe.rows[0], start);
    const existing = await client.query("SELECT id,scheduled_at,duration_hours FROM requests WHERE pe_id=$1 AND status NOT IN ('Completed','Cancelled') AND id<>$2", [old.pe_id,id]);
    for (const row of existing.rows) {
      const other = asDate(row.scheduled_at);
      if (!other) continue;
      const otherEnd = other.getTime() + duration(row.duration_hours) * 3_600_000;
      if (start.getTime() < otherEnd && other.getTime() < start.getTime() + hours * 3_600_000) return "PE already has an overlapping booking";
    }
    return null;
  } catch (error) { return error instanceof Error ? error.message : "Invalid booking time"; }
}
export async function checkPeBooking(client: PoolClient, peId: string, city: string, scheduledAt: unknown, durationHours: unknown, excludeId: string) {
  const pe = await client.query("SELECT city,shift_start,shift_end,status FROM pes WHERE id=$1", [peId]);
  if (!pe.rowCount || pe.rows[0].status !== "Active") throw new Error("Select an active PE");
  if (pe.rows[0].city && city && pe.rows[0].city.toLowerCase() !== city.toLowerCase()) throw new Error("PE city does not match the service city");
  const start = asDate(scheduledAt);
  if (!start) return;
  const hours = duration(durationHours);
  checkShift(pe.rows[0], start);
  const existing = await client.query("SELECT id,scheduled_at,duration_hours FROM requests WHERE pe_id=$1 AND status NOT IN ('Completed','Cancelled') AND id<>$2", [peId,excludeId]);
  for (const row of existing.rows) {
    const other = asDate(row.scheduled_at);
    if (other && start.getTime() < other.getTime() + duration(row.duration_hours) * 3_600_000 && other.getTime() < start.getTime() + hours * 3_600_000) throw new Error("PE already has an overlapping booking");
  }
}
export { asDate, duration, checkShift };
