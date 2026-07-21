import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const ACTIVE_TICKET_KEY = "queue_active_ticket";

export function formatTicketCode(serviceCode: string, number: number) {
  return `${serviceCode}-${String(number).padStart(3, "0")}`;
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWaitDuration(createdAt: string, endAt?: string | null) {
  const start = new Date(createdAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m`;
}

export const statusLabels: Record<string, string> = {
  waiting: "Waiting",
  called: "Called",
  serving: "Serving",
  served: "Served",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

export const statusStyles: Record<string, string> = {
  waiting: "bg-slate-100 text-slate-600",
  called: "bg-brand-50 text-brand-700",
  serving: "bg-brand-100 text-brand-700",
  served: "bg-slate-100 text-slate-500",
  skipped: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};
