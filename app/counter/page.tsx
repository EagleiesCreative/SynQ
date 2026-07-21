import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { StaffHeader } from "@/components/layout/StaffHeader";
import { CounterDashboard } from "@/components/counter/CounterDashboard";

export const dynamic = "force-dynamic";

export default async function CounterPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/counter");

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader
        title="Counter"
        fullName={profile?.full_name || user.email || ""}
        nav={
          profile?.role === "admin"
            ? [{ href: "/admin", label: "Admin dashboard" }]
            : undefined
        }
      />
      <CounterDashboard userId={user.id} />
    </div>
  );
}
