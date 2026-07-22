import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile } from "@/lib/auth";
import type { Event } from "@/lib/database.types";
import { EventsManager, type EventWithStats } from "@/components/admin/EventsManager";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";
  const db = createAdminClient();

  const { data: events } = await db
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const list = (events as Event[]) || [];

  // One grouped read instead of two per event.
  const { data: tickets } = list.length
    ? await db
        .from("tickets")
        .select("event_id, status")
        .in(
          "event_id",
          list.map((e) => e.id)
        )
    : { data: [] };

  const withStats: EventWithStats[] = list.map((e) => {
    const mine = (tickets || []).filter((t) => t.event_id === e.id);
    return {
      ...e,
      waiting: mine.filter((t) => t.status === "waiting").length,
      served: mine.filter((t) => t.status === "served").length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Events</h1>
        <p className="text-sm text-slate-500">
          Each event runs one queue. Open its board to call numbers, or share
          its QR code so people can take a number.
        </p>
      </div>
      <EventsManager initialEvents={withStats} />
    </div>
  );
}
