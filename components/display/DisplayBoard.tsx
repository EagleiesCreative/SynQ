"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/database.types";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Full-screen TV board for a single queue.
 *
 * Layout: the number being served fills the centre, the next few numbers
 * ride a carousel down the right, and the queue name plus a live clock sit
 * along the top.
 */
export function DisplayBoard({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [current, setCurrent] = useState<Ticket | null>(null);
  const [upcoming, setUpcoming] = useState<Ticket[]>([]);
  const [waitingTotal, setWaitingTotal] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [flash, setFlash] = useState(false);
  const [live, setLive] = useState(false);
  const lastAnnounced = useRef<string | null>(null);

  // Clock. Rendered only after mount so server/client markup can't disagree.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ev }, { data: rows, count }] = await Promise.all([
      supabase
        .from("events")
        .select("current_ticket_id")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("tickets")
        .select("*", { count: "exact" })
        .eq("event_id", eventId)
        .in("status", ["waiting", "called", "serving"])
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    const all = (rows as Ticket[]) || [];
    const serving = all.find((t) => t.id === ev?.current_ticket_id) || null;
    const waiting = all.filter((t) => t.status === "waiting");

    setCurrent(serving);
    setUpcoming(waiting.slice(0, 4));
    setWaitingTotal(
      count ? Math.max(waiting.length, count - (serving ? 1 : 0)) : waiting.length
    );

    // Pulse whenever a different number comes up (or the same one is recalled).
    const stamp = serving ? `${serving.id}:${serving.called_at ?? ""}` : null;
    if (stamp && stamp !== lastAnnounced.current) {
      lastAnnounced.current = stamp;
      setFlash(true);
      setTimeout(() => setFlash(false), 2200);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`display-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${eventId}`,
        },
        load
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        load
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Safety net for a TV left running for days on a flaky connection.
    const poll = setInterval(load, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [eventId, load]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header: queue name + clock */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
            S
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {eventName}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              live ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {live ? (
              <Wifi size={15} aria-hidden="true" />
            ) : (
              <WifiOff size={15} aria-hidden="true" />
            )}
            {live ? "Live" : "Reconnecting"}
          </span>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
              {now
                ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "--:--"}
            </p>
            <p className="text-sm text-slate-500">
              {now
                ? now.toLocaleDateString([], {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-8 p-10 lg:grid-cols-[1fr_22rem]">
        {/* Now serving */}
        <section className="flex items-center justify-center">
          <div
            className={`w-full max-w-3xl rounded-[2rem] border p-14 text-center transition-all duration-500 ${
              flash
                ? "scale-[1.02] border-brand-400 bg-brand-50 shadow-[0_20px_60px_-25px] shadow-brand-500/40"
                : "border-slate-200 bg-white shadow-soft"
            }`}
          >
            <p className="text-lg font-semibold uppercase tracking-[0.3em] text-brand-600">
              Now serving
            </p>
            <p
              className={`mt-6 font-bold leading-none tabular-nums ${
                current
                  ? "text-[8rem] text-slate-900 sm:text-[11rem] lg:text-[13rem]"
                  : "text-[6rem] text-slate-300"
              }`}
            >
              {current?.code || "—"}
            </p>
            {current?.customer_name && (
              <p className="mt-6 text-3xl text-slate-600">{current.customer_name}</p>
            )}
            {!current && (
              <p className="mt-6 text-2xl text-slate-400">
                Please wait for the next number
              </p>
            )}
          </div>
        </section>

        {/* Upcoming carousel */}
        <aside className="flex flex-col">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Up next
          </p>
          <div className="flex-1 space-y-4 overflow-hidden">
            {upcoming.map((t, i) => (
              <div
                key={t.id}
                style={{ animationDelay: `${i * 90}ms` }}
                className={`animate-[slideUp_0.5s_ease-out_both] rounded-2xl border px-7 py-6 ${
                  i === 0
                    ? "border-brand-200 bg-white shadow-soft"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <p
                  className={`font-bold leading-none tabular-nums ${
                    i === 0 ? "text-6xl text-slate-900" : "text-4xl text-slate-500"
                  }`}
                >
                  {t.code}
                </p>
                {t.customer_name && (
                  <p
                    className={`mt-2 truncate ${
                      i === 0 ? "text-lg text-slate-600" : "text-sm text-slate-400"
                    }`}
                  >
                    {t.customer_name}
                  </p>
                )}
              </div>
            ))}

            {upcoming.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-7 py-10 text-center text-slate-400">
                Nobody waiting
              </div>
            )}
          </div>

          {waitingTotal > 0 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              {waitingTotal === 1
                ? "1 person waiting"
                : `${waitingTotal} people waiting`}
            </p>
          )}
        </aside>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[slideUp_0\\.5s_ease-out_both\\] {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
