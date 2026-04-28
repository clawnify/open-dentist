-- ── Operatories (treatment rooms / chairs) ──────────────────────
CREATE TABLE IF NOT EXISTS operatories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'sky',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Practitioners (dentists, hygienists, assistants) ────────────
CREATE TABLE IF NOT EXISTS practitioners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dentist', -- 'dentist' | 'hygienist' | 'assistant'
  color TEXT NOT NULL DEFAULT 'teal',
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Treatment types (procedures) ────────────────────────────────
CREATE TABLE IF NOT EXISTS treatment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,                   -- e.g. 'D1110' (ADA code) or short label
  name TEXT NOT NULL,                   -- e.g. 'Adult Prophylaxis'
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  default_fee REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'sky',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Patients ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,                   -- ISO date 'YYYY-MM-DD'
  email TEXT,
  phone TEXT,
  address TEXT,
  medical_alerts TEXT,                  -- comma-separated tags: 'allergy:penicillin,heart-condition'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- ── Appointments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  practitioner_id INTEGER REFERENCES practitioners(id) ON DELETE SET NULL,
  operatory_id INTEGER NOT NULL REFERENCES operatories(id) ON DELETE CASCADE,
  treatment_type_id INTEGER REFERENCES treatment_types(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,             -- ISO datetime 'YYYY-MM-DDTHH:MM:SS'
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'arrived' | 'in_chair' | 'completed' | 'no_show' | 'cancelled'
  kind TEXT NOT NULL DEFAULT 'patient',     -- 'patient' | 'break' | 'lunch' | 'block'
  title TEXT,                           -- override title (used for break/lunch/block)
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_op_start ON appointments(operatory_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

-- ── Treatment plans ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS treatment_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_type_id INTEGER REFERENCES treatment_types(id) ON DELETE SET NULL,
  tooth TEXT,                           -- e.g. '14' (FDI) or '#3' (Universal)
  surface TEXT,                         -- 'M' | 'O' | 'D' | 'B' | 'L' | combinations
  fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'accepted' | 'completed' | 'declined'
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plan_patient ON treatment_plan_items(patient_id);

-- ── Clinical notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id INTEGER REFERENCES practitioners(id) ON DELETE SET NULL,
  note_date TEXT NOT NULL DEFAULT (datetime('now')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id, note_date DESC);

-- ── Tooth chart conditions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tooth_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth TEXT NOT NULL,                  -- '11'..'48' (FDI) or '1'..'32' (Universal)
  surface TEXT,                         -- 'M' | 'O' | 'D' | 'B' | 'L' | NULL for whole-tooth
  condition TEXT NOT NULL,              -- 'caries' | 'restoration' | 'crown' | 'missing' | 'implant' | 'endo'
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tooth_patient ON tooth_conditions(patient_id);

-- ── Invoices ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'paid' | 'void'
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  treatment_type_id INTEGER REFERENCES treatment_types(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ── Waiting list ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiting_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_type_id INTEGER REFERENCES treatment_types(id) ON DELETE SET NULL,
  preferred_practitioner_id INTEGER REFERENCES practitioners(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Appointments to make (recall reminders) ────────────────────
CREATE TABLE IF NOT EXISTS appointments_to_make (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_type_id INTEGER REFERENCES treatment_types(id) ON DELETE SET NULL,
  due_after TEXT,                       -- ISO date 'YYYY-MM-DD'
  source TEXT NOT NULL DEFAULT 'reception', -- 'reception' | 'patient' | 'system'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'scheduled' | 'cancelled'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Seed data (only inserted on first run) ─────────────────────
INSERT INTO operatories (name, color, sort_order)
SELECT 'Op 1', 'sky', 0
WHERE NOT EXISTS (SELECT 1 FROM operatories);

INSERT INTO operatories (name, color, sort_order)
SELECT 'Op 2', 'emerald', 1
WHERE (SELECT COUNT(*) FROM operatories) = 1;

INSERT INTO operatories (name, color, sort_order)
SELECT 'Op 3', 'amber', 2
WHERE (SELECT COUNT(*) FROM operatories) = 2;

INSERT INTO practitioners (name, role, color)
SELECT 'Dr. Lee', 'dentist', 'teal'
WHERE NOT EXISTS (SELECT 1 FROM practitioners);

INSERT INTO practitioners (name, role, color)
SELECT 'Dr. Patel', 'dentist', 'violet'
WHERE (SELECT COUNT(*) FROM practitioners) = 1;

INSERT INTO practitioners (name, role, color)
SELECT 'Sarah Kim', 'hygienist', 'rose'
WHERE (SELECT COUNT(*) FROM practitioners) = 2;

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'EXAM', 'Exam & Cleaning', 30, 120, 'sky'
WHERE NOT EXISTS (SELECT 1 FROM treatment_types);

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'FILL', 'Restoration / Filling', 45, 220, 'amber'
WHERE (SELECT COUNT(*) FROM treatment_types) = 1;

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'CROWN', 'Crown', 90, 1100, 'violet'
WHERE (SELECT COUNT(*) FROM treatment_types) = 2;

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'ENDO', 'Root Canal', 90, 950, 'rose'
WHERE (SELECT COUNT(*) FROM treatment_types) = 3;

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'EXT', 'Extraction', 30, 250, 'orange'
WHERE (SELECT COUNT(*) FROM treatment_types) = 4;

INSERT INTO treatment_types (code, name, duration_minutes, default_fee, color)
SELECT 'CONS', 'Consultation', 20, 80, 'emerald'
WHERE (SELECT COUNT(*) FROM treatment_types) = 5;
