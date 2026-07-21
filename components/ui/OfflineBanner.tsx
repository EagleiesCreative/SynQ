"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700"
    >
      <WifiOff size={14} />
      You&apos;re offline — updates will resume once you&apos;re back online.
    </div>
  );
}
