import { getCurrentUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/database.types";

/**
 * Every server action that writes to Supabase must call one of these first.
 * Authorization now lives here (application code) instead of in RLS,
 * because Supabase RLS's auth.uid() checks have nothing to read once Clerk
 * — not Supabase Auth — owns the session.
 */

export class UnauthorizedError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireStaff(): Promise<{
  userId: string;
  profile: Profile;
  db: ReturnType<typeof createAdminClient>;
}> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) throw new UnauthorizedError("Sign in to continue.");
  return { userId: user.id, profile, db: createAdminClient() };
}

export async function requireAdmin(): Promise<{
  userId: string;
  profile: Profile;
  db: ReturnType<typeof createAdminClient>;
}> {
  const result = await requireStaff();
  if (result.profile.role !== "admin") {
    throw new UnauthorizedError("Admin access required.");
  }
  return result;
}
