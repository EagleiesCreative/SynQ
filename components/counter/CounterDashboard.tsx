"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatWaitDuration,
  statusLabels,
  statusStyles,
} from "@/lib/utils";
import {
  PhoneCall,
  Play,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  LogOut,
  Users,
} from "lucide-react";

interface CounterRow {
  id: string;
  name: string;
  current_ticket_id: string | null;
  current_agent_id: string | null;
}

interface TicketRow {
  id: string;
  code: string;
  status: string;
  customer_name: string | null;
  party_size: number;
  created_at: string;
  called_at: string | null;
  served_at: string | null;
  service_id: string;
  skip_count: number;
  service?: { name: string; color: string };
}

const STORAGE_KEY = "queue_selected_counter";

export function CounterDashboard({ userId }: { userId: string }) {
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(
    null
  );
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [currentTicket, setCurrentTicket] = useState<TicketRow | null>(null);
  const [waitingList, setWaitingList] = useState<TicketRow[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [servedToday, setServedToday] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingCounters, setLoadingCounters] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedCounterId(stored);
  }, []);

  const loadCounters = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("counters")
      .select("id, name, current_ticket_id, current_agent_id")
      .eq("is_active", true)
      .order("name", { ascending: true });
    setCounters((data as CounterRow[]) || []);
    setLoadingCounters(false);
  }, []);

  const loadCounterDetails = useCallback(async (counterId: string) => {
    const supabase = createClient();

    const { data: services } = await supabase
      .from("counter_services")
      .select("service_id")
      .eq("counter_id", counterId);
    const ids = (services || []).map((s: { service_id: string }) => s.service_id);
    setServiceIds(ids);

    const { data: counter } = await supabase
      .from("counters")
      .select("current_ticket_id")
      .eq("id", counterId)
      .single();

    if (counter?.current_ticket_id) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select(
          "id, code, status, customer_name, party_size, created_at, called_at, served_at, service_id, skip_count, service:services(name,color)"
        )
        .eq("id", counter.current_ticket_id)
        .single();
      setCurrentTicket(ticket as unknown as TicketRow);
    } else {
      setCurrentTicket(null);
    }

    if (ids.length) {
      const { data: waiting, count } = await supabase
        .from("tickets")
        .select(
          "id, code, status, customer_name, party_size, created_at, called_at, served_at, service_id, skip_count, service:services(name,color)",
          { count: "exact" }
        )
        .in("service_id", ids)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(6);
      setWaitingList((waiting as unknown as TicketRow[]) || []);
      setWaitingCount(count || 0);
    } else {
      setWaitingList([]);
      setWaitingCount(0);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: servedCount } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", userId)
      .eq("status", "served")
      .gte("finished_at", startOfDay.toISOString());
    setServedToday(servedCount || 0);
  }, [userId]);

  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  useEffect(() => {
    if (!selectedCounterId) return;
    loadCounterDetails(selectedCounterId);

    const supabase = createClient();
    const channel = supabase
      .channel(`counter-${selectedCounterId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => loadCounterDetails(selectedCounterId)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "counters",
          filter: `id=eq.${selectedCounterId}`,
        },
        () => loadCounterDetails(selectedCounterId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCounterId, loadCounterDetails]);

  async function selectCounter(counterId: string) {
    const supabase = createClient();
    await supabase
      .from("counters")
      .update({ current_agent_id: userId })
      .eq("id", counterId);
    localStorage.setItem(STORAGE_KEY, counterId);
    setSelectedCounterId(counterId);
    loadCounters();
  }

  async function releaseCounter() {
    if (!selectedCounterId) return;
    const supabase = createClient();
    await supabase
      .from("counters")
      .update({ current_agent_id: null })
      .eq("id", selectedCounterId);
    localStorage.removeItem(STORAGE_KEY);
    setSelectedCounterId(null);
    setCurrentTicket(null);
    loadCounters();
  }

  async function callNext() {
    if (!selectedCounterId || !serviceIds.length) return;
    setBusy(true);
    setNotice(null);
    const supabase = createClient();

    const { data: nextTicket } = await supabase
      .from("tickets")
      .select("id")
      .in("service_id", serviceIds)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextTicket) {
      setNotice("No one is waiting right now.");
      setBusy(false);
      return;
    }

    await supabase
      .from("tickets")
      .update({
        status: "called",
        counter_id: selectedCounterId,
        agent_id: userId,
        called_at: new Date().toISOString(),
      })
      .eq("id", nextTicket.id);

    await supabase
      .from("counters")
      .update({ current_ticket_id: nextTicket.id })
      .eq("id", selectedCounterId);

    await loadCounterDetails(selectedCounterId);
    setBusy(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((e.key === "c" || e.key === "C") && !currentTicket && selectedCounterId) {
        e.preventDefault();
        callNext();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTicket, selectedCounterId, busy]);

  async function startServing() {
    if (!currentTicket) return;
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ status: "serving", served_at: new Date().toISOString() })
      .eq("id", currentTicket.id);
    if (selectedCounterId) await loadCounterDetails(selectedCounterId);
    setBusy(false);
  }

  async function finishTicket() {
    if (!currentTicket || !selectedCounterId) return;
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ status: "served", finished_at: new Date().toISOString() })
      .eq("id", currentTicket.id);
    await supabase
      .from("counters")
      .update({ current_ticket_id: null })
      .eq("id", selectedCounterId);
    await loadCounterDetails(selectedCounterId);
    setBusy(false);
  }

  async function skipTicket() {
    if (!currentTicket || !selectedCounterId) return;
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({
        status: "skipped",
        finished_at: new Date().toISOString(),
        skip_count: (currentTicket.skip_count || 0) + 1,
      })
      .eq("id", currentTicket.id);
    await supabase
      .from("counters")
      .update({ current_ticket_id: null })
      .eq("id", selectedCounterId);
    await loadCounterDetails(selectedCounterId);
    setBusy(false);
  }

  async function recall() {
    if (!currentTicket) return;
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ called_at: new Date().toISOString() })
      .eq("id", currentTicket.id);
    setBusy(false);
  }

  const selectedCounter = counters.find((c) => c.id === selectedCounterId);

  if (!selectedCounterId || !selectedCounter) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Choose your counter
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Select which counter you&apos;ll be serving from today.
        </p>
        {loadingCounters ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : counters.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No counters configured yet"
              description="Ask an admin to add one from the Counters page."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {counters.map((c) => (
              <button key={c.id} onClick={() => selectCounter(c.id)}>
                <Card className="p-5 text-left hover:border-brand-300 hover:shadow-md transition-all">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.current_agent_id
                      ? "Currently claimed by another session"
                      : "Available"}
                  </p>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {selectedCounter.name}
          </h1>
          <p className="text-sm text-slate-500">
            {servedToday} served today · {waitingCount} waiting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={releaseCounter}>
          <LogOut size={14} /> Switch counter
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-8">
              {currentTicket ? (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Now serving
                  </p>
                  <p className="text-6xl font-semibold text-slate-900 tracking-tight">
                    {currentTicket.code}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Badge className={statusStyles[currentTicket.status]}>
                      {statusLabels[currentTicket.status]}
                    </Badge>
                    {currentTicket.service && (
                      <Badge
                        style={{
                          backgroundColor: `${currentTicket.service.color}1a`,
                          color: currentTicket.service.color,
                        }}
                      >
                        {currentTicket.service.name}
                      </Badge>
                    )}
                  </div>
                  {(currentTicket.customer_name || currentTicket.party_size > 1) && (
                    <p className="mt-3 text-sm text-slate-500 flex items-center justify-center gap-2">
                      {currentTicket.customer_name}
                      {currentTicket.party_size > 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <Users size={11} /> Party of {currentTicket.party_size}
                        </span>
                      )}
                    </p>
                  )}

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {currentTicket.status === "called" && (
                      <>
                        <Button onClick={startServing} disabled={busy}>
                          <Play size={16} /> Start serving
                        </Button>
                        <Button variant="outline" onClick={recall} disabled={busy}>
                          <RotateCcw size={16} /> Recall
                        </Button>
                      </>
                    )}
                    {currentTicket.status === "serving" && (
                      <Button onClick={finishTicket} disabled={busy}>
                        <CheckCircle2 size={16} /> Finish
                      </Button>
                    )}
                    <Button variant="danger" onClick={skipTicket} disabled={busy}>
                      <SkipForward size={16} /> Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400 mb-6">No customer at this counter</p>
                  {notice && (
                    <p className="mb-4 text-sm text-amber-600">{notice}</p>
                  )}
                  <Button size="lg" onClick={callNext} disabled={busy}>
                    <PhoneCall size={18} /> Call next
                    <kbd className="ml-1 rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-medium opacity-80">
                      C
                    </kbd>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Up next
            </h2>
          </div>
          <Card>
            <div className="divide-y divide-slate-100">
              {waitingList.length === 0 && (
                <EmptyState title="No one waiting" />
              )}
              {waitingList.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                      {t.code}
                      {t.party_size > 1 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                          <Users size={10} /> {t.party_size}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t.service?.name}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatWaitDuration(t.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
