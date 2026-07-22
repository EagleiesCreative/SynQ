"use server";

import { requireAdmin } from "./guard";

export async function addCounter(
  name: string,
  organizationId: string,
  serviceIds: string[]
) {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("counters")
    .insert({ name, organization_id: organizationId })
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
  const { db } = await requireAdmin();
  const { error } = await db
    .from("counters")
    .update({ is_active: isActive })
    .eq("id", counterId);
  if (error) throw new Error(error.message);
}

export async function deleteCounter(counterId: string) {
  const { db } = await requireAdmin();
  const { error } = await db.from("counters").delete().eq("id", counterId);
  if (error) throw new Error(error.message);
}

export async function restoreCounter(
  counter: { id: string; name: string; is_active: boolean; organizationId: string },
  serviceIds: string[]
) {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("counters")
    .insert({
      id: counter.id,
      name: counter.name,
      is_active: counter.is_active,
      organization_id: counter.organizationId,
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
  const { db } = await requireAdmin();
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
