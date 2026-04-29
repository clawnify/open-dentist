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
export interface PracticeSettings {
  day_start_minute: number;
  day_end_minute: number;
  slot_minutes: number;
}

const DEFAULT_SETTINGS: PracticeSettings = {
  day_start_minute: 7 * 60,
  day_end_minute: 19 * 60,
  slot_minutes: 15,
};

function parseSettings(raw: Record<string, string>): PracticeSettings {
  const num = (key: keyof PracticeSettings) => {
    const v = parseInt(raw[key], 10);
    return Number.isFinite(v) ? v : DEFAULT_SETTINGS[key];
  };
  return {
    day_start_minute: num("day_start_minute"),
    day_end_minute: num("day_end_minute"),
    slot_minutes: num("slot_minutes"),
  };
}

export function useAppState() {
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [appointmentsToMake, setAppointmentsToMake] = useState<AppointmentToMake[]>([]);
  const [settings, setSettings] = useState<PracticeSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLookups = useCallback(async () => {
    const [ops, prs, tts, st] = await Promise.all([
      api<{ operatories: Operatory[] }>("GET", "/api/operatories"),
      api<{ practitioners: Practitioner[] }>("GET", "/api/practitioners"),
      api<{ treatment_types: TreatmentType[] }>("GET", "/api/treatment-types"),
      api<{ settings: Record<string, string> }>("GET", "/api/settings").catch(() => ({ settings: {} as Record<string, string> })),
    ]);
    setOperatories(ops.operatories);
    setPractitioners(prs.practitioners);
    setTreatmentTypes(tts.treatment_types);
    setSettings(parseSettings(st.settings));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<PracticeSettings>) => {
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) body[k] = String(v);
    }
    const res = await api<{ settings: Record<string, string> }>("PUT", "/api/settings", body);
    setSettings(parseSettings(res.settings));
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
    settings,
    loading, error,
    setError,
    // refresh
    refreshLookups, refreshDay, refreshSidePanels,
    // mutations
    createAppointment, updateAppointment, deleteAppointment,
    searchPatients, createPatient,
    updateSettings,
  };
}

export type AppStateValue = ReturnType<typeof useAppState>;
