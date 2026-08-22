import {
  Calendar,
  Users,
  Settings,
  Stethoscope,
  FileBarChart2,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Route } from "@/hooks/use-router";

interface NavItem {
  label: string;
  icon: typeof Calendar;
  path?: string;
  match?: (r: Route) => boolean;
  disabled?: boolean;
}

const sections: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Practice",
    items: [
      { label: "Agenda",     icon: Calendar,      path: "/agenda",   match: (r) => r.name === "agenda" },
      { label: "Patients",   icon: Users,         path: "/patients", match: (r) => r.name === "patients" || r.name === "patient" },
      { label: "Lab cases",  icon: FlaskConical,  path: "/lab",      match: (r) => r.name === "lab" },
    ],
  },
  {
    heading: "Admin",
    items: [
      { label: "Reports",  icon: FileBarChart2, path: "/reports",  match: (r) => r.name === "reports" },
      { label: "Settings", icon: Settings,      path: "/settings", match: (r) => r.name === "settings" },
    ],
  },
];

export function Sidebar({
  route,
  navigate,
}: {
  route: Route;
  navigate: (to: string) => void;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Stethoscope className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">OpenDentist</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.heading} className="mb-4">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.match ? item.match(route) : false;
                const isDisabled = !!item.disabled;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => item.path && navigate(item.path)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active && "bg-sidebar-accent text-sidebar-accent-foreground",
                        !active && !isDisabled && "hover:bg-sidebar-accent/60",
                        isDisabled && "cursor-not-allowed text-muted-foreground/60",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isDisabled && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
