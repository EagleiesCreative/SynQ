import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile } from "@/lib/auth";
import type { Event, Ticket } from "@/lib/database.types";
import { EventBoard } from "@/components/admin/EventBoard";
import { EventSettings } from "@/components/admin/EventSettings";
import { AdminQrCode } from "@/components/admin/AdminQrCode";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventBoardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";
  const db = createAdminClient();

  const { data: event } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!event) notFound();
  const ev = event as Event;

  const { data: rows } = await db
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .in("status", ["waiting", "called", "serving", "skipped"])
    .order("created_at", { ascending: true });

  const tickets = (rows as Ticket[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} /> All events
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{ev.name}</h1>
          <Badge
            className={
              ev.is_open
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }
          >
            {ev.is_open ? "Open" : "Closed"}
          </Badge>
          <Link
            href={`/display/${ev.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
          >
            Open display board <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      <EventBoard
        event={ev}
        initialCurrent={tickets.find((t) => t.id === ev.current_ticket_id) || null}
        initialWaiting={tickets.filter((t) => t.status === "waiting")}
        initialSkipped={tickets.filter((t) => t.status === "skipped")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <EventSettings event={ev} />
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            QR code &amp; links
          </h2>
          <AdminQrCode eventId={ev.id} />
        </div>
      </div>
    </div>
  );
}
