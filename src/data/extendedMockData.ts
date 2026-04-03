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

export const mockExtendedStations: ExtendedStation[] = [
  { id: "S001", name: "Downtown Hub", address: "123 Main St, Nairobi", county_name: "Nairobi", latitude: -1.2921, longitude: 36.8219, host_partner: "Morgan Blake", revenue_share_percent: 15, open_hours: "06:00 - 22:00", is_active: true, machines_count: 4, features: ["WiFi", "Parking"], image_url: "", created_at: "2025-06-15" },
  { id: "S002", name: "Airport Terminal", address: "JKIA Terminal 2", county_name: "Nairobi", latitude: -1.3192, longitude: 36.9275, host_partner: "James Odhiambo", revenue_share_percent: 20, open_hours: "24/7", is_active: true, machines_count: 6, features: ["24/7 Access"], image_url: "", created_at: "2025-07-01" },
  { id: "S003", name: "Mall Plaza", address: "500 Shopping Ave, Mombasa", county_name: "Mombasa", latitude: -4.0435, longitude: 39.6682, host_partner: "Sarah Mwangi", revenue_share_percent: 12, open_hours: "08:00 - 21:00", is_active: true, machines_count: 3, features: ["Security"], image_url: "", created_at: "2025-08-10" },
  { id: "S004", name: "Tech Park", address: "1 Innovation Dr, Nairobi", county_name: "Nairobi", latitude: -1.2641, longitude: 36.8083, host_partner: "Morgan Blake", revenue_share_percent: 18, open_hours: "07:00 - 20:00", is_active: true, machines_count: 8, features: ["WiFi", "Lounge"], image_url: "", created_at: "2025-09-01" },
  { id: "S005", name: "University", address: "Campus Lot C, Kisumu", county_name: "Kisumu", latitude: -0.0917, longitude: 34.7680, host_partner: "Peter Kamau", revenue_share_percent: 10, open_hours: "06:00 - 23:00", is_active: false, machines_count: 2, features: [], image_url: "", created_at: "2025-10-20" },
];

export const mockExtendedMachines: ExtendedMachine[] = [
  { id: "CB-001", name: "Charger Alpha", station: "Downtown Hub", station_id: "S001", model: "CB-X200", qr_code: "QR-CB001", total_slots: 8, available_slots: 5, status: "online", is_active: true, last_maintenance: "2026-03-15", created_at: "2025-06-15" },
  { id: "CB-003", name: "Charger Gamma", station: "Downtown Hub", station_id: "S001", model: "CB-X200", qr_code: "QR-CB003", total_slots: 8, available_slots: 3, status: "online", is_active: true, last_maintenance: "2026-03-20", created_at: "2025-06-15" },
  { id: "CB-005", name: "Charger Epsilon", station: "Mall Plaza", station_id: "S003", model: "CB-X100", qr_code: "QR-CB005", total_slots: 6, available_slots: 6, status: "online", is_active: true, last_maintenance: "2026-02-28", created_at: "2025-08-10" },
  { id: "CB-008", name: "Charger Theta", station: "University", station_id: "S005", model: "CB-X100", qr_code: "QR-CB008", total_slots: 6, available_slots: 2, status: "online", is_active: true, last_maintenance: "2026-03-01", created_at: "2025-10-20" },
  { id: "CB-012", name: "Charger Lambda", station: "Airport Terminal", station_id: "S002", model: "CB-X300", qr_code: "QR-CB012", total_slots: 12, available_slots: 0, status: "maintenance", is_active: false, last_maintenance: "2026-03-30", created_at: "2025-07-01" },
  { id: "CB-022", name: "Charger Chi", station: "Tech Park", station_id: "S004", model: "CB-X300", qr_code: "QR-CB022", total_slots: 12, available_slots: 8, status: "offline", is_active: true, last_maintenance: "2026-03-10", created_at: "2025-09-01" },
  { id: "CB-025", name: "Charger Psi", station: "Airport Terminal", station_id: "S002", model: "CB-X200", qr_code: "QR-CB025", total_slots: 8, available_slots: 7, status: "online", is_active: true, last_maintenance: "2026-03-25", created_at: "2025-11-01" },
  { id: "CB-030", name: "Charger Omega", station: "Tech Park", station_id: "S004", model: "CB-X100", qr_code: "QR-CB030", total_slots: 6, available_slots: 4, status: "faulty", is_active: false, last_maintenance: "2026-02-15", created_at: "2025-12-01" },
];

