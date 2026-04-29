import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FlaskConical, AlertTriangle } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import type { LabCase, LabStatus, Patient } from "@/types";

const STATUSES: LabStatus[] = ["sent", "in_lab", "received", "seated", "cancelled"];
const CASE_TYPES = ["Crown", "Bridge", "Inlay/Onlay", "Veneer", "Denture", "Partial", "Aligner", "Night Guard", "Implant Abutment", "Other"];

const STATUS_STYLE: Record<LabStatus, string> = {
  sent:      "bg-amber-100 text-amber-800 border-amber-200",
  in_lab:    "bg-sky-100 text-sky-800 border-sky-200",
  received:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  seated:    "bg-violet-100 text-violet-800 border-violet-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
};

export function LabPage({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [cases, setCases] = useState<LabCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LabStatus | "all">("all");
  const [editing, setEditing] = useState<LabCase | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const url = statusFilter === "all" ? "/api/lab-cases" : `/api/lab-cases?status=${statusFilter}`;
      const data = await api<{ cases: LabCase[] }>("GET", url);
      setCases(data.cases);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const overdueCount = useMemo(() => {
    const now = new Date().toISOString();
    return cases.filter((c) => c.due_at && c.due_at < now && !c.received_at && c.status !== "cancelled").length;
  }, [cases]);

  async function setStatus(id: number, status: LabStatus) {
    try {
      const patch: Partial<LabCase> = { status };
      if (status === "received" && !cases.find((c) => c.id === id)?.received_at) {
        patch.received_at = new Date().toISOString();
      }
      if (status === "seated") {
        patch.seated_at = new Date().toISOString();
      }
      const res = await api<{ case: LabCase }>("PUT", `/api/lab-cases/${id}`, patch);
      setCases((prev) => prev.map((c) => (c.id === id ? res.case : c)));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this lab case?")) return;
    try {
      await api("DELETE", `/api/lab-cases/${id}`);
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <FlaskConical className="h-5 w-5" /> Lab cases
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
          <div className="w-44">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LabStatus | "all")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{labelFor(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4" /> New case
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
            ) : cases.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No lab cases yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Lab</th>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Tooth</th>
                    <th className="px-3 py-2 font-semibold">Sent</th>
                    <th className="px-3 py-2 font-semibold">Due</th>
                    <th className="px-3 py-2 text-right font-semibold">Fee</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const overdue = c.due_at && c.due_at < new Date().toISOString() && !c.received_at && c.status !== "cancelled";
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/patients/${c.patient_id}`)}
                            className="font-medium hover:underline"
                          >
                            {c.first_name} {c.last_name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{c.lab_name}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => setEditing(c)} className="text-foreground hover:underline">
                            {c.case_type}
                          </button>
                          {c.shade && <span className="ml-1 text-xs text-muted-foreground">· {c.shade}</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{c.tooth ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.sent_at ? formatDate(c.sent_at) : "—"}</td>
                        <td className={cn("px-3 py-2", overdue ? "font-semibold text-rose-700" : "text-muted-foreground")}>
                          {c.due_at ? formatDate(c.due_at) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">${c.fee.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as LabStatus)}>
                            <SelectTrigger className={cn("h-7 w-[120px] text-xs", STATUS_STYLE[c.status])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s}>{labelFor(s)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Delete">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <LabCaseDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        caseRow={editing}
        onSaved={(c) => {
          if (editing) {
            setCases((prev) => prev.map((x) => (x.id === c.id ? c : x)));
          } else {
            setCases((prev) => [c, ...prev]);
          }
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function labelFor(s: LabStatus): string {
  if (s === "in_lab") return "In lab";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Lab case dialog ────────────────────────────────────────────────

function LabCaseDialog({
  open, onOpenChange, caseRow, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseRow: LabCase | null;
  onSaved: (c: LabCase) => void;
}) {
  const app = useApp();
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [labName, setLabName] = useState("");
  const [caseType, setCaseType] = useState("Crown");
  const [tooth, setTooth] = useState("");
  const [shade, setShade] = useState("");
  const [fee, setFee] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [practitionerId, setPractitionerId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (caseRow) {
      setPatientId(caseRow.patient_id);
      setPatientLabel(`${caseRow.first_name ?? ""} ${caseRow.last_name ?? ""}`.trim());
      setLabName(caseRow.lab_name);
      setCaseType(caseRow.case_type);
      setTooth(caseRow.tooth ?? "");
      setShade(caseRow.shade ?? "");
      setFee(caseRow.fee.toString());
      setSentAt(caseRow.sent_at ? caseRow.sent_at.slice(0, 10) : "");
      setDueAt(caseRow.due_at ? caseRow.due_at.slice(0, 10) : "");
      setPractitionerId(caseRow.practitioner_id?.toString() ?? "none");
      setNotes(caseRow.notes ?? "");
    } else {
      setPatientId(null);
      setPatientLabel("");
      setLabName("");
      setCaseType("Crown");
      setTooth("");
      setShade("");
      setFee("");
      setSentAt(new Date().toISOString().slice(0, 10));
      setDueAt("");
      setPractitionerId("none");
      setNotes("");
    }
  }, [open, caseRow]);

  useEffect(() => {
    const q = patientLabel.trim();
    if (!q || patientId) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ patients: Patient[] }>("GET", `/api/patients?q=${encodeURIComponent(q)}`);
        if (!cancelled) setResults(r.patients.slice(0, 5));
      } catch { /* ignore */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [patientLabel, patientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      app.setError("Pick a patient");
      return;
    }
    setBusy(true);
    try {
      const body = {
        patient_id: patientId,
        practitioner_id: practitionerId === "none" ? null : parseInt(practitionerId, 10),
        lab_name: labName.trim(),
        case_type: caseType,
        tooth: tooth.trim() || null,
        shade: shade.trim() || null,
        fee: parseFloat(fee) || 0,
        sent_at: sentAt ? `${sentAt}T00:00:00` : null,
        due_at: dueAt ? `${dueAt}T00:00:00` : null,
        notes: notes.trim() || null,
      };
      const res = caseRow
        ? await api<{ case: LabCase }>("PUT", `/api/lab-cases/${caseRow.id}`, body)
        : await api<{ case: LabCase }>("POST", "/api/lab-cases", body);
      onSaved(res.case);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{caseRow ? "Edit lab case" : "New lab case"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient *</Label>
            <div className="relative">
              <Input
                value={patientLabel}
                onChange={(e) => { setPatientLabel(e.target.value); setPatientId(null); }}
                placeholder="Type a name…"
              />
              {results.length > 0 && !patientId && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPatientId(p.id); setPatientLabel(`${p.first_name} ${p.last_name}`); setResults([]); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div className="font-medium">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-muted-foreground">{p.date_of_birth ?? p.email ?? p.phone ?? "—"}</div>
                    </button>
                  ))}
                </div>
              )}
              {patientLabel && !patientId && results.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">A new patient will be created on save.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lab *">
              <Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g. Glidewell" required />
            </Field>
            <Field label="Case type">
              <Select value={caseType} onValueChange={setCaseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tooth"><Input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="e.g. 14" /></Field>
            <Field label="Shade"><Input value={shade} onChange={(e) => setShade(e.target.value)} placeholder="e.g. A2" /></Field>
            <Field label="Fee"><Input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Sent"><Input type="date" value={sentAt} onChange={(e) => setSentAt(e.target.value)} /></Field>
            <Field label="Due"><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
            <Field label="Practitioner">
              <Select value={practitionerId} onValueChange={setPractitionerId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {app.practitioners.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : caseRow ? "Save" : "Create"}</Button>
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
