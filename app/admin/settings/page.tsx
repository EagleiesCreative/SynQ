import { createClient } from "@/lib/supabase/server";
import type { AppSettings } from "@/lib/database.types";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Control when customers can join and how many can be waiting at once.
        </p>
      </div>
      <SettingsForm initialSettings={settings as AppSettings} />
    </div>
  );
}
