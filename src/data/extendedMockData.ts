// Extended mock data for stations/machines management, M-Pesa, audit logs, notifications, and staff ops

export interface ExtendedStation {
  id: string;
  name: string;
  address: string;
  county_name: string;
  latitude: number;
  longitude: number;
  host_partner: string;
  revenue_share_percent: number;
  open_hours: string;
  is_active: boolean;
  machines_count: number;
  features: string[];
  image_url: string;
  created_at: string;
}

export interface ExtendedMachine {
  id: string;
  name: string;
  station: string;
  station_id: string;
  model: string;
  qr_code: string;
  total_slots: number;
  available_slots: number;
  status: "online" | "offline" | "maintenance" | "faulty";
  is_active: boolean;
  last_maintenance: string;
  created_at: string;
}

export interface MpesaTransaction {
  id: string;
  date: string;
  transaction_type: "deposit" | "rental_charge" | "refund" | "penalty";
  amount: number;
  currency: string;
  mpesa_receipt: string;
  phone_number: string;
  checkout_request_id: string;
  rental_id: string;
  status: "completed" | "pending" | "failed";
}

export interface MpesaCallback {
  id: string;
  date: string;
  transaction_id: string;
  merchant_request_id: string;
  checkout_request_id: string;
  amount: number;
  mpesa_receipt_number: string;
  phone_number: string;
  result_code: number;
  result_desc: string;
  processed: boolean;
  callback_data: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  date: string;
  user_id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string;
  ip_address: string;
  user_agent: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: "critical" | "warning" | "info";
  type: string;
  related_entity?: string;
  read: boolean;
  roles: string[];
}

export interface StaffLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  station: string;
  status: "new" | "contacted" | "interested" | "converted" | "lost";
  owner: string;
  follow_up_date: string;
  notes: string;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  completed: boolean;
  created_at: string;
}

// Mock arrays cleared — all data now comes from the backend.
export const mockExtendedStations: ExtendedStation[] = [];
export const mockExtendedMachines: ExtendedMachine[] = [];
export const mockMpesaTransactions: MpesaTransaction[] = [];
export const mockMpesaCallbacks: MpesaCallback[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockNotifications: Notification[] = [];
export const mockStaffLeads: StaffLead[] = [];
export const mockDailyPlans: DailyPlan[] = [];

