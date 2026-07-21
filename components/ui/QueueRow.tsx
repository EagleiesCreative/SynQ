import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Badge } from "./Badge";
import { statusLabels, statusStyles, formatWaitDuration } from "@/lib/utils";

export interface QueueRowData {
  id: string;
  code: string;
  customerName?: string | null;
  partySize?: number;
  serviceName?: string;
  serviceColor?: string;
  status: string;
  createdAt: string;
}

export function QueueRow({
  ticket,
  actions,
}: {
  ticket: QueueRowData;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 sm:px-6 py-3 text-sm animate-row-in">
      <span className="w-16 shrink-0 font-semibold text-slate-900 tabular-nums">
        {ticket.code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-slate-800 flex items-center gap-1.5">
          {ticket.customerName || "Guest"}
          {!!ticket.partySize && ticket.partySize > 1 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-slate-400">
              <Users size={10} /> {ticket.partySize}
            </span>
          )}
        </p>
        {ticket.serviceName && (
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-400">
            {ticket.serviceColor && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: ticket.serviceColor }}
              />
            )}
            {ticket.serviceName}
          </p>
        )}
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-slate-400 tabular-nums">
        {formatWaitDuration(ticket.createdAt)}
      </span>
      <Badge className={`shrink-0 ${statusStyles[ticket.status]}`}>
        {statusLabels[ticket.status]}
      </Badge>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