export const mockMpesaTransactions: MpesaTransaction[] = [
  { id: "MT001", date: "2026-04-01 14:23", transaction_type: "rental_charge", amount: 150, currency: "KES", mpesa_receipt: "RKQ3XY9Z01", phone_number: "254712345678", checkout_request_id: "ws_CO_01042026142300", rental_id: "R001", status: "completed" },
  { id: "MT002", date: "2026-04-01 10:05", transaction_type: "deposit", amount: 500, currency: "KES", mpesa_receipt: "RKQ3XY9Z02", phone_number: "254723456789", checkout_request_id: "ws_CO_01042026100500", rental_id: "R003", status: "completed" },
  { id: "MT003", date: "2026-03-31 18:42", transaction_type: "refund", amount: 300, currency: "KES", mpesa_receipt: "RKQ3XY9Z03", phone_number: "254734567890", checkout_request_id: "ws_CO_31032026184200", rental_id: "R002", status: "completed" },
  { id: "MT004", date: "2026-03-31 09:15", transaction_type: "rental_charge", amount: 200, currency: "KES", mpesa_receipt: "", phone_number: "254745678901", checkout_request_id: "ws_CO_31032026091500", rental_id: "R005", status: "failed" },
  { id: "MT005", date: "2026-03-30 16:30", transaction_type: "penalty", amount: 100, currency: "KES", mpesa_receipt: "RKQ3XY9Z05", phone_number: "254756789012", checkout_request_id: "ws_CO_30032026163000", rental_id: "R004", status: "pending" },
  { id: "MT006", date: "2026-03-30 12:00", transaction_type: "deposit", amount: 500, currency: "KES", mpesa_receipt: "RKQ3XY9Z06", phone_number: "254767890123", checkout_request_id: "ws_CO_30032026120000", rental_id: "R006", status: "completed" },
  { id: "MT007", date: "2026-03-29 08:45", transaction_type: "rental_charge", amount: 350, currency: "KES", mpesa_receipt: "RKQ3XY9Z07", phone_number: "254778901234", checkout_request_id: "ws_CO_29032026084500", rental_id: "R002", status: "completed" },
];

export const mockMpesaCallbacks: MpesaCallback[] = [
  { id: "MCB001", date: "2026-04-01 14:24", transaction_id: "MT001", merchant_request_id: "MR-29384-01", checkout_request_id: "ws_CO_01042026142300", amount: 150, mpesa_receipt_number: "RKQ3XY9Z01", phone_number: "254712345678", result_code: 0, result_desc: "The service request is processed successfully.", processed: true, callback_data: { MerchantRequestID: "MR-29384-01", CheckoutRequestID: "ws_CO_01042026142300", ResultCode: 0, ResultDesc: "Success", Amount: 150, MpesaReceiptNumber: "RKQ3XY9Z01", TransactionDate: "20260401142400", PhoneNumber: "254712345678" } },
  { id: "MCB002", date: "2026-04-01 10:06", transaction_id: "MT002", merchant_request_id: "MR-29384-02", checkout_request_id: "ws_CO_01042026100500", amount: 500, mpesa_receipt_number: "RKQ3XY9Z02", phone_number: "254723456789", result_code: 0, result_desc: "The service request is processed successfully.", processed: true, callback_data: { MerchantRequestID: "MR-29384-02", ResultCode: 0, Amount: 500, PhoneNumber: "254723456789" } },
  { id: "MCB003", date: "2026-03-31 09:16", transaction_id: "MT004", merchant_request_id: "MR-29384-04", checkout_request_id: "ws_CO_31032026091500", amount: 200, mpesa_receipt_number: "", phone_number: "254745678901", result_code: 1032, result_desc: "Request cancelled by user", processed: true, callback_data: { MerchantRequestID: "MR-29384-04", ResultCode: 1032, ResultDesc: "Request cancelled by user" } },
  { id: "MCB004", date: "2026-03-30 16:31", transaction_id: "MT005", merchant_request_id: "MR-29384-05", checkout_request_id: "ws_CO_30032026163000", amount: 100, mpesa_receipt_number: "RKQ3XY9Z05", phone_number: "254756789012", result_code: 0, result_desc: "Success", processed: false, callback_data: { MerchantRequestID: "MR-29384-05", ResultCode: 0, Amount: 100, PhoneNumber: "254756789012", MpesaReceiptNumber: "RKQ3XY9Z05" } },
];

