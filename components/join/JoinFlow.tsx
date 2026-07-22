"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/database.types";
import { ACTIVE_TICKET_KEY } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2, DoorClosed, Users, Check, Minus, Plus } from "lucide-react";

const MAX_PARTY_SIZE = 20;
const TERMINAL_STATUSES = ["served", "skipped", "cancelled"];

export function JoinFlow({
  eventId,
  closed = false,
  full = false,
}: {
  eventId: string;
  closed?: boolean;
  full?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // If this phone already holds a live number, jump straight to it.
  useEffect(() => {
    const existingId = localStorage.getItem(ACTIVE_TICKET_KEY);
    if (!existingId) {
      setCheckingExisting(false);
      return;
    }
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tickets")
        .select("id, status")
        .eq("id", existingId)
        .maybeSingle();
      if (!active) return;
      if (data && !TERMINAL_STATUSES.includes(data.status)) {
        router.replace(`/join/ticket/${existingId}`);
        return;
      }
      localStorage.removeItem(ACTIVE_TICKET_KEY);
      setCheckingExisting(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleGetTicket() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      // issue_ticket allocates the number under a row lock and enforces the
      // event's open/closed and capacity rules server-side.
      const { data, error: rpcError } = await supabase.rpc("issue_ticket", {
        p_event_id: eventId,
        p_customer_name: name || null,
        p_party_size: partySize,
        p_customer_phone: phone || null,
      });
      if (rpcError) throw rpcError;

      const ticket = data as Ticket;
      localStorage.setItem(ACTIVE_TICKET_KEY, ticket.id);
      router.push(`/join/ticket/${ticket.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  if (checkingExisting) {
    return <Skeleton className="h-64 w-full rounded-3xl" />;
  }

  if (closed) {
    return (
      <Card className="overflow-hidden border-slate-200 shadow-xl">
        <EmptyState
          icon={DoorClosed}
          title="Queue is closed"
          description="This queue isn't accepting new numbers right now. Please check back later."
        />
      </Card>
    );
  }

  if (full) {
    return (
      <Card className="overflow-hidden border-slate-200 shadow-xl">
        <EmptyState
          icon={Users}
          title="Queue is full"
          description="We've reached capacity for waiting customers right now. Please try again shortly."
        />
      </Card>
    );
  }

  return (
    <Card className="animate-row-in rounded-3xl border-slate-200/80 bg-white p-6 shadow-xl">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
            Your name{" "}
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Christina"
            className="rounded-xl border-slate-200 py-3 font-medium text-slate-800 focus:border-brand-500 focus:ring-brand-500/20"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
            WhatsApp number{" "}
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62 812 3456 7890"
            className="rounded-xl border-slate-200 py-3 font-medium text-slate-800 focus:border-brand-500 focus:ring-brand-500/20"
          />
          <p className="text-xs text-slate-400">
            We&apos;ll message you when your number is nearly up.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partySize" className="text-sm font-semibold text-slate-700">
            Party size
            <span className="text-xs font-normal text-slate-400">
              {" "}
              (how many people, including you)
            </span>
          </Label>
          <div
            id="partySize"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => setPartySize((n) => Math.max(1, n - 1))}
              disabled={partySize <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease party size"
            >
              <Minus size={15} />
            </button>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <span className="w-6 text-center text-lg font-bold tabular-nums text-slate-900">
                {partySize}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPartySize((n) => Math.min(MAX_PARTY_SIZE, n + 1))}
              disabled={partySize >= MAX_PARTY_SIZE}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase party size"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <Button
          className="w-full gap-2 rounded-xl py-4 font-bold transition-all hover:-translate-y-0.5 active:translate-y-0"
          size="lg"
          onClick={handleGetTicket}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Getting your number…
            </>
          ) : (
            <>
              <Check size={16} /> Get my number
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
