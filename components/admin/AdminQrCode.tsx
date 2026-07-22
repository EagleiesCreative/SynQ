"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Download, Copy, Check, QrCode, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "join" | "display";

export function AdminQrCode({ eventId }: { eventId: string }) {
  const [origin, setOrigin] = useState("");
  const [mode, setMode] = useState<Mode>("join");
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setCopied(false);
  }, [mode]);

  if (!eventId) {
    return (
      <Card className="max-w-md">
        <CardContent className="p-8 text-center text-sm text-slate-500">
          We couldn&apos;t find this event. Try reloading, or contact support
          if this persists.
        </CardContent>
      </Card>
    );
  }

  const url =
    origin && eventId
      ? `${origin}/${mode === "join" ? "join" : "display"}/${eventId}`
      : "";

  function downloadPng() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = `synq-${mode}-qr.png`;
    a.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-8 text-center">
        <div className="inline-flex p-1 mb-6 rounded-xl bg-slate-100">
          <button
            onClick={() => setMode("join")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
              mode === "join"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <QrCode size={15} /> Join Queue
          </button>
          <button
            onClick={() => setMode("display")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
              mode === "display"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Monitor size={15} /> Display Board
          </button>
        </div>

        <div
          ref={canvasWrapRef}
          className="inline-flex p-5 rounded-xl border border-slate-200 bg-white"
        >
          {url && (
            <QRCodeCanvas
              value={url}
              size={220}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              includeMargin={false}
            />
          )}
        </div>

        <div className="mt-6 text-left">
          <Label>{mode === "join" ? "Join link" : "Display board link"}</Label>
          <div className="flex items-center gap-2">
            <Input value={url} readOnly />
            <Button variant="outline" size="md" onClick={copyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {mode === "join"
              ? "Share this at your venue so customers can join. It only shows your organization's services."
              : "Open this on a TV or monitor. It only shows your organization's counters and queue."}
          </p>
        </div>

        <Button className="w-full mt-4" onClick={downloadPng}>
          <Download size={16} /> Download PNG
        </Button>
      </CardContent>
    </Card>
  );
}