export const mockAuditLogs: AuditLog[] = [
  { id: "AL001", date: "2026-04-01 15:30", user_id: "1", user_name: "Alex Rivera", action: "UPDATE", table_name: "machines", record_id: "CB-012", ip_address: "192.168.1.100", user_agent: "Mozilla/5.0 Chrome/120", old_values: { status: "online", is_active: true }, new_values: { status: "maintenance", is_active: false } },
  { id: "AL002", date: "2026-04-01 14:00", user_id: "2", user_name: "Jordan Lee", action: "INSERT", table_name: "cb_stations", record_id: "S006", ip_address: "192.168.1.101", user_agent: "Mozilla/5.0 Safari/17", old_values: null, new_values: { name: "Westlands Mall", address: "Westlands Rd", is_active: true } },
  { id: "AL003", date: "2026-04-01 11:20", user_id: "1", user_name: "Alex Rivera", action: "DELETE", table_name: "campaigns", record_id: "C005", ip_address: "192.168.1.100", user_agent: "Mozilla/5.0 Chrome/120", old_values: { name: "Old Campaign", status: "paused" }, new_values: null },
  { id: "AL004", date: "2026-03-31 16:45", user_id: "3", user_name: "Sam Chen", action: "INSERT", table_name: "leads", record_id: "L004", ip_address: "10.0.0.55", user_agent: "Mozilla/5.0 Firefox/121", old_values: null, new_values: { name: "New Lead", email: "lead@example.com", status: "new" } },
  { id: "AL005", date: "2026-03-31 09:00", user_id: "2", user_name: "Jordan Lee", action: "UPDATE", table_name: "cb_stations", record_id: "S005", ip_address: "192.168.1.101", user_agent: "Mozilla/5.0 Safari/17", old_values: { is_active: true }, new_values: { is_active: false } },
  { id: "AL006", date: "2026-03-30 14:30", user_id: "1", user_name: "Alex Rivera", action: "UPDATE", table_name: "transactions", record_id: "MT005", ip_address: "192.168.1.100", user_agent: "Mozilla/5.0 Chrome/120", old_values: { status: "pending" }, new_values: { status: "completed" } },
];

