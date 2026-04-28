import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/context";
import { api } from "@/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localDateTime, minutesOfDay } from "@/lib/utils";
import type { Appointment, AppointmentKind, AppointmentStatus, NewAppointment, Patient } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When editing an existing appointment. */
  appointment: Appointment | null;
  /** Used when creating a new one — the day the user is currently viewing. */
  date: string;
  /** Default operatory + start minutes for a fresh appointment. */
  defaults?: { operatoryId: number; minutesFromMidnight: number };
}

const STATUSES: AppointmentStatus[] = ["scheduled", "arrived", "in_chair", "completed", "no_show", "cancelled"];
const KINDS: AppointmentKind[] = ["patient", "break", "lunch", "block"];

export function AppointmentDialog({ open, onOpenChange, appointment, date, defaults }: Props) {
  const app = useApp();
  const [kind, setKind] = useState<AppointmentKind>("patient");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [operatoryId, setOperatoryId] = useState<number | null>(null);
  const [practitionerId, setPractitionerId] = useState<number | null>(null);
  const [treatmentTypeId, setTreatmentTypeId] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [startTime, setStartTime] = useState(""); // 'HH:MM'
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize from props.
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setKind(appointment.kind);
      setStatus(appointment.status);
      setOperatoryId(appointment.operatory_id);
      setPractitionerId(appointment.practitioner_id);
      setTreatmentTypeId(appointment.treatment_type_id);
      setPatientId(appointment.patient_id);
      setPatientLabel(
        [appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).join(" "),
      );
      setStartTime(appointment.start_time.slice(11, 16));
      setEndTime(appointment.end_time.slice(11, 16));
      setTitle(appointment.title ?? "");
      setNotes(appointment.notes ?? "");
    } else {
      setKind("patient");
      setStatus("scheduled");
      setOperatoryId(defaults?.operatoryId ?? app.operatories[0]?.id ?? null);
      setPractitionerId(null);
      setTreatmentTypeId(null);
      setPatientId(null);
      setPatientLabel("");
      const startMin = defaults?.minutesFromMidnight ?? 9 * 60;
      const endMin = startMin + (app.treatmentTypes[0]?.duration_minutes ?? 30);
      setStartTime(toHHMM(startMin));
      setEndTime(toHHMM(endMin));
      setTitle("");
      setNotes("");
    }
  }, [open, appointment, defaults, app.operatories, app.treatmentTypes]);

  // Live search patients by typed label (only when no patient is yet selected).
  useEffect(() => {
    if (kind !== "patient") return;
    const q = patientLabel.trim();
    if (!q || patientId) { setPatientResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await api<{ patients: Patient[] }>("GET", `/api/patients?q=${encodeURIComponent(q)}`);
        if (!cancelled) setPatientResults(data.patients.slice(0, 6));
      } catch {
        /* ignore */
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [patientLabel, patientId, kind]);

  // When treatment type changes, push end time accordingly.
  useEffect(() => {
    if (!treatmentTypeId || !startTime) return;
    const tt = app.treatmentTypes.find((t) => t.id === treatmentTypeId);
    if (!tt) return;
    const startMin = parseHHMM(startTime);
    setEndTime(toHHMM(startMin + tt.duration_minutes));
  }, [treatmentTypeId, startTime, app.treatmentTypes]);

  const isCreate = !appointment;

  const dialogTitle = useMemo(() => {
    if (isCreate) return "New appointment";
    return "Edit appointment";
  }, [isCreate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operatoryId) {
      app.setError("Select an operatory");
      return;
    }
    const startMin = parseHHMM(startTime);
    const endMin = parseHHMM(endTime);
    if (Number.isNaN(startMin) || Number.isNaN(endMin) || endMin <= startMin) {
      app.setError("End time must be after start time");
      return;
    }
    setSaving(true);
    try {
      let patient_id = patientId;
      if (kind === "patient" && !patient_id && patientLabel.trim()) {
        // Auto-create a quick patient from the typed label.
        const [first, ...rest] = patientLabel.trim().split(/\s+/);
        const created = await app.createPatient({
          first_name: first,
          last_name: rest.join(" ") || "(unknown)",
        });
        patient_id = created.id;
      }

      const payload: NewAppointment = {
        operatory_id: operatoryId,
        practitioner_id: practitionerId ?? undefined,
        treatment_type_id: treatmentTypeId ?? undefined,
        patient_id: kind === "patient" ? patient_id : null,
        start_time: localDateTime(date, startMin),
        end_time: localDateTime(date, endMin),
        status,
        kind,
        title: title.trim() || null,
        notes: notes.trim() || null,
      };

      if (isCreate) {
        await app.createAppointment(payload);
      } else {
        await app.updateAppointment(appointment!.id, payload);
      }
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    if (!confirm("Delete this appointment?")) return;
    setSaving(true);
    try {
      await app.deleteAppointment(appointment.id);
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={kind} onValueChange={(v) => setKind(v as AppointmentKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{capitalize(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Operatory">
              <Select value={operatoryId?.toString() ?? ""} onValueChange={(v) => setOperatoryId(parseInt(v, 10))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {app.operatories.map((o) => (
                    <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {kind === "patient" ? (
            <div className="space-y-3">
              <Field label="Patient">
                <div className="relative">
                  <Input
                    value={patientLabel}
                    onChange={(e) => { setPatientLabel(e.target.value); setPatientId(null); }}
                    placeholder="Type a name…"
                  />
                  {patientResults.length > 0 && !patientId && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPatientId(p.id);
                            setPatientLabel(`${p.first_name} ${p.last_name}`);
                            setPatientResults([]);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <div className="font-medium">{p.first_name} {p.last_name}</div>
                          <div className="text-xs text-muted-foreground">{p.date_of_birth ?? p.email ?? p.phone ?? "—"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {patientLabel && !patientId && patientResults.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">A new patient will be created on save.</p>
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Practitioner">
                  <Select value={practitionerId?.toString() ?? "none"} onValueChange={(v) => setPractitionerId(v === "none" ? null : parseInt(v, 10))}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {app.practitioners.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Treatment">
                  <Select value={treatmentTypeId?.toString() ?? "none"} onValueChange={(v) => setTreatmentTypeId(v === "none" ? null : parseInt(v, 10))}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {app.treatmentTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.code} · {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          ) : (
            <Field label="Title (optional)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "lunch" ? "Lunch" : kind === "break" ? "Break" : "Block"} />
            </Field>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </Field>
            <Field label="End">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{capitalize(s.replace("_", " "))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>

          <DialogFooter className="items-center">
            {!isCreate && (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={saving} className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

void minutesOfDay; // imported for type completeness only
