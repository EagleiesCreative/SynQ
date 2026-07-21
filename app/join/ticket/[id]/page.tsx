import { TicketStatus } from "@/components/join/TicketStatus";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketStatus ticketId={id} />;
}
