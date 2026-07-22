"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, requireAdmin, UnauthorizedError } from "./guard";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Moves the signed-in user into the organization that owns `code`, as an
 * agent. If they were the sole member of their own auto-created (and still
 * empty) organization, that organization is cleaned up behind them so we
 * don't accumulate abandoned tenants.
 */
export async function joinOrganizationByCode(code: string) {
  const { userId, profile, db } = await requireStaff();

  const joinCode = normalizeCode(code);
  if (joinCode.length < 4) {
    throw new Error("That doesn't look like a valid join code.");
  }

  const { data: target } = await db
    .from("organizations")
    .select("id, name")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (!target) {
    throw new Error("No team found with that code. Double-check it with your admin.");
  }

  const previousOrgId = profile.organization_id;
  if (previousOrgId === target.id) {
    return { organizationName: target.name as string, alreadyMember: true };
  }

  const { error } = await db
    .from("profiles")
    .update({ organization_id: target.id, role: "agent" })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  // Clean up the organization they just left, but only if it is now empty
  // and has no data of its own. Never touch an org with other members.
  if (previousOrgId) {
    const [{ count: members }, { count: services }, { count: counters }] =
      await Promise.all([
        db
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", previousOrgId),
        db
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", previousOrgId),
        db
          .from("counters")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", previousOrgId),
      ]);

    if (!members && !services && !counters) {
      await db.from("organizations").delete().eq("id", previousOrgId);
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/counter");
  return { organizationName: target.name as string, alreadyMember: false };
}

/** Issues a fresh join code, invalidating any previously shared link. */
export async function regenerateJoinCode() {
  const { profile, db } = await requireAdmin();
  if (!profile.organization_id) throw new UnauthorizedError();

  // Retry a couple of times in the (astronomically unlikely) event of a
  // collision against the unique index.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32))
    ).join("");

    const { error } = await db
      .from("organizations")
      .update({ join_code: code })
      .eq("id", profile.organization_id);

    if (!error) {
      revalidatePath("/admin/staff");
      return code;
    }
  }

  throw new Error("Couldn't generate a new join code. Try again.");
}

export async function renameOrganization(name: string) {
  const { profile, db } = await requireAdmin();
  if (!profile.organization_id) throw new UnauthorizedError();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Organization name can't be empty.");

  const { error } = await db
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", profile.organization_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin", "layout");
}

/** Removes a teammate from the organization. Owners can't be removed. */
export async function removeStaffMember(profileId: string) {
  const { userId, profile, db } = await requireAdmin();
  if (!profile.organization_id) throw new UnauthorizedError();
  if (profileId === userId) {
    throw new Error("You can't remove yourself.");
  }

  const { data: target } = await db
    .from("profiles")
    .select("id, organization_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!target || target.organization_id !== profile.organization_id) {
    throw new UnauthorizedError("That person isn't on your team.");
  }

  const { data: org } = await db
    .from("organizations")
    .select("owner_id")
    .eq("id", profile.organization_id)
    .maybeSingle();
  if (org?.owner_id === profileId) {
    throw new Error("The organization owner can't be removed.");
  }

  const { error } = await db
    .from("profiles")
    .update({ organization_id: null, role: "agent" })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/staff");
}
