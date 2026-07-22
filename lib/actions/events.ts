"use server";

import { revalidatePath } from "next/cache";
import {
  requireStaff,
  requireAdmin,
  assertEventInOrg,
  assertTicketInOrg,
} from "./guard";
import type { Event, Ticket } from "@/lib/database.types";
import { notifyTicket, notifyAlmostUp } from "@/lib/whatsapp/notify";

/* ----------------------------------------------------------------- queue */

/**
 * Each account owns exactly one queue, provisioned at sign-in — there is
 * deliberately no create or delete action here, only settings.
 */
export async function updateEvent(
  eventId: string,
  patch: Partial<
    Pick<
      Event,
      "name" | "description" | "is_open" | "opens_at" | "closes_at" | "max_queue_size"
    >
  >
) {
  const { db, orgId } = await requireAdmin();
  await assertEventInOrg(db, eventId, orgId);

  const { error } = await db
    .from("events")
    .update({
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.opens_at !== undefined ? { opens_at: patch.opens_at || null } : {}),
      ...(patch.closes_at !== undefined ? { closes_at: patch.closes_at || null } : {}),
    })
    .eq("id", eventId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/**
 * Calls the next waiting ticket. Any ticket still sitting in called/serving
 * is marked served first, so the operator only ever needs one button.
 */
export async function callNext(
  eventId: string
): Promise<{ ok: true; ticket: Ticket } | { ok: false; reason: "empty" }> {
  const { userId, db, orgId } = await requireStaff();
  await assertEventInOrg(db, eventId, orgId);

  const { data: eventRow } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  const event = eventRow as Event | null;

  const now = new Date().toISOString();

  // Close out whoever is currently up.
  await db
    .from("tickets")
    .update({ status: "served", finished_at: now })
    .eq("event_id", eventId)
    .in("status", ["called", "serving"]);

  const { data: next } = await db
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) {
    await db.from("events").update({ current_ticket_id: null }).eq("id", eventId);
    revalidatePath("/admin");
    return { ok: false, reason: "empty" };
  }

  const { data: called, error } = await db
    .from("tickets")
    .update({
      status: "called",
      agent_id: userId,
      called_at: now,
      served_at: now,
    })
    .eq("id", next.id)
    .select("*")
    .single();
  if (error || !called) throw new Error(error?.message || "Couldn't call the next number.");

  await db
    .from("events")
    .update({ current_ticket_id: called.id })
    .eq("id", eventId);

  if (event) {
    // Tell this person they're up, and warn whoever is now near the front.
    await notifyTicket({
      kind: "called",
      ticket: called as Ticket,
      event,
      organizationId: orgId,
      db,
    });
    await notifyAlmostUp({ event, organizationId: orgId, db });
  }

  revalidatePath("/admin");
  return { ok: true, ticket: called as Ticket };
}

/** Re-announces the number currently up without advancing the queue. */
export async function recallCurrent(eventId: string) {
  const { db, orgId } = await requireStaff();
  await assertEventInOrg(db, eventId, orgId);

  const { data: event } = await db
    .from("events")
    .select("current_ticket_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event?.current_ticket_id) return;

  // Touching called_at is what the display board watches for.
  await db
    .from("tickets")
    .update({ called_at: new Date().toISOString() })
    .eq("id", event.current_ticket_id);
}

/** Marks the number currently up as a no-show and moves on. */
export async function skipCurrent(eventId: string) {
  const { db, orgId } = await requireStaff();
  await assertEventInOrg(db, eventId, orgId);

  const { data: event } = await db
    .from("events")
    .select("current_ticket_id")
    .eq("id", eventId)
    .maybeSingle();

  if (event?.current_ticket_id) {
    const { data: current } = await db
      .from("tickets")
      .select("skip_count")
      .eq("id", event.current_ticket_id)
      .maybeSingle();

    await db
      .from("tickets")
      .update({
        status: "skipped",
        finished_at: new Date().toISOString(),
        skip_count: (current?.skip_count ?? 0) + 1,
      })
      .eq("id", event.current_ticket_id);

    await db.from("events").update({ current_ticket_id: null }).eq("id", eventId);
  }

  revalidatePath("/admin");
}

/** Puts a skipped ticket back at the end of the waiting line. */
export async function requeueTicket(ticketId: string) {
  const { db, orgId } = await requireStaff();
  const eventId = await assertTicketInOrg(db, ticketId, orgId);

  const { error } = await db
    .from("tickets")
    .update({
      status: "waiting",
      called_at: null,
      served_at: null,
      finished_at: null,
      created_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** Hands a number to a walk-up customer who didn't scan the QR. */
export async function issueWalkInTicket(
  eventId: string,
  customerName?: string,
  partySize = 1,
  customerPhone?: string
): Promise<Ticket> {
  const { db, orgId } = await requireStaff();
  await assertEventInOrg(db, eventId, orgId);

  const { data, error } = await db.rpc("issue_ticket", {
    p_event_id: eventId,
    p_customer_name: customerName?.trim() || null,
    p_party_size: partySize,
    p_customer_phone: customerPhone?.trim() || null,
  });
  if (error) throw new Error(error.message);

  const ticket = data as Ticket;

  const { data: eventRow } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (eventRow) {
    await notifyTicket({
      kind: "joined",
      ticket,
      event: eventRow as Event,
      organizationId: orgId,
      db,
    });
  }

  revalidatePath("/admin");
  return ticket;
}

/** Clears the queue so the event can start over (numbers restart at 1). */
export async function resetQueue(eventId: string) {
  const { db, orgId } = await requireAdmin();
  await assertEventInOrg(db, eventId, orgId);

  await db.from("events").update({ current_ticket_id: null }).eq("id", eventId);
  await db.from("tickets").delete().eq("event_id", eventId);
  await db.from("events").update({ last_number: 0 }).eq("id", eventId);

  revalidatePath("/admin");
}
