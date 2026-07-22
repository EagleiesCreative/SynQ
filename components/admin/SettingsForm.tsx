"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import type { AppSettings } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Check } from "lucide-react";

export function SettingsForm({ initialSettings }: { initialSettings: AppSettings }) {
  const showToast = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateSettings({
        is_open: settings.is_open,
        opens_at: settings.opens_at || null,
        closes_at: settings.closes_at || null,
        max_queue_size: settings.max_queue_size,
      });
      showToast({ message: "Settings saved" });
    } catch {
      showToast({ message: "Couldn't save settings. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Accepting new customers</p>
            <p className="text-xs text-slate-500">
              Turn off to close the queue immediately — customers will see it&apos;s closed.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.is_open}
            onClick={() => setSettings((s) => ({ ...s, is_open: !s.is_open }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              settings.is_open ? "bg-brand-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.is_open ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="opens_at">Opens at</Label>
            <Input
              id="opens_at"
              type="time"
              value={settings.opens_at || ""}
              onChange={(e) => setSettings((s) => ({ ...s, opens_at: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="closes_at">Closes at</Label>
            <Input
              id="closes_at"
              type="time"
              value={settings.closes_at || ""}
              onChange={(e) => setSettings((s) => ({ ...s, closes_at: e.target.value }))}
            />
          </div>
        </div>
        <p className="-mt-3 text-xs text-slate-400">
          Leave both blank to accept customers any time of day.
        </p>

        <div>
          <Label htmlFor="max_queue_size">Max queue size</Label>
          <Input
            id="max_queue_size"
            type="number"
            min={0}
            placeholder="No limit"
            value={settings.max_queue_size ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                max_queue_size: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Total customers allowed to be waiting at once, across all services. Leave blank for no limit.
          </p>
        </div>

        <Button onClick={save} disabled={saving}>
          <Check size={16} /> {saving ? "Saving..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
