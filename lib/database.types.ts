export type TicketStatus =
  | "waiting"
  | "called"
  | "serving"
  | "served"
  | "skipped"
  | "cancelled";

export type StaffRole = "admin" | "agent";

export interface Organization {
  id: string;
  name: string;
  /** Clerk id of the staff member who owns this organization. */
  owner_id: string | null;
  /** Short shareable code teammates use to join this organization. */
  join_code: string;
  created_at: string;
}

/**
 * An event owns exactly one queue. Creating an event is how an owner opens
 * a new line; everything a customer or display board needs hangs off it.
 */
export interface Event {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  max_queue_size: number | null;
  /** Highest number handed out so far. */
  last_number: number;
  /** The ticket currently being served, if any. */
  current_ticket_id: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  number: number;
  code: string;
  status: TicketStatus;
  customer_name: string | null;
  customer_phone: string | null;
  party_size: number;
  agent_id: string | null;
  called_at: string | null;
  served_at: string | null;
  finished_at: string | null;
  skip_count: number;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: StaffRole;
  organization_id: string | null;
  email: string | null;
  created_at: string;
}
