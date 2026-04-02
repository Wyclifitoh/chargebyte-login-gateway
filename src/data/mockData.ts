import { Rental, Machine, Station, Transaction } from "@/types/dashboard";
import { Campaign, Lead, Report, Activity } from "@/types/dashboard";

export const mockRentals: Rental[] = [
  { id: "R001", customer: "John Doe", station: "Downtown Hub", machine: "CB-001", startTime: "2026-03-28 08:00", endTime: "2026-03-28 10:30", status: "completed", amount: 12.50 },
  { id: "R002", customer: "Jane Smith", station: "Airport Terminal", machine: "CB-012", startTime: "2026-03-30 14:00", endTime: "2026-03-30 16:00", status: "completed", amount: 18.00 },
  { id: "R003", customer: "Mike Johnson", station: "Mall Plaza", machine: "CB-005", startTime: "2026-04-01 09:00", endTime: "", status: "active", amount: 0 },
  { id: "R004", customer: "Sara Wilson", station: "Downtown Hub", machine: "CB-003", startTime: "2026-03-29 11:00", endTime: "2026-03-29 11:15", status: "cancelled", amount: 0 },
  { id: "R005", customer: "Tom Brown", station: "Tech Park", machine: "CB-022", startTime: "2026-03-31 07:00", endTime: "2026-03-31 09:45", status: "completed", amount: 22.75 },
  { id: "R006", customer: "Lisa Chen", station: "University", machine: "CB-008", startTime: "2026-04-01 06:30", endTime: "", status: "active", amount: 0 },
];

export const mockMachines: Machine[] = [
  { id: "CB-001", name: "Charger Alpha", station: "Downtown Hub", type: "Level 2", status: "online", lastActive: "2026-04-01 10:30", totalSessions: 1245 },
  { id: "CB-003", name: "Charger Gamma", station: "Downtown Hub", type: "DC Fast", status: "online", lastActive: "2026-04-01 09:00", totalSessions: 892 },
  { id: "CB-005", name: "Charger Epsilon", station: "Mall Plaza", type: "Level 2", status: "online", lastActive: "2026-04-01 09:15", totalSessions: 567 },
  { id: "CB-008", name: "Charger Theta", station: "University", type: "Level 2", status: "online", lastActive: "2026-04-01 06:30", totalSessions: 334 },
  { id: "CB-012", name: "Charger Lambda", station: "Airport Terminal", type: "DC Fast", status: "maintenance", lastActive: "2026-03-30 16:00", totalSessions: 2103 },
  { id: "CB-022", name: "Charger Chi", station: "Tech Park", type: "DC Fast", status: "offline", lastActive: "2026-03-31 09:45", totalSessions: 1567 },
];

export const mockStations: Station[] = [
  { id: "S001", name: "Downtown Hub", location: "123 Main St", machines: 4, status: "active", revenue: 45200 },
  { id: "S002", name: "Airport Terminal", location: "Terminal 2, Gate B", machines: 6, status: "active", revenue: 78500 },
  { id: "S003", name: "Mall Plaza", location: "500 Shopping Ave", machines: 3, status: "active", revenue: 23100 },
  { id: "S004", name: "Tech Park", location: "1 Innovation Dr", machines: 8, status: "active", revenue: 62800 },
  { id: "S005", name: "University", location: "Campus Lot C", machines: 2, status: "inactive", revenue: 8900 },
];

export const mockTransactions: Transaction[] = [
  { id: "T001", date: "2026-04-01", customer: "John Doe", station: "Downtown Hub", amount: 12.50, type: "rental", status: "completed" },
  { id: "T002", date: "2026-03-31", customer: "Tom Brown", station: "Tech Park", amount: 22.75, type: "rental", status: "completed" },
  { id: "T003", date: "2026-03-30", customer: "Jane Smith", station: "Airport Terminal", amount: 18.00, type: "rental", status: "completed" },
  { id: "T004", date: "2026-03-30", customer: "Corp Fleet Inc", station: "Tech Park", amount: 499.00, type: "subscription", status: "completed" },
  { id: "T005", date: "2026-03-29", customer: "Sara Wilson", station: "Downtown Hub", amount: 5.00, type: "penalty", status: "pending" },
  { id: "T006", date: "2026-03-28", customer: "Mike Johnson", station: "Mall Plaza", amount: 15.25, type: "rental", status: "completed" },
  { id: "T007", date: "2026-03-27", customer: "EV Corp", station: "Airport Terminal", amount: 899.00, type: "subscription", status: "completed" },
  { id: "T008", date: "2026-03-26", customer: "Lisa Chen", station: "University", amount: 8.50, type: "rental", status: "failed" },
];

