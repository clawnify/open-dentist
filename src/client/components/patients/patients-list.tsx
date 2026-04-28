import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "@/context";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";
import { PatientDialog } from "./patient-dialog";

export function PatientsList({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api<{ patients: Patient[] }>(
          "GET",
          q.trim() ? `/api/patients?q=${encodeURIComponent(q.trim())}` : "/api/patients",
        );
        if (!cancelled) setPatients(res.patients);
      } catch (err) {
        if (!cancelled) app.setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, app]);

  const visible = useMemo(() => patients, [patients]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Patients</h1>
        <div className="relative ml-auto w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          New patient
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {q ? "No patients match your search." : "No patients yet. Click “New patient” to add one."}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((p) => (
                  <TableRow
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      {p.last_name}, {p.first_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.date_of_birth ? formatDate(p.date_of_birth) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                    <TableCell>
                      {p.medical_alerts ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                          {p.medical_alerts.split(",").length} alert{p.medical_alerts.split(",").length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <PatientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={null}
        onSaved={(p) => {
          setPatients((prev) => [p, ...prev]);
          navigate(`/patients/${p.id}`);
        }}
      />
    </div>
  );
}
