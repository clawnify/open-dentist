import { useMemo } from "react";
import { useApp } from "@/context";
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

const PX_PER_MIN = 1.6;           // ~ 24px per 15min row
const HEADER_H = 56;              // operatory header height

/** "6 AM" style hour label. */
function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function DayGrid({ date, operatories, appointments, onSlotClick, onAppointmentClick }: Props) {
  const { settings } = useApp();
  const DAY_START_MIN = settings.day_start_minute;
  const DAY_END_MIN = settings.day_end_minute;
  const SLOT_MIN = settings.slot_minutes;
  const PX_PER_SLOT = SLOT_MIN * PX_PER_MIN;
  const totalMinutes = Math.max(60, DAY_END_MIN - DAY_START_MIN);
  const totalHeight = totalMinutes * PX_PER_MIN;

  const hourLabels = useMemo(() => {
    const out: { hour: number; topPx: number }[] = [];
    const startHour = Math.floor(DAY_START_MIN / 60);
    const endHour = Math.ceil(DAY_END_MIN / 60);
    for (let h = startHour; h <= endHour; h++) {
      out.push({ hour: h, topPx: (h * 60 - DAY_START_MIN) * PX_PER_MIN });
    }
    return out;
  }, [DAY_START_MIN, DAY_END_MIN]);

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
    <div className="relative flex-1 overflow-auto bg-white">
      <div className="flex min-w-fit">
        {/* Hour gutter */}
        <div className="sticky left-0 z-20 w-16 shrink-0 bg-white">
          <div className="sticky top-0 z-10 border-b border-border/50 bg-white" style={{ height: HEADER_H }} />
          <div className="relative" style={{ height: totalHeight }}>
            {hourLabels.map(({ hour, topPx }) => (
              <div
                key={hour}
                className="absolute right-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70"
                style={{ top: topPx + 4 }}
              >
                {hourLabel(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Operatory columns */}
        {operatories.map((op, idx) => {
          const palette = colorClasses(op.color);
          const items = byOperatory.get(op.id) ?? [];
          const isFirst = idx === 0;
          return (
            <div
              key={op.id}
              className={cn("flex w-56 shrink-0 flex-col bg-white", !isFirst && "border-l border-border/50")}
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10 flex flex-col justify-center border-b border-border/50 bg-white px-4"
                style={{ height: HEADER_H }}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("inline-block h-2 w-2 rounded-full", palette.dot)} />
                  <span className="truncate text-sm font-semibold text-muted-foreground">
                    {op.name}
                  </span>
                </div>
              </div>

              <div className="relative" style={{ height: totalHeight }}>
                {/* Hour grid lines — very faint */}
                {hourLabels.map(({ hour, topPx }) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/40"
                    style={{ top: topPx }}
                  />
                ))}

                {/* Half-hour ticks — even fainter */}
                {hourLabels.slice(0, -1).map(({ hour, topPx }) => (
                  <div
                    key={`half-${hour}`}
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/20"
                    style={{ top: topPx + 30 * PX_PER_MIN }}
                  />
                ))}

                {/* Clickable empty slots */}
                {Array.from({ length: totalMinutes / SLOT_MIN }).map((_, i) => {
                  const slotMin = DAY_START_MIN + i * SLOT_MIN;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSlotClick(op.id, slotMin)}
                      className="absolute inset-x-0 cursor-cell transition-colors hover:bg-accent/30"
                      style={{ top: i * PX_PER_SLOT, height: PX_PER_SLOT }}
                      tabIndex={-1}
                      aria-label={`Add appointment at ${String(Math.floor(slotMin / 60)).padStart(2, "0")}:${String(slotMin % 60).padStart(2, "0")}`}
                    />
                  );
                })}

                {/* Appointments */}
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

                {/* Now indicator — z-30 so it sits above appointment cards
                    and slot hover states, but still below sticky headers. */}
                {nowTop !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30"
                    style={{ top: nowTop }}
                  >
                    <div className="relative h-px bg-rose-500/90">
                      {isFirst && (
                        <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Filler column — fills any remaining horizontal space when there are
            few operatories so the right side reads as the same canvas. */}
        <div className="flex min-w-0 flex-1 flex-col border-l border-border/50 bg-white">
          <div className="sticky top-0 z-10 border-b border-border/50 bg-white" style={{ height: HEADER_H }} />
          <div className="relative" style={{ height: totalHeight }}>
            {hourLabels.map(({ hour, topPx }) => (
              <div
                key={hour}
                className="pointer-events-none absolute inset-x-0 border-t border-border/40"
                style={{ top: topPx }}
              />
            ))}
            {hourLabels.slice(0, -1).map(({ hour, topPx }) => (
              <div
                key={`half-${hour}`}
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/20"
                style={{ top: topPx + 30 * PX_PER_MIN }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
