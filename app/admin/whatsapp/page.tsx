import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { getAisensyApiKey } from "@/lib/whatsapp/aisensy";
import type { WhatsappSettings } from "@/lib/whatsapp/notify";
import {
  WhatsappSettingsForm,
  type WhatsappSettingsView,
} from "@/components/admin/WhatsappSettingsForm";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";

  const { data } = await createAdminClient()
    .from("whatsapp_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const s = data as WhatsappSettings | null;

  // Only whether a key is configured crosses to the client, never its value.
  const initial: WhatsappSettingsView = {
    enabled: s?.enabled ?? false,
    keyConfigured: Boolean(getAisensyApiKey()),
    campaign_joined: s?.campaign_joined ?? "",
    campaign_almost_up: s?.campaign_almost_up ?? "",
    campaign_called: s?.campaign_called ?? "",
    notify_on_join: s?.notify_on_join ?? true,
    notify_almost_up: s?.notify_almost_up ?? true,
    notify_on_called: s?.notify_on_called ?? true,
    almost_up_threshold: s?.almost_up_threshold ?? 3,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">WhatsApp</h1>
        <p className="text-sm text-slate-500">
          Notify people on WhatsApp through AiSensy when they join the queue,
          get close to the front, and when their number is called. The API key
          is read from the server environment, not stored here.
        </p>
      </div>
      <WhatsappSettingsForm initial={initial} />
    </div>
  );
}
