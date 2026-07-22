import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { JoinTeamForm } from "@/components/auth/JoinTeamForm";

export const dynamic = "force-dynamic";

export default async function JoinTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/join-team");

  const { code } = await searchParams;

  let currentOrgName: string | null = null;
  if (profile?.organization_id) {
    const { data: org } = await createAdminClient()
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();
    currentOrgName = (org?.name as string) ?? null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-semibold mb-4"
          >
            S
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Join a team</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter the join code your admin shared with you.
          </p>
        </div>

        <JoinTeamForm
          initialCode={(code || "").toUpperCase()}
          currentOrgName={currentOrgName}
        />

        <p className="mt-5 text-center text-sm text-slate-500">
          Running your own queue instead?{" "}
          <Link href="/admin" className="font-medium text-brand-600 hover:underline">
            Go to your dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
