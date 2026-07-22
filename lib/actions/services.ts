"use server";

import { requireAdmin } from "./guard";
import type { Service } from "@/lib/database.types";

export async function addService(input: {
  name: string;
  code: string;
  description: string | null;
  color: string;
  sortOrder: number;
  organizationId: string;
}) {
  const { db } = await requireAdmin();
  const { error } = await db.from("services").insert({
    name: input.name,
    code: input.code,
    description: input.description,
    color: input.color,
    sort_order: input.sortOrder,
    organization_id: input.organizationId,
  });
  if (error) throw new Error(error.message);
}

export async function toggleServiceActive(serviceId: string, isActive: boolean) {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId);
  if (error) throw new Error(error.message);
}

export async function updateService(
  service: Pick<Service, "id" | "name" | "code" | "description" | "color">
) {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("services")
    .update({
      name: service.name,
      code: service.code,
      description: service.description,
      color: service.color,
    })
    .eq("id", service.id);
  if (error) throw new Error(error.message);
}

export async function deleteService(serviceId: string) {
  const { db } = await requireAdmin();
  const { error } = await db.from("services").delete().eq("id", serviceId);
  if (error) throw new Error(error.message);
}

export async function restoreService(service: Service) {
  const { db } = await requireAdmin();
  const { error } = await db.from("services").insert(service);
  if (error) throw new Error(error.message);
}
