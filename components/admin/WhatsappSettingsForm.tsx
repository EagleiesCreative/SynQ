"use client";

import { useState, type FormEvent } from "react";
import { saveWhatsappSettings, sendWhatsappTest } from "@/lib/actions/whatsapp";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, Check, Send } from "lucide-react";

export interface WhatsappSettingsView {
  enabled: boolean;
  /** Whether messaging is set up on the server. */
  keyConfigured: boolean;
  campaign_joined: string;
  campaign_almost_up: string;
  campaign_called: string;
  notify_on_join: boolean;
  notify_almost_up: boolean;
  notify_on_called: boolean;
  almost_up_threshold: number;
}

export function WhatsappSettingsForm({
  initial,
}: {
  initial: WhatsappSettingsView;
}) {
  const [form, setForm] = useState(initial);
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof WhatsappSettingsView>(
    key: K,
    value: WhatsappSettingsView[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveWhatsappSettings({
        enabled: form.enabled,
        campaign_joined: form.campaign_joined || null,
        campaign_almost_up: form.campaign_almost_up || null,
        campaign_called: form.campaign_called || null,
        notify_on_join: form.notify_on_join,
        notify_almost_up: form.notify_almost_up,
        notify_on_called: form.notify_on_called,
        almost_up_threshold: form.almost_up_threshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { destination } = await sendWhatsappTest(testPhone);
      setNotice(`Test message sent to ${destination}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Automatic messages
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Keep people updated on their phone so they don&apos;t have to
                stand and watch the board.
              </p>
            </div>
            {form.keyConfigured ? (
              <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700">Not connected</Badge>
            )}
          </div>

          {!form.keyConfigured && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              Messaging isn&apos;t connected yet. Once it&apos;s set up, this page
              will switch on automatically.
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
              disabled={!form.keyConfigured}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            />
            Send messages to customers
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              When to message
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose the moments worth interrupting someone for, and give each
              one the message you&apos;ve already had approved.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notify_on_join}
                  onChange={(e) => set("notify_on_join", e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600"
                />
                When they take a number
              </label>
              <Input
                value={form.campaign_joined}
                onChange={(e) => set("campaign_joined", e.target.value)}
                placeholder="Message name"
                disabled={!form.notify_on_join}
                aria-label="Message to send when someone takes a number"
              />
            </div>

            <div>
              <label className="mb-2 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notify_almost_up}
                  onChange={(e) => set("notify_almost_up", e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600"
                />
                When they&apos;re nearly up
              </label>
              <Input
                value={form.campaign_almost_up}
                onChange={(e) => set("campaign_almost_up", e.target.value)}
                placeholder="Message name"
                disabled={!form.notify_almost_up}
                aria-label="Message to send when someone is nearly up"
              />
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="threshold" className="mb-0 text-xs text-slate-500">
                  Send it once this many people are ahead
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  max={20}
                  value={form.almost_up_threshold}
                  onChange={(e) =>
                    set("almost_up_threshold", Number(e.target.value) || 3)
                  }
                  disabled={!form.notify_almost_up}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notify_on_called}
                  onChange={(e) => set("notify_on_called", e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600"
                />
                When their number is called
              </label>
              <Input
                value={form.campaign_called}
                onChange={(e) => set("campaign_called", e.target.value)}
                placeholder="Message name"
                disabled={!form.notify_on_called}
                aria-label="Message to send when a number is called"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
            Each message can include their name, their number, the queue name,
            and how many people are ahead — in that order.
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={busy} className="cursor-pointer gap-1.5">
        {saved ? (
          <>
            <Check size={15} aria-hidden="true" /> Saved
          </>
        ) : busy ? (
          "Saving…"
        ) : (
          "Save settings"
        )}
      </Button>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Send a test</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Sends one real message to the number below, so save your changes
              first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Label htmlFor="test-phone" className="sr-only">
              Phone number to test with
            </Label>
            <Input
              id="test-phone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+62 812 3456 7890"
              className="min-w-[200px] flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={handleTest}
              disabled={busy || !testPhone.trim()}
            >
              <Send size={14} aria-hidden="true" /> Send test
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
