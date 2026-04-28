import { useApp } from "../context";
import { X } from "lucide-react";

export function ErrorBanner() {
  const { error, setError } = useApp();
  if (!error) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(90vw,520px)] -translate-x-1/2 items-start gap-3 rounded-md border border-destructive/30 bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-lg">
      <span className="flex-1">{error}</span>
      <button
        type="button"
        onClick={() => setError(null)}
        className="opacity-80 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
