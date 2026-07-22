import { createClient } from "@/lib/supabase/server";
import type { AppSettings, Service } from "@/lib/database.types";
import { JoinFlow } from "@/components/join/JoinFlow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

function isWithinHours(settings: AppSettings | null) {
  if (!settings?.opens_at || !settings?.closes_at) return true;
  const now = new Date().toTimeString().slice(0, 8);
  return now >= settings.opens_at && now <= settings.closes_at;
}

export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  if (!organization) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <EmptyState
            icon={SearchX}
            title="Queue not found"
            description="This link doesn't point to a valid queue. Ask staff for the correct QR code or link."
          />
        </Card>
      </main>
    );
  }

  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", eventId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("app_settings")
      .select("*")
      .eq("organization_id", eventId)
      .maybeSingle(),
  ]);

  const serviceIds = (services || []).map((s: Service) => s.id);
  const { count: waitingCount } = serviceIds.length
    ? await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("service_id", serviceIds)
        .eq("status", "waiting")
    : { count: 0 };

  const appSettings = settings as AppSettings | null;
  // A newly created organization has no settings row until an admin saves
  // one — treat that as "open" rather than locking customers out.
  const closed = appSettings
    ? !appSettings.is_open || !isWithinHours(appSettings)
    : false;
  const full = Boolean(
    appSettings?.max_queue_size != null &&
      (waitingCount || 0) >= appSettings.max_queue_size
  );

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">
            {organization.name}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Get a queue ticket
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Select the service you need, and we&apos;ll give you a number.
          </p>
        </div>
        <JoinFlow
          services={(services as Service[]) || []}
          closed={closed}
          full={full}
        />
      </div>
    </main>
  );
}
