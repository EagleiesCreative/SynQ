import { createClient } from "@/lib/supabase/server";
import { DisplayBoard } from "@/components/display/DisplayBoard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DisplayEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  if (!organization) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <EmptyState
            icon={SearchX}
            title="Display board not found"
            description="This link doesn't point to a valid queue. Ask an admin for the correct display link."
          />
        </Card>
      </main>
    );
  }

  return (
    <DisplayBoard organizationId={organization.id} organizationName={organization.name} />
  );
}
