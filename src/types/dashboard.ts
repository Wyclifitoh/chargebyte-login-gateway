export type UserRole = "super_admin" | "admin" | "staff" | "location_partner" | "advertising_client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  location_partner: "Location Partner",
  advertising_client: "Advertising Client",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  staff: "/dashboard",
  location_partner: "/dashboard",
  advertising_client: "/dashboard",
};

// Which nav items each role can see
export const ROLE_NAV_ACCESS: Record<UserRole, string[]> = {
  super_admin: ["overview", "rentals", "machines", "stations", "revenue", "users", "forms"],
  admin: ["overview", "rentals", "machines", "stations", "revenue", "forms"],
  staff: ["overview", "rentals", "machines", "forms"],
  location_partner: ["overview", "partner", "revenue"],
  advertising_client: ["overview", "campaigns"],
};

export interface Rental {
  id: string;
  customer: string;
  station: string;
  machine: string;
  startTime: string;
  endTime: string;
  status: "active" | "completed" | "cancelled";
  amount: number;
}

export interface Machine {
  id: string;
  name: string;
  station: string;
  type: string;
  status: "online" | "offline" | "maintenance";
  lastActive: string;
  totalSessions: number;
}

export interface Station {
  id: string;
  name: string;
  location: string;
  machines: number;
  status: "active" | "inactive";
  revenue: number;
}

export interface Transaction {
  id: string;
  date: string;
  customer: string;
  station: string;
  amount: number;
  type: "rental" | "subscription" | "penalty";
  status: "completed" | "pending" | "failed";
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
