
import { createAdminClient } from "@/lib/supabase/admin";
import type { Event, Ticket } from "@/lib/database.types";
import {
  getAisensyApiKey,
  normalisePhone,
  sendAisensyCampaign,
  type NotificationKind,
} from "./aisensy";

export interface WhatsappSettings {
  organization_id: string;
  enabled: boolean;
  campaign_joined: string | null;
  campaign_almost_up: string | null;
  campaign_called: string | null;
  notify_on_join: boolean;
  notify_almost_up: boolean;
  notify_on_called: boolean;
  almost_up_threshold: number;
  updated_at: string;
}

type Db = ReturnType<typeof createAdminClient>;

export async function getWhatsappSettings(
  organizationId: string
): Promise<WhatsappSettings | null> {
  const { data } = await createAdminClient()
    .from("whatsapp_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as WhatsappSettings) ?? null;
}

function campaignFor(s: WhatsappSettings, kind: NotificationKind) {
  if (kind === "joined") return s.notify_on_join ? s.campaign_joined : null;
  if (kind === "almost_up") return s.notify_almost_up ? s.campaign_almost_up : null;
  return s.notify_on_called ? s.campaign_called : null;
}

/**
 * Template parameters, in the order the AiSensy template expects them.
 * Keep this in sync with the approved WhatsApp template:
 *   1. customer name
 *   2. queue number
 *   3. queue / event name
 *   4. people ahead (0 when it's their turn)
 */
function templateParams(
  ticket: Ticket,
  event: Event,
  peopleAhead: number
): string[] {
  return [
    ticket.customer_name || "there",
    ticket.code,
    event.name,
    String(peopleAhead),
  ];
}

/**
 * Sends one WhatsApp notification for a ticket, at most once per kind.
 *
 * Everything here is best-effort and swallowed: a queue must keep moving
 * even if the messaging provider is down, misconfigured, or unpaid.
 */
export async function notifyTicket({
  kind,
  ticket,
  event,
  organizationId,
  peopleAhead = 0,
  db = createAdminClient(),
}: {
  kind: NotificationKind;
  ticket: Ticket;
  event: Event;
  organizationId: string;
  peopleAhead?: number;
  db?: Db;
}): Promise<void> {
  try {
    if (!getAisensyApiKey()) return;

    const settings = await getWhatsappSettings(organizationId);
    if (!settings?.enabled) return;

    const campaignName = campaignFor(settings, kind);
    if (!campaignName) return;

    const destination = normalisePhone(ticket.customer_phone);
    if (!destination) return;

    // The unique (ticket_id, kind) index is what actually guarantees
    // once-only delivery; claim the slot before calling out.
    const { error: claimError } = await db.from("whatsapp_messages").insert({
      ticket_id: ticket.id,
      organization_id: organizationId,
      kind,
      destination,
      status: "sent",
    });
    if (claimError) return; // already sent, or ticket vanished

    const result = await sendAisensyCampaign({
      campaignName,
      destination,
      userName: ticket.customer_name || "Guest",
      templateParams: templateParams(ticket, event, peopleAhead),
    });

    if (!result.ok) {
      await db
        .from("whatsapp_messages")
        .update({ status: "failed", error: result.error })
        .eq("ticket_id", ticket.id)
        .eq("kind", kind);
    }
  } catch (err) {
    console.error("[whatsapp] notify failed:", err);
  }
}

/**
 * Nudges everyone who has moved within `almost_up_threshold` of the front.
 * Safe to call after every "Next" — already-notified tickets are skipped by
 * the unique index.
 */
export async function notifyAlmostUp({
  event,
  organizationId,
  db = createAdminClient(),
}: {
  event: Event;
  organizationId: string;
  db?: Db;
}): Promise<void> {
  try {
    if (!getAisensyApiKey()) return;

    const settings = await getWhatsappSettings(organizationId);
    if (!settings?.enabled || !settings.notify_almost_up) return;

    const { data: waiting } = await db
      .from("tickets")
      .select("*")
      .eq("event_id", event.id)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(Math.max(1, settings.almost_up_threshold));

    await Promise.all(
      ((waiting as Ticket[]) || []).map((t, index) =>
        notifyTicket({
          kind: "almost_up",
          ticket: t,
          event,
          organizationId,
          peopleAhead: index + 1,
          db,
        })
      )
    );
  } catch (err) {
    console.error("[whatsapp] almost-up sweep failed:", err);
  }
}
