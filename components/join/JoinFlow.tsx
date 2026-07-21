"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/database.types";
import { ACTIVE_TICKET_KEY, formatTicketCode } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChevronRight, ArrowLeft, Loader2, DoorClosed, Users, Check, Sparkles, Minus, Plus } from "lucide-react";

const MAX_PARTY_SIZE = 20;

const TERMINAL_STATUSES = ["served", "skipped", "cancelled"];

export function JoinFlow({
  services,
  closed = false,
  full = false,
}: {
  services: Service[];
  closed?: boolean;
  full?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
        .single();
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
    if (!selected) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: number, error: rpcError } = await supabase.rpc(
        "next_ticket_number",
        { p_service_id: selected.id }
      );
      if (rpcError) throw rpcError;

      const code = formatTicketCode(selected.code, number as number);

      const { data: ticket, error: insertError } = await supabase
        .from("tickets")
        .insert({
          service_id: selected.id,
          number,
          code,
          customer_name: name || null,
          party_size: partySize,
          status: "waiting",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      localStorage.setItem(ACTIVE_TICKET_KEY, ticket.id);
      router.push(`/join/ticket/${ticket.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checkingExisting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (closed || !services.length) {
    return (
      <Card className="overflow-hidden border-slate-200 shadow-xl">
        <EmptyState
          icon={DoorClosed}
          title="Queue is closed"
          description="There are no services open to join right now. Please check back later."
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
    <div className="w-full space-y-6">
      {/* Progress Step Indicators */}
      <div className="flex items-center justify-center gap-2 mb-8 bg-slate-100/80 p-2 rounded-2xl max-w-sm mx-auto">
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-300 ${
            !selected ? "bg-brand-600 text-white shadow-md shadow-brand-600/10" : "bg-transparent text-slate-500"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px]">1</span>
          <span>Service</span>
        </div>
        <div className="h-px w-6 bg-slate-300" />
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-300 ${
            selected ? "bg-brand-600 text-white shadow-md shadow-brand-600/10" : "bg-transparent text-slate-400"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px]">2</span>
          <span>Info</span>
        </div>
      </div>

      {!selected ? (
        /* Step 1: Services List */
        <div className="space-y-3.5 animate-row-in">
          {services.map((s) => {
            const isHovered = hoveredId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-full text-left focus:outline-none"
              >
                <Card
                  className="p-5 flex items-center justify-between transition-all duration-300 relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl hover:-translate-y-0.5"
                  style={{
                    borderColor: isHovered ? s.color : undefined,
                    boxShadow: isHovered ? `0 10px 20px -10px ${s.color}40, 0 1px 3px 0 rgb(0 0 0 / 0.05)` : undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-sm"
                      style={{
                        backgroundColor: s.color,
                        boxShadow: `0 4px 10px 0 ${s.color}40`,
                      }}
                    >
                      {s.code}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{s.name}</p>
                      {s.description ? (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5 italic">No description provided</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                </Card>
              </button>
            );
          })}
        </div>
      ) : (
        /* Step 2: Input Details */
        <Card className="p-6 border-slate-200/80 shadow-xl rounded-3xl bg-white animate-row-in relative overflow-hidden">
          {/* Header Accent Line */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: selected.color }}
          />

          <button
            onClick={() => {
              setSelected(null);
              setError(null);
            }}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full"
          >
            <ArrowLeft size={13} /> Back to services
          </button>

          <div className="flex items-center gap-4 mb-6">
            <span
              className="h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-sm"
              style={{
                backgroundColor: selected.color,
                boxShadow: `0 4px 10px 0 ${selected.color}40`,
              }}
            >
              {selected.code}
            </span>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Selected Service</span>
              <p className="font-bold text-slate-800 text-base">{selected.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                Your Name <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Christina"
                className="rounded-xl border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 py-3 text-slate-800 font-medium"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partySize" className="text-sm font-semibold text-slate-700">
                Party Size
                <span className="text-xs text-slate-400 font-normal"> (how many people, including you)</span>
              </Label>
              <div
                id="partySize"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                  disabled={partySize <= 1}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease party size"
                >
                  <Minus size={15} />
                </button>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-lg font-bold text-slate-900 tabular-nums w-6 text-center">
                    {partySize}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((n) => Math.min(MAX_PARTY_SIZE, n + 1))}
                  disabled={partySize >= MAX_PARTY_SIZE}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Increase party size"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 text-sm">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/10"
              size="lg"
              onClick={handleGetTicket}
              disabled={loading}
              style={{
                backgroundColor: selected.color,
                boxShadow: `0 8px 20px -8px ${selected.color}`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating Ticket...
                </>
              ) : (
                <>
                  <Check size={16} /> Get My Number
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
