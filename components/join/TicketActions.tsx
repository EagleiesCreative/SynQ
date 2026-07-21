"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ACTIVE_TICKET_KEY } from "@/lib/utils";
import { LogOut, Share2 } from "lucide-react";

export function TicketActions({
  ticketId,
  ticketCode,
  canLeave,
}: {
  ticketId: string;
  ticketCode: string;
  canLeave: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function shareTicket() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Queue ticket ${ticketCode}`,
          text: `My queue number is ${ticketCode}`,
          url,
        });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast({ message: "Ticket link copied" });
  }

  async function leaveQueue() {
    setLeaving(true);
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (localStorage.getItem(ACTIVE_TICKET_KEY) === ticketId) {
      localStorage.removeItem(ACTIVE_TICKET_KEY);
    }
    setLeaving(false);
    setConfirmOpen(false);
    router.push("/join");
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={shareTicket}>
          <Share2 size={14} /> Share ticket
        </Button>
        {canLeave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-slate-500"
          >
            <LogOut size={14} /> Leave queue
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={leaveQueue}
        title="Leave the queue?"
        description="You'll lose your place in line and will need to join again to get a new number."
        confirmLabel="Leave queue"
        busy={leaving}
      />
    </>
  );
}
