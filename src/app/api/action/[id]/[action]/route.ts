import { NextResponse } from "next/server";
import { apiUser, audit, entityConfig, entityName, fail, isResponse, permissionFor, pool } from "@/lib/api";
import { checkPeBooking } from "@/lib/scheduling";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; action: string }> };

export async function POST(request: Request, context: Context) {
  const { id, action } = await context.params;
  const data = await request.json().catch(() => null);
  const entity = entityName(String(data?.entity || ""));
  const valid = entity === "applications" ? ["approve", "reject"].includes(action) : entity === "requests" && ["assign", "status"].includes(action);
  if (!valid || !entity) return fail("Unsupported action", 400);
  const user = await apiUser(permissionFor(entity));
  if (isResponse(user)) return user;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (entity === "applications") {
      const { rows } = await client.query("SELECT * FROM applications WHERE id=$1 FOR UPDATE", [id]);
      const app = rows[0];
      if (!app) { await client.query("ROLLBACK"); return fail("Record not found", 404); }
      if (user.role === "City Admin" && app.city !== user.city) { await client.query("ROLLBACK"); return fail("Record not found", 404); }
      if (app.status !== "Pending") { await client.query("ROLLBACK"); return fail("Only pending applications can be reviewed", 409); }
      const reason = String(data?.reason || "").trim();
      if (action === "reject" && !reason) { await client.query("ROLLBACK"); return fail("A rejection reason is required"); }
      const status = action === "approve" ? "Approved" : "Rejected";
      await client.query("UPDATE applications SET status=$1,rejection_reason=$2,updated_at=now() WHERE id=$3", [status, action === "reject" ? reason : null, id]);
      if (action === "approve") {
        const [firstName, ...lastParts] = String(app.name).trim().split(/\s+/);
        await client.query(`INSERT INTO members(application_id,name,first_name,last_name,email,phone,city,plan,status)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,'Pending Payment')`, [id, app.name, firstName, lastParts.join(" "), app.email, app.phone, app.city, app.plan]);
      }
      await audit(client, user.email, action, "applications", id, { status, reason_recorded: !!reason });
    } else {
      const { rows } = await client.query("SELECT * FROM requests WHERE id=$1 FOR UPDATE", [id]);
      const job = rows[0];
      if (!job || (user.role === "City Admin" && job.city !== user.city)) { await client.query("ROLLBACK"); return fail("Record not found", 404); }
      if (action === "assign") {
        const peId = String(data?.pe_id || "");
        const reason = String(data?.reason || "").trim();
        if (!peId) { await client.query("ROLLBACK"); return fail("Select an active PE"); }
        if (!reason) { await client.query("ROLLBACK"); return fail("An assignment or reassignment reason is required"); }
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [peId]);
        try { await checkPeBooking(client, peId, job.city, job.scheduled_at, job.duration_hours, id); }
        catch (error) { await client.query("ROLLBACK"); return fail(error instanceof Error ? error.message : "Invalid PE assignment", 409); }
        await client.query("UPDATE requests SET pe_id=$1,status='Assigned',updated_at=now() WHERE id=$2", [peId, id]);
        await audit(client, user.email, "assign", "requests", id, { previous_pe_id: job.pe_id, new_pe_id: peId, reason });
      } else {
        const status = String(data?.status || "");
        if (!(entityConfig.requests.status || []).includes(status)) { await client.query("ROLLBACK"); return fail("Invalid request status"); }
        if (status === "Assigned" && !job.pe_id) { await client.query("ROLLBACK"); return fail("Assign a PE before marking this request Assigned", 409); }
        await client.query("UPDATE requests SET status=$1,updated_at=now() WHERE id=$2", [status, id]);
        await audit(client, user.email, "status", "requests", id, { status });
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") return fail("A related record already exists", 409);
    console.error("Operations action failed", error);
    return fail("Could not complete the requested action", 500);
  } finally { client.release(); }
}
