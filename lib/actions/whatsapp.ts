"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";
import {
  getAisensyApiKey,
  normalisePhone,
  sendAisensyCampaign,
} from "@/lib/whatsapp/aisensy";
import type { WhatsappSettings } from "@/lib/whatsapp/notify";

/**
 * What the settings form may change. The AiSensy key is server config
 * (AISENSY_API_KEY) and is deliberately not settable from the UI.
 */
export type WhatsappSettingsInput = Partial<
  Pick<
    WhatsappSettings,
    | "enabled"
    | "campaign_joined"
    | "campaign_almost_up"
    | "campaign_called"
    | "notify_on_join"
    | "notify_almost_up"
    | "notify_on_called"
    | "almost_up_threshold"
  >
>;

export async function saveWhatsappSettings(input: WhatsappSettingsInput) {
  const { db, orgId } = await requireAdmin();

  const patch: Record<string, unknown> = {
    organization_id: orgId,
    updated_at: new Date().toISOString(),
  };

  for (const key of [
    "enabled",
    "campaign_joined",
    "campaign_almost_up",
    "campaign_called",
    "notify_on_join",
    "notify_almost_up",
    "notify_on_called",
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }

  if (input.almost_up_threshold !== undefined) {
    patch.almost_up_threshold = Math.min(
      20,
      Math.max(1, Number(input.almost_up_threshold) || 3)
    );
  }

  if (patch.enabled === true && !getAisensyApiKey()) {
    throw new Error(
      "Messaging isn't connected yet, so notifications can't be switched on."
    );
  }

  const { error } = await db
    .from("whatsapp_settings")
    .upsert(patch, { onConflict: "organization_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/whatsapp");
}

/** Fires one real message so the owner can confirm the wiring end to end. */
export async function sendWhatsappTest(phone: string) {
  const { db, orgId } = await requireAdmin();

  if (!getAisensyApiKey()) {
    throw new Error("Messaging isn't connected yet.");
  }

  const destination = normalisePhone(phone);
  if (!destination) {
    throw new Error("Enter a valid phone number, including the country code.");
  }

  const { data } = await db
    .from("whatsapp_settings")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  const settings = data as WhatsappSettings | null;

  const campaignName =
    settings?.campaign_called ||
    settings?.campaign_joined ||
    settings?.campaign_almost_up;
  if (!campaignName) {
    throw new Error("Add at least one message name first.");
  }

  const result = await sendAisensyCampaign({
    campaignName,
    destination,
    userName: "SynQ test",
    templateParams: ["there", "001", "Test queue", "0"],
  });

  if (!result.ok) {
    throw new Error("That message couldn't be sent. Check the message name and try again.");
  }
  return { destination };
}
