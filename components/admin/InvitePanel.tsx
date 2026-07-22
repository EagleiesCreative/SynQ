"use client";

import { useState } from "react";
import { regenerateJoinCode } from "@/lib/actions/organization";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy, Check, RefreshCw } from "lucide-react";

export function InvitePanel({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [busy, setBusy] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join-team?code=${code}`
      : `/join-team?code=${code}`;

  async function copy(value: string, which: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  }

  async function regenerate() {
    if (
      !confirm(
        "Generate a new code? Anyone holding the old link won't be able to join with it."
      )
    )
      return;
    setBusy(true);
    try {
      setCode(await regenerateJoinCode());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Invite teammates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Share this code or link. Whoever uses it signs in and joins this
            organization as an agent — you can promote them to admin below.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-xl bg-slate-50 px-4 py-3 font-mono text-lg tracking-[0.25em] text-slate-900">
            {code}
          </code>
          <Button
            variant="outline"
            onClick={() => copy(code, "code")}
            aria-label="Copy join code"
          >
            {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 justify-center gap-2"
            onClick={() => copy(link, "link")}
          >
            {copied === "link" ? <Check size={16} /> : <Copy size={16} />}
            {copied === "link" ? "Link copied" : "Copy invite link"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={regenerate}
            disabled={busy}
          >
            <RefreshCw size={16} className={busy ? "animate-spin" : undefined} />
            New code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
