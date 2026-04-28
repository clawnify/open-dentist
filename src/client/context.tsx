import { createContext, useContext } from "react";
import type { AppStateValue } from "./hooks/use-app-state";

export const AppContext = createContext<AppStateValue | null>(null);

export function useApp(): AppStateValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}
