import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile } from "@/lib/auth";
import type { AppSettings } from "@/lib/database.types";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";

  const { data: settings } = await createAdminClient()
    .from("app_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  // An organization created before per-org settings existed may not have a
  // row yet; the form upserts on save.
  const initialSettings: AppSettings = (settings as AppSettings) ?? {
    organization_id: organizationId,
    max_queue_size: null,
    opens_at: null,
    closes_at: null,
    is_open: true,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Control when customers can join and how many can be waiting at once.
        </p>
      </div>
      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
