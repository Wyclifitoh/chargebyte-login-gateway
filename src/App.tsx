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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
