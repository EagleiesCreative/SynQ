"use server";

import { requireAdmin, assertCounterInOrg, assertServiceInOrg } from "./guard";

export async function addCounter(
  name: string,
  /** Ignored — the counter is always created in the caller's own org. */
  _organizationId: string,
  serviceIds: string[]
) {
  const { db, orgId } = await requireAdmin();

  // Never link a counter to another tenant's services.
  await Promise.all(serviceIds.map((id) => assertServiceInOrg(db, id, orgId)));

  const { data, error } = await db
    .from("counters")
    .insert({ name, organization_id: orgId })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create counter");

  if (serviceIds.length) {
    await db.from("counter_services").insert(
      serviceIds.map((serviceId) => ({ counter_id: data.id, service_id: serviceId }))
    );
  }
  return data.id as string;
}

export async function toggleCounterActive(counterId: string, isActive: boolean) {
  const { db, orgId } = await requireAdmin();
  const { error } = await db
    .from("counters")
    .update({ is_active: isActive })
    .eq("id", counterId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export async function deleteCounter(counterId: string) {
  const { db, orgId } = await requireAdmin();
  const { error } = await db
    .from("counters")
    .delete()
    .eq("id", counterId)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export async function restoreCounter(
  counter: { id: string; name: string; is_active: boolean; organizationId: string },
  serviceIds: string[]
) {
  const { db, orgId } = await requireAdmin();
  await Promise.all(serviceIds.map((id) => assertServiceInOrg(db, id, orgId)));

  const { data, error } = await db
    .from("counters")
    .insert({
      id: counter.id,
      name: counter.name,
      is_active: counter.is_active,
      organization_id: orgId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to restore counter");

  if (serviceIds.length) {
    await db.from("counter_services").insert(
      serviceIds.map((serviceId) => ({ counter_id: data.id, service_id: serviceId }))
    );
  }
  return data.id as string;
}

export async function setCounterService(
  counterId: string,
  serviceId: string,
  linked: boolean
) {
  const { db, orgId } = await requireAdmin();
  await assertCounterInOrg(db, counterId, orgId);
  await assertServiceInOrg(db, serviceId, orgId);

  if (linked) {
    const { error } = await db
      .from("counter_services")
      .insert({ counter_id: counterId, service_id: serviceId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db
      .from("counter_services")
      .delete()
      .eq("counter_id", counterId)
      .eq("service_id", serviceId);
    if (error) throw new Error(error.message);
  }
}
