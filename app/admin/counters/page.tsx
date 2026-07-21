import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/database.types";
import { CountersManager } from "@/components/admin/CountersManager";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCountersPage() {
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";

  const [{ data: counters }, { data: services }, { data: mappings }] =
    await Promise.all([
      supabase
        .from("counters")
        .select(
          "id, name, is_active, current_agent_id, agent:profiles!counters_current_agent_id_fkey(full_name)"
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true),
      supabase.from("counter_services").select("counter_id, service_id"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Counters</h1>
        <p className="text-sm text-slate-500">
          Manage physical counters and which services they can serve.
        </p>
      </div>
      <CountersManager
        initialCounters={
          (counters as unknown as {
            id: string;
            name: string;
            is_active: boolean;
            current_agent_id: string | null;
            agent: { full_name: string } | { full_name: string }[] | null;
          }[]) || []
        }
        services={(services as Service[]) || []}
        mappings={mappings || []}
        organizationId={organizationId}
      />
    </div>
  );
}
