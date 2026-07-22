"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

export function EventBoard({
  event,
  initialCurrent,
  initialWaiting,
  initialSkipped,
}: {
  event: Event;
  initialCurrent: Ticket | null;
  initialWaiting: Ticket[];
  initialSkipped: Ticket[];
}) {
  const showToast = useToast();
  const [current, setCurrent] = useState<Ticket | null>(initialCurrent);
  const [waiting, setWaiting] = useState<Ticket[]>(initialWaiting);
  const [skipped, setSkipped] = useState<Ticket[]>(initialSkipped);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-board-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
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

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Now serving + the one button that matters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Now serving
              </p>
              <p className="mt-1 text-6xl font-bold tabular-nums text-slate-900 leading-none">
                {current?.code || "—"}
              </p>
              {current && (
                <p className="mt-2 text-sm text-slate-500">
                  {current.customer_name || "Guest"}
                  {current.party_size > 1 && ` · party of ${current.party_size}`}
                  {current.called_at &&
                    ` · called ${formatWaitDuration(current.called_at)} ago`}
                </p>
              )}
              {!current && (
                <p className="mt-2 text-sm text-slate-500">
                  Press Next to call the first number.
                </p>
              )}
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
                className="w-full sm:w-auto gap-2 text-lg px-10 py-6"
                onClick={handleNext}
                disabled={busy}
              >
                Next <ChevronRight size={20} />
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
              className="gap-1.5"
              disabled={busy || !current}
              onClick={() => run(() => recallCurrent(event.id))}
            >
              <Volume2 size={14} /> Recall
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busy || !current}
              onClick={() => run(() => skipCurrent(event.id))}
            >
              <UserX size={14} /> No-show
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const t = await issueWalkInTicket(event.id);
                  showToast({ message: `Issued ${t.code}` });
                })
              }
            >
              <UserPlus size={14} /> Walk-up number
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-400 hover:text-rose-600 ml-auto"
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
              <RotateCcw size={14} /> Reset queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waiting line */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Waiting</h2>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Users size={14} className="text-slate-400" />
              <span className="tabular-nums">{waiting.length}</span>
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {waiting.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-6 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      i === 0
                        ? "w-14 font-bold tabular-nums text-brand-600"
                        : "w-14 font-semibold tabular-nums text-slate-900"
                    }
                  >
                    {t.code}
                  </span>
                  <span className="text-slate-600">
                    {t.customer_name || "Guest"}
                    {t.party_size > 1 && (
                      <span className="text-slate-400"> · {t.party_size}</span>
                    )}
                  </span>
                </div>
                <span className="text-slate-400 tabular-nums">
                  {formatWaitDuration(t.created_at)}
                </span>
              </div>
            ))}
            {waiting.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-slate-400">
                Nobody in line.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
                    className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-40"
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
