import { getCurrentUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/database.types";

/**
 * Every server action that writes to Supabase must call one of these first.
 * Authorization now lives here (application code) instead of in RLS,
 * because Supabase RLS's auth.uid() checks have nothing to read once Clerk
 * — not Supabase Auth — owns the session.
 *
 * `orgId` is the tenant boundary: because the service-role client bypasses
 * RLS entirely, every query an action runs MUST be constrained to it, either
 * with `.eq("organization_id", orgId)` or via one of the assert* helpers
 * below for rows that inherit their tenant through a parent.
 */

export class UnauthorizedError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

type Db = ReturnType<typeof createAdminClient>;

export interface Actor {
  userId: string;
  profile: Profile;
  orgId: string;
  db: Db;
}

export async function requireStaff(): Promise<Actor> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) throw new UnauthorizedError("Sign in to continue.");
  if (!profile.organization_id) {
    throw new UnauthorizedError(
      "You're not part of an organization yet. Join a team or start your own."
    );
  }
  return {
    userId: user.id,
    profile,
    orgId: profile.organization_id,
    db: createAdminClient(),
  };
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireStaff();
  if (actor.profile.role !== "admin") {
    throw new UnauthorizedError("Admin access required.");
  }
  return actor;
}

/** Throws unless `counterId` belongs to `orgId`. */
export async function assertCounterInOrg(db: Db, counterId: string, orgId: string) {
  const { data } = await db
    .from("counters")
    .select("id")
    .eq("id", counterId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) throw new UnauthorizedError("That counter isn't in your organization.");
}

/** Throws unless `serviceId` belongs to `orgId`. */
export async function assertServiceInOrg(db: Db, serviceId: string, orgId: string) {
  const { data } = await db
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) throw new UnauthorizedError("That service isn't in your organization.");
}

/**
 * Tickets have no organization_id of their own — they inherit the tenant
 * from the service they were issued against.
 */
export async function assertTicketInOrg(db: Db, ticketId: string, orgId: string) {
  const { data } = await db
    .from("tickets")
    .select("id, service:services!tickets_service_id_fkey(organization_id)")
    .eq("id", ticketId)
    .maybeSingle();

  const service = Array.isArray(data?.service) ? data?.service[0] : data?.service;
  if (!data || service?.organization_id !== orgId) {
    throw new UnauthorizedError("That ticket isn't in your organization.");
  }
}
