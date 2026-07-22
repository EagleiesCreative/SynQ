"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/database.types";

/**
 * Full-screen TV board for a single event queue.
 *
 * Layout: the number being served fills the centre, the next few numbers
 * ride a carousel down the right, and the event name plus a live clock sit
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
    setWaitingTotal(count ? Math.max(waiting.length, count - (serving ? 1 : 0)) : waiting.length);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();

    // Safety net in case the realtime socket drops on a TV left running.
    const poll = setInterval(load, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [eventId, load]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      {/* Header: event name + clock */}
      <header className="flex items-center justify-between border-b border-white/10 px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold">
            S
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {eventName}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
            {now
              ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "--:--"}
          </p>
          <p className="text-sm text-white/40">
            {now
              ? now.toLocaleDateString([], {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : ""}
          </p>
        </div>
      </header>

      <div className="grid flex-1 gap-8 p-10 lg:grid-cols-[1fr_22rem]">
        {/* Now serving */}
        <section className="flex items-center justify-center">
          <div
            className={`w-full max-w-3xl rounded-[2rem] border p-14 text-center transition-all duration-500 ${
              flash
                ? "scale-[1.02] border-brand-400 bg-brand-600/20 shadow-[0_0_90px_-10px] shadow-brand-500/60"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="text-lg font-medium uppercase tracking-[0.3em] text-brand-300">
              Now serving
            </p>
            <p
              className={`mt-6 font-bold leading-none tabular-nums ${
                current
                  ? "text-[8rem] sm:text-[11rem] lg:text-[13rem]"
                  : "text-[6rem] text-white/25"
              } ${flash ? "animate-pulse" : ""}`}
            >
              {current?.code || "—"}
            </p>
            {current?.customer_name && (
              <p className="mt-6 text-3xl text-white/70">{current.customer_name}</p>
            )}
            {!current && (
              <p className="mt-6 text-2xl text-white/40">
                Please wait for the next number
              </p>
            )}
          </div>
        </section>

        {/* Upcoming carousel */}
        <aside className="flex flex-col">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-white/40">
            Up next
          </p>
          <div className="flex-1 space-y-4 overflow-hidden">
            {upcoming.map((t, i) => (
              <div
                key={t.id}
                style={{ animationDelay: `${i * 90}ms` }}
                className={`animate-[slideUp_0.5s_ease-out_both] rounded-2xl border px-7 py-6 ${
                  i === 0
                    ? "border-brand-400/40 bg-white/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p
                  className={`font-bold leading-none tabular-nums ${
                    i === 0 ? "text-6xl text-white" : "text-4xl text-white/55"
                  }`}
                >
                  {t.code}
                </p>
                {t.customer_name && (
                  <p
                    className={`mt-2 truncate ${
                      i === 0 ? "text-lg text-white/60" : "text-sm text-white/35"
                    }`}
                  >
                    {t.customer_name}
                  </p>
                )}
              </div>
            ))}

            {upcoming.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-7 py-10 text-center text-white/30">
                Nobody waiting
              </div>
            )}
          </div>

          {waitingTotal > 0 && (
            <p className="mt-6 text-center text-sm text-white/30">
              {waitingTotal === 1 ? "1 person waiting" : `${waitingTotal} people waiting`}
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
      `}</style>
    </main>
  );
}
