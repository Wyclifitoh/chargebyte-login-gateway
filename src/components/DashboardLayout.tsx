import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_NAV_ACCESS, ROLE_LABELS } from "@/types/dashboard";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronDown, Zap, LayoutDashboard, Car, Cpu, MapPin, DollarSign, Users, Megaphone, ClipboardList, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/chargebyte-logo.png";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { id: "rentals", label: "Rentals", icon: Car, path: "/dashboard/rentals" },
  { id: "machines", label: "Machines", icon: Cpu, path: "/dashboard/machines" },
  { id: "stations", label: "Stations", icon: MapPin, path: "/dashboard/stations" },
  { id: "revenue", label: "Revenue", icon: DollarSign, path: "/dashboard/revenue" },
  { id: "users", label: "Users", icon: Users, path: "/dashboard/users" },
  { id: "forms", label: "Forms", icon: ClipboardList, path: "/dashboard/forms" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, path: "/dashboard/campaigns" },
  { id: "partner", label: "My Machines", icon: Cpu, path: "/dashboard/partner" },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const accessibleNav = NAV_ITEMS.filter((item) => ROLE_NAV_ACCESS[user.role].includes(item.id));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ChargeByte" width={32} height={32} />
            <span className="text-lg font-bold text-foreground">ChargeByte</span>
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            {/* Mobile menu toggle */}
            <button
              className="sm:hidden p-2 text-muted-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Nav bar */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
            {accessibleNav.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          {/* Mobile nav */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-2 space-y-1">
              {accessibleNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