export const revenueByMonth = [
  { month: "Oct", revenue: 32000 },
  { month: "Nov", revenue: 38000 },
  { month: "Dec", revenue: 35000 },
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 48000 },
  { month: "Mar", revenue: 52000 },
];

export const sessionsByStation = [
  { name: "Downtown Hub", sessions: 3200 },
  { name: "Airport Terminal", sessions: 4800 },
  { name: "Mall Plaza", sessions: 1500 },
  { name: "Tech Park", sessions: 3800 },
  { name: "University", sessions: 900 },
];

export const mockCampaigns: Campaign[] = [
  { id: "C001", name: "Spring EV Promo", client: "GreenAuto Inc", startDate: "2026-03-01", endDate: "2026-04-15", locations: ["Downtown Hub", "Airport Terminal"], impressions: 45200, interactions: 3800, ctr: 8.4, spend: 12000, status: "active" },
  { id: "C002", name: "Airport Display Ads", client: "TravelCharge Co", startDate: "2026-02-15", endDate: "2026-03-31", locations: ["Airport Terminal"], impressions: 78500, interactions: 5200, ctr: 6.6, spend: 18500, status: "completed" },
  { id: "C003", name: "Campus Awareness", client: "EduPower Ltd", startDate: "2026-04-01", endDate: "2026-06-30", locations: ["University", "Tech Park"], impressions: 12300, interactions: 980, ctr: 7.9, spend: 5500, status: "active" },
  { id: "C004", name: "Mall Weekend Blitz", client: "ShopVolt", startDate: "2026-04-10", endDate: "2026-04-20", locations: ["Mall Plaza"], impressions: 0, interactions: 0, ctr: 0, spend: 8000, status: "scheduled" },
];

export const mockLeads: Lead[] = [
  { id: "L001", name: "David Park", email: "david@example.com", phone: "+1-555-0101", source: "Walk-in", station: "Downtown Hub", status: "new", createdAt: "2026-04-01", notes: "Interested in monthly plan" },
  { id: "L002", name: "Emma Roberts", email: "emma@example.com", phone: "+1-555-0102", source: "Online", station: "Airport Terminal", status: "contacted", createdAt: "2026-03-30", notes: "Needs fleet pricing" },
  { id: "L003", name: "Frank Miller", email: "frank@example.com", phone: "+1-555-0103", source: "Referral", station: "Tech Park", status: "qualified", createdAt: "2026-03-28", notes: "" },
];

export const mockReports: Report[] = [
  { id: "RP001", title: "Daily Station Check - Downtown", type: "daily", station: "Downtown Hub", submittedBy: "Sam Chen", date: "2026-04-01", status: "submitted", summary: "All machines operational. Minor cleaning needed at slot 3." },
  { id: "RP002", title: "Weekly Revenue Summary", type: "weekly", station: "All Stations", submittedBy: "Sam Chen", date: "2026-03-31", status: "reviewed", summary: "Revenue up 12% week-over-week. Airport Terminal leading." },
  { id: "RP003", title: "Monthly Maintenance Log", type: "monthly", station: "Airport Terminal", submittedBy: "Jordan Lee", date: "2026-03-30", status: "submitted", summary: "CB-012 requires part replacement. Scheduled for next week." },
];

export const mockActivities: Activity[] = [
  { id: "A001", title: "Inspect CB-012 at Airport", type: "maintenance", assignedTo: "Sam Chen", station: "Airport Terminal", date: "2026-04-03", status: "planned", description: "Check and replace faulty connector." },
  { id: "A002", title: "Client meeting - GreenAuto", type: "meeting", assignedTo: "Jordan Lee", station: "Downtown Hub", date: "2026-04-02", status: "in_progress", description: "Discuss campaign extension and new placements." },
  { id: "A003", title: "Install new machine at Mall", type: "installation", assignedTo: "Sam Chen", station: "Mall Plaza", date: "2026-04-05", status: "planned", description: "Set up CB-025 at Mall Plaza slot 4." },
];

// Partner-specific machine data with extended fields
export const mockPartnerMachines = mockMachines.map((m) => ({
  ...m,
  revenue: Math.round(Math.random() * 15000 + 2000),
  availableSlots: Math.floor(Math.random() * 4 + 1),
  lastMaintenance: "2026-03-" + String(Math.floor(Math.random() * 28 + 1)).padStart(2, "0"),
  powerbankHealth: Math.floor(Math.random() * 30 + 70),
}));
