import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/database.types";
import { CallNextBar } from "@/components/admin/CallNextBar";
import { LiveQueueTable } from "@/components/admin/LiveQueueTable";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Live queue</h1>
        <p className="text-sm text-slate-500">
          Call the next customer, monitor everyone waiting, and step in on any
          counter. Press <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-xs">C</kbd> to call next.
        </p>
      </div>

      <CallNextBar />
      <LiveQueueTable services={(services as Service[]) || []} />
    </div>
  );
}
