// Mock data has been removed. All dashboard data now comes from the backend.
// Empty exports preserved so legacy imports continue to compile.
import { Rental, Machine, Station, Transaction, Campaign, Lead, Report, Activity } from "@/types/dashboard";

export const mockStations: Station[] = [];
export const mockMachines: Machine[] = [];
export const mockRentals: Rental[] = [];
export const mockTransactions: Transaction[] = [];
export const revenueByMonth: Array<{ month: string; revenue: number }> = [];
export const sessionsByStation: Array<{ name: string; sessions: number }> = [];
export const mockCampaigns: Campaign[] = [];
export const mockLeads: Lead[] = [];
export const mockReports: Report[] = [];
export const mockActivities: Activity[] = [];
export const mockPartnerMachines: Array<
  Machine & {
    station: string;
    revenue: number;
    availableSlots: number;
    lastMaintenance: string;
    powerbankHealth: number;
    totalSessions: number;
  }
> = [];
