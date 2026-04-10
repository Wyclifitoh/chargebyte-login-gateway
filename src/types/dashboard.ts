export type UserRole = "super_admin" | "staff" | "location_partner" | "funding_partner" | "ad_client" | "system";

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
  staff: "Staff",
  location_partner: "Location Partner",
  funding_partner: "Funding Partner",
  ad_client: "Ad Client",
  system: "System",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  super_admin: "/dashboard",
  staff: "/dashboard",
  location_partner: "/dashboard",
  funding_partner: "/dashboard",
  ad_client: "/dashboard",
  system: "/dashboard",
};

// Which nav items each role can see
export const ROLE_NAV_ACCESS: Record<UserRole, string[]> = {
  super_admin: ["overview", "rentals", "machines", "stations", "revenue", "users", "forms", "campaigns", "transactions", "audit", "operations", "notifications", "partner"],
  staff: ["overview", "rentals", "machines", "forms", "operations", "notifications"],
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
  status: "active" | "completed" | "overdue" | "cancelled";
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
