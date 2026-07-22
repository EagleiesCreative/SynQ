"use server";

import {
  requireStaff,
  assertCounterInOrg,
  assertServiceInOrg,
  assertTicketInOrg,
} from "./guard";

export async function claimCounter(counterId: string) {
  const { userId, db, orgId } = await requireStaff();
  await assertCounterInOrg(db, counterId, orgId);
  const { error } = await db
    .from("counters")
    .update({ current_agent_id: userId })
    .eq("id", counterId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export async function releaseCounterClaim(counterId: string) {
  const { db, orgId } = await requireStaff();
  const { error } = await db
    .from("counters")
    .update({ current_agent_id: null })
    .eq("id", counterId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export async function callNextTicket(
  counterId: string
): Promise<{ ok: true } | { ok: false; reason: "no-services" | "empty" }> {
  const { userId, db, orgId } = await requireStaff();
  await assertCounterInOrg(db, counterId, orgId);

  const { data: links } = await db
    .from("counter_services")
    .select("service_id")
    .eq("counter_id", counterId);
  const serviceIds = (links || []).map((l) => l.service_id as string);
  if (!serviceIds.length) return { ok: false, reason: "no-services" };

  const { data: nextTicket } = await db
    .from("tickets")
    .select("id")
    .in("service_id", serviceIds)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextTicket) return { ok: false, reason: "empty" };

  await db
    .from("tickets")
    .update({
      status: "called",
      counter_id: counterId,
      agent_id: userId,
      called_at: new Date().toISOString(),
    })
    .eq("id", nextTicket.id);

  await db
    .from("counters")
    .update({ current_ticket_id: nextTicket.id })
    .eq("id", counterId)
    .eq("organization_id", orgId);

  return { ok: true };
}

export async function updateTicket(
  ticketId: string,
  status: "called" | "serving" | "served" | "skipped",
  extra: Record<string, string | number | null> = {}
) {
  const { db, orgId } = await requireStaff();
  await assertTicketInOrg(db, ticketId, orgId);
  const { error } = await db
    .from("tickets")
    .update({ status, ...extra })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);
}

export async function clearCounterTicket(counterId: string) {
  const { db, orgId } = await requireStaff();
  const { error } = await db
    .from("counters")
    .update({ current_ticket_id: null })
    .eq("id", counterId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export async function moveTicketToFront(ticketId: string, serviceId: string) {
  const { db, orgId } = await requireStaff();
  await assertTicketInOrg(db, ticketId, orgId);
  await assertServiceInOrg(db, serviceId, orgId);

  const { data: earliest } = await db
    .from("tickets")
    .select("created_at")
    .eq("service_id", serviceId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const base = earliest ? new Date(earliest.created_at) : new Date();
  const bumped = new Date(base.getTime() - 1000).toISOString();

  const { error } = await db
    .from("tickets")
    .update({ created_at: bumped })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);
}
