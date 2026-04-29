import { useEffect, useState } from "react";
import {
  CalendarDays, CalendarRange, TrendingUp, Wallet, AlertTriangle, FlaskConical, Users, ListChecks,
} from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportsSummary } from "@/types";

export function ReportsPage() {
  const app = useApp();
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api<ReportsSummary>("GET", "/api/reports/summary");
        setData(res);
      } catch (err) {
        app.setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [app]);

  if (loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {loading ? "Loading…" : "No data"}
      </div>
    );
  }

  const completedRate = data.month_appointments
    ? Math.round((data.month_completed / data.month_appointments) * 100)
    : 0;
  const noShowRate = data.month_appointments
    ? Math.round((data.month_no_shows / data.month_appointments) * 100)
    : 0;
  const collectionRate = data.month_production
    ? Math.round((data.month_collections / data.month_production) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="text-xs text-muted-foreground">Practice KPIs · month-to-date</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={CalendarDays}  label="Today's appointments" value={data.today_appointments.toString()} tone="sky" />
          <KpiCard icon={CalendarRange} label="This week"             value={data.week_appointments.toString()}  tone="emerald" />
          <KpiCard icon={TrendingUp}    label="MTD production"        value={`$${data.month_production.toFixed(0)}`} sub={`${data.month_appointments} appts`} tone="violet" />
          <KpiCard icon={Wallet}        label="MTD collections"       value={`$${data.month_collections.toFixed(0)}`} sub={`${collectionRate}% of production`} tone="amber" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Completion vs no-show */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment outcomes (MTD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Bar label="Completed" count={data.month_completed} total={data.month_appointments || 1} pct={completedRate} tone="emerald" />
              <Bar label="No-shows"  count={data.month_no_shows}  total={data.month_appointments || 1} pct={noShowRate}    tone="rose" />
              <Bar label="Cancelled" count={data.month_cancelled} total={data.month_appointments || 1} pct={Math.round((data.month_cancelled / (data.month_appointments || 1)) * 100)} tone="slate" />
            </CardContent>
          </Card>

          {/* Operational alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Alert icon={ListChecks} label="Patients on waiting list" value={data.waiting_list_count} tone={data.waiting_list_count > 0 ? "sky" : "slate"} />
              <Alert icon={FlaskConical} label="Overdue lab cases" value={data.overdue_lab_cases} tone={data.overdue_lab_cases > 0 ? "rose" : "slate"} />
              <Alert icon={AlertTriangle} label="No-shows this month" value={data.month_no_shows} tone={data.month_no_shows > 0 ? "amber" : "slate"} />
            </CardContent>
          </Card>
        </div>

        {/* Aged receivables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aged receivables</CardTitle>
            <p className="text-xs text-muted-foreground">Outstanding balances by days since invoice issue</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ARBucket label="0–30 days"  amount={data.aged_receivables["0-30"]}  tone="emerald" />
            <ARBucket label="31–60 days" amount={data.aged_receivables["31-60"]} tone="amber" />
            <ARBucket label="61–90 days" amount={data.aged_receivables["61-90"]} tone="orange" />
            <ARBucket label="90+ days"   amount={data.aged_receivables["90+"]}   tone="rose" />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* By treatment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top treatments (MTD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.by_treatment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments this month yet.</p>
              ) : (
                data.by_treatment.slice(0, 8).map((row, i) => {
                  const max = data.by_treatment[0].n || 1;
                  return (
                    <Bar
                      key={`${row.name}-${i}`}
                      label={row.name}
                      count={row.n}
                      total={max}
                      pct={Math.round((row.n / max) * 100)}
                      tone="sky"
                    />
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* By marketing source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Patients by acquisition source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.by_source.length === 0 ? (
                <p className="text-sm text-muted-foreground">No patients yet.</p>
              ) : (
                data.by_source.slice(0, 8).map((row, i) => {
                  const max = data.by_source[0].n || 1;
                  return (
                    <Bar
                      key={`${row.source}-${i}`}
                      label={row.source}
                      count={row.n}
                      total={max}
                      pct={Math.round((row.n / max) * 100)}
                      tone="violet"
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const TONE: Record<string, { bg: string; border: string; text: string; bar: string; dot: string }> = {
  sky:     { bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-900",     bar: "bg-sky-500",     dot: "bg-sky-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-900",   bar: "bg-amber-500",   dot: "bg-amber-500" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-900",    bar: "bg-rose-500",    dot: "bg-rose-500" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-900",  bar: "bg-violet-500",  dot: "bg-violet-500" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-900",  bar: "bg-orange-500",  dot: "bg-orange-500" },
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-700",   bar: "bg-slate-400",   dot: "bg-slate-400" },
};

function KpiCard({ icon: Icon, label, value, sub, tone }: {
  icon: typeof CalendarDays; label: string; value: string; sub?: string; tone: keyof typeof TONE;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-lg border p-4", t.bg, t.border)}>
      <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80", t.text)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", t.text)}>{value}</div>
      {sub && <div className={cn("text-xs opacity-70", t.text)}>{sub}</div>}
    </div>
  );
}

function Bar({ label, count, total, pct, tone }: { label: string; count: number; total: number; pct: number; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{count} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${Math.min(100, (count / Math.max(total, 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

function Alert({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: number; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <div className={cn("flex items-center justify-between rounded-md border px-3 py-2", t.bg, t.border)}>
      <span className={cn("flex items-center gap-2 text-sm font-medium", t.text)}>
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className={cn("tabular-nums text-lg font-bold", t.text)}>{value}</span>
    </div>
  );
}

function ARBucket({ label, amount, tone }: { label: string; amount: number; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-lg border p-3", t.bg, t.border)}>
      <div className={cn("text-xs font-semibold uppercase tracking-wider opacity-80", t.text)}>{label}</div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", t.text)}>${amount.toFixed(0)}</div>
    </div>
  );
}
