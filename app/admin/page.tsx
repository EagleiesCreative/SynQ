import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile, getOrCreateEvent } from "@/lib/auth";
import type { Ticket } from "@/lib/database.types";
import { EventBoard } from "@/components/admin/EventBoard";
import { EventSettings } from "@/components/admin/EventSettings";
import { AdminQrCode } from "@/components/admin/AdminQrCode";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";

  const event = await getOrCreateEvent(
    organizationId,
    profile?.full_name ? `${profile.full_name}'s Queue` : "My Queue"
  );

  if (!event) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-slate-500">
          We couldn&apos;t load your queue. Try reloading the page.
        </CardContent>
      </Card>
    );
  }

  const { data: rows } = await createAdminClient()
    .from("tickets")
    .select("*")
    .eq("event_id", event.id)
    .in("status", ["waiting", "called", "serving", "skipped"])
    .order("created_at", { ascending: true });

  const tickets = (rows as Ticket[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{event.name}</h1>
        <Badge
          className={
            event.is_open
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }
        >
          {event.is_open ? "Open" : "Closed"}
        </Badge>
        <Link
          href={`/display/${event.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          Open display board <ExternalLink size={13} />
        </Link>
      </div>

      <EventBoard
        event={event}
        initialCurrent={tickets.find((t) => t.id === event.current_ticket_id) || null}
        initialWaiting={tickets.filter((t) => t.status === "waiting")}
        initialSkipped={tickets.filter((t) => t.status === "skipped")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <EventSettings event={event} />
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            QR code &amp; links
          </h2>
          <AdminQrCode eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
