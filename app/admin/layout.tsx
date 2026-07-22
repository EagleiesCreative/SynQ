import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { StaffHeader } from "@/components/layout/StaffHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/admin");

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <StaffHeader
          title="Admin"
          fullName={profile?.full_name || user.email || ""}
        />
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Admin access required
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Your account doesn&apos;t have admin permissions. Ask the queue owner to make you an admin from the Staff page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader
        title="Admin"
        fullName={profile?.full_name || user.email || ""}
      />
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-6 px-6 py-8">
        <AdminSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
