import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, colorClasses } from "@/lib/utils";
import type { TreatmentPlanItem, TreatmentPlanStatus } from "@/types";

const STATUSES: TreatmentPlanStatus[] = ["planned", "accepted", "completed", "declined"];
const STATUS_STYLE: Record<TreatmentPlanStatus, string> = {
  planned:   "bg-sky-100 text-sky-800 border-sky-200",
  accepted:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  declined:  "bg-rose-100 text-rose-800 border-rose-200",
};

export function TreatmentPlan({ patientId }: { patientId: number }) {
  const app = useApp();
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for the inline "add row".
  const [treatmentTypeId, setTreatmentTypeId] = useState<string>("none");
  const [tooth, setTooth] = useState("");
  const [fee, setFee] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api<{ items: TreatmentPlanItem[] }>(
          "GET",
          `/api/patients/${patientId}/treatment-plan`,
        );
        setItems(data.items);
      } catch (err) {
        app.setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, app]);

  // Default the fee field when picking a treatment type.
  useEffect(() => {
    if (treatmentTypeId === "none") return;
    const tt = app.treatmentTypes.find((t) => t.id === parseInt(treatmentTypeId, 10));
    if (tt && !fee) setFee(String(tt.default_fee));
  }, [treatmentTypeId, app.treatmentTypes, fee]);

  const totals = useMemo(() => {
    const sum = (s: TreatmentPlanStatus) =>
      items.filter((i) => i.status === s).reduce((acc, i) => acc + i.fee, 0);
    return {
      planned: sum("planned"),
      accepted: sum("accepted"),
      completed: sum("completed"),
    };
  }, [items]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const tt = treatmentTypeId === "none" ? null : parseInt(treatmentTypeId, 10);
      const f = parseFloat(fee || "0") || 0;
      const res = await api<{ item: TreatmentPlanItem }>("POST", "/api/treatment-plan-items", {
        patient_id: patientId,
        treatment_type_id: tt,
        tooth: tooth.trim() || null,
        fee: f,
      });
      setItems((prev) => [...prev, res.item]);
      setTooth("");
      setFee("");
      setTreatmentTypeId("none");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function setStatus(id: number, status: TreatmentPlanStatus) {
    try {
      const res = await api<{ item: TreatmentPlanItem }>("PUT", `/api/treatment-plan-items/${id}`, { status });
      setItems((prev) => prev.map((i) => (i.id === id ? res.item : i)));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this plan item?")) return;
    try {
      await api("DELETE", `/api/treatment-plan-items/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Planned"   amount={totals.planned}   tone="sky" />
        <SummaryCard label="Accepted"  amount={totals.accepted}  tone="emerald" />
        <SummaryCard label="Completed" amount={totals.completed} tone="slate" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treatment plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addItem} className="grid grid-cols-1 items-end gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs">Treatment</Label>
              <Select value={treatmentTypeId} onValueChange={setTreatmentTypeId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {app.treatmentTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.code} · {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tooth</Label>
              <Input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="e.g. 14" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fee</Label>
              <Input type="number" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00" />
            </div>
            <Button type="submit" disabled={adding}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No plan items yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Treatment</th>
                    <th className="px-3 py-2 font-semibold">Tooth</th>
                    <th className="px-3 py-2 text-right font-semibold">Fee</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const palette = colorClasses(i.treatment_color || "sky");
                    return (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                            <span className="font-medium">
                              {i.treatment_name ?? "—"}
                            </span>
                            {i.treatment_code && (
                              <Badge variant="outline" className="text-[10px]">{i.treatment_code}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">{i.tooth ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${i.fee.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Select value={i.status} onValueChange={(v) => setStatus(i.id, v as TreatmentPlanStatus)}>
                            <SelectTrigger className={cn("h-7 w-[140px] text-xs", STATUS_STYLE[i.status])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Delete">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, amount, tone }: { label: string; amount: number; tone: "sky" | "emerald" | "slate" }) {
  const palette = colorClasses(tone);
  return (
    <div className={cn("rounded-lg border p-4", palette.bg, palette.border)}>
      <div className={cn("text-xs font-semibold uppercase tracking-wider", palette.text, "opacity-80")}>{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", palette.text)}>${amount.toFixed(2)}</div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