export const mockNotifications: Notification[] = [
  { id: "N001", title: "Machine Offline", description: "CB-022 at Tech Park went offline 30 minutes ago", time: "2026-04-01 15:00", severity: "critical", type: "machine_offline", related_entity: "CB-022", read: false, roles: ["super_admin", "admin", "staff"] },
  { id: "N002", title: "Low Available Slots", description: "CB-012 at Airport Terminal has 0 available slots", time: "2026-04-01 14:30", severity: "warning", type: "low_slots", related_entity: "CB-012", read: false, roles: ["super_admin", "admin", "staff", "location_partner"] },
  { id: "N003", title: "Failed Rental", description: "Rental R005 payment failed - M-Pesa timeout", time: "2026-04-01 09:15", severity: "critical", type: "failed_rental", related_entity: "R005", read: false, roles: ["super_admin", "admin"] },
  { id: "N004", title: "Maintenance Due", description: "CB-030 at Tech Park maintenance overdue by 15 days", time: "2026-04-01 08:00", severity: "warning", type: "maintenance_due", related_entity: "CB-030", read: true, roles: ["super_admin", "admin", "staff"] },
  { id: "N005", title: "Campaign Ending Soon", description: "Spring EV Promo ends in 14 days", time: "2026-03-31 12:00", severity: "info", type: "campaign_ending", related_entity: "C001", read: true, roles: ["super_admin", "admin", "advertising_client"] },
  { id: "N006", title: "Unprocessed Callback", description: "M-Pesa callback MCB004 has not been processed", time: "2026-03-30 17:00", severity: "warning", type: "unprocessed_callback", related_entity: "MCB004", read: false, roles: ["super_admin", "admin"] },
  { id: "N007", title: "Revenue Anomaly", description: "Downtown Hub revenue dropped 40% compared to last week", time: "2026-03-30 10:00", severity: "warning", type: "revenue_anomaly", related_entity: "S001", read: true, roles: ["super_admin", "admin"] },
  { id: "N008", title: "Machine Faulty", description: "CB-030 reported faulty by 3 users today", time: "2026-03-29 16:00", severity: "critical", type: "machine_faulty", related_entity: "CB-030", read: true, roles: ["super_admin", "admin", "staff", "location_partner"] },
];

export const mockStaffLeads: StaffLead[] = [
  { id: "SL001", name: "David Park", email: "david@example.com", phone: "+254-712-000-101", source: "Walk-in", station: "Downtown Hub", status: "new", owner: "Sam Chen", follow_up_date: "2026-04-05", notes: "Interested in monthly plan", created_at: "2026-04-01" },
  { id: "SL002", name: "Emma Roberts", email: "emma@example.com", phone: "+254-712-000-102", source: "Online", station: "Airport Terminal", status: "contacted", owner: "Sam Chen", follow_up_date: "2026-04-03", notes: "Needs fleet pricing", created_at: "2026-03-30" },
  { id: "SL003", name: "Frank Miller", email: "frank@example.com", phone: "+254-712-000-103", source: "Referral", station: "Tech Park", status: "interested", owner: "Jordan Lee", follow_up_date: "2026-04-04", notes: "Wants to partner for hosting", created_at: "2026-03-28" },
  { id: "SL004", name: "Grace Wanjiku", email: "grace@example.com", phone: "+254-712-000-104", source: "Campaign", station: "Mall Plaza", status: "converted", owner: "Sam Chen", follow_up_date: "", notes: "Signed up as location partner", created_at: "2026-03-25" },
  { id: "SL005", name: "Henry Otieno", email: "henry@example.com", phone: "+254-712-000-105", source: "Walk-in", station: "University", status: "lost", owner: "Jordan Lee", follow_up_date: "", notes: "Not interested at this time", created_at: "2026-03-20" },
];

export const mockDailyPlans: DailyPlan[] = [
  { id: "DP001", title: "Inspect CB-012 connector issue", priority: "high", deadline: "2026-04-01", completed: false, created_at: "2026-04-01" },
  { id: "DP002", title: "Follow up with Emma Roberts", priority: "medium", deadline: "2026-04-01", completed: true, created_at: "2026-04-01" },
  { id: "DP003", title: "Submit weekly revenue report", priority: "high", deadline: "2026-04-01", completed: false, created_at: "2026-04-01" },
  { id: "DP004", title: "Update Mall Plaza machine firmware", priority: "low", deadline: "2026-04-02", completed: false, created_at: "2026-04-01" },
  { id: "DP005", title: "Call Frank Miller about partnership", priority: "medium", deadline: "2026-04-02", completed: false, created_at: "2026-04-01" },
];
