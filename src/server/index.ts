import { Hono, type Context } from "hono";
import { z } from "zod";
import { initDB, query, get, run } from "./db";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  initDB(c.env.DB);
  await next();
});

// ── Helpers ────────────────────────────────────────────────────────

const intParam = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
};

async function parseJson<T>(c: Context, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, data: parsed.data };
}

// ── Operatories ────────────────────────────────────────────────────

const OperatoryInput = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  sort_order: z.number().int().optional(),
});

app.get("/api/operatories", async (c) => {
  const rows = await query("SELECT * FROM operatories ORDER BY sort_order, id");
  return c.json({ operatories: rows });
});

app.post("/api/operatories", async (c) => {
  const parsed = await parseJson(c, OperatoryInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { name, color, sort_order } = parsed.data;
  const result = await run(
    "INSERT INTO operatories (name, color, sort_order) VALUES (?, ?, COALESCE(?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM operatories)))",
    [name, color ?? "sky", sort_order ?? null],
  );
  const row = await get("SELECT * FROM operatories WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ operatory: row }, 201);
});

app.put("/api/operatories/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, OperatoryInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const fields = parsed.data;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE operatories SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM operatories WHERE id = ?", [id]);
  return c.json({ operatory: row });
});

app.delete("/api/operatories/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM operatories WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Practitioners ──────────────────────────────────────────────────

const PractitionerInput = z.object({
  name: z.string().min(1),
  role: z.enum(["dentist", "hygienist", "assistant"]).optional(),
  color: z.string().optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

app.get("/api/practitioners", async (c) => {
  const rows = await query("SELECT * FROM practitioners ORDER BY name");
  return c.json({ practitioners: rows });
});

app.post("/api/practitioners", async (c) => {
  const parsed = await parseJson(c, PractitionerInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { name, role, color, email, phone } = parsed.data;
  const result = await run(
    "INSERT INTO practitioners (name, role, color, email, phone) VALUES (?, ?, ?, ?, ?)",
    [name, role ?? "dentist", color ?? "teal", email ?? null, phone ?? null],
  );
  const row = await get("SELECT * FROM practitioners WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ practitioner: row }, 201);
});

app.put("/api/practitioners/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, PractitionerInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE practitioners SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM practitioners WHERE id = ?", [id]);
  return c.json({ practitioner: row });
});

app.delete("/api/practitioners/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM practitioners WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Treatment types ────────────────────────────────────────────────

const TreatmentTypeInput = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  duration_minutes: z.number().int().min(5).optional(),
  default_fee: z.number().min(0).optional(),
  color: z.string().optional(),
});

app.get("/api/treatment-types", async (c) => {
  const rows = await query("SELECT * FROM treatment_types ORDER BY code");
  return c.json({ treatment_types: rows });
});

app.post("/api/treatment-types", async (c) => {
  const parsed = await parseJson(c, TreatmentTypeInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { code, name, duration_minutes, default_fee, color } = parsed.data;
  const result = await run(
    "INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color) VALUES (?, ?, ?, ?, ?)",
    [code, name, duration_minutes ?? 30, default_fee ?? 0, color ?? "sky"],
  );
  const row = await get("SELECT * FROM treatment_types WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ treatment_type: row }, 201);
});

app.put("/api/treatment-types/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, TreatmentTypeInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE treatment_types SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM treatment_types WHERE id = ?", [id]);
  return c.json({ treatment_type: row });
});

app.delete("/api/treatment-types/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM treatment_types WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Patients ───────────────────────────────────────────────────────

const PatientInput = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  medical_alerts: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  referral_source: z.string().optional().nullable(),
});

app.get("/api/patients", async (c) => {
  const search = c.req.query("q")?.trim();
  if (search) {
    const like = `%${search}%`;
    const rows = await query(
      "SELECT * FROM patients WHERE last_name LIKE ? OR first_name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY last_name, first_name LIMIT 200",
      [like, like, like, like],
    );
    return c.json({ patients: rows });
  }
  const rows = await query("SELECT * FROM patients ORDER BY last_name, first_name LIMIT 500");
  return c.json({ patients: rows });
});

app.get("/api/patients/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get("SELECT * FROM patients WHERE id = ?", [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ patient: row });
});

