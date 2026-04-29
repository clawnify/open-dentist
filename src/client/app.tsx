import { useAppState } from "./hooks/use-app-state";
import { useRouter } from "./hooks/use-router";
import { AppContext } from "./context";
import { Sidebar } from "./components/sidebar";
import { ErrorBanner } from "./components/error-banner";
import { AgendaPage } from "./components/agenda/agenda-page";
import { PatientsList } from "./components/patients/patients-list";
import { PatientPage } from "./components/patients/patient-page";
import { ReportsPage } from "./components/reports/reports-page";
import { LabPage } from "./components/lab/lab-page";
import { SettingsPage } from "./components/settings/settings-page";

export function App() {
  const state = useAppState();
  const { route, navigate } = useRouter();

  return (
    <AppContext.Provider value={state}>
      <div className="flex h-screen min-h-0 overflow-hidden">
        <Sidebar route={route} navigate={navigate} />
        <main className="flex flex-1 flex-col overflow-hidden">
          {state.loading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              {route.name === "agenda" && <AgendaPage />}
              {route.name === "patients" && <PatientsList navigate={navigate} />}
              {route.name === "patient" && <PatientPage id={route.id} navigate={navigate} />}
              {route.name === "reports" && <ReportsPage />}
              {route.name === "lab" && <LabPage navigate={navigate} />}
              {route.name === "settings" && <SettingsPage />}
              {route.name === "not-found" && (
                <Placeholder title="Not found" message="That page doesn't exist." />
              )}
            </>
          )}
        </main>
        <ErrorBanner />
      </div>
    </AppContext.Provider>
  );
}

function Placeholder({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
