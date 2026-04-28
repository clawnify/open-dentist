import { useEffect, useMemo, useState } from "react";
import { Odontogram, type ToothConditionGroup, type ToothDetail } from "react-odontogram";
import "react-odontogram/style.css";
import { Eraser, Lock, Unlock } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ToothCondition, ToothConditionRow } from "@/types";

type Brush = ToothCondition | "erase";

const CONDITION_META: Record<ToothCondition, { label: string; fill: string; outline: string; chip: string }> = {
  caries:      { label: "Caries",       fill: "#fecaca", outline: "#dc2626", chip: "bg-rose-200 text-rose-900" },
  restoration: { label: "Restoration",  fill: "#fde68a", outline: "#d97706", chip: "bg-amber-200 text-amber-900" },
  crown:       { label: "Crown",        fill: "#ddd6fe", outline: "#7c3aed", chip: "bg-violet-200 text-violet-900" },
  endo:        { label: "Endo",         fill: "#fbcfe8", outline: "#db2777", chip: "bg-fuchsia-200 text-fuchsia-900" },
  implant:     { label: "Implant",      fill: "#99f6e4", outline: "#0d9488", chip: "bg-teal-200 text-teal-900" },
  missing:     { label: "Missing",      fill: "#cbd5e1", outline: "#64748b", chip: "bg-slate-200 text-slate-700" },
};

const BRUSH_ORDER: ToothCondition[] = ["caries", "restoration", "crown", "endo", "implant", "missing"];

export function ToothChart({ patientId }: { patientId: number }) {
  const app = useApp();
  const [conditions, setConditions] = useState<ToothConditionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [brush, setBrush] = useState<Brush>("caries");
  const [readOnly, setReadOnly] = useState(false);
  // Bumped after each tooth click to remount the chart and clear its
  // internal "selected" ring (the library's selection state is uncontrolled).
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api<{ conditions: ToothConditionRow[] }>(
          "GET",
          `/api/patients/${patientId}/tooth-chart`,
        );
        setConditions(data.conditions);
      } catch (err) {
        app.setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, app]);

  const teethConditions: ToothConditionGroup[] = useMemo(() => {
    return BRUSH_ORDER.map((c) => ({
      label: CONDITION_META[c].label,
      fillColor: CONDITION_META[c].fill,
      outlineColor: CONDITION_META[c].outline,
      teeth: conditions.filter((row) => row.condition === c && !row.surface).map((row) => `teeth-${row.tooth}`),
    })).filter((g) => g.teeth.length > 0);
  }, [conditions]);

  async function setToothCondition(fdi: string, next: ToothCondition | null) {
    try {
      // Replace any whole-tooth condition for this tooth.
      const existing = conditions.filter((c) => c.tooth === fdi && !c.surface);
      await Promise.all(existing.map((e) => api("DELETE", `/api/tooth-conditions/${e.id}`)));
      let nextLocal = conditions.filter((c) => !(c.tooth === fdi && !c.surface));

      if (next) {
        const res = await api<{ condition: ToothConditionRow }>("POST", "/api/tooth-conditions", {
          patient_id: patientId,
          tooth: fdi,
          condition: next,
        });
        nextLocal = [...nextLocal, res.condition];
      }
      setConditions(nextLocal);
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  function handleChange(selected: ToothDetail[]) {
    // singleSelect mode → either one tooth (newly clicked) or empty (re-click clears).
    if (!selected.length) return;
    const fdi = selected[0].notations.fdi;
    const existing = conditions.find((c) => c.tooth === fdi && !c.surface);

    // Toggle: clicking the same brush on an already-marked tooth clears it.
    // Erase brush always clears.
    if (brush === "erase" || (existing && existing.condition === brush)) {
      setToothCondition(fdi, null);
    } else {
      setToothCondition(fdi, brush);
    }

    // Force the library to drop its internal selection ring so the next click
    // is a fresh interaction rather than a deselect.
    setTick((t) => t + 1);
  }

  const counts = useMemo(() => {
    const out: Record<ToothCondition, number> = {
      caries: 0, restoration: 0, crown: 0, endo: 0, implant: 0, missing: 0,
    };
    for (const c of conditions) {
      if (!c.surface) out[c.condition]++;
    }
    return out;
  }, [conditions]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <span>Tooth chart</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">FDI numbering</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brush:</span>
            {BRUSH_ORDER.map((c) => (
              <BrushButton
                key={c}
                active={brush === c}
                disabled={readOnly}
                onClick={() => setBrush(c)}
                label={CONDITION_META[c].label}
                count={counts[c]}
                fill={CONDITION_META[c].fill}
                outline={CONDITION_META[c].outline}
              />
            ))}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setBrush("erase")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                brush === "erase"
                  ? "border-foreground/20 bg-foreground/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
                readOnly && "cursor-not-allowed opacity-50",
              )}
            >
              <Eraser className="h-3.5 w-3.5" />
              Erase
            </button>
            <button
              type="button"
              onClick={() => setReadOnly((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              {readOnly ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {readOnly ? "Read-only" : "Editing"}
            </button>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="odontogram-host mx-auto w-full max-w-md rounded-md bg-muted/30 p-2">
              <Odontogram
                key={`chart-${tick}-${readOnly ? "ro" : "rw"}`}
                singleSelect
                readOnly={readOnly}
                notation="FDI"
                showTooltip
                teethConditions={teethConditions}
                onChange={handleChange}
                styles={{ width: "100%", height: "auto" }}
              />
            </div>
          )}

          {!readOnly && (
            <p className="text-xs text-muted-foreground">
              Pick a brush above, then click any tooth to apply its condition. Click the same tooth again to clear it, or use <strong>Erase</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BrushButton({
  active, disabled, onClick, label, count, fill, outline,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  count: number;
  fill: string;
  outline: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "ring-2 ring-offset-1" : "hover:bg-accent",
        disabled && "cursor-not-allowed opacity-50",
      )}
      style={{
        borderColor: active ? outline : "var(--border)",
        background: active ? fill : "var(--background)",
        color: active ? outline : "var(--foreground)",
      }}
    >
      <span
        className="inline-block h-3 w-3 rounded-sm border"
        style={{ background: fill, borderColor: outline }}
      />
      {label}
      {count > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: outline, color: "white" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
