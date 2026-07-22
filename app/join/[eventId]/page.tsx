import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";
import { JoinFlow } from "@/components/join/JoinFlow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

function isWithinHours(event: Event) {
  if (!event.opens_at || !event.closes_at) return true;
  const now = new Date().toTimeString().slice(0, 8);
  return now >= event.opens_at && now <= event.closes_at;
}

export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <Card className="w-full max-w-sm">
          <EmptyState
            icon={SearchX}
            title="Queue not found"
            description="This link doesn't point to a valid queue. Ask staff for the correct QR code or link."
          />
        </Card>
      </main>
    );
  }

  const event = data as Event;

  const { count: waitingCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "waiting");

  const closed = !event.is_open || !isWithinHours(event);
  const full = Boolean(
    event.max_queue_size != null && (waitingCount || 0) >= event.max_queue_size
  );

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">
            {event.name}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Get a queue number
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Tell us who you are and we&apos;ll save your spot in line.
          </p>
        </div>
        <JoinFlow eventId={event.id} closed={closed} full={full} />
      </div>
    </main>
  );
}
