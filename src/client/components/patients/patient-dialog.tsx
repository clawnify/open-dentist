import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api";
import { useApp } from "@/context";
import type { Patient } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When provided, the dialog edits this patient. Otherwise it creates a new one. */
  patient: Patient | null;
  onSaved?: (patient: Patient) => void;
}

export function PatientDialog({ open, onOpenChange, patient, onSaved }: Props) {
  const app = useApp();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [alerts, setAlerts] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirst(patient?.first_name ?? "");
    setLast(patient?.last_name ?? "");
    setDob(patient?.date_of_birth ?? "");
    setEmail(patient?.email ?? "");
    setPhone(patient?.phone ?? "");
    setAddress(patient?.address ?? "");
    setAlerts(patient?.medical_alerts ?? "");
    setNotes(patient?.notes ?? "");
  }, [open, patient]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!first.trim() || !last.trim()) {
      app.setError("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        first_name: first.trim(),
        last_name: last.trim(),
        date_of_birth: dob.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        medical_alerts: alerts.trim() || null,
        notes: notes.trim() || null,
      };
      const res = patient
        ? await api<{ patient: Patient }>("PUT", `/api/patients/${patient.id}`, body)
        : await api<{ patient: Patient }>("POST", "/api/patients", body);
      onSaved?.(res.patient);
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "New patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <Input value={first} onChange={(e) => setFirst(e.target.value)} required />
            </Field>
            <Field label="Last name *">
              <Input value={last} onChange={(e) => setLast(e.target.value)} required />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </div>
          <Field label="Medical alerts (comma-separated)">
            <Input
              value={alerts}
              onChange={(e) => setAlerts(e.target.value)}
              placeholder="e.g. allergy:penicillin, diabetes, anticoagulant"
            />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : patient ? "Save" : "Create"}
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
