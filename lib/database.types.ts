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
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
  organization_id: string;
  created_at: string;
}

export interface Counter {
  id: string;
  name: string;
  is_active: boolean;
  current_agent_id: string | null;
  current_ticket_id: string | null;
  organization_id: string;
  created_at: string;
}

export interface CounterService {
  counter_id: string;
  service_id: string;
}

export interface Ticket {
  id: string;
  service_id: string;
  number: number;
  code: string;
  status: TicketStatus;
  customer_name: string | null;
  customer_phone: string | null;
  party_size: number;
  counter_id: string | null;
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
  created_at: string;
}

export interface AppSettings {
  id: boolean;
  max_queue_size: number | null;
  opens_at: string | null;
  closes_at: string | null;
  is_open: boolean;
  updated_at: string;
}
