"use client";

import { useEffect, useState } from "react";
import { MapPin, BellRing, Check, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function YourTurnOverlay({
  code,
  counterName,
  isBeingServed,
  partySize,
}: {
  code: string;
  counterName?: string | null;
  isBeingServed: boolean;
  partySize?: number;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Vibrate phone when overlay appears
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([150, 80, 150, 80, 200]);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-6 transition-all duration-300 animate-toast-in"
    >
      {/* Background glowing bubbles */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl -z-10 animate-pulse-soft" />

      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Animated ringing bell */}
        <div className="mx-auto h-16 w-16 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center border border-brand-500/20 mb-6 animate-pulse-soft">
          <BellRing size={32} className="animate-bounce" />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
          {isBeingServed ? "Now Serving" : "Your Turn!"}
        </p>

        <h2 className="mt-3 text-7xl font-extrabold tracking-tight text-white font-mono">
          {code}
        </h2>

        {!!partySize && partySize > 1 && (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Party of {partySize}
          </p>
        )}

        {counterName && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-slate-200">
            <MapPin size={18} className="text-brand-400 shrink-0" />
            <span className="font-semibold text-sm">Please proceed to {counterName}</span>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Button
            variant="primary"
            className="w-full py-3.5 rounded-xl font-bold bg-brand-600 text-white hover:bg-brand-500 flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:translate-y-0 hover:-translate-y-0.5 transition-all"
            onClick={() => setDismissed(true)}
          >
            <Check size={16} /> Got It, Heading Over
          </Button>
          
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
            <Volume2 size={12} />
            <span>Show this screen to the counter staff</span>
          </div>
        </div>
      </div>
    </div>
  );
}
