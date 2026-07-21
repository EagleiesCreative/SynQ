"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2, Check, X, Power } from "lucide-react";

const COLOR_OPTIONS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

export function ServicesManager({
  initialServices,
  organizationId,
}: {
  initialServices: Service[];
  organizationId: string;
}) {
  const showToast = useToast();
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    color: COLOR_OPTIONS[0],
  });
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true });
    setServices((data as Service[]) || []);
  }

  async function addService() {
    if (!form.name || !form.code) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("services").insert({
      name: form.name,
      code: form.code.toUpperCase(),
      description: form.description || null,
      color: form.color,
      sort_order: services.length,
      organization_id: organizationId,
    });
    setForm({ name: "", code: "", description: "", color: COLOR_OPTIONS[0] });
    setShowAdd(false);
    await refresh();
    setBusy(false);
  }

  async function toggleActive(s: Service) {
    const supabase = createClient();
    const nextActive = !s.is_active;
    await supabase.from("services").update({ is_active: nextActive }).eq("id", s.id);
    await refresh();
    showToast({
      message: `${s.name} ${nextActive ? "activated" : "deactivated"}`,
      actionLabel: "Undo",
      onAction: async () => {
        await supabase
          .from("services")
          .update({ is_active: !nextActive })
          .eq("id", s.id);
        refresh();
      },
    });
  }

  async function deleteService() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const removed = deleteTarget;
    await supabase.from("services").delete().eq("id", removed.id);
    setDeleteTarget(null);
    setDeleting(false);
    await refresh();
    showToast({
      message: `${removed.name} deleted`,
      actionLabel: "Undo",
      onAction: async () => {
        await supabase.from("services").insert(removed);
        refresh();
      },
    });
  }

  async function saveEdit(s: Service) {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("services")
      .update({
        name: s.name,
        code: s.code.toUpperCase(),
        description: s.description,
        color: s.color,
      })
      .eq("id", s.id);
    setEditingId(null);
    await refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {services.map((s) =>
              editingId === s.id ? (
                <EditRow
                  key={s.id}
                  service={s}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSave={saveEdit}
                />
              ) : (
                <div
                  key={s.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.code}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {s.name}
                      </p>
                      {s.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(s)}
                      title={s.is_active ? "Deactivate" : "Activate"}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                        s.is_active
                          ? "text-emerald-600 hover:bg-emerald-50"
                          : "text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      onClick={() => setEditingId(s.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            )}
            {services.length === 0 && (
              <EmptyState title="No services yet" description="Add one below to get started." />
            )}
          </div>
        </CardContent>
      </Card>

      {showAdd ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Service name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Service"
                />
              </div>
              <div>
                <Label>Code prefix</Label>
                <Input
                  value={form.code}
                  maxLength={2}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. A"
                />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short description"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className="h-7 w-7 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "#0f172a" : "transparent",
                      transform: form.color === c ? "scale(1.1)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={addService} disabled={busy}>
                <Check size={16} /> Save service
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add service
        </Button>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteService}
        title="Delete service?"
        description={`"${deleteTarget?.name}" will be removed. You can undo this from the confirmation toast right after.`}
        busy={deleting}
      />
    </div>
  );
}

function EditRow({
  service,
  busy,
  onSave,
  onCancel,
}: {
  service: Service;
  busy: boolean;
  onSave: (s: Service) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState(service);

  return (
    <div className="px-6 py-4 space-y-3 bg-slate-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={s.name}
          onChange={(e) => setS({ ...s, name: e.target.value })}
          placeholder="Name"
        />
        <Input
          value={s.code}
          maxLength={2}
          onChange={(e) => setS({ ...s, code: e.target.value })}
          placeholder="Code"
        />
      </div>
      <Input
        value={s.description || ""}
        onChange={(e) => setS({ ...s, description: e.target.value })}
        placeholder="Description"
      />
      <div className="flex items-center gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            onClick={() => setS({ ...s, color: c })}
            className="h-6 w-6 rounded-full border-2"
            style={{
              backgroundColor: c,
              borderColor: s.color === c ? "#0f172a" : "transparent",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onSave(s)} disabled={busy}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X size={14} /> Cancel
        </Button>
      </div>
    </div>
  );
}
