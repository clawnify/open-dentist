import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, toIsoDate } from "@/lib/utils";

interface Props {
  date: string;
  onChange: (date: string) => void;
  onCreate: () => void;
}

export function DayToolbar({ date, onChange, onCreate }: Props) {
  const today = toIsoDate(new Date());
  const isToday = date === today;

  const shift = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    onChange(toIsoDate(d));
  };

  return (
    <div className="flex items-center gap-3 border-b bg-white px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {formatDate(date, { month: "long", year: "numeric" })}
        </h2>
        <p className="text-xs text-muted-foreground">
          {formatDate(date, { weekday: "long", day: "numeric" })}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Prev | Today | Next pill */}
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous day"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(today)}
            className={
              "rounded-md px-3 py-1 text-sm font-medium transition-colors " +
              (isToday ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent")
            }
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next day"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Date picker */}
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />

        <div className="h-6 w-px bg-border" />

        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4" /> Add appointment
        </Button>
      </div>
    </div>
  );
}
