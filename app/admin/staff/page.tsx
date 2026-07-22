import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { StaffManager } from "@/components/admin/StaffManager";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const supabase = await createClient();
  const { user } = await getCurrentUserAndProfile();
  const { data: staff } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
        <p className="text-sm text-slate-500">
          Manage staff accounts and permissions. New accounts can be created
          from the{" "}
          <Link href="/register" className="text-brand-600 hover:underline">
            sign up page
          </Link>
          .
        </p>
      </div>
      <StaffManager
        initialStaff={(staff as Profile[]) || []}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
