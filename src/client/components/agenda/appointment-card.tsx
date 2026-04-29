import { Coffee, Utensils, Lock } from "lucide-react";
import { cn, colorClasses, formatTime } from "@/lib/utils";
import type { Appointment } from "@/types";

interface Props {
  appointment: Appointment;
  onClick: () => void;
  topPx: number;
  heightPx: number;
}

/** "10:20 AM" style */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function AppointmentCard({ appointment, onClick, topPx, heightPx }: Props) {
  const isBlock = appointment.kind !== "patient";

  if (isBlock) {
    const Icon =
      appointment.kind === "lunch" ? Utensils :
      appointment.kind === "break" ? Coffee :
      Lock;
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ top: topPx, height: heightPx }}
        className="absolute inset-x-1.5 flex items-center justify-center gap-2 rounded-lg bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/70"
      >
        <Icon className="h-3.5 w-3.5" />
        {appointment.title || appointment.kind}
      </button>
    );
  }

  const palette = colorClasses(appointment.treatment_color || "sky");
  const patientName =
    appointment.patient_first_name || appointment.patient_last_name
      ? `${appointment.patient_first_name ?? ""} ${appointment.patient_last_name ?? ""}`.trim()
      : appointment.title || "Unnamed";

  const isCompact = heightPx < 56;
  const isVeryCompact = heightPx < 36;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ top: topPx, height: heightPx }}
      className={cn(
        "absolute inset-x-1.5 flex flex-col items-start overflow-hidden rounded-lg px-3 py-2 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2",
        palette.bg,
        palette.text,
        palette.ring,
        appointment.status === "completed" && "opacity-70",
        appointment.status === "cancelled" && "opacity-50 line-through",
      )}
      title={`${patientName} · ${appointment.treatment_name ?? ""}`}
    >
      {!isVeryCompact && (
        <span className={cn("text-[11px] font-medium tabular-nums opacity-80")}>
          {timeLabel(appointment.start_time)}
        </span>
      )}
      <span className={cn("truncate font-semibold leading-tight", isCompact ? "text-xs" : "text-sm")}>
        {patientName}
      </span>
      {!isCompact && appointment.treatment_name && (
        <span className="mt-0.5 truncate text-[11px] opacity-70">
          {appointment.treatment_name}
        </span>
      )}
    </button>
  );
}

void formatTime;
