import { Coffee, Utensils, Lock, Clock } from "lucide-react";
import { cn, colorClasses, formatTime, formatDate } from "@/lib/utils";
import type { Appointment } from "@/types";

interface Props {
  appointment: Appointment;
  onClick: () => void;
  topPx: number;
  heightPx: number;
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
        className="absolute inset-x-1 flex items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/70"
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

  const dob = appointment.patient_date_of_birth ? formatDate(appointment.patient_date_of_birth) : null;
  const isCompact = heightPx < 50;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ top: topPx, height: heightPx }}
      className={cn(
        "absolute inset-x-1 flex flex-col items-stretch overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-all hover:shadow-md hover:ring-2",
        palette.bg,
        palette.border,
        palette.text,
        palette.ring,
        appointment.status === "completed" && "opacity-70",
        appointment.status === "cancelled" && "opacity-50 line-through",
      )}
      title={`${patientName} · ${appointment.treatment_name ?? ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{patientName}</span>
        {dob && !isCompact && <span className="shrink-0 text-[10px] opacity-70">{dob}</span>}
      </div>
      {!isCompact && (
        <div className="mt-0.5 flex items-center gap-1 text-[11px] opacity-80">
          <Clock className="h-3 w-3" />
          {formatTime(appointment.start_time)}–{formatTime(appointment.end_time)}
          {appointment.treatment_code && (
            <span className="ml-auto rounded bg-white/40 px-1 text-[10px] font-semibold">
              {appointment.treatment_code}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
