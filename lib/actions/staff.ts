"use server";

import { requireAdmin } from "./guard";
import type { StaffRole } from "@/lib/database.types";

export async function setStaffRole(profileId: string, role: StaffRole) {
  const { db } = await requireAdmin();
  const { error } = await db.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new Error(error.message);
}
