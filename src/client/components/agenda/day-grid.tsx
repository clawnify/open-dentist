import { useMemo } from "react";
import { cn, colorClasses, minutesOfDay } from "@/lib/utils";
import type { Appointment, Operatory } from "@/types";
import { AppointmentCard } from "./appointment-card";

interface Props {
  date: string;
  operatories: Operatory[];
  appointments: Appointment[];
  onSlotClick: (operatoryId: number, minutesFromMidnight: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const DAY_START_MIN = 7 * 60;     // 07:00
const DAY_END_MIN = 19 * 60;      // 19:00
const SLOT_MIN = 15;              // 15-min slots
const PX_PER_MIN = 1.6;           // ~ 24px per 15min row
const PX_PER_SLOT = SLOT_MIN * PX_PER_MIN;

export function DayGrid({ date, operatories, appointments, onSlotClick, onAppointmentClick }: Props) {
  const totalMinutes = DAY_END_MIN - DAY_START_MIN;
  const totalHeight = totalMinutes * PX_PER_MIN;

  const hourLabels = useMemo(() => {
    const out: { hour: number; topPx: number }[] = [];
    for (let h = DAY_START_MIN / 60; h <= DAY_END_MIN / 60; h++) {
      out.push({ hour: h, topPx: (h * 60 - DAY_START_MIN) * PX_PER_MIN });
    }
    return out;
  }, []);

  const byOperatory = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    for (const a of appointments) {
      const arr = map.get(a.operatory_id) ?? [];
      arr.push(a);
      map.set(a.operatory_id, arr);
    }
    return map;
  }, [appointments]);

  // "Now" indicator only for today.
  const todayIso = new Date().toISOString().slice(0, 10);
  const showNow = date === todayIso;
  const nowMin = minutesOfDay(new Date().toISOString());
  const nowTop = showNow && nowMin >= DAY_START_MIN && nowMin <= DAY_END_MIN
    ? (nowMin - DAY_START_MIN) * PX_PER_MIN
    : null;

  if (!operatories.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-center text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">No operatories yet</p>
          <p className="mt-1 text-sm">Add at least one operatory in Settings to start scheduling.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto bg-background">
      <div className="flex min-w-fit">
        {/* Hour gutter */}
        <div className="sticky left-0 z-20 w-16 shrink-0 border-r bg-card">
          <div className="sticky top-0 z-10 h-12 border-b bg-card" />
          <div className="relative" style={{ height: totalHeight }}>
            {hourLabels.map(({ hour, topPx }) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
                style={{ top: topPx }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {/* Operatory columns */}
        {operatories.map((op) => {
          const palette = colorClasses(op.color);
          const items = byOperatory.get(op.id) ?? [];
          return (
            <div key={op.id} className="flex w-56 shrink-0 flex-col border-r last:border-r-0">
              <div className={cn("sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-card px-3")}>
                <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                <span className="truncate text-sm font-semibold">{op.name}</span>
              </div>
              <div className="relative" style={{ height: totalHeight }}>
                {/* hour grid lines */}
                {hourLabels.map(({ hour, topPx }) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: topPx }}
                  />
                ))}
                {/* clickable empty slots */}
                {Array.from({ length: totalMinutes / SLOT_MIN }).map((_, i) => {
                  const slotMin = DAY_START_MIN + i * SLOT_MIN;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSlotClick(op.id, slotMin)}
                      className="absolute inset-x-0 cursor-cell hover:bg-accent/40"
                      style={{ top: i * PX_PER_SLOT, height: PX_PER_SLOT }}
                      tabIndex={-1}
                      aria-label={`Add appointment at ${String(Math.floor(slotMin / 60)).padStart(2, "0")}:${String(slotMin % 60).padStart(2, "0")}`}
                    />
                  );
                })}
                {/* appointments */}
                {items.map((a) => {
                  const startMin = minutesOfDay(a.start_time);
                  const endMin = minutesOfDay(a.end_time);
                  const top = (startMin - DAY_START_MIN) * PX_PER_MIN;
                  const height = Math.max((endMin - startMin) * PX_PER_MIN - 2, 24);
                  if (top + height < 0 || top > totalHeight) return null;
                  return (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      topPx={top}
                      heightPx={height}
                      onClick={() => onAppointmentClick(a)}
                    />
                  );
                })}
                {/* now indicator */}
                {nowTop !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-destructive" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
