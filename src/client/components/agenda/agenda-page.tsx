import { useEffect, useState } from "react";
import { useApp } from "@/context";
import { toIsoDate } from "@/lib/utils";
import type { Appointment } from "@/types";
import { DayToolbar } from "./day-toolbar";
import { DayGrid } from "./day-grid";
import { AppointmentDialog } from "./appointment-dialog";

export function AgendaPage() {
  const app = useApp();
  const [date, setDate] = useState<string>(() => toIsoDate(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [defaults, setDefaults] = useState<{ operatoryId: number; minutesFromMidnight: number } | undefined>();

  // Reload appointments whenever the day or operatory list changes.
  useEffect(() => {
    if (!app.operatories.length) return;
    app.refreshDay(date).catch((err) => app.setError((err as Error).message));
  }, [date, app.operatories.length]);

  function openCreate(operatoryId?: number, minutesFromMidnight?: number) {
    setEditing(null);
    setDefaults(
      operatoryId !== undefined && minutesFromMidnight !== undefined
        ? { operatoryId, minutesFromMidnight }
        : undefined,
    );
    setDialogOpen(true);
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setDefaults(undefined);
    setDialogOpen(true);
  }

  return (
    <>
      <DayToolbar date={date} onChange={setDate} onCreate={() => openCreate()} />
      <DayGrid
        date={date}
        operatories={app.operatories}
        appointments={app.appointments}
        onSlotClick={(opId, min) => openCreate(opId, min)}
        onAppointmentClick={openEdit}
      />
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        date={date}
        defaults={defaults}
      />
    </>
  );
}
