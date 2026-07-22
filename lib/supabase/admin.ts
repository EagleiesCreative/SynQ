import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Since Clerk (not Supabase Auth) now owns identity, Supabase's
 * auth.uid()-based RLS policies can no longer gate staff writes (there is
 * no Supabase Auth session to read a uid from). Authorization for writes
 * happens in application code instead: every server action that uses this
 * client must first verify the caller's Clerk session and role via
 * `requireStaff()` / `requireAdmin()` in `lib/actions/guard.ts`.
 *
 * NEVER import this file from a "use client" component or expose
 * `SUPABASE_SERVICE_ROLE_KEY` to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add SUPABASE_SERVICE_ROLE_KEY (Project Settings > API > service_role key, " +
        "server-only, never NEXT_PUBLIC_) to .env.local."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
