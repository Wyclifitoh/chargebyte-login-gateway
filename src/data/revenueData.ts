// Extended mock data for Revenue Visibility and Rentals Management pages

export interface RevenueTransaction {
  id: string;
  date: string;
  rentalCode: string;
  station: string;
  machine: string;
  transactionType: "rental_charge" | "deposit" | "refund" | "penalty";
  amount: number;
  currency: string;
  mpesaReceipt: string;
  phoneNumber: string;
  status: "completed" | "pending" | "failed";
}

export interface ExtendedRental {
  id: string;
  rentalCode: string;
  phoneNumber: string;
  station: string;
  machine: string;
  powerbankId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalAmount: number;
  depositAmount: number;
  depositRefunded: boolean;
  status: "active" | "completed" | "overdue" | "cancelled";
}

export const mockRevenueTransactions: RevenueTransaction[] = [
  { id: "TX001", date: "2026-04-01 09:15", rentalCode: "RNT-2841", station: "Downtown Hub", machine: "CB-001", transactionType: "rental_charge", amount: 150, currency: "KES", mpesaReceipt: "RJK4H7M2NP", phoneNumber: "0712345678", status: "completed" },
  { id: "TX002", date: "2026-04-01 09:15", rentalCode: "RNT-2841", station: "Downtown Hub", machine: "CB-001", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJK4H7M2NQ", phoneNumber: "0712345678", status: "completed" },
  { id: "TX003", date: "2026-04-01 11:30", rentalCode: "RNT-2842", station: "Airport Terminal", machine: "CB-012", transactionType: "rental_charge", amount: 200, currency: "KES", mpesaReceipt: "RJK5L9N3RT", phoneNumber: "0723456789", status: "completed" },
  { id: "TX004", date: "2026-04-01 11:30", rentalCode: "RNT-2842", station: "Airport Terminal", machine: "CB-012", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJK5L9N3RU", phoneNumber: "0723456789", status: "completed" },
  { id: "TX005", date: "2026-03-31 14:00", rentalCode: "RNT-2840", station: "Mall Plaza", machine: "CB-005", transactionType: "rental_charge", amount: 100, currency: "KES", mpesaReceipt: "RJK3G6K1MS", phoneNumber: "0734567890", status: "completed" },
  { id: "TX006", date: "2026-03-31 14:00", rentalCode: "RNT-2840", station: "Mall Plaza", machine: "CB-005", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJK3G6K1MT", phoneNumber: "0734567890", status: "completed" },
  { id: "TX007", date: "2026-03-31 16:30", rentalCode: "RNT-2840", station: "Mall Plaza", machine: "CB-005", transactionType: "refund", amount: 500, currency: "KES", mpesaReceipt: "RJK3G6K1MU", phoneNumber: "0734567890", status: "completed" },
  { id: "TX008", date: "2026-03-30 08:00", rentalCode: "RNT-2838", station: "Tech Park", machine: "CB-022", transactionType: "rental_charge", amount: 300, currency: "KES", mpesaReceipt: "RJK2F5J0LR", phoneNumber: "0745678901", status: "completed" },
  { id: "TX009", date: "2026-03-30 08:00", rentalCode: "RNT-2838", station: "Tech Park", machine: "CB-022", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJK2F5J0LS", phoneNumber: "0745678901", status: "completed" },
  { id: "TX010", date: "2026-03-29 10:00", rentalCode: "RNT-2835", station: "University", machine: "CB-008", transactionType: "rental_charge", amount: 50, currency: "KES", mpesaReceipt: "RJK1E4I9KQ", phoneNumber: "0756789012", status: "pending" },
  { id: "TX011", date: "2026-03-29 10:00", rentalCode: "RNT-2835", station: "University", machine: "CB-008", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJK1E4I9KR", phoneNumber: "0756789012", status: "failed" },
  { id: "TX012", date: "2026-03-28 13:00", rentalCode: "RNT-2832", station: "Downtown Hub", machine: "CB-003", transactionType: "penalty", amount: 200, currency: "KES", mpesaReceipt: "RJK0D3H8JP", phoneNumber: "0767890123", status: "completed" },
  { id: "TX013", date: "2026-03-27 07:30", rentalCode: "RNT-2830", station: "Airport Terminal", machine: "CB-012", transactionType: "rental_charge", amount: 250, currency: "KES", mpesaReceipt: "RJH9C2G7IO", phoneNumber: "0778901234", status: "completed" },
  { id: "TX014", date: "2026-03-27 07:30", rentalCode: "RNT-2830", station: "Airport Terminal", machine: "CB-012", transactionType: "deposit", amount: 500, currency: "KES", mpesaReceipt: "RJH9C2G7IP", phoneNumber: "0778901234", status: "completed" },
  { id: "TX015", date: "2026-03-27 10:00", rentalCode: "RNT-2830", station: "Airport Terminal", machine: "CB-012", transactionType: "refund", amount: 500, currency: "KES", mpesaReceipt: "RJH9C2G7IQ", phoneNumber: "0778901234", status: "completed" },
  { id: "TX016", date: "2026-03-26 15:45", rentalCode: "RNT-2828", station: "Tech Park", machine: "CB-022", transactionType: "rental_charge", amount: 175, currency: "KES", mpesaReceipt: "RJH8B1F6HN", phoneNumber: "0789012345", status: "completed" },
];

export const mockExtendedRentals: ExtendedRental[] = [
  { id: "R001", rentalCode: "RNT-2841", phoneNumber: "0712345678", station: "Downtown Hub", machine: "CB-001", powerbankId: "PB-0451", startTime: "2026-04-01 09:15", endTime: "2026-04-01 11:45", durationMinutes: 150, totalAmount: 150, depositAmount: 500, depositRefunded: true, status: "completed" },
  { id: "R002", rentalCode: "RNT-2842", phoneNumber: "0723456789", station: "Airport Terminal", machine: "CB-012", powerbankId: "PB-0322", startTime: "2026-04-01 11:30", endTime: "", durationMinutes: 0, totalAmount: 0, depositAmount: 500, depositRefunded: false, status: "active" },
  { id: "R003", rentalCode: "RNT-2840", phoneNumber: "0734567890", station: "Mall Plaza", machine: "CB-005", powerbankId: "PB-0198", startTime: "2026-03-31 14:00", endTime: "2026-03-31 16:30", durationMinutes: 150, totalAmount: 100, depositAmount: 500, depositRefunded: true, status: "completed" },
  { id: "R004", rentalCode: "RNT-2838", phoneNumber: "0745678901", station: "Tech Park", machine: "CB-022", powerbankId: "PB-0567", startTime: "2026-03-30 08:00", endTime: "2026-03-30 12:00", durationMinutes: 240, totalAmount: 300, depositAmount: 500, depositRefunded: false, status: "overdue" },
  { id: "R005", rentalCode: "RNT-2835", phoneNumber: "0756789012", station: "University", machine: "CB-008", powerbankId: "PB-0089", startTime: "2026-03-29 10:00", endTime: "", durationMinutes: 0, totalAmount: 0, depositAmount: 500, depositRefunded: false, status: "active" },
  { id: "R006", rentalCode: "RNT-2832", phoneNumber: "0767890123", station: "Downtown Hub", machine: "CB-003", powerbankId: "PB-0234", startTime: "2026-03-28 13:00", endTime: "2026-03-28 13:15", durationMinutes: 15, totalAmount: 0, depositAmount: 500, depositRefunded: false, status: "cancelled" },
  { id: "R007", rentalCode: "RNT-2830", phoneNumber: "0778901234", station: "Airport Terminal", machine: "CB-012", powerbankId: "PB-0411", startTime: "2026-03-27 07:30", endTime: "2026-03-27 10:00", durationMinutes: 150, totalAmount: 250, depositAmount: 500, depositRefunded: true, status: "completed" },
  { id: "R008", rentalCode: "RNT-2828", phoneNumber: "0789012345", station: "Tech Park", machine: "CB-022", powerbankId: "PB-0601", startTime: "2026-03-26 15:45", endTime: "", durationMinutes: 0, totalAmount: 0, depositAmount: 500, depositRefunded: false, status: "overdue" },
];

export const revenueOverTime = [
  { date: "Mar 26", revenue: 175 },
  { date: "Mar 27", revenue: 750 },
  { date: "Mar 28", revenue: 200 },
  { date: "Mar 29", revenue: 50 },
  { date: "Mar 30", revenue: 800 },
  { date: "Mar 31", revenue: 600 },
  { date: "Apr 01", revenue: 850 },
];

export const revenueByStation = [
  { station: "Downtown Hub", revenue: 350 },
  { station: "Airport Terminal", revenue: 950 },
  { station: "Mall Plaza", revenue: 100 },
  { station: "Tech Park", revenue: 475 },
  { station: "University", revenue: 50 },
];

export const revenueByMachine = [
  { machine: "CB-001", revenue: 150 },
  { machine: "CB-003", revenue: 200 },
  { machine: "CB-005", revenue: 100 },
  { machine: "CB-008", revenue: 50 },
  { machine: "CB-012", revenue: 450 },
  { machine: "CB-022", revenue: 475 },
];

export const transactionTypeBreakdown = [
  { type: "Rental Charge", value: 1225, fill: "hsl(174, 72%, 56%)" },
  { type: "Deposit", value: 3500, fill: "hsl(210, 20%, 60%)" },
  { type: "Refund", value: 1000, fill: "hsl(45, 90%, 55%)" },
  { type: "Penalty", value: 200, fill: "hsl(0, 84%, 60%)" },
];

export const STATIONS = ["Downtown Hub", "Airport Terminal", "Mall Plaza", "Tech Park", "University"];
export const MACHINES = ["CB-001", "CB-003", "CB-005", "CB-008", "CB-012", "CB-022"];
export const TRANSACTION_TYPES = ["rental_charge", "deposit", "refund", "penalty"];
export const RENTAL_STATUSES = ["active", "completed", "overdue", "cancelled"];
