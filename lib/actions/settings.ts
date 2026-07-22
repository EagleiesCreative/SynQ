"use server";

import { requireAdmin } from "./guard";
import type { AppSettings } from "@/lib/database.types";

export async function updateSettings(
  settings: Pick<AppSettings, "is_open" | "opens_at" | "closes_at" | "max_queue_size">
) {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("app_settings")
    .update({
      is_open: settings.is_open,
      opens_at: settings.opens_at || null,
      closes_at: settings.closes_at || null,
      max_queue_size: settings.max_queue_size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
}
