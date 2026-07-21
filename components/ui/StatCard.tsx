import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg mb-3",
          accent ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon size={18} />
      </div>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Card>
  );
}
