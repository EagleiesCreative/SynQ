import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/database.types";
import { StaffManager } from "@/components/admin/StaffManager";
import { InvitePanel } from "@/components/admin/InvitePanel";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";
  const db = createAdminClient();

  const [{ data: staff }, { data: org }] = await Promise.all([
    db
      .from("profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    db
      .from("organizations")
      .select("join_code, owner_id")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
        <p className="text-sm text-slate-500">
          Everyone who can work this organization&apos;s queue.
        </p>
      </div>

      {org?.join_code && <InvitePanel initialCode={org.join_code as string} />}

      <StaffManager
        initialStaff={(staff as Profile[]) || []}
        currentUserId={user?.id || ""}
        ownerId={(org?.owner_id as string | null) || null}
      />
    </div>
  );
}
