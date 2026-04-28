import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, toIsoDate } from "@/lib/utils";

interface Props {
  date: string;
  onChange: (date: string) => void;
  onCreate: () => void;
}

export function DayToolbar({ date, onChange, onCreate }: Props) {
  const today = toIsoDate(new Date());

  const shift = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    onChange(toIsoDate(d));
  };

  const isToday = date === today;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant={isToday ? "default" : "outline"} size="sm" onClick={() => onChange(today)} className="ml-1">
          Today
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-sm font-medium outline-none"
        />
      </div>

      <div className="text-sm font-medium text-foreground">
        {formatDate(date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>

      <div className="ml-auto">
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4" />
          New appointment
        </Button>
      </div>
    </div>
  );
}
