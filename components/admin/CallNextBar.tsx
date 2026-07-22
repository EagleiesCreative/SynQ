"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  callNextTicket,
  updateTicket as updateTicketAction,
  clearCounterTicket,
} from "@/lib/actions/tickets";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { statusLabels, statusStyles } from "@/lib/utils";
import { PhoneCall, Play, CheckCircle2, SkipForward, RotateCcw, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface CounterOption {
  id: string;
  name: string;
}

interface CurrentTicket {
  id: string;
  code: string;
  status: string;
  customer_name: string | null;
  party_size: number;
  service?: { name: string; color: string } | { name: string; color: string }[] | null;
}

export function CallNextBar({
  onChange,
  organizationId,
}: {
  onChange?: () => void;
  organizationId: string;
}) {
  const showToast = useToast();
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [counterId, setCounterId] = useState<string>("");
  const [ticket, setTicket] = useState<CurrentTicket | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCounters = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("counters")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true });
    setCounters(data || []);
    setCounterId((prev) => prev || data?.[0]?.id || "");
  }, [organizationId]);

  const loadTicket = useCallback(async (id: string) => {
    if (!id) {
      setTicket(null);
      return;
    }
    const supabase = createClient();
    const { data: counter } = await supabase
      .from("counters")
      .select("current_ticket_id")
      .eq("id", id)
      .single();
    if (!counter?.current_ticket_id) {
      setTicket(null);
      return;
    }
    const { data: t } = await supabase
      .from("tickets")
      .select("id, code, status, customer_name, party_size, service:services(name,color)")
      .eq("id", counter.current_ticket_id)
      .single();
    setTicket(t as unknown as CurrentTicket);
  }, []);

  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  useEffect(() => {
    if (counterId) loadTicket(counterId);
  }, [counterId, loadTicket]);

  const callNext = useCallback(async () => {
    if (!counterId || busy) return;
    setBusy(true);

    const result = await callNextTicket(counterId);
    if (!result.ok) {
      showToast({
        message:
          result.reason === "no-services"
            ? "This counter isn't linked to any services."
            : "No one is waiting right now.",
      });
      setBusy(false);
      return;
    }

    await loadTicket(counterId);
    onChange?.();
    setBusy(false);
  }, [counterId, busy, loadTicket, onChange, showToast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (typing) return;
      if ((e.key === "c" || e.key === "C") && !ticket) {
        e.preventDefault();
        callNext();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [callNext, ticket]);

  async function updateTicket(status: string, extra: Record<string, unknown> = {}) {
    if (!ticket) return;
    setBusy(true);
    await updateTicketAction(
      ticket.id,
      status as "called" | "serving" | "served" | "skipped",
      extra as Record<string, string | number | null>
    );
    if (status === "served" || status === "skipped") {
      await clearCounterTicket(counterId);
    }
    await loadTicket(counterId);
    onChange?.();
    setBusy(false);
  }

  const service = ticket
    ? Array.isArray(ticket.service)
      ? ticket.service[0]
      : ticket.service
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500 shrink-0">
            Counter
          </label>
          <Select
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            className="w-44"
          >
            {counters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {ticket ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {ticket.code}
            </span>
            <Badge className={statusStyles[ticket.status]}>
              {statusLabels[ticket.status]}
            </Badge>
            {service && (
              <Badge
                style={{
                  backgroundColor: `${service.color}1a`,
                  color: service.color,
                }}
              >
                {service.name}
              </Badge>
            )}
            {ticket.party_size > 1 && (
              <Badge className="bg-slate-100 text-slate-600 flex items-center gap-1">
                <Users size={11} /> Party of {ticket.party_size}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              {ticket.status === "called" && (
                <>
                  <Button size="sm" onClick={() => updateTicket("serving", { served_at: new Date().toISOString() })} disabled={busy}>
                    <Play size={14} /> Start serving
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateTicket("called", { called_at: new Date().toISOString() })}
                    disabled={busy}
                  >
                    <RotateCcw size={14} /> Recall
                  </Button>
                </>
              )}
              {ticket.status === "serving" && (
                <Button size="sm" onClick={() => updateTicket("served", { finished_at: new Date().toISOString() })} disabled={busy}>
                  <CheckCircle2 size={14} /> Finish
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  updateTicket("skipped", {
                    finished_at: new Date().toISOString(),
                  })
                }
                disabled={busy}
              >
                <SkipForward size={14} /> No-show
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={callNext} disabled={busy || !counterId} size="lg">
            <PhoneCall size={18} /> Call next
            <kbd className="ml-1 rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-medium opacity-80">
              C
            </kbd>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
