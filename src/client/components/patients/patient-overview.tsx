import { Mail, Phone, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";

export function PatientOverview({ patient }: { patient: Patient }) {
  const alerts = (patient.medical_alerts ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const age = patient.date_of_birth ? computeAge(patient.date_of_birth) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Detail icon={Calendar} label="Date of birth">
            {patient.date_of_birth ? (
              <>
                {formatDate(patient.date_of_birth)} {age !== null && <span className="text-muted-foreground">· {age} yrs</span>}
              </>
            ) : "—"}
          </Detail>
          <Detail icon={Mail} label="Email">
            {patient.email ? <a href={`mailto:${patient.email}`} className="text-primary hover:underline">{patient.email}</a> : "—"}
          </Detail>
          <Detail icon={Phone} label="Phone">
            {patient.phone ? <a href={`tel:${patient.phone}`} className="text-primary hover:underline">{patient.phone}</a> : "—"}
          </Detail>
          <Detail icon={MapPin} label="Address">
            {patient.address || "—"}
          </Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Medical alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts on file.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {alerts.map((a) => (
                <Badge key={a} variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.notes ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">{patient.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No general notes on file.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function computeAge(iso: string): number | null {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
