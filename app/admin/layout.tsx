import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { StaffHeader } from "@/components/layout/StaffHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

/**
 * Everyone on the team works the same queue board. Agents get the board and
 * nothing else; the owner and any admins also get notifications and staff.
 * Per-action authorization still lives in the server actions themselves.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/admin");

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader
        title="Queue"
        fullName={profile?.full_name || user.email || ""}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row">
        <AdminSidebar isAdmin={profile?.role === "admin"} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