app.post("/api/patients", async (c) => {
  const parsed = await parseJson(c, PatientInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO patients (first_name, last_name, date_of_birth, email, phone, address, medical_alerts, notes, referral_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [d.first_name, d.last_name, d.date_of_birth ?? null, d.email ?? null, d.phone ?? null, d.address ?? null, d.medical_alerts ?? null, d.notes ?? null, d.referral_source ?? null],
  );
  const row = await get("SELECT * FROM patients WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ patient: row }, 201);
});

app.put("/api/patients/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, PatientInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE patients SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM patients WHERE id = ?", [id]);
  return c.json({ patient: row });
});

app.delete("/api/patients/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM patients WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Appointments ───────────────────────────────────────────────────

const AppointmentInput = z.object({
  patient_id: z.number().int().nullable().optional(),
  practitioner_id: z.number().int().nullable().optional(),
  operatory_id: z.number().int(),
  treatment_type_id: z.number().int().nullable().optional(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(["scheduled", "arrived", "in_chair", "completed", "no_show", "cancelled"]).optional(),
  kind: z.enum(["patient", "break", "lunch", "block"]).optional(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const APPT_SELECT = `
  SELECT
    a.*,
    p.first_name as patient_first_name,
    p.last_name as patient_last_name,
    p.date_of_birth as patient_date_of_birth,
    pr.name as practitioner_name,
    pr.color as practitioner_color,
    o.name as operatory_name,
    tt.code as treatment_code,
    tt.name as treatment_name,
    tt.color as treatment_color
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
  LEFT JOIN practitioners pr ON pr.id = a.practitioner_id
  LEFT JOIN operatories o ON o.id = a.operatory_id
  LEFT JOIN treatment_types tt ON tt.id = a.treatment_type_id
`;

app.get("/api/appointments", async (c) => {
  // Day-view query: ?date=YYYY-MM-DD returns appointments overlapping that local day.
  const date = c.req.query("date");
  const patientId = intParam(c.req.query("patient_id"));
  if (patientId) {
    const rows = await query(`${APPT_SELECT} WHERE a.patient_id = ? ORDER BY a.start_time DESC LIMIT 200`, [patientId]);
    return c.json({ appointments: rows });
  }
  if (date) {
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;
    const rows = await query(
      `${APPT_SELECT} WHERE a.start_time < ? AND a.end_time > ? ORDER BY a.start_time`,
      [dayEnd, dayStart],
    );
    return c.json({ appointments: rows });
  }
  const rows = await query(`${APPT_SELECT} ORDER BY a.start_time DESC LIMIT 200`);
  return c.json({ appointments: rows });
});

app.post("/api/appointments", async (c) => {
  const parsed = await parseJson(c, AppointmentInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO appointments
       (patient_id, practitioner_id, operatory_id, treatment_type_id, start_time, end_time, status, kind, title, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.patient_id ?? null,
      d.practitioner_id ?? null,
      d.operatory_id,
      d.treatment_type_id ?? null,
      d.start_time,
      d.end_time,
      d.status ?? "scheduled",
      d.kind ?? "patient",
      d.title ?? null,
      d.notes ?? null,
    ],
  );
  const row = await get(`${APPT_SELECT} WHERE a.id = ?`, [result.lastInsertRowid]);
  return c.json({ appointment: row }, 201);
});

app.put("/api/appointments/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, AppointmentInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE appointments SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${APPT_SELECT} WHERE a.id = ?`, [id]);
  return c.json({ appointment: row });
});

app.delete("/api/appointments/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM appointments WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Treatment plan items ───────────────────────────────────────────

const TreatmentPlanItemInput = z.object({
  patient_id: z.number().int(),
  treatment_type_id: z.number().int().nullable().optional(),
  tooth: z.string().optional().nullable(),
  surface: z.string().optional().nullable(),
  fee: z.number().min(0).optional(),
  status: z.enum(["planned", "accepted", "completed", "declined"]).optional(),
  notes: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
});

app.get("/api/patients/:id/treatment-plan", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const rows = await query(
    `SELECT tpi.*, tt.code as treatment_code, tt.name as treatment_name, tt.color as treatment_color
     FROM treatment_plan_items tpi
     LEFT JOIN treatment_types tt ON tt.id = tpi.treatment_type_id
     WHERE tpi.patient_id = ?
     ORDER BY tpi.sort_order, tpi.id`,
    [id],
  );
  return c.json({ items: rows });
});

app.post("/api/treatment-plan-items", async (c) => {
  const parsed = await parseJson(c, TreatmentPlanItemInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO treatment_plan_items (patient_id, treatment_type_id, tooth, surface, fee, status, notes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM treatment_plan_items WHERE patient_id = ?)))`,
    [d.patient_id, d.treatment_type_id ?? null, d.tooth ?? null, d.surface ?? null, d.fee ?? 0, d.status ?? "planned", d.notes ?? null, d.sort_order ?? null, d.patient_id],
  );
  const row = await get(
    `SELECT tpi.*, tt.code as treatment_code, tt.name as treatment_name, tt.color as treatment_color
     FROM treatment_plan_items tpi LEFT JOIN treatment_types tt ON tt.id = tpi.treatment_type_id
     WHERE tpi.id = ?`,
    [result.lastInsertRowid],
  );
  return c.json({ item: row }, 201);
});

app.put("/api/treatment-plan-items/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, TreatmentPlanItemInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE treatment_plan_items SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(
    `SELECT tpi.*, tt.code as treatment_code, tt.name as treatment_name, tt.color as treatment_color
     FROM treatment_plan_items tpi LEFT JOIN treatment_types tt ON tt.id = tpi.treatment_type_id
     WHERE tpi.id = ?`,
    [id],
  );
  return c.json({ item: row });
});

app.delete("/api/treatment-plan-items/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM treatment_plan_items WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Clinical notes ─────────────────────────────────────────────────

const ClinicalNoteInput = z.object({
  patient_id: z.number().int(),
  practitioner_id: z.number().int().nullable().optional(),
  note_date: z.string().optional(),
  body: z.string().min(1),
});

app.get("/api/patients/:id/notes", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const rows = await query(
    `SELECT cn.*, pr.name as practitioner_name
     FROM clinical_notes cn LEFT JOIN practitioners pr ON pr.id = cn.practitioner_id
     WHERE cn.patient_id = ? ORDER BY cn.note_date DESC`,
    [id],
  );
  return c.json({ notes: rows });
});

app.post("/api/clinical-notes", async (c) => {
  const parsed = await parseJson(c, ClinicalNoteInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO clinical_notes (patient_id, practitioner_id, note_date, body) VALUES (?, ?, COALESCE(?, datetime('now')), ?)",
    [d.patient_id, d.practitioner_id ?? null, d.note_date ?? null, d.body],
  );
  const row = await get(
    `SELECT cn.*, pr.name as practitioner_name FROM clinical_notes cn LEFT JOIN practitioners pr ON pr.id = cn.practitioner_id WHERE cn.id = ?`,
    [result.lastInsertRowid],
  );
  return c.json({ note: row }, 201);
});

app.delete("/api/clinical-notes/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM clinical_notes WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Tooth chart conditions ─────────────────────────────────────────

const ToothConditionInput = z.object({
  patient_id: z.number().int(),
  tooth: z.string().min(1),
  surface: z.string().optional().nullable(),
  condition: z.enum(["caries", "restoration", "crown", "missing", "implant", "endo"]),
});

app.get("/api/patients/:id/tooth-chart", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const rows = await query(
    "SELECT * FROM tooth_conditions WHERE patient_id = ? ORDER BY tooth, surface",
    [id],
  );
  return c.json({ conditions: rows });
});

app.post("/api/tooth-conditions", async (c) => {
  const parsed = await parseJson(c, ToothConditionInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO tooth_conditions (patient_id, tooth, surface, condition) VALUES (?, ?, ?, ?)",
    [d.patient_id, d.tooth, d.surface ?? null, d.condition],
  );
  const row = await get("SELECT * FROM tooth_conditions WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ condition: row }, 201);
});

app.delete("/api/tooth-conditions/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM tooth_conditions WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Invoices ───────────────────────────────────────────────────────

const InvoiceInput = z.object({
  patient_id: z.number().int(),
  appointment_id: z.number().int().nullable().optional(),
  status: z.enum(["open", "paid", "void"]).optional(),
  total: z.number().min(0).optional(),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

app.get("/api/patients/:id/invoices", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const invoices = await query("SELECT * FROM invoices WHERE patient_id = ? ORDER BY issued_at DESC", [id]);
  return c.json({ invoices });
});

app.post("/api/invoices", async (c) => {
  const parsed = await parseJson(c, InvoiceInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO invoices (patient_id, appointment_id, status, total, amount_paid, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [d.patient_id, d.appointment_id ?? null, d.status ?? "open", d.total ?? 0, d.amount_paid ?? 0, d.notes ?? null],
  );
  const row = await get("SELECT * FROM invoices WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ invoice: row }, 201);
});

app.put("/api/invoices/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, InvoiceInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE invoices SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM invoices WHERE id = ?", [id]);
  return c.json({ invoice: row });
});

app.delete("/api/invoices/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM invoices WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Waiting list ───────────────────────────────────────────────────

const WaitingListInput = z.object({
  patient_id: z.number().int(),
  treatment_type_id: z.number().int().nullable().optional(),
  preferred_practitioner_id: z.number().int().nullable().optional(),
  duration_minutes: z.number().int().min(5).optional(),
  notes: z.string().optional().nullable(),
});

const WAITING_SELECT = `
  SELECT w.*, p.first_name, p.last_name, p.date_of_birth,
    tt.name as treatment_name, tt.color as treatment_color,
    pr.name as practitioner_name
  FROM waiting_list w
  LEFT JOIN patients p ON p.id = w.patient_id
  LEFT JOIN treatment_types tt ON tt.id = w.treatment_type_id
  LEFT JOIN practitioners pr ON pr.id = w.preferred_practitioner_id
`;

app.get("/api/waiting-list", async (c) => {
  const rows = await query(`${WAITING_SELECT} ORDER BY w.created_at DESC`);
  return c.json({ waiting: rows });
});

app.post("/api/waiting-list", async (c) => {
  const parsed = await parseJson(c, WaitingListInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO waiting_list (patient_id, treatment_type_id, preferred_practitioner_id, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)",
    [d.patient_id, d.treatment_type_id ?? null, d.preferred_practitioner_id ?? null, d.duration_minutes ?? 30, d.notes ?? null],
  );
  const row = await get(`${WAITING_SELECT} WHERE w.id = ?`, [result.lastInsertRowid]);
  return c.json({ entry: row }, 201);
});

app.delete("/api/waiting-list/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM waiting_list WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Appointments to make ───────────────────────────────────────────

const ToMakeInput = z.object({
  patient_id: z.number().int(),
  treatment_type_id: z.number().int().nullable().optional(),
  due_after: z.string().optional().nullable(),
  source: z.enum(["reception", "patient", "system"]).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["open", "scheduled", "cancelled"]).optional(),
});

const TO_MAKE_SELECT = `
  SELECT atm.*, p.first_name, p.last_name, p.date_of_birth,
    tt.name as treatment_name, tt.color as treatment_color
  FROM appointments_to_make atm
  LEFT JOIN patients p ON p.id = atm.patient_id
  LEFT JOIN treatment_types tt ON tt.id = atm.treatment_type_id
`;

app.get("/api/appointments-to-make", async (c) => {
  const source = c.req.query("source");
  const where = source ? " WHERE atm.source = ? AND atm.status = 'open'" : " WHERE atm.status = 'open'";
  const params = source ? [source] : [];
  const rows = await query(`${TO_MAKE_SELECT}${where} ORDER BY atm.created_at DESC`, params);
  return c.json({ to_make: rows });
});

app.post("/api/appointments-to-make", async (c) => {
  const parsed = await parseJson(c, ToMakeInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO appointments_to_make (patient_id, treatment_type_id, due_after, source, notes, status) VALUES (?, ?, ?, ?, ?, ?)",
    [d.patient_id, d.treatment_type_id ?? null, d.due_after ?? null, d.source ?? "reception", d.notes ?? null, d.status ?? "open"],
  );
  const row = await get(`${TO_MAKE_SELECT} WHERE atm.id = ?`, [result.lastInsertRowid]);
  return c.json({ entry: row }, 201);
});

app.put("/api/appointments-to-make/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, ToMakeInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE appointments_to_make SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${TO_MAKE_SELECT} WHERE atm.id = ?`, [id]);
  return c.json({ entry: row });
});

app.delete("/api/appointments-to-make/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM appointments_to_make WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Insurance plans ────────────────────────────────────────────────

const InsurancePlanInput = z.object({
  patient_id: z.number().int(),
  rank: z.enum(["primary", "secondary", "tertiary"]).optional(),
  carrier: z.string().min(1),
  member_id: z.string().optional().nullable(),
  group_id: z.string().optional().nullable(),
  subscriber_name: z.string().optional().nullable(),
  subscriber_dob: z.string().optional().nullable(),
  effective_date: z.string().optional().nullable(),
  term_date: z.string().optional().nullable(),
  copay: z.number().min(0).optional(),
  deductible_total: z.number().min(0).optional(),
  deductible_used: z.number().min(0).optional(),
  max_annual: z.number().min(0).optional(),
  max_used: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

app.get("/api/patients/:id/insurance", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  // Fall back to [] if the table doesn't exist yet (pre-migration dev DB).
  const rows = await query(
    "SELECT * FROM insurance_plans WHERE patient_id = ? ORDER BY CASE rank WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END",
    [id],
  ).catch(() => []);
  return c.json({ plans: rows });
});

app.post("/api/insurance-plans", async (c) => {
  const parsed = await parseJson(c, InsurancePlanInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO insurance_plans
       (patient_id, rank, carrier, member_id, group_id, subscriber_name, subscriber_dob,
        effective_date, term_date, copay, deductible_total, deductible_used, max_annual, max_used, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.patient_id, d.rank ?? "primary", d.carrier,
      d.member_id ?? null, d.group_id ?? null, d.subscriber_name ?? null, d.subscriber_dob ?? null,
      d.effective_date ?? null, d.term_date ?? null,
      d.copay ?? 0, d.deductible_total ?? 0, d.deductible_used ?? 0, d.max_annual ?? 0, d.max_used ?? 0,
      d.notes ?? null,
    ],
  );
  const row = await get("SELECT * FROM insurance_plans WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ plan: row }, 201);
});

app.put("/api/insurance-plans/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, InsurancePlanInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE insurance_plans SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM insurance_plans WHERE id = ?", [id]);
  return c.json({ plan: row });
});

app.delete("/api/insurance-plans/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM insurance_plans WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Lab cases ─────────────────────────────────────────────────────

const LabCaseInput = z.object({
  patient_id: z.number().int(),
  practitioner_id: z.number().int().nullable().optional(),
  treatment_type_id: z.number().int().nullable().optional(),
  lab_name: z.string().min(1),
  case_type: z.string().min(1),
  tooth: z.string().optional().nullable(),
  shade: z.string().optional().nullable(),
  fee: z.number().min(0).optional(),
  sent_at: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(),
  received_at: z.string().optional().nullable(),
  seated_at: z.string().optional().nullable(),
  status: z.enum(["sent", "in_lab", "received", "seated", "cancelled"]).optional(),
  notes: z.string().optional().nullable(),
});

const LAB_SELECT = `
  SELECT lc.*,
    p.first_name, p.last_name,
    pr.name as practitioner_name,
    tt.code as treatment_code, tt.name as treatment_name
  FROM lab_cases lc
  LEFT JOIN patients p ON p.id = lc.patient_id
  LEFT JOIN practitioners pr ON pr.id = lc.practitioner_id
  LEFT JOIN treatment_types tt ON tt.id = lc.treatment_type_id
`;

app.get("/api/lab-cases", async (c) => {
  const status = c.req.query("status");
  const where = status ? "WHERE lc.status = ?" : "";
  const params = status ? [status] : [];
  // Fall back to [] if the table doesn't exist yet (pre-migration dev DB).
  const rows = await query(`${LAB_SELECT} ${where} ORDER BY lc.due_at ASC, lc.id DESC`, params)
    .catch(() => []);
  return c.json({ cases: rows });
});

app.post("/api/lab-cases", async (c) => {
  const parsed = await parseJson(c, LabCaseInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO lab_cases
       (patient_id, practitioner_id, treatment_type_id, lab_name, case_type, tooth, shade, fee,
        sent_at, due_at, received_at, seated_at, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.patient_id, d.practitioner_id ?? null, d.treatment_type_id ?? null,
      d.lab_name, d.case_type, d.tooth ?? null, d.shade ?? null, d.fee ?? 0,
      d.sent_at ?? null, d.due_at ?? null, d.received_at ?? null, d.seated_at ?? null,
      d.status ?? "sent", d.notes ?? null,
    ],
  );
  const row = await get(`${LAB_SELECT} WHERE lc.id = ?`, [result.lastInsertRowid]);
  return c.json({ case: row }, 201);
});

app.put("/api/lab-cases/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, LabCaseInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE lab_cases SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${LAB_SELECT} WHERE lc.id = ?`, [id]);
  return c.json({ case: row });
});

app.delete("/api/lab-cases/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM lab_cases WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Reports ───────────────────────────────────────────────────────

app.get("/api/reports/summary", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = `${today.slice(0, 8)}01`;
  const startOfWeek = (() => {
    const d = new Date(`${today}T00:00:00`);
    const dow = d.getDay();
    const diff = (dow + 6) % 7; // make Monday the start
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  })();

  // Per-query .catch so a missing table/column on a partially-migrated dev DB
  // doesn't take down the whole report.
  const safeGet = <T,>(sql: string, params: unknown[] = [], fallback: T) =>
    get<T>(sql, params).catch(() => fallback as T | undefined).then((v) => v ?? fallback);
  const safeQuery = <T,>(sql: string, params: unknown[] = []): Promise<T[]> =>
    query<T>(sql, params).catch(() => [] as T[]);

  const [
    todayAppts,
    weekAppts,
    monthAppts,
    monthCompleted,
    monthNoShows,
    monthCancelled,
    byTreatmentRows,
    bySourceRows,
    productionRow,
    paidRow,
    aged0_30,
    aged31_60,
    aged61_90,
    aged90,
    overdueLabs,
    waitingCount,
  ] = await Promise.all([
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) = ? AND kind = 'patient'", [today], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) >= ? AND kind = 'patient'", [startOfWeek], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) >= ? AND kind = 'patient'", [startOfMonth], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) >= ? AND status = 'completed'", [startOfMonth], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) >= ? AND status = 'no_show'", [startOfMonth], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM appointments WHERE substr(start_time, 1, 10) >= ? AND status = 'cancelled'", [startOfMonth], { n: 0 }),
    safeQuery<{ name: string; n: number; total: number }>(
      `SELECT COALESCE(tt.name, 'Unspecified') as name, COUNT(*) as n, COALESCE(SUM(tt.default_fee), 0) as total
       FROM appointments a LEFT JOIN treatment_types tt ON tt.id = a.treatment_type_id
       WHERE substr(a.start_time, 1, 10) >= ? AND a.kind = 'patient'
       GROUP BY tt.id ORDER BY n DESC`,
      [startOfMonth],
    ),
    safeQuery<{ source: string; n: number }>(
      `SELECT COALESCE(NULLIF(referral_source, ''), 'Unknown') as source, COUNT(*) as n
       FROM patients GROUP BY source ORDER BY n DESC`,
    ),
    safeGet<{ total: number }>(
      "SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE substr(issued_at, 1, 10) >= ? AND status != 'void'",
      [startOfMonth], { total: 0 },
    ),
    safeGet<{ total: number }>(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM invoices WHERE substr(issued_at, 1, 10) >= ? AND status != 'void'",
      [startOfMonth], { total: 0 },
    ),
    safeGet<{ total: number }>(
      `SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices
       WHERE status = 'open' AND julianday('now') - julianday(issued_at) <= 30`, [], { total: 0 },
    ),
    safeGet<{ total: number }>(
      `SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices
       WHERE status = 'open' AND julianday('now') - julianday(issued_at) > 30 AND julianday('now') - julianday(issued_at) <= 60`, [], { total: 0 },
    ),
    safeGet<{ total: number }>(
      `SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices
       WHERE status = 'open' AND julianday('now') - julianday(issued_at) > 60 AND julianday('now') - julianday(issued_at) <= 90`, [], { total: 0 },
    ),
    safeGet<{ total: number }>(
      `SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices
       WHERE status = 'open' AND julianday('now') - julianday(issued_at) > 90`, [], { total: 0 },
    ),
    safeGet<{ n: number }>(
      `SELECT COUNT(*) as n FROM lab_cases WHERE due_at < datetime('now') AND received_at IS NULL AND status NOT IN ('cancelled', 'received', 'seated')`,
      [], { n: 0 },
    ),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM waiting_list", [], { n: 0 }),
  ]);

  return c.json({
    today_appointments: todayAppts.n ?? 0,
    week_appointments: weekAppts.n ?? 0,
    month_appointments: monthAppts.n ?? 0,
    month_completed: monthCompleted.n ?? 0,
    month_no_shows: monthNoShows.n ?? 0,
    month_cancelled: monthCancelled.n ?? 0,
    month_production: productionRow.total ?? 0,
    month_collections: paidRow.total ?? 0,
    by_treatment: byTreatmentRows,
    by_source: bySourceRows,
    aged_receivables: {
      "0-30": aged0_30.total ?? 0,
      "31-60": aged31_60.total ?? 0,
      "61-90": aged61_90.total ?? 0,
      "90+": aged90.total ?? 0,
    },
    overdue_lab_cases: overdueLabs.n ?? 0,
    waiting_list_count: waitingCount.n ?? 0,
  });
});

// ── Settings (key/value) ───────────────────────────────────────────

app.get("/api/settings", async (c) => {
  const rows = await query<{ key: string; value: string }>(
    "SELECT key, value FROM settings",
  ).catch(() => []);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return c.json({ settings: out });
});

app.put("/api/settings", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object") return c.json({ error: "Body must be an object" }, 400);
  const entries = Object.entries(body as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null);
  for (const [key, value] of entries) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, String(value)],
    );
  }
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return c.json({ settings: out });
});

// ── Health ─────────────────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
