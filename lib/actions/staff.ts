"use server";

import { requireAdmin, UnauthorizedError } from "./guard";
import type { StaffRole } from "@/lib/database.types";

export async function setStaffRole(profileId: string, role: StaffRole) {
  const { db, orgId, userId } = await requireAdmin();

  if (profileId === userId) {
    throw new Error("You can't change your own role.");
  }

  // Only ever touch a profile that is in the caller's own organization.
  const { error, data } = await db
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
    .eq("organization_id", orgId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new UnauthorizedError("That person isn't on your team.");
}
