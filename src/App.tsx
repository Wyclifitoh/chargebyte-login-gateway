import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import RentalsPage from "@/pages/dashboard/RentalsPage";
import MachinesPage from "@/pages/dashboard/MachinesPage";
import StationsPage from "@/pages/dashboard/StationsPage";
import RevenuePage from "@/pages/dashboard/RevenuePage";
import UsersPage from "@/pages/dashboard/UsersPage";
import CampaignsPage from "@/pages/dashboard/CampaignsPage";
import FormsPage from "@/pages/dashboard/FormsPage";
import PartnerDashboardPage from "@/pages/dashboard/PartnerDashboardPage";
import TransactionsPage from "@/pages/dashboard/TransactionsPage";
import MpesaPage from "@/pages/dashboard/MpesaPage";
import AuditLogsPage from "@/pages/dashboard/AuditLogsPage";
import OperationsPage from "@/pages/dashboard/OperationsPage";
import NotificationsPage from "@/pages/dashboard/NotificationsPage";
import PartnersPage from "@/pages/dashboard/PartnersPage";
import AdClientsPage from "@/pages/dashboard/AdClientsPage";

const queryClient = new QueryClient();

const DashboardRoute = ({ children, section }: { children: React.ReactNode; section?: string }) => (
  <ProtectedRoute requiredSection={section}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<DashboardRoute section="overview"><OverviewPage /></DashboardRoute>} />
            <Route path="/dashboard/rentals" element={<DashboardRoute section="rentals"><RentalsPage /></DashboardRoute>} />
            <Route path="/dashboard/machines" element={<DashboardRoute section="machines"><MachinesPage /></DashboardRoute>} />
            <Route path="/dashboard/stations" element={<DashboardRoute section="stations"><StationsPage /></DashboardRoute>} />
            <Route path="/dashboard/revenue" element={<DashboardRoute section="revenue"><RevenuePage /></DashboardRoute>} />
            <Route path="/dashboard/users" element={<DashboardRoute section="users"><UsersPage /></DashboardRoute>} />
            <Route path="/dashboard/campaigns" element={<DashboardRoute section="campaigns"><CampaignsPage /></DashboardRoute>} />
            <Route path="/dashboard/forms" element={<DashboardRoute section="forms"><FormsPage /></DashboardRoute>} />
            <Route path="/dashboard/partner" element={<DashboardRoute section="partner"><PartnerDashboardPage /></DashboardRoute>} />
            <Route path="/dashboard/partners" element={<DashboardRoute section="partners"><PartnersPage /></DashboardRoute>} />
            <Route path="/dashboard/adclients" element={<DashboardRoute section="adclients"><AdClientsPage /></DashboardRoute>} />
            <Route path="/dashboard/transactions" element={<DashboardRoute section="transactions"><TransactionsPage /></DashboardRoute>} />
            <Route path="/dashboard/mpesa" element={<DashboardRoute section="mpesa"><MpesaPage /></DashboardRoute>} />
            <Route path="/dashboard/audit" element={<DashboardRoute section="audit"><AuditLogsPage /></DashboardRoute>} />
            <Route path="/dashboard/operations" element={<DashboardRoute section="operations"><OperationsPage /></DashboardRoute>} />
            <Route path="/dashboard/notifications" element={<DashboardRoute section="notifications"><NotificationsPage /></DashboardRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
