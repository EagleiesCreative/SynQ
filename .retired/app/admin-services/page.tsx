import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/database.types";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Services</h1>
        <p className="text-sm text-slate-500">
          Define the service types customers can queue for.
        </p>
      </div>
      <ServicesManager
        initialServices={(services as Service[]) || []}
        organizationId={organizationId}
      />
    </div>
  );
}
