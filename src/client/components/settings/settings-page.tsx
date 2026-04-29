import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Clock } from "lucide-react";
import { useApp } from "@/context";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, colorClasses } from "@/lib/utils";
import type { Operatory, Practitioner, PractitionerRole, TreatmentType } from "@/types";

const COLOR_TOKENS = ["sky", "emerald", "amber", "rose", "violet", "fuchsia", "teal", "orange", "slate"] as const;
const ROLES: PractitionerRole[] = ["dentist", "hygienist", "assistant"];

export function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="operatories">
          <TabsList>
            <TabsTrigger value="operatories">Operatories</TabsTrigger>
            <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
            <TabsTrigger value="treatments">Treatment types</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>
          <TabsContent value="operatories" className="mt-4">
            <OperatoriesTab />
          </TabsContent>
          <TabsContent value="practitioners" className="mt-4">
            <PractitionersTab />
          </TabsContent>
          <TabsContent value="treatments" className="mt-4">
            <TreatmentTypesTab />
          </TabsContent>
          <TabsContent value="hours" className="mt-4">
            <HoursTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Hours ──────────────────────────────────────────────────────────

function HoursTab() {
  const app = useApp();
  const [start, setStart] = useState(toHHMM(app.settings.day_start_minute));
  const [end, setEnd] = useState(toHHMM(app.settings.day_end_minute));
  const [slot, setSlot] = useState(app.settings.slot_minutes);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setStart(toHHMM(app.settings.day_start_minute));
    setEnd(toHHMM(app.settings.day_end_minute));
    setSlot(app.settings.slot_minutes);
  }, [app.settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const startMin = parseHHMM(start);
    const endMin = parseHHMM(end);
    if (Number.isNaN(startMin) || Number.isNaN(endMin)) {
      app.setError("Enter valid HH:MM times");
      return;
    }
    if (endMin <= startMin) {
      app.setError("End must be after start");
      return;
    }
    setBusy(true);
    try {
      await app.updateSettings({
        day_start_minute: startMin,
        day_end_minute: endMin,
        slot_minutes: slot,
      });
      setSavedAt(Date.now());
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Working hours
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Controls the time range shown on the agenda day-view and the granularity of bookable slots.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <FieldGroup label="Day starts">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </FieldGroup>
          <FieldGroup label="Day ends">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </FieldGroup>
          <FieldGroup label="Slot length">
            <Select value={slot.toString()} onValueChange={(v) => setSlot(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 30, 60].map((m) => (
                  <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
        {savedAt && (
          <p className="mt-3 text-xs text-emerald-700">Saved. The agenda will reflect the new hours immediately.</p>
        )}
      </CardContent>
    </Card>
  );
}

function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

// ── Operatories ────────────────────────────────────────────────────

function OperatoriesTab() {
  const app = useApp();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("sky");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("sky");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ operatory: Operatory }>("POST", "/api/operatories", {
        name: name.trim(),
        color,
      });
      app.refreshLookups();
      void res;
      setName("");
      setColor("sky");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number) {
    try {
      await api("PUT", `/api/operatories/${id}`, { name: editName.trim(), color: editColor });
      app.refreshLookups();
      setEditingId(null);
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this operatory? Existing appointments in it will be deleted too.")) return;
    try {
      await api("DELETE", `/api/operatories/${id}`);
      app.refreshLookups();
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operatories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="grid items-end gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[2fr_1fr_auto]">
          <FieldGroup label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Op 4" required />
          </FieldGroup>
          <FieldGroup label="Color">
            <ColorSelect value={color} onChange={setColor} />
          </FieldGroup>
          <Button type="submit" disabled={busy}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Color</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {app.operatories.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">No operatories yet.</td></tr>
              ) : app.operatories.map((o) => {
                const palette = colorClasses(o.color);
                const editing = editingId === o.id;
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {editing ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                          {o.name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <ColorSelect value={editColor} onChange={setEditColor} />
                      ) : (
                        <span className="capitalize text-muted-foreground">{o.color}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => save(o.id)}><Check className="h-4 w-4 text-emerald-600" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(o.id); setEditName(o.name); setEditColor(o.color); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Practitioners ──────────────────────────────────────────────────

function PractitionersTab() {
  const app = useApp();
  const [name, setName] = useState("");
  const [role, setRole] = useState<PractitionerRole>("dentist");
  const [color, setColor] = useState("teal");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ name: string; role: PractitionerRole; color: string }>({ name: "", role: "dentist", color: "teal" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api<{ practitioner: Practitioner }>("POST", "/api/practitioners", {
        name: name.trim(), role, color,
      });
      app.refreshLookups();
      setName("");
      setRole("dentist");
      setColor("teal");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number) {
    try {
      await api("PUT", `/api/practitioners/${id}`, edit);
      app.refreshLookups();
      setEditingId(null);
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this practitioner?")) return;
    try {
      await api("DELETE", `/api/practitioners/${id}`);
      app.refreshLookups();
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practitioners</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="grid items-end gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <FieldGroup label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FieldGroup>
          <FieldGroup label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as PractitionerRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Color">
            <ColorSelect value={color} onChange={setColor} />
          </FieldGroup>
          <Button type="submit" disabled={busy}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Color</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {app.practitioners.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No practitioners yet.</td></tr>
              ) : app.practitioners.map((p) => {
                const palette = colorClasses(p.color);
                const editing = editingId === p.id;
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {editing ? (
                        <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-8" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                          {p.name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {editing ? (
                        <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as PractitionerRole })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : p.role}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? <ColorSelect value={edit.color} onChange={(c) => setEdit({ ...edit, color: c })} /> : <span className="capitalize text-muted-foreground">{p.color}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => save(p.id)}><Check className="h-4 w-4 text-emerald-600" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(p.id); setEdit({ name: p.name, role: p.role, color: p.color }); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Treatment types ────────────────────────────────────────────────

function TreatmentTypesTab() {
  const app = useApp();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [fee, setFee] = useState("0");
  const [color, setColor] = useState("sky");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    try {
      await api<{ treatment_type: TreatmentType }>("POST", "/api/treatment-types", {
        code: code.trim(),
        name: name.trim(),
        duration_minutes: parseInt(duration, 10) || 30,
        default_fee: parseFloat(fee) || 0,
        color,
      });
      app.refreshLookups();
      setCode("");
      setName("");
      setDuration("30");
      setFee("0");
      setColor("sky");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this treatment type?")) return;
    try {
      await api("DELETE", `/api/treatment-types/${id}`);
      app.refreshLookups();
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="grid items-end gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_2fr_1fr_1fr_1fr_auto]">
          <FieldGroup label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EXAM" required /></FieldGroup>
          <FieldGroup label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exam & Cleaning" required /></FieldGroup>
          <FieldGroup label="Duration (min)"><Input type="number" min="5" value={duration} onChange={(e) => setDuration(e.target.value)} /></FieldGroup>
          <FieldGroup label="Default fee"><Input type="number" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} /></FieldGroup>
          <FieldGroup label="Color"><ColorSelect value={color} onChange={setColor} /></FieldGroup>
          <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> Add</Button>
        </form>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 text-right font-semibold">Duration</th>
                <th className="px-3 py-2 text-right font-semibold">Default fee</th>
                <th className="px-3 py-2 font-semibold">Color</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {app.treatmentTypes.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No treatment types yet.</td></tr>
              ) : app.treatmentTypes.map((t) => {
                const palette = colorClasses(t.color);
                return (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{t.duration_minutes} min</td>
                    <td className="px-3 py-2 text-right tabular-nums">${t.default_fee.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                        <span className="capitalize text-muted-foreground">{t.color}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ColorSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLOR_TOKENS.map((c) => (
          <SelectItem key={c} value={c}>
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2 w-2 rounded-full", colorClasses(c).dot)} />
              <span className="capitalize">{c}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
