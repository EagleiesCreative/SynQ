"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Plus, Trash2, Power, ChevronDown, ChevronUp } from "lucide-react";

interface CounterRow {
  id: string;
  name: string;
  is_active: boolean;
  current_agent_id: string | null;
  agent: { full_name: string } | { full_name: string }[] | null;
}

export function CountersManager({
  initialCounters,
  services,
  mappings,
  organizationId,
}: {
  initialCounters: CounterRow[];
  services: Service[];
  mappings: { counter_id: string; service_id: string }[];
  organizationId: string;
}) {
  const [counters, setCounters] = useState(initialCounters);
  const [serviceMap, setServiceMap] = useState<Record<string, Set<string>>>(
    () => {
      const m: Record<string, Set<string>> = {};
      counters.forEach((c) => (m[c.id] = new Set()));
      mappings.forEach((row) => {
        if (!m[row.counter_id]) m[row.counter_id] = new Set();
        m[row.counter_id].add(row.service_id);
      });
      return m;
    }
  );
  const showToast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CounterRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("counters")
      .select(
        "id, name, is_active, current_agent_id, agent:profiles!counters_current_agent_id_fkey(full_name)"
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    setCounters((data as unknown as CounterRow[]) || []);
  }

  async function addCounter() {
    if (!newName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("counters")
      .insert({ name: newName.trim(), organization_id: organizationId })
      .select()
      .single();
    if (data) {
      // by default, link to all active services
      await supabase.from("counter_services").insert(
        services.map((s) => ({ counter_id: data.id, service_id: s.id }))
      );
    }
    setNewName("");
    await refresh();
    setServiceMap((prev) => ({
      ...prev,
      [data.id]: new Set(services.map((s) => s.id)),
    }));
    setBusy(false);
  }

  async function toggleActive(c: CounterRow) {
    const supabase = createClient();
    const nextActive = !c.is_active;
    await supabase.from("counters").update({ is_active: nextActive }).eq("id", c.id);
    await refresh();
    showToast({
      message: `${c.name} ${nextActive ? "activated" : "deactivated"}`,
      actionLabel: "Undo",
      onAction: async () => {
        await supabase
          .from("counters")
          .update({ is_active: !nextActive })
          .eq("id", c.id);
        refresh();
      },
    });
  }

  async function deleteCounter() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const removed = deleteTarget;
    const linkedServiceIds = Array.from(serviceMap[removed.id] || []);
    await supabase.from("counters").delete().eq("id", removed.id);
    setDeleteTarget(null);
    setDeleting(false);
    await refresh();
    showToast({
      message: `${removed.name} deleted`,
      actionLabel: "Undo",
      onAction: async () => {
        const { data } = await supabase
          .from("counters")
          .insert({
            id: removed.id,
            name: removed.name,
            is_active: removed.is_active,
            organization_id: organizationId,
          })
          .select()
          .single();
        if (data && linkedServiceIds.length) {
          await supabase.from("counter_services").insert(
            linkedServiceIds.map((serviceId) => ({
              counter_id: data.id,
              service_id: serviceId,
            }))
          );
        }
        refresh();
      },
    });
  }

  async function toggleService(counterId: string, serviceId: string) {
    const supabase = createClient();
    const current = serviceMap[counterId] || new Set();
    const has = current.has(serviceId);

    if (has) {
      await supabase
        .from("counter_services")
        .delete()
        .eq("counter_id", counterId)
        .eq("service_id", serviceId);
    } else {
      await supabase
        .from("counter_services")
        .insert({ counter_id: counterId, service_id: serviceId });
    }

    setServiceMap((prev) => {
      const next = new Set(prev[counterId] || []);
      if (has) next.delete(serviceId);
      else next.add(serviceId);
      return { ...prev, [counterId]: next };
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {counters.map((c) => {
              const agent = Array.isArray(c.agent) ? c.agent[0] : c.agent;
              const isExpanded = expanded === c.id;
              return (
                <div key={c.id}>
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {agent?.full_name
                          ? `Operated by ${agent.full_name}`
                          : "Unassigned"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setExpanded(isExpanded ? null : c.id)
                        }
                        className="h-8 px-2 flex items-center gap-1 rounded-lg text-xs text-slate-500 hover:bg-slate-50"
                      >
                        Services{" "}
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        title={c.is_active ? "Deactivate" : "Activate"}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                          c.is_active
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-4 flex flex-wrap gap-2 bg-slate-50">
                      {services.map((s) => {
                        const active = serviceMap[c.id]?.has(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleService(c.id, s.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              active
                                ? "border-transparent text-white"
                                : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                            }`}
                            style={
                              active ? { backgroundColor: s.color } : undefined
                            }
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {counters.length === 0 && (
              <EmptyState title="No counters yet" description="Add one below to get started." />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New counter name, e.g. Counter 4"
            onKeyDown={(e) => e.key === "Enter" && addCounter()}
          />
          <Button onClick={addCounter} disabled={busy}>
            <Plus size={16} /> Add
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteCounter}
        title="Delete counter?"
        description={`"${deleteTarget?.name}" will be removed. You can undo this from the confirmation toast right after.`}
        busy={deleting}
      />
    </div>
  );
}
