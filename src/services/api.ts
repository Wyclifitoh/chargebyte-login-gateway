// Placeholder API service layer
// Replace these with actual REST API calls when backend is connected

import { mockRentals, mockMachines, mockStations, mockTransactions, mockCampaigns, mockLeads, mockReports, mockActivities, mockPartnerMachines } from "@/data/mockData";
import { mockExtendedStations, mockExtendedMachines, mockMpesaTransactions, mockMpesaCallbacks, mockAuditLogs, mockNotifications, mockStaffLeads, mockDailyPlans } from "@/data/extendedMockData";
import { mockRevenueTransactions, mockExtendedRentals, revenueOverTime, revenueByStation, revenueByMachine, transactionTypeBreakdown } from "@/data/revenueData";

// Simulate network delay
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

async function mockFetch<T>(data: T): Promise<ApiResponse<T>> {
  await delay();
  return { data, success: true };
}

// API endpoints organized by domain
export const api = {
  // Dashboard overview
  overview: {
    getMetrics: () => mockFetch({ rentals: mockRentals, machines: mockMachines, transactions: mockTransactions }),
    getRevenueChart: () => mockFetch(revenueOverTime),
  },

  // Rentals
  rentals: {
    getAll: () => mockFetch(mockExtendedRentals),
    getById: (id: string) => mockFetch(mockExtendedRentals.find((r) => r.id === id)),
  },

  // Machines
  machines: {
    getAll: () => mockFetch(mockExtendedMachines),
    getById: (id: string) => mockFetch(mockExtendedMachines.find((m) => m.id === id)),
  },

  // Stations
  stations: {
    getAll: () => mockFetch(mockExtendedStations),
    getById: (id: string) => mockFetch(mockExtendedStations.find((s) => s.id === id)),
  },

  // Revenue
  revenue: {
    getTransactions: () => mockFetch(mockRevenueTransactions),
    getChartData: () => mockFetch({ revenueOverTime, revenueByStation, revenueByMachine, transactionTypeBreakdown }),
  },

  // M-Pesa
  mpesa: {
    getTransactions: () => mockFetch(mockMpesaTransactions),
    getCallbacks: () => mockFetch(mockMpesaCallbacks),
  },

  // Campaigns
  campaigns: {
    getAll: () => mockFetch(mockCampaigns),
  },

  // Operations
  operations: {
    getLeads: () => mockFetch(mockStaffLeads),
    getReports: () => mockFetch(mockReports),
    getDailyPlans: () => mockFetch(mockDailyPlans),
  },

  // Audit
  audit: {
    getLogs: () => mockFetch(mockAuditLogs),
  },

  // Notifications
  notifications: {
    getAll: () => mockFetch(mockNotifications),
  },

  // Partner
  partner: {
    getMachines: () => mockFetch(mockPartnerMachines),
  },
};

export default api;
