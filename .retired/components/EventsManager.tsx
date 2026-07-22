"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/events";
import type { Event } from "@/lib/database.types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CalendarDays,
  Plus,
  Trash2,
  ArrowRight,
  Users,
  AlertCircle,
} from "lucide-react";

export interface EventWithStats extends Event {
  waiting: number;
  served: number;
}

export function EventsManager({ initialEvents }: { initialEvents: EventWithStats[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await createEvent({ name });
      router.push(`/admin/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the event.");
      setBusy(false);
    }
  }

  async function toggleOpen(ev: EventWithStats) {
    setBusy(true);
    try {
      await updateEvent(ev.id, { is_open: !ev.is_open });
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, is_open: !e.is_open } : e))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the event.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(ev: EventWithStats) {
    if (
      !confirm(
        `Delete "${ev.name}"? Every number issued for this event is deleted too.`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteEvent(ev.id);
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {creating ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="event-name">Event name</Label>
                <Input
                  id="event-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Sunday Service, Registration Desk…"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create event"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus size={16} /> New event
        </Button>
      )}

      {events.length === 0 && !creating ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarDays}
              title="No events yet"
              description="Create an event to open its queue, print its QR code, and put its number up on the display board."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-600 truncate block"
                    >
                      {ev.name}
                    </Link>
                    <Badge
                      className={
                        ev.is_open
                          ? "mt-1.5 bg-emerald-100 text-emerald-700"
                          : "mt-1.5 bg-slate-100 text-slate-500"
                      }
                    >
                      {ev.is_open ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => remove(ev)}
                    disabled={busy}
                    className="text-slate-300 hover:text-rose-600 disabled:opacity-40"
                    aria-label={`Delete ${ev.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-5 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Users size={14} className="text-slate-400" />
                    <strong className="tabular-nums text-slate-900">
                      {ev.waiting}
                    </strong>{" "}
                    waiting
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    {ev.served} served
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/events/${ev.id}`} className="flex-1">
                    <Button className="w-full gap-1.5" size="sm">
                      Open board <ArrowRight size={14} />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOpen(ev)}
                    disabled={busy}
                  >
                    {ev.is_open ? "Close" : "Reopen"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
