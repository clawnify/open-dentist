import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { InsurancePlan, InsuranceRank } from "@/types";

const RANK_STYLE: Record<InsuranceRank, string> = {
  primary:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  secondary: "bg-sky-100 text-sky-800 border-sky-200",
  tertiary:  "bg-violet-100 text-violet-800 border-violet-200",
};

export function InsuranceTab({ patientId }: { patientId: number }) {
  const app = useApp();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InsurancePlan | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api<{ plans: InsurancePlan[] }>("GET", `/api/patients/${patientId}/insurance`);
        setPlans(data.plans);
      } catch (err) {
        app.setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, app]);

  async function remove(id: number) {
    if (!confirm("Delete this insurance plan?")) return;
    try {
      await api("DELETE", `/api/insurance-plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          {plans.length} plan{plans.length === 1 ? "" : "s"} on file
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add insurance
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No insurance on file.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onEdit={() => setEditing(p)}
              onRemove={() => remove(p.id)}
            />
          ))}
        </div>
      )}

      <PlanDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        plan={editing}
        patientId={patientId}
        onSaved={(plan) => {
          if (editing) setPlans((prev) => prev.map((x) => (x.id === plan.id ? plan : x)));
          else setPlans((prev) => [...prev, plan].sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank)));
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function rankOrder(r: InsuranceRank): number {
  return r === "primary" ? 0 : r === "secondary" ? 1 : 2;
}

function PlanCard({ plan, onEdit, onRemove }: { plan: InsurancePlan; onEdit: () => void; onRemove: () => void }) {
  const dedRemaining = Math.max(0, plan.deductible_total - plan.deductible_used);
  const maxRemaining = Math.max(0, plan.max_annual - plan.max_used);
  const dedPct = plan.deductible_total > 0 ? (plan.deductible_used / plan.deductible_total) * 100 : 0;
  const maxPct = plan.max_annual > 0 ? (plan.max_used / plan.max_annual) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("uppercase", RANK_STYLE[plan.rank])}>{plan.rank}</Badge>
              <CardTitle className="text-base">{plan.carrier}</CardTitle>
            </div>
            {plan.member_id && (
              <div className="mt-1 text-xs text-muted-foreground">Member ID: <span className="font-mono">{plan.member_id}</span></div>
            )}
            {plan.group_id && (
              <div className="text-xs text-muted-foreground">Group: <span className="font-mono">{plan.group_id}</span></div>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Delete"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Detail label="Subscriber">{plan.subscriber_name || "—"}{plan.subscriber_dob && <span className="text-muted-foreground"> · {formatDate(plan.subscriber_dob)}</span>}</Detail>
          <Detail label="Copay">${plan.copay.toFixed(2)}</Detail>
          <Detail label="Effective">{plan.effective_date ? formatDate(plan.effective_date) : "—"}</Detail>
          <Detail label="Term">{plan.term_date ? formatDate(plan.term_date) : "—"}</Detail>
        </div>

        {plan.deductible_total > 0 && (
          <Progress
            label="Deductible"
            used={plan.deductible_used}
            total={plan.deductible_total}
            remaining={dedRemaining}
            pct={dedPct}
          />
        )}
        {plan.max_annual > 0 && (
          <Progress
            label="Annual maximum"
            used={plan.max_used}
            total={plan.max_annual}
            remaining={maxRemaining}
            pct={maxPct}
          />
        )}
        {plan.notes && <p className="text-xs text-muted-foreground">{plan.notes}</p>}
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Progress({ label, used, total, remaining, pct }: { label: string; used: number; total: number; remaining: number; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">${used.toFixed(0)} / ${total.toFixed(0)} · ${remaining.toFixed(0)} left</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────

function PlanDialog({
  open, onOpenChange, plan, patientId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: InsurancePlan | null;
  patientId: number;
  onSaved: (p: InsurancePlan) => void;
}) {
  const app = useApp();
  const [rank, setRank] = useState<InsuranceRank>("primary");
  const [carrier, setCarrier] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberDob, setSubscriberDob] = useState("");
  const [effective, setEffective] = useState("");
  const [term, setTerm] = useState("");
  const [copay, setCopay] = useState("0");
  const [dedTotal, setDedTotal] = useState("0");
  const [dedUsed, setDedUsed] = useState("0");
  const [maxAnnual, setMaxAnnual] = useState("0");
  const [maxUsed, setMaxUsed] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRank(plan?.rank ?? "primary");
    setCarrier(plan?.carrier ?? "");
    setMemberId(plan?.member_id ?? "");
    setGroupId(plan?.group_id ?? "");
    setSubscriberName(plan?.subscriber_name ?? "");
    setSubscriberDob(plan?.subscriber_dob ?? "");
    setEffective(plan?.effective_date ?? "");
    setTerm(plan?.term_date ?? "");
    setCopay(plan?.copay.toString() ?? "0");
    setDedTotal(plan?.deductible_total.toString() ?? "0");
    setDedUsed(plan?.deductible_used.toString() ?? "0");
    setMaxAnnual(plan?.max_annual.toString() ?? "0");
    setMaxUsed(plan?.max_used.toString() ?? "0");
    setNotes(plan?.notes ?? "");
  }, [open, plan]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!carrier.trim()) {
      app.setError("Carrier is required");
      return;
    }
    setBusy(true);
    try {
      const body = {
        patient_id: patientId,
        rank,
        carrier: carrier.trim(),
        member_id: memberId.trim() || null,
        group_id: groupId.trim() || null,
        subscriber_name: subscriberName.trim() || null,
        subscriber_dob: subscriberDob || null,
        effective_date: effective || null,
        term_date: term || null,
        copay: parseFloat(copay) || 0,
        deductible_total: parseFloat(dedTotal) || 0,
        deductible_used: parseFloat(dedUsed) || 0,
        max_annual: parseFloat(maxAnnual) || 0,
        max_used: parseFloat(maxUsed) || 0,
        notes: notes.trim() || null,
      };
      const res = plan
        ? await api<{ plan: InsurancePlan }>("PUT", `/api/insurance-plans/${plan.id}`, body)
        : await api<{ plan: InsurancePlan }>("POST", "/api/insurance-plans", body);
      onSaved(res.plan);
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
          <DialogTitle>{plan ? "Edit insurance plan" : "Add insurance plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rank">
              <Select value={rank} onValueChange={(v) => setRank(v as InsuranceRank)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="tertiary">Tertiary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Carrier *" className="col-span-2">
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Delta Dental" required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Member ID"><Input value={memberId} onChange={(e) => setMemberId(e.target.value)} /></Field>
            <Field label="Group ID"><Input value={groupId} onChange={(e) => setGroupId(e.target.value)} /></Field>
            <Field label="Subscriber name"><Input value={subscriberName} onChange={(e) => setSubscriberName(e.target.value)} /></Field>
            <Field label="Subscriber DOB"><Input type="date" value={subscriberDob} onChange={(e) => setSubscriberDob(e.target.value)} /></Field>
            <Field label="Effective date"><Input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
            <Field label="Term date"><Input type="date" value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Copay"><Input type="number" min="0" step="0.01" value={copay} onChange={(e) => setCopay(e.target.value)} /></Field>
            <Field label="Deductible total"><Input type="number" min="0" step="0.01" value={dedTotal} onChange={(e) => setDedTotal(e.target.value)} /></Field>
            <Field label="Deductible used"><Input type="number" min="0" step="0.01" value={dedUsed} onChange={(e) => setDedUsed(e.target.value)} /></Field>
            <Field label="Annual max"><Input type="number" min="0" step="0.01" value={maxAnnual} onChange={(e) => setMaxAnnual(e.target.value)} /></Field>
            <Field label="Max used"><Input type="number" min="0" step="0.01" value={maxUsed} onChange={(e) => setMaxUsed(e.target.value)} /></Field>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : plan ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
