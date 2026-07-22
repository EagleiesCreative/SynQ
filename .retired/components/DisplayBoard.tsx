"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/utils";
import { Volume2 } from "lucide-react";

interface CounterRow {
  id: string;
  name: string;
  is_active: boolean;
  ticket: {
    id: string;
    code: string;
    customer_name: string | null;
    service: { name: string; color: string } | null;
  } | null;
}

interface HistoryRow {
  id: string;
  code: string;
  status: string;
  called_at: string | null;
  service: { name: string; color: string } | null;
}

interface WaitingCount {
  service_id: string;
  name: string;
  color: string;
  count: number;
}

export function DisplayBoard({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [waiting, setWaiting] = useState<WaitingCount[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [lastCalledId, setLastCalledId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();

    const { data: countersData } = await supabase
      .from("counters")
      .select(
        "id, name, is_active, ticket:tickets!counters_current_ticket_fk(id, code, customer_name, service:services(name,color))"
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    setCounters((countersData as unknown as CounterRow[]) || []);

    const { data: services } = await supabase
      .from("services")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const serviceIds = (services || []).map((s: { id: string }) => s.id);

    const { data: historyData } = serviceIds.length
      ? await supabase
          .from("tickets")
          .select("id, code, status, called_at, service:services(name,color)")
          .in("service_id", serviceIds)
          .in("status", ["called", "serving", "served"])
          .order("called_at", { ascending: false })
          .limit(8)
      : { data: [] };

    setHistory((historyData as unknown as HistoryRow[]) || []);

    const { data: waitingTickets } = serviceIds.length
      ? await supabase
          .from("tickets")
          .select("service_id")
          .in("service_id", serviceIds)
          .eq("status", "waiting")
      : { data: [] };

    const counts = new Map<string, number>();
    (waitingTickets || []).forEach((t: { service_id: string }) => {
      counts.set(t.service_id, (counts.get(t.service_id) || 0) + 1);
    });

    setWaiting(
      (services || []).map((s: { id: string; name: string; color: string }) => ({
        service_id: s.id,
        name: s.name,
        color: s.color,
        count: counts.get(s.id) || 0,
      }))
    );
  }, [organizationId]);

  useEffect(() => {
    refresh();
    const supabase = createClient();

    const channel = supabase
      .channel("display-board")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          const t = payload.new as { id: string; status: string };
          if (t.status === "called") setLastCalledId(t.id);
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "counters" },
        () => refresh()
      )
      .subscribe();

    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(clock);
    };
  }, [refresh]);

  useEffect(() => {
    if (!lastCalledId) return;
    const t = setTimeout(() => setLastCalledId(null), 4000);
    return () => clearTimeout(t);
  }, [lastCalledId]);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-600 text-white font-semibold flex items-center justify-center text-sm">
            S
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            {organizationName} — Now Serving
          </h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {now
              ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : " "}
          </p>
          <p className="text-xs text-slate-400">
            {now
              ? now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : " "}
          </p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-8">
        <section className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Counters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {counters.map((c) => {
              const flashing = c.ticket && c.ticket.id === lastCalledId;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border bg-white p-6 shadow-card transition-all ${
                    flashing
                      ? "border-brand-400 ring-4 ring-brand-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-500">{c.name}</p>
                    {flashing && (
                      <Volume2 size={16} className="text-brand-500 animate-pulse-soft" />
                    )}
                  </div>
                  {c.ticket ? (
                    <>
                      <p className="text-5xl font-semibold text-slate-900 tracking-tight tabular-nums">
                        {c.ticket.code}
                      </p>
                      <p
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${c.ticket.service?.color}1a`,
                          color: c.ticket.service?.color,
                        }}
                      >
                        {c.ticket.service?.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-semibold text-slate-300">— — —</p>
                  )}
                </div>
              );
            })}
            {counters.length === 0 && (
              <p className="text-sm text-slate-400 col-span-full">
                No active counters yet.
              </p>
            )}
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-4">
            Recently called
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white shadow-card divide-y divide-slate-100">
            {history.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">No calls yet.</p>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: h.service?.color }}
                  />
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {h.code}
                  </span>
                  <span className="text-sm text-slate-500">
                    {h.service?.name}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {formatTime(h.called_at)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Waiting
          </h2>
          <div className="space-y-3">
            {waiting.map((w) => (
              <div
                key={w.service_id}
                className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-card"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: w.color }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {w.name}
                  </span>
                </div>
                <span className="text-lg font-semibold text-slate-900 tabular-nums">
                  {w.count}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
