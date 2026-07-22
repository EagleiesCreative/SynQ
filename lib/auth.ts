import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, StaffRole } from "@/lib/database.types";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * Resolves the signed-in staff member from Clerk, and mirrors them into our
 * own `profiles` table (which still owns role + organization_id — Clerk
 * only owns identity). Supabase RLS can no longer gate this lookup by
 * auth.uid() (there is no Supabase Auth session anymore), so it's done
 * with the service-role client, entirely in application code.
 */
export async function getCurrentUserAndProfile(): Promise<{
  user: CurrentUser | null;
  profile: Profile | null;
}> {
  const clerkUser = await currentUser();
  if (!clerkUser) return { user: null, profile: null };

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;
  const fullName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email ||
    "Staff";

  const user: CurrentUser = { id: clerkUser.id, email };
  const admin = createAdminClient();

  let profile: Profile | null = null;

  const { data: byId } = await admin
    .from("profiles")
    .select("*")
    .eq("id", clerkUser.id)
    .maybeSingle();
  profile = byId as Profile | null;

  // First time this Clerk identity has signed in. If a profile already
  // exists under the same email (the pre-Clerk Supabase-Auth account),
  // re-parent it onto the new Clerk id instead of creating a duplicate
  // and silently losing that person's role/organization.
  if (!profile && email) {
    const { data: existing } = await admin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const { data: relinked } = await admin
        .from("profiles")
        .update({ id: clerkUser.id, full_name: fullName })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      profile = (relinked as Profile | null) ?? { ...existing, id: clerkUser.id };
    }
  }

  if (!profile) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    let role: StaffRole;
    let organizationId: string;

    if (!count) {
      // First staff member ever: becomes admin and gets a new organization.
      role = "admin";
      const { data: org, error } = await admin
        .from("organizations")
        .insert({ name: `${fullName}'s Organization` })
        .select("id")
        .single();
      if (error || !org) return { user, profile: null };
      organizationId = org.id;
    } else {
      // Everyone else joins the existing organization as an agent.
      role = "agent";
      const { data: org, error } = await admin
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error || !org) return { user, profile: null };
      organizationId = org.id;
    }

    const { data: created } = await admin
      .from("profiles")
      .insert({
        id: clerkUser.id,
        full_name: fullName,
        role,
        organization_id: organizationId,
        email,
      })
      .select("*")
      .single();
    profile = created as Profile | null;
  }

  return { user, profile };
}
