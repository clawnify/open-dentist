import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Map a color token (e.g. "sky") to a set of Tailwind classes for a card surface. */
export const colorPalette = {
  sky:     { bg: "bg-sky-100",     border: "border-sky-300",     text: "text-sky-900",     ring: "ring-sky-400",     dot: "bg-sky-500" },
  emerald: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-900", ring: "ring-emerald-400", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-100",   border: "border-amber-300",   text: "text-amber-900",   ring: "ring-amber-400",   dot: "bg-amber-500" },
  rose:    { bg: "bg-rose-100",    border: "border-rose-300",    text: "text-rose-900",    ring: "ring-rose-400",    dot: "bg-rose-500" },
  violet:  { bg: "bg-violet-100",  border: "border-violet-300",  text: "text-violet-900",  ring: "ring-violet-400",  dot: "bg-violet-500" },
  fuchsia: { bg: "bg-fuchsia-100", border: "border-fuchsia-300", text: "text-fuchsia-900", ring: "ring-fuchsia-400", dot: "bg-fuchsia-500" },
  teal:    { bg: "bg-teal-100",    border: "border-teal-300",    text: "text-teal-900",    ring: "ring-teal-400",    dot: "bg-teal-500" },
  orange:  { bg: "bg-orange-100",  border: "border-orange-300",  text: "text-orange-900",  ring: "ring-orange-400",  dot: "bg-orange-500" },
  slate:   { bg: "bg-slate-100",   border: "border-slate-300",   text: "text-slate-900",   ring: "ring-slate-400",   dot: "bg-slate-500" },
} as const;

export type ColorToken = keyof typeof colorPalette;

export function colorClasses(token: string | null | undefined): typeof colorPalette[ColorToken] {
  return colorPalette[(token as ColorToken)] ?? colorPalette.sky;
}

/** Format an ISO date string 'YYYY-MM-DD' or full datetime to a short date label. */
export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, opts ?? { year: "numeric", month: "short", day: "numeric" });
}

/** Format an ISO datetime to HH:MM. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** YYYY-MM-DD for a given Date in local time. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build a local-time ISO datetime 'YYYY-MM-DDTHH:MM:00' for a given date + minutes-from-midnight. */
export function localDateTime(date: string, minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Minutes-from-midnight of a local datetime ISO string. */
export function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
