"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateEvent } from "@/lib/actions/events";
import type { Event } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Check } from "lucide-react";

export function EventSettings({ event }: { event: Event }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [isOpen, setIsOpen] = useState(event.is_open);
  const [opensAt, setOpensAt] = useState(event.opens_at?.slice(0, 5) || "");
  const [closesAt, setClosesAt] = useState(event.closes_at?.slice(0, 5) || "");
  const [maxQueue, setMaxQueue] = useState(
    event.max_queue_size != null ? String(event.max_queue_size) : ""
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateEvent(event.id, {
        name,
        is_open: isOpen,
        opens_at: opensAt || null,
        closes_at: closesAt || null,
        max_queue_size: maxQueue.trim() ? Number(maxQueue) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Event settings</h2>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div>
              <Label htmlFor="name">Event name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Accepting new numbers
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="opens">Opens at</Label>
                <Input
                  id="opens"
                  type="time"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="closes">Closes at</Label>
                <Input
                  id="closes"
                  type="time"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="max">Max people waiting</Label>
              <Input
                id="max"
                type="number"
                min={1}
                value={maxQueue}
                onChange={(e) => setMaxQueue(e.target.value)}
                placeholder="No limit"
              />
            </div>

            <Button type="submit" disabled={busy} className="gap-1.5">
              {saved ? (
                <>
                  <Check size={15} /> Saved
                </>
              ) : busy ? (
                "Saving…"
              ) : (
                "Save settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
