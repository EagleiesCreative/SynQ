"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  callNext,
  recallCurrent,
  skipCurrent,
  issueWalkInTicket,
  requeueTicket,
  resetQueue,
} from "@/lib/actions/events";
import type { Event, Ticket } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatWaitDuration } from "@/lib/utils";
import {
  ChevronRight,
  Volume2,
  UserX,
  UserPlus,
  RotateCcw,
  Users,
  AlertCircle,
  Phone,
  Clock,
  Wifi,
  WifiOff,
  Inbox,
} from "lucide-react";

/* -------------------------------------------------------------- ticket card */

function TicketCard({
  ticket,
  position,
  highlight = false,
  action,
}: {
  ticket: Ticket;
  position: number;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white transition-colors ${
        highlight ? "border-brand-200 shadow-soft" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 ${
            highlight ? "bg-brand-50" : "bg-slate-50"
          }`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Pos
          </span>
          <span
            className={`text-lg font-semibold leading-none tabular-nums ${
              highlight ? "text-brand-700" : "text-slate-700"
            }`}
          >
            #{position}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">
            {ticket.customer_name || "Guest"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-slate-100 text-slate-600 tabular-nums">
              {ticket.code}
            </Badge>
            <Badge
              className={
                ticket.status === "waiting"
                  ? "bg-sky-50 text-sky-700"
                  : "bg-emerald-50 text-emerald-700"
              }
            >
              {ticket.status === "waiting" ? "Waiting" : "Called"}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 px-4 py-3 text-sm">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Phone number
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
            <Phone size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate tabular-nums">
              {ticket.customer_phone || "—"}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Party size
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
            <Users size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            {ticket.party_size} {ticket.party_size === 1 ? "person" : "people"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Elapsed time
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
            <Clock size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            Waiting{" "}
            <span className="font-medium text-brand-700">
              {formatWaitDuration(ticket.created_at)}
            </span>
          </dd>
        </div>
      </dl>

      {action && (
        <div className="flex justify-end border-t border-slate-100 px-4 py-3">
          {action}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- board */

export function EventBoard({
  event,
  initialCurrent,
  initialWaiting,
  initialSkipped,
  isAdmin = false,
}: {
  event: Event;
  initialCurrent: Ticket | null;
  initialWaiting: Ticket[];
  initialSkipped: Ticket[];
  isAdmin?: boolean;
}) {
  const showToast = useToast();
  const [current, setCurrent] = useState<Ticket | null>(initialCurrent);
  const [waiting, setWaiting] = useState<Ticket[]>(initialWaiting);
  const [skipped, setSkipped] = useState<Ticket[]>(initialSkipped);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [walkIn, setWalkIn] = useState<{ name: string; phone: string } | null>(
    null
  );
  // Re-render once a minute so "waiting 4 min" doesn't go stale on screen.
  const [, setTick] = useState(0);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ev }, { data: rows }] = await Promise.all([
      supabase
        .from("events")
        .select("current_ticket_id")
        .eq("id", event.id)
        .maybeSingle(),
      supabase
        .from("tickets")
        .select("*")
        .eq("event_id", event.id)
        .in("status", ["waiting", "called", "serving", "skipped"])
        .order("created_at", { ascending: true }),
    ]);

    const all = (rows as Ticket[]) || [];
    setWaiting(all.filter((t) => t.status === "waiting"));
    setSkipped(all.filter((t) => t.status === "skipped"));
    setCurrent(all.find((t) => t.id === ev?.current_ticket_id) || null);
  }, [event.id]);

  // Live updates. Both tables are filtered server-side to this event so we
  // aren't woken by other queues, and a slow poll covers dropped sockets.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${event.id}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${event.id}`,
        },
        refresh
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    const poll = setInterval(() => {
      if (!busyRef.current) refresh();
    }, 20000);
    const clock = setInterval(() => setTick((n) => n + 1), 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [event.id, refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    busyRef.current = true;
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  const handleNext = useCallback(() => {
    run(async () => {
      const result = await callNext(event.id);
      if (!result.ok) showToast({ message: "Nobody is waiting." });
      else showToast({ message: `Now serving ${result.ticket.code}` });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Spacebar / N is the whole job — keep hands off the mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.code === "Space" || e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (!busy) handleNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, handleNext]);

  const upNext = waiting[0];
  const rest = waiting.slice(1);

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Now serving + the one button that matters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Now serving
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    live ? "text-emerald-600" : "text-slate-400"
                  }`}
                  title={live ? "Updating live" : "Reconnecting…"}
                >
                  {live ? (
                    <Wifi size={11} aria-hidden="true" />
                  ) : (
                    <WifiOff size={11} aria-hidden="true" />
                  )}
                  {live ? "Live" : "Reconnecting"}
                </span>
              </div>
              <p className="mt-1 text-6xl font-bold leading-none tabular-nums text-slate-900">
                {current?.code || "—"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {current
                  ? `${current.customer_name || "Guest"}${
                      current.party_size > 1
                        ? ` · party of ${current.party_size}`
                        : ""
                    }`
                  : "Press Next to call the first number."}
              </p>
            </div>

            <div className="sm:text-right">
              {upNext && (
                <p className="mb-2 text-sm text-slate-500">
                  Up next{" "}
                  <span className="font-semibold tabular-nums text-slate-900">
                    {upNext.code}
                  </span>
                </p>
              )}
              <Button
                size="lg"
                className="w-full cursor-pointer gap-2 px-10 py-6 text-lg sm:w-auto"
                onClick={handleNext}
                disabled={busy}
              >
                Next <ChevronRight size={20} aria-hidden="true" />
              </Button>
              <p className="mt-2 text-xs text-slate-400">
                or press{" "}
                <kbd className="rounded border border-slate-200 px-1.5 py-0.5">
                  space
                </kbd>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
              disabled={busy || !current}
              onClick={() => run(() => recallCurrent(event.id))}
            >
              <Volume2 size={14} aria-hidden="true" /> Recall
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
              disabled={busy || !current}
              onClick={() => run(() => skipCurrent(event.id))}
            >
              <UserX size={14} aria-hidden="true" /> No-show
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
              disabled={busy}
              onClick={() => setWalkIn({ name: "", phone: "" })}
            >
              <UserPlus size={14} aria-hidden="true" /> Walk-up number
            </Button>
            {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto cursor-pointer gap-1.5 text-slate-400 hover:text-rose-600"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Reset this queue? Every number is cleared and numbering restarts at 1."
                  )
                )
                  run(() => resetQueue(event.id));
              }}
            >
              <RotateCcw size={14} aria-hidden="true" /> Reset queue
            </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Walk-up: capture a phone so they can be messaged like QR joiners */}
      {walkIn && (
        <Card>
          <CardContent className="pt-6">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const { name, phone } = walkIn;
                setWalkIn(null);
                run(async () => {
                  const t = await issueWalkInTicket(event.id, name, 1, phone);
                  showToast({ message: `Issued ${t.code}` });
                });
              }}
            >
              <div className="min-w-[160px] flex-1">
                <Label htmlFor="walkin-name">Name (optional)</Label>
                <Input
                  id="walkin-name"
                  autoFocus
                  value={walkIn.name}
                  onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
                  placeholder="Guest"
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <Label htmlFor="walkin-phone">WhatsApp (optional)</Label>
                <Input
                  id="walkin-phone"
                  type="tel"
                  value={walkIn.phone}
                  onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })}
                  placeholder="+62 812 3456 7890"
                />
              </div>
              <Button type="submit" className="cursor-pointer" disabled={busy}>
                Issue number
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => setWalkIn(null)}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Up next + the rest of the line */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section aria-labelledby="up-next-heading">
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60">
            <h2
              id="up-next-heading"
              className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-emerald-800"
            >
              <Users size={16} aria-hidden="true" /> Up next
            </h2>
            <div className="p-4 pt-0">
              {upNext ? (
                <TicketCard
                  ticket={upNext}
                  position={1}
                  highlight
                  action={
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      disabled={busy}
                      onClick={handleNext}
                    >
                      Call next
                    </Button>
                  }
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/60 px-4 py-10 text-center text-sm text-slate-400">
                  Nobody in line
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="waiting-heading">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-5 py-4">
              <h2 id="waiting-heading" className="text-sm font-semibold text-slate-900">
                Waiting list
              </h2>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-medium tabular-nums text-white">
                {waiting.length}
              </span>
            </div>

            <div className="px-5 pb-5">
              {rest.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rest.map((t, i) => (
                    <TicketCard key={t.id} ticket={t} position={i + 2} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                  <Inbox size={22} className="text-slate-300" aria-hidden="true" />
                  <p className="mt-2 text-sm text-slate-400">
                    {upNext
                      ? "Nobody else waiting behind them."
                      : "New numbers appear here automatically."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* No-shows, so they can be put back */}
      {skipped.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">No-shows</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {skipped.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-6 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-14 font-semibold tabular-nums text-slate-500">
                      {t.code}
                    </span>
                    <span className="text-slate-500">
                      {t.customer_name || "Guest"}
                    </span>
                    {t.skip_count > 1 && (
                      <Badge className="bg-amber-100 text-amber-700">
                        missed {t.skip_count}×
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => run(() => requeueTicket(t.id))}
                    disabled={busy}
                    className="cursor-pointer text-xs font-medium text-brand-600 hover:underline disabled:opacity-40"
                  >
                    Put back in line
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
