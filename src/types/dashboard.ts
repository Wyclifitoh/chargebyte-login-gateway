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
  super_admin: ["overview", "rentals", "machines", "stations", "revenue", "users"],
  admin: ["overview", "rentals", "machines", "stations", "revenue"],
  staff: ["overview", "rentals", "machines"],
  location_partner: ["overview", "machines", "revenue"],
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
