import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Monitor } from "lucide-react";

export default function DisplayPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <EmptyState
          icon={Monitor}
          title="No display board selected"
          description="This board is tied to a specific organization. Ask an admin for the display link from their dashboard."
        />
      </Card>
    </main>
  );
}
