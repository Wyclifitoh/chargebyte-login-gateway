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
import PartnerProfilePage from "@/pages/dashboard/PartnerProfilePage";
import AdClientsPage from "@/pages/dashboard/AdClientsPage";
import ClockInPage from "@/pages/dashboard/ClockInPage";
import ReportsPage from "@/pages/dashboard/ReportsPage";
import SupportPage from "@/pages/dashboard/SupportPage";
import PerformancePage from "@/pages/dashboard/PerformancePage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import AssetsPage from "@/pages/dashboard/AssetsPage";
import EventsPage from "@/pages/dashboard/EventsPage";
import EventProfilePage from "@/pages/dashboard/EventProfilePage";
import OperationsDashboardPage from "@/pages/dashboard/operations/OperationsDashboardPage";
import DailyUpdatesPage from "@/pages/dashboard/operations/DailyUpdatesPage";
import FieldActivitiesPage from "@/pages/dashboard/operations/FieldActivitiesPage";
import DepartmentUpdatesPage from "@/pages/dashboard/operations/DepartmentUpdatesPage";
import OpsTasksPage from "@/pages/dashboard/operations/OpsTasksPage";
import OpsCalendarPage from "@/pages/dashboard/operations/OpsCalendarPage";

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
            <Route
              path="/dashboard"
              element={
                <DashboardRoute section="overview">
                  <OverviewPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/rentals"
              element={
                <DashboardRoute section="rentals">
                  <RentalsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/machines"
              element={
                <DashboardRoute section="machines">
                  <MachinesPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/stations"
              element={
                <DashboardRoute section="stations">
                  <StationsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/revenue"
              element={
                <DashboardRoute section="revenue">
                  <RevenuePage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <DashboardRoute section="users">
                  <UsersPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/campaigns"
              element={
                <DashboardRoute section="campaigns">
                  <CampaignsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/forms"
              element={
                <DashboardRoute section="forms">
                  <FormsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/partner"
              element={
                <DashboardRoute section="partner">
                  <PartnerDashboardPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/partners"
              element={
                <DashboardRoute section="partners">
                  <PartnersPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/partners/:id"
              element={
                <DashboardRoute section="partners">
                  <PartnerProfilePage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/adclients"
              element={
                <DashboardRoute section="adclients">
                  <AdClientsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/transactions"
              element={
                <DashboardRoute section="transactions">
                  <TransactionsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/mpesa"
              element={
                <DashboardRoute section="mpesa">
                  <MpesaPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/audit"
              element={
                <DashboardRoute section="audit">
                  <AuditLogsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/operations"
              element={
                <DashboardRoute section="operations">
                  <OperationsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <DashboardRoute section="notifications">
                  <NotificationsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/clockin"
              element={
                <DashboardRoute section="clockin">
                  <ClockInPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <DashboardRoute section="reports">
                  <ReportsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/support"
              element={
                <DashboardRoute section="support">
                  <SupportPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/performance"
              element={
                <DashboardRoute section="performance">
                  <PerformancePage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <DashboardRoute section="settings">
                  <SettingsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/assets"
              element={
                <DashboardRoute section="assets">
                  <AssetsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/events"
              element={
                <DashboardRoute section="events">
                  <EventsPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/events/:id"
              element={
                <DashboardRoute section="events">
                  <EventProfilePage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops"
              element={
                <DashboardRoute section="ops">
                  <OperationsDashboardPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops/updates"
              element={
                <DashboardRoute section="ops_updates">
                  <DailyUpdatesPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops/field"
              element={
                <DashboardRoute section="ops_field">
                  <FieldActivitiesPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops/departments"
              element={
                <DashboardRoute section="ops_departments">
                  <DepartmentUpdatesPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops/tasks"
              element={
                <DashboardRoute section="ops_tasks">
                  <OpsTasksPage />
                </DashboardRoute>
              }
            />
            <Route
              path="/dashboard/ops/calendar"
              element={
                <DashboardRoute section="ops_calendar">
                  <OpsCalendarPage />
                </DashboardRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
