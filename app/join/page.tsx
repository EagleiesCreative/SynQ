import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QrCode } from "lucide-react";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <EmptyState
          icon={QrCode}
          title="Scan a queue's QR code"
          description="There's no general sign-up page here — ask staff for the QR code or link for the specific queue you'd like to join."
        />
      </Card>
    </main>
  );
}
