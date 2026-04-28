// ── Core entities ──────────────────────────────────────────────────

export interface Operatory {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export type PractitionerRole = "dentist" | "hygienist" | "assistant";

export interface Practitioner {
  id: number;
  name: string;
  role: PractitionerRole;
  color: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface TreatmentType {
  id: number;
  code: string;
  name: string;
  duration_minutes: number;
  default_fee: number;
  color: string;
  created_at: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  medical_alerts: string | null;
  notes: string | null;
  created_at: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "in_chair"
  | "completed"
  | "no_show"
  | "cancelled";

export type AppointmentKind = "patient" | "break" | "lunch" | "block";

export interface Appointment {
  id: number;
  patient_id: number | null;
  practitioner_id: number | null;
  operatory_id: number;
  treatment_type_id: number | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  kind: AppointmentKind;
  title: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  patient_date_of_birth?: string | null;
  practitioner_name?: string | null;
  practitioner_color?: string | null;
  operatory_name?: string | null;
  treatment_code?: string | null;
  treatment_name?: string | null;
  treatment_color?: string | null;
}

export interface NewAppointment {
  patient_id?: number | null;
  practitioner_id?: number | null;
  operatory_id: number;
  treatment_type_id?: number | null;
  start_time: string;
  end_time: string;
  status?: AppointmentStatus;
  kind?: AppointmentKind;
  title?: string | null;
  notes?: string | null;
}

export type TreatmentPlanStatus = "planned" | "accepted" | "completed" | "declined";

export interface TreatmentPlanItem {
  id: number;
  patient_id: number;
  treatment_type_id: number | null;
  tooth: string | null;
  surface: string | null;
  fee: number;
  status: TreatmentPlanStatus;
  notes: string | null;
  sort_order: number;
  created_at: string;
  treatment_code?: string | null;
  treatment_name?: string | null;
  treatment_color?: string | null;
}

export interface ClinicalNote {
  id: number;
  patient_id: number;
  practitioner_id: number | null;
  note_date: string;
  body: string;
  created_at: string;
  practitioner_name?: string | null;
}

export type ToothCondition =
  | "caries"
  | "restoration"
  | "crown"
  | "missing"
  | "implant"
  | "endo";

export interface ToothConditionRow {
  id: number;
  patient_id: number;
  tooth: string;
  surface: string | null;
  condition: ToothCondition;
  recorded_at: string;
}

export interface Invoice {
  id: number;
  patient_id: number;
  appointment_id: number | null;
  issued_at: string;
  status: "open" | "paid" | "void";
  total: number;
  amount_paid: number;
  notes: string | null;
}

export interface WaitingListEntry {
  id: number;
  patient_id: number;
  treatment_type_id: number | null;
  preferred_practitioner_id: number | null;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  treatment_name?: string | null;
  treatment_color?: string | null;
  practitioner_name?: string | null;
}

export type ToMakeSource = "reception" | "patient" | "system";

export interface AppointmentToMake {
  id: number;
  patient_id: number;
  treatment_type_id: number | null;
  due_after: string | null;
  source: ToMakeSource;
  notes: string | null;
  status: "open" | "scheduled" | "cancelled";
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  treatment_name?: string | null;
  treatment_color?: string | null;
}
