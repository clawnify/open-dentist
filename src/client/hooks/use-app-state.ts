import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type {
  Appointment,
  AppointmentToMake,
  NewAppointment,
  Operatory,
  Patient,
  Practitioner,
  TreatmentType,
  WaitingListEntry,
} from "../types";

/**
 * Holds the data needed across the app shell — operatories, practitioners, treatment
 * types, plus the day's appointments. Per-patient detail data is fetched in the
 * patient-detail page itself to keep this hook lean.
 */
export function useAppState() {
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [appointmentsToMake, setAppointmentsToMake] = useState<AppointmentToMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLookups = useCallback(async () => {
    const [ops, prs, tts] = await Promise.all([
      api<{ operatories: Operatory[] }>("GET", "/api/operatories"),
      api<{ practitioners: Practitioner[] }>("GET", "/api/practitioners"),
      api<{ treatment_types: TreatmentType[] }>("GET", "/api/treatment-types"),
    ]);
    setOperatories(ops.operatories);
    setPractitioners(prs.practitioners);
    setTreatmentTypes(tts.treatment_types);
  }, []);

  const refreshDay = useCallback(async (date: string) => {
    const data = await api<{ appointments: Appointment[] }>("GET", `/api/appointments?date=${date}`);
    setAppointments(data.appointments);
  }, []);

  const refreshSidePanels = useCallback(async () => {
    const [w, m] = await Promise.all([
      api<{ waiting: WaitingListEntry[] }>("GET", "/api/waiting-list"),
      api<{ to_make: AppointmentToMake[] }>("GET", "/api/appointments-to-make"),
    ]);
    setWaitingList(w.waiting);
    setAppointmentsToMake(m.to_make);
  }, []);

  // Initial load.
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await refreshLookups();
        await refreshSidePanels();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshLookups, refreshSidePanels]);

  const createAppointment = useCallback(async (data: NewAppointment) => {
    const res = await api<{ appointment: Appointment }>("POST", "/api/appointments", data);
    setAppointments((prev) => [...prev, res.appointment].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return res.appointment;
  }, []);

  const updateAppointment = useCallback(async (id: number, patch: Partial<NewAppointment>) => {
    const res = await api<{ appointment: Appointment }>("PUT", `/api/appointments/${id}`, patch);
    setAppointments((prev) => prev.map((a) => (a.id === id ? res.appointment : a)));
    return res.appointment;
  }, []);

  const deleteAppointment = useCallback(async (id: number) => {
    await api("DELETE", `/api/appointments/${id}`);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const searchPatients = useCallback(async (q: string): Promise<Patient[]> => {
    const data = await api<{ patients: Patient[] }>(
      "GET",
      q ? `/api/patients?q=${encodeURIComponent(q)}` : "/api/patients",
    );
    return data.patients;
  }, []);

  const createPatient = useCallback(async (input: Partial<Patient> & { first_name: string; last_name: string }) => {
    const res = await api<{ patient: Patient }>("POST", "/api/patients", input);
    return res.patient;
  }, []);

  return {
    // data
    operatories, practitioners, treatmentTypes, appointments,
    waitingList, appointmentsToMake,
    loading, error,
    setError,
    // refresh
    refreshLookups, refreshDay, refreshSidePanels,
    // mutations
    createAppointment, updateAppointment, deleteAppointment,
    searchPatients, createPatient,
  };
}

export type AppStateValue = ReturnType<typeof useAppState>;
