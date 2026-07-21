"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import type { Ticket, Service, Counter } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { YourTurnOverlay } from "@/components/join/YourTurnOverlay";
import { TicketActions } from "@/components/join/TicketActions";
import { ACTIVE_TICKET_KEY, statusLabels, statusStyles } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, Users, BellRing, Smartphone, MapPin, Share2 } from "lucide-react";

export function TicketStatus({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [counter, setCounter] = useState<Counter | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  const loadPosition = useCallback(
    async (t: Ticket) => {
      if (t.status !== "waiting") {
        setPosition(0);
        return;
      }
      const supabase = createClient();
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("service_id", t.service_id)
        .eq("status", "waiting")
        .lt("created_at", t.created_at);
      setPosition((count || 0) + 1);
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data: t } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      if (!active || !t) {
        setLoading(false);
        return;
      }
      setTicket(t as Ticket);

      const { data: s } = await supabase
        .from("services")
        .select("*")
        .eq("id", t.service_id)
        .single();
      if (active) setService(s as Service);

      if (t.counter_id) {
        const { data: c } = await supabase
          .from("counters")
          .select("*")
          .eq("id", t.counter_id)
          .single();
        if (active) setCounter(c as Counter);
      }

      await loadPosition(t as Ticket);
      if (active) setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
        },
        async (payload) => {
          const updated = payload.new as Ticket;
          setTicket(updated);
          if (updated.counter_id) {
            const { data: c } = await supabase
              .from("counters")
              .select("*")
              .eq("id", updated.counter_id)
              .single();
            setCounter(c as Counter);
          }
          await loadPosition(updated);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          setTicket((current) => {
            if (current) loadPosition(current);
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [ticketId, loadPosition]);

  useEffect(() => {
    if (!ticket) return;
    const isTerminal = ["served", "skipped", "cancelled"].includes(ticket.status);
    if (isTerminal) {
      if (localStorage.getItem(ACTIVE_TICKET_KEY) === ticket.id) {
        localStorage.removeItem(ACTIVE_TICKET_KEY);
      }
    } else {
      localStorage.setItem(ACTIVE_TICKET_KEY, ticket.id);
    }
  }, [ticket]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm">
          <Skeleton className="mx-auto mb-6 h-4 w-32" />
          <Card className="p-8 text-center rounded-3xl shadow-lg border-slate-200">
            <Skeleton className="mx-auto mb-3 h-3 w-20" />
            <Skeleton className="mx-auto mb-4 h-16 w-40" />
            <Skeleton className="mx-auto h-6 w-24 rounded-full" />
            <div className="mt-8 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (!ticket || !service) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <Card className="max-w-sm border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
          <EmptyState
            icon={XCircle}
            title="Ticket not found"
            description="This ticket may have expired or the link is invalid."
            action={
              <Link
                href="/"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline"
              >
                Go home
              </Link>
            }
          />
        </Card>
      </main>
    );
  }

  const isActive = ticket.status === "called" || ticket.status === "serving";
  const isDone = ["served", "skipped", "cancelled"].includes(ticket.status);

  // Status visual styles for glowing indicator
  const ringStyles: Record<string, string> = {
    waiting: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
    called: "bg-amber-500/15 text-amber-600 ring-amber-500/30 animate-pulse-soft",
    serving: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 animate-pulse-soft",
    served: "bg-slate-500/10 text-slate-500 ring-slate-500/10",
    skipped: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
    cancelled: "bg-slate-500/10 text-slate-400 ring-slate-500/10",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 flex flex-col items-center justify-center">
      {isActive && (
        <YourTurnOverlay
          code={ticket.code}
          counterName={counter?.name}
          isBeingServed={ticket.status === "serving"}
          partySize={ticket.party_size}
        />
      )}

      <div className="w-full max-w-sm">
        {/* Live sync connection indicator */}
        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Queue Ticket</span>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold text-emerald-700 tracking-wider uppercase">Live Sync Active</span>
          </div>
        </div>

        {/* Boarding Pass Ticket Container */}
        <Card className="relative bg-white border border-slate-200/80 shadow-xl rounded-3xl overflow-hidden select-none">
          {/* Top color strip */}
          <div className="h-2 w-full" style={{ backgroundColor: service.color }} />

          {/* Ticket punches left & right */}
          <div className="absolute -left-3 top-[52%] -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/80 z-10" />
          <div className="absolute -right-3 top-[52%] -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200/80 z-10" />

          {/* Ticket Upper Half */}
          <div className="p-8 text-center pb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
              {service.name}
            </span>
            
            {(ticket.customer_name || ticket.party_size > 1) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                {ticket.customer_name && (
                  <p className="text-xs font-semibold text-slate-500 bg-slate-100 inline-block px-3 py-1 rounded-full">
                    For: {ticket.customer_name}
                  </p>
                )}
                {ticket.party_size > 1 && (
                  <p className="text-xs font-semibold text-slate-500 bg-slate-100 inline-flex items-center gap-1 px-3 py-1 rounded-full">
                    <Users size={11} /> Party of {ticket.party_size}
                  </p>
                )}
              </div>
            )}

            <div className="relative inline-flex items-center justify-center my-2">
              {/* Pulsing ring visual */}
              <div className={`absolute inset-0 rounded-full filter blur-md opacity-30 ${ringStyles[ticket.status]}`} />
              <p className="text-6xl font-extrabold tracking-tight text-slate-900 font-mono relative">
                {ticket.code}
              </p>
            </div>

            <div className="mt-4 flex justify-center">
              <Badge className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusStyles[ticket.status]}`}>
                {statusLabels[ticket.status]}
              </Badge>
            </div>
          </div>

          {/* Ticket Dashed Separator Line */}
          <div className="relative flex items-center justify-center h-px">
            <div className="w-[85%] border-t border-dashed border-slate-200" />
          </div>

          {/* Ticket Lower Half */}
          <div className="p-8 pt-6 text-center">
            <div aria-live="polite" role="status" className="mb-6">
              {/* WAITING state */}
              {ticket.status === "waiting" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <Clock size={16} className="text-brand-600 animate-pulse" />
                    <span className="text-sm font-semibold">
                      {position && position > 0
                        ? `${position} ${position === 1 ? "person" : "people"} ahead of you`
                        : "You're next!"}
                    </span>
                  </div>

                  {/* Visual waiting queue line */}
                  {position && position > 0 && (
                    <div className="flex flex-col gap-1.5 px-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Lobby</span>
                        <span>Counter</span>
                      </div>
                      <div className="flex items-center gap-1.5 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const filled = idx >= Math.min(position, 4);
                          return (
                            <div
                              key={idx}
                              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                filled ? "bg-brand-500" : "bg-slate-300"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CALLED / SERVING state */}
              {(ticket.status === "called" || ticket.status === "serving") && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center space-y-2 animate-bounce-soft">
                  <div className="mx-auto h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <BellRing size={16} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Your Number is Called!</p>
                  {counter?.name && (
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100/50 px-3.5 py-1.5 rounded-xl text-sm">
                      <MapPin size={15} />
                      <span>Proceed to {counter.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SERVED state */}
              {ticket.status === "served" && (
                <div className="flex flex-col items-center gap-2.5 text-emerald-600 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60">
                  <CheckCircle2 size={32} strokeWidth={2.5} />
                  <span className="text-sm font-bold">
                    You have been served. Thank you!
                  </span>
                </div>
              )}

              {/* SKIPPED state */}
              {ticket.status === "skipped" && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl border border-amber-100 text-sm font-medium space-y-1">
                  <p className="font-bold text-base text-amber-900">Ticket Skipped</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Please see our staff counter for assistance to reactivate your queue spot.
                  </p>
                </div>
              )}

              {/* CANCELLED state */}
              {ticket.status === "cancelled" && (
                <div className="bg-slate-100 text-slate-600 p-4 rounded-2xl border border-slate-200 text-sm font-medium">
                  <p className="font-bold text-slate-800">Ticket Cancelled</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This ticket has been removed from the live queue list.
                  </p>
                </div>
              )}
            </div>

            {/* QR Code section */}
            {shareUrl && !isDone && (
              <div className="mt-6 flex flex-col items-center">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm inline-block">
                  <QRCodeCanvas
                    value={shareUrl}
                    size={110}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Smartphone size={11} /> Scan to open ticket on phone
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Ticket Action Buttons (Share, Leave, etc.) */}
        {isDone ? (
          <div className="mt-6 text-center">
            <Link href={`/join/${service.organization_id}`}>
              <Button variant="primary" className="w-full py-3.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
                Get Another Ticket
              </Button>
            </Link>
          </div>
        ) : (
          <TicketActions
            ticketId={ticket.id}
            ticketCode={ticket.code}
            canLeave={ticket.status === "waiting"}
          />
        )}

        <p className="mt-6 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5 bg-slate-100 py-2.5 px-4 rounded-2xl max-w-[280px] mx-auto shadow-sm border border-slate-200/30">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
          Keep open — auto-updates live
        </p>
      </div>
    </main>
  );
}
