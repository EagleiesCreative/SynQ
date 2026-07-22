"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { moveTicketToFront } from "@/lib/actions/tickets";
import type { Service } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { QueueRow, type QueueRowData } from "@/components/ui/QueueRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ArrowUp, ListChecks } from "lucide-react";

interface TicketRow {
  id: string;
  code: string;
  status: string;
  customer_name: string | null;
  party_size: number;
  created_at: string;
  service_id: string;
  service: { name: string; color: string } | { name: string; color: string }[] | null;
}

const STATUS_FILTERS = [
  { value: "active", label: "Active (waiting + called + serving)" },
  { value: "waiting", label: "Waiting" },
  { value: "called", label: "Called" },
  { value: "serving", label: "Serving" },
  { value: "served", label: "Served today" },
  { value: "skipped", label: "No-show today" },
];

export function LiveQueueTable({ services }: { services: Service[] }) {
  const showToast = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sort, setSort] = useState<"longest" | "newest">("longest");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("tickets")
      .select(
        "id, code, status, customer_name, party_size, created_at, service_id, service:services(name,color)"
      )
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: true });

    setTickets((data as unknown as TicketRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    let rows = tickets;
    if (serviceFilter !== "all") {
      rows = rows.filter((t) => t.service_id === serviceFilter);
    }
    if (statusFilter === "active") {
      rows = rows.filter((t) => ["waiting", "called", "serving"].includes(t.status));
    } else {
      rows = rows.filter((t) => t.status === statusFilter);
    }
    rows = [...rows].sort((a, b) =>
      sort === "longest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)
    );
    return rows;
  }, [tickets, serviceFilter, statusFilter, sort]);

  async function moveToFront(ticket: TicketRow) {
    setBusyId(ticket.id);
    await moveTicketToFront(ticket.id, ticket.service_id);
    showToast({ message: `${ticket.code} moved to the front of the line` });
    setBusyId(null);
    load();
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Live queue</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-40"
            aria-label="Filter by service"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-56"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as "longest" | "newest")}
            className="w-40"
            aria-label="Sort order"
          >
            <option value="longest">Longest waiting</option>
            <option value="newest">Newest first</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing here"
          description="No tickets match the current filters."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((t) => {
            const service = Array.isArray(t.service) ? t.service[0] : t.service;
            const row: QueueRowData = {
              id: t.id,
              code: t.code,
              customerName: t.customer_name,
              partySize: t.party_size,
              serviceName: service?.name,
              serviceColor: service?.color,
              status: t.status,
              createdAt: t.created_at,
            };
            return (
              <QueueRow
                key={t.id}
                ticket={row}
                actions={
                  t.status === "waiting" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveToFront(t)}
                      disabled={busyId === t.id}
                      title="Move to front of line"
                    >
                      <ArrowUp size={14} /> Priority
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
