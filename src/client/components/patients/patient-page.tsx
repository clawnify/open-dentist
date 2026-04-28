import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";
import { PatientOverview } from "./patient-overview";
import { ToothChart } from "./tooth-chart";
import { TreatmentPlan } from "./treatment-plan";
import { ClinicalNotes } from "./clinical-notes";
import { Billing } from "./billing";
import { PatientDialog } from "./patient-dialog";

interface Props {
  id: number;
  navigate: (to: string) => void;
}

export function PatientPage({ id, navigate }: Props) {
  const app = useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api<{ patient: Patient }>("GET", `/api/patients/${id}`);
        if (!cancelled) setPatient(data.patient);
      } catch (err) {
        if (!cancelled) app.setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, app]);

  async function deletePatient() {
    if (!patient) return;
    if (!confirm(`Delete ${patient.first_name} ${patient.last_name}? This removes all their records.`)) return;
    try {
      await api("DELETE", `/api/patients/${patient.id}`);
      navigate("/patients");
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!patient) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-medium">Patient not found</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>Back to patients</Button>
      </div>
    );
  }

  const alerts = (patient.medical_alerts ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {patient.date_of_birth && <span>{formatDate(patient.date_of_birth)}</span>}
              {patient.email && <span>{patient.email}</span>}
              {patient.phone && <span>{patient.phone}</span>}
              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {alerts.map((a) => (
                    <Badge key={a} variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={deletePatient} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chart">Tooth Chart</TabsTrigger>
            <TabsTrigger value="plan">Treatment Plan</TabsTrigger>
            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <PatientOverview patient={patient} />
          </TabsContent>
          <TabsContent value="chart" className="mt-4">
            <ToothChart patientId={patient.id} />
          </TabsContent>
          <TabsContent value="plan" className="mt-4">
            <TreatmentPlan patientId={patient.id} />
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            <ClinicalNotes patientId={patient.id} />
          </TabsContent>
          <TabsContent value="billing" className="mt-4">
            <Billing patientId={patient.id} />
          </TabsContent>
        </Tabs>
      </div>

      <PatientDialog
        open={editing}
        onOpenChange={setEditing}
        patient={patient}
        onSaved={(p) => setPatient(p)}
      />
    </div>
  );
}
