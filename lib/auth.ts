import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Event } from "@/lib/database.types";

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
 *
 * Provisioning model (POS-style): whoever signs in gets their OWN
 * organization with exactly one queue, and is its admin/owner. Nobody is
 * ever auto-dropped into someone else's organization — joining an existing
 * team is an explicit, opt-in action via a join code (see
 * lib/actions/organization.ts).
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

  const { data: byId } = await admin
    .from("profiles")
    .select("*")
    .eq("id", clerkUser.id)
    .maybeSingle();
  let profile = byId as Profile | null;

  // First time this Clerk identity has signed in. If a profile already
  // exists under the same email (the pre-Clerk Supabase-Auth account, or a
  // teammate pre-provisioned by an admin), re-parent it onto the new Clerk
  // id instead of creating a duplicate and silently losing their
  // role/organization.
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

  // Brand-new person: give them their own organization and make them its
  // owner/admin. They can later join someone else's team with a join code.
  if (!profile) {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: `${fullName}'s Organization` })
      .select("id")
      .single();
    if (orgError || !org) return { user, profile: null };

    const { data: created, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: clerkUser.id,
        full_name: fullName,
        role: "admin",
        organization_id: org.id,
        email,
      })
      .select("*")
      .single();

    if (profileError || !created) {
      // Don't leave an orphaned, unreachable organization behind.
      await admin.from("organizations").delete().eq("id", org.id);
      return { user, profile: null };
    }

    await admin
      .from("organizations")
      .update({ owner_id: clerkUser.id })
      .eq("id", org.id);

    // Each account runs exactly one queue, created up front so the
    // dashboard is usable the moment they land on it.
    await admin
      .from("events")
      .insert({ organization_id: org.id, name: `${fullName}'s Queue` })
      .select("id")
      .maybeSingle();

    profile = created as Profile;
  }

  return { user, profile };
}

/**
 * The single queue belonging to `organizationId`, created on demand.
 *
 * There is deliberately no UI for creating or deleting queues: one account
 * owns one queue for its whole life. This exists so accounts that predate
 * that rule (or whose queue was somehow removed) still resolve to one.
 */
export async function getOrCreateEvent(
  organizationId: string,
  fallbackName = "My Queue"
): Promise<Event | null> {
  if (!organizationId) return null;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as Event;

  const { data: created } = await admin
    .from("events")
    .insert({ organization_id: organizationId, name: fallbackName })
    .select("*")
    .maybeSingle();

  return (created as Event) ?? null;
}
