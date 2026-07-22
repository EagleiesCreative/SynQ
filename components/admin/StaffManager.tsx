"use client";

import { useState } from "react";
import { setStaffRole } from "@/lib/actions/staff";
import { removeStaffMember } from "@/lib/actions/organization";
import type { Profile } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, ShieldOff, UserMinus, Crown } from "lucide-react";

export function StaffManager({
  initialStaff,
  currentUserId,
  ownerId,
}: {
  initialStaff: Profile[];
  currentUserId: string;
  ownerId: string | null;
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole(p: Profile) {
    setBusy(p.id);
    setError(null);
    const newRole = p.role === "admin" ? "agent" : "admin";
    try {
      await setStaffRole(p.id, newRole);
      setStaff((prev) =>
        prev.map((s) => (s.id === p.id ? { ...s, role: newRole } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that role.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Profile) {
    if (!confirm(`Remove ${p.full_name} from this organization?`)) return;
    setBusy(p.id);
    setError(null);
    try {
      await removeStaffMember(p.id);
      setStaff((prev) => prev.filter((s) => s.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that person.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        {error && (
          <p className="px-6 py-3 text-sm text-rose-700 bg-rose-50">{error}</p>
        )}
        <div className="divide-y divide-slate-100">
          {staff.map((p) => {
            const isOwner = p.id === ownerId;
            const isSelf = p.id === currentUserId;
            return (
              <div
                key={p.id}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {p.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {p.full_name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        className={
                          p.role === "admin"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {p.role}
                      </Badge>
                      {isOwner && (
                        <Badge className="bg-amber-100 text-amber-700 gap-1">
                          <Crown size={11} /> owner
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <button
                    onClick={() => toggleRole(p)}
                    disabled={busy === p.id || isSelf || isOwner}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {p.role === "admin" ? (
                      <>
                        <ShieldOff size={14} /> Make agent
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Make admin
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={busy === p.id || isSelf || isOwner}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserMinus size={14} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
          {staff.length === 0 && (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">
              No staff accounts yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
