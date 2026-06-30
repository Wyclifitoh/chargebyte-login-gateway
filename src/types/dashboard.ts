export type UserRole =
  | "super_admin"
  | "admin"
  | "staff"
  | "location_partner"
  | "funding_partner"
  | "ad_client"
  | "system";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  partner_id?: string;
  partner_type?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  location_partner: "Location Partner",
  funding_partner: "Funding Partner",
  ad_client: "Ad Client",
  system: "System",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  staff: "/dashboard",
  location_partner: "/dashboard",
  funding_partner: "/dashboard",
  ad_client: "/dashboard",
  system: "/dashboard",
};

// Which nav items each role can see
// Super Admin: everything. Admin: ops-focused (no revenue/mpesa/partners/adclients/transactions/campaigns/audit).
// Staff: clock-in, daily report, alerts.
export const ROLE_NAV_ACCESS: Record<UserRole, string[]> = {
  super_admin: ["overview", "rentals", "machines", "stations", "revenue", "users", "partners", "adclients", "forms", "campaigns", "transactions", "mpesa", "audit", "operations", "notifications", "clockin", "reports", "support"],
  admin: ["overview", "rentals", "machines", "stations", "users", "forms", "operations", "notifications", "clockin", "reports", "support"],
  staff: ["overview", "clockin", "reports", "notifications", "support"],
  location_partner: ["overview", "partner", "revenue", "notifications"],
  funding_partner: ["overview", "partner", "revenue", "notifications"],
  ad_client: ["overview", "campaigns", "notifications"],
  system: ["overview"],
};

export interface Rental {
  id: string;
  user_id: string;
  machine_id: string;
  powerbank_id: string;
  station_id: string;
  qr_code: string;
  machine_model: string;
  manufacturer_trade_no?: string;
  rental_code: string;
  rental_slot: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  total_amount: number;
  deposit_amount: number;
  deposit_refunded: boolean;
  deposit_refund_time?: string;
  phone_number: string;
  status: "active" | "completed" | "overdue" | "cancelled" | "pending" | "pending_payment";
  return_station_id?: string;
  return_machine_id?: string;
  return_slot?: number;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  station_id: string;
  model: string;
  qr_code: string;
  name: string;
  total_slots: number;
  available_slots: number;
  is_available: boolean;
  last_maintenance: string | null;
  status: "online" | "offline" | "maintenance" | "faulty";
  is_active: boolean;
  station_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  county_id: number;
  county_name: string;
  image_url: string;
  features: string[] | null;
  open_hours: string;
  is_active: boolean;
  host_partner_id: string | null;
  revenue_share_percent: number;
  machines_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  rental_id: string | null;
  transaction_type: "deposit" | "rental_charge" | "refund" | "topup";
  amount: number;
  currency: string;
  mpesa_receipt: string | null;
  phone_number: string;
  checkout_request_id: string | null;
  status: "completed" | "pending" | "failed";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MpesaCallback {
  id: string;
  transaction_id: string | null;
  merchant_request_id: string;
  checkout_request_id: string;
  result_code: number;
  result_desc: string;
  amount: number | null;
  mpesa_receipt_number: string | null;
  transaction_date: string;
  phone_number: string;
  callback_data: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

export interface Partner {
  id: string;
  partner_code: string;
  name: string;
  partner_type: string;
  tier: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  status: string;
  revenue_share_percent: number;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  user_name?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  locations: string[];
  impressions: number;
  interactions: number;
  ctr: number;
  spend: number;
  status: "active" | "completed" | "scheduled" | "paused";
}

export type TeamCategory = "core" | "agent" | "consultant";

export interface TeamMember {
  id: string;
  system_user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  category: TeamCategory;
  title?: string | null;
  is_active: number | boolean;
  created_at?: string;
}

export interface ClockWhitelist {
  id: string;
  name: string;
  type: "ip" | "cidr" | "geo";
  ip_cidr?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  is_active: number | boolean;
  notes?: string | null;
  created_at?: string;
}

export interface ClockEvent {
  id: string;
  team_member_id?: string | null;
  system_user_id: string;
  event_type: "clock_in" | "clock_out";
  event_time: string;
  ip_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: "approved" | "rejected";
  reject_reason?: string | null;
  member_name?: string | null;
  member_category?: TeamCategory | null;
  user_name?: string | null;
  user_email?: string | null;
  whitelist_name?: string | null;
}

export interface DailyReport {
  id: string;
  report_date: string;
  agent_user_id: string;
  agent_name: string;
  station_id?: string | null;
  location: string;
  rentals: number;
  returns: number;
  pending_returns: number;
  powerbanks_arrival: number;
  powerbanks_departure: number;
  time_in?: string | null;
  time_out?: string | null;
  rentals_auto?: number;
  notes?: string | null;
  created_at?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  station: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: string;
  notes: string;
}

export interface Report {
  id: string;
  title: string;
  type: "daily" | "weekly" | "monthly";
  station: string;
  submittedBy: string;
  date: string;
  status: "draft" | "submitted" | "reviewed";
  summary: string;
}

export interface Activity {
  id: string;
  title: string;
  type: "maintenance" | "meeting" | "installation" | "inspection";
  assignedTo: string;
  station: string;
  date: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  description: string;
}

export type SupportStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed" | "escalated";
export type SupportPriority = "low" | "medium" | "high" | "critical";
export type SupportCategory = "rental" | "refund" | "machine" | "payment" | "account" | "other";

export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name?: string | null;
  body: string;
  is_internal: number | boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_no: string;
  subject: string;
  description?: string | null;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  rental_id?: string | null;
  machine_id?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photos_json?: string[] | null;
  sla_due_at?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_by: string;
  created_by_name?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
  comments?: SupportTicketComment[];
}
