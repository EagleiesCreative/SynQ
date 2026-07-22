"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { joinOrganizationByCode } from "@/lib/actions/organization";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function JoinTeamForm({
  initialCode,
  currentOrgName,
}: {
  initialCode: string;
  currentOrgName: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await joinOrganizationByCode(code);
      setJoined(result.organizationName);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that team.");
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            You&apos;ve joined {joined}.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;re set up as an agent. An admin can promote you if you need
            more access.
          </p>
          <Button className="mt-5 w-full" onClick={() => router.push("/counter")}>
            Go to my counter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        {currentOrgName && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            You&apos;re currently in <strong>{currentOrgName}</strong>. Joining a
            new team will move you out of it.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Join code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="ABCD1234"
              className="font-mono tracking-widest"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full" size="md" disabled={busy}>
            {busy ? "Joining…" : "Join team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
