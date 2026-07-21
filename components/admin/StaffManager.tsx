"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, ShieldOff } from "lucide-react";

export function StaffManager({
  initialStaff,
  currentUserId,
}: {
  initialStaff: Profile[];
  currentUserId: string;
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleRole(p: Profile) {
    setBusy(p.id);
    const supabase = createClient();
    const newRole = p.role === "admin" ? "agent" : "admin";
    await supabase.from("profiles").update({ role: newRole }).eq("id", p.id);
    setStaff((prev) =>
      prev.map((s) => (s.id === p.id ? { ...s, role: newRole } : s))
    );
    setBusy(null);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {staff.map((p) => (
            <div
              key={p.id}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {p.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">
                    {p.full_name}
                    {p.id === currentUserId && (
                      <span className="ml-2 text-xs text-slate-400">(you)</span>
                    )}
                  </p>
                  <Badge
                    className={
                      p.role === "admin"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {p.role}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => toggleRole(p)}
                disabled={busy === p.id || p.id === currentUserId}
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
            </div>
          ))}
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
