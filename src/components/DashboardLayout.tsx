import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_NAV_ACCESS, ROLE_LABELS, UserRole } from "@/types/dashboard";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LogOut, ChevronDown, LayoutDashboard, Car, Cpu, MapPin, DollarSign, Users,
  Megaphone, ClipboardList, Menu, X, CreditCard, Shield, Briefcase, Bell,
  KeyRound, Smartphone, Clock, FileText, LifeBuoy, Trophy, Settings2, BarChart3, LucideIcon,
} from "lucide-react";
import logo from "@/assets/chargebyte-logo.png";
import SetPinDialog from "@/components/SetPinDialog";
import { api } from "@/services/api";

// ---------------- Nav definition (grouped) ----------------
type NavLeaf = { id: string; label: string; icon: LucideIcon; path: string };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavLeaf[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "operations", label: "Operations", icon: Briefcase,
    items: [
      { id: "rentals", label: "Rentals", icon: Car, path: "/dashboard/rentals" },
      { id: "machines", label: "Machines", icon: Cpu, path: "/dashboard/machines" },
      { id: "stations", label: "Stations", icon: MapPin, path: "/dashboard/stations" },
      { id: "partner", label: "My Machines", icon: Cpu, path: "/dashboard/partner" },
      { id: "operations", label: "Field Ops", icon: Briefcase, path: "/dashboard/operations" },
      { id: "support", label: "Support", icon: LifeBuoy, path: "/dashboard/support" },
    ],
  },
  {
    id: "finance", label: "Finance", icon: DollarSign,
    items: [
      { id: "revenue", label: "Revenue", icon: DollarSign, path: "/dashboard/revenue" },
      { id: "transactions", label: "Transactions", icon: CreditCard, path: "/dashboard/transactions" },
      { id: "mpesa", label: "M-Pesa", icon: Smartphone, path: "/dashboard/mpesa" },
    ],
  },
  {
    id: "people", label: "People", icon: Users,
    items: [
      { id: "users", label: "Users", icon: Users, path: "/dashboard/users" },
      { id: "partners", label: "Partners", icon: Briefcase, path: "/dashboard/partners" },
      { id: "adclients", label: "Ad Clients", icon: Megaphone, path: "/dashboard/adclients" },
      { id: "clockin", label: "Clock In/Out", icon: Clock, path: "/dashboard/clockin" },
      { id: "performance", label: "Performance", icon: Trophy, path: "/dashboard/performance" },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      { id: "campaigns", label: "Campaigns", icon: Megaphone, path: "/dashboard/campaigns" },
      { id: "forms", label: "Forms", icon: ClipboardList, path: "/dashboard/forms" },
    ],
  },
  {
    id: "insights", label: "Insights", icon: BarChart3,
    items: [
      { id: "reports", label: "Reports", icon: FileText, path: "/dashboard/reports" },
      { id: "audit", label: "Audit Logs", icon: Shield, path: "/dashboard/audit" },
      { id: "settings", label: "Settings", icon: Settings2, path: "/dashboard/settings" },
    ],
  },
];

const OVERVIEW: NavLeaf = { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/dashboard" };

function filterGroupsForRole(role: UserRole): NavGroup[] {
  const allowed = new Set(ROLE_NAV_ACCESS[role]);
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.id)) }))
    .filter((g) => g.items.length > 0);
}

// ---------------- Dropdown ----------------
function NavDropdown({ group, activePath, onNavigate }: {
  group: NavGroup; activePath: string; onNavigate: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const containsActive = group.items.some((i) => i.path === activePath);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
          containsActive
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
        }`}
      >
        <group.icon className="h-4 w-4" />
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-0 w-56 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
          {group.items.map((item) => {
            const isActive = activePath === item.path;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.path); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
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
  );
}

// ---------------- Layout ----------------
const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const res = await api.notifications.unreadCount();
      if (!cancelled && res.success && res.data) {
        setUnread(Number((res.data as { count?: number }).count ?? 0));
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user, location.pathname]);

  const groups = useMemo(() => user ? filterGroupsForRole(user.role) : [], [user]);
  const allowed = user ? new Set(ROLE_NAV_ACCESS[user.role]) : new Set<string>();
  const showOverview = allowed.has("overview");
  const alertsAllowed = allowed.has("notifications");

  if (!user) return null;

  const handleLogout = () => { logout(); navigate("/"); };

  // Flat list for mobile
  const flatItems: NavLeaf[] = [
    ...(showOverview ? [OVERVIEW] : []),
    ...groups.flatMap((g) => g.items),
    ...(alertsAllowed ? [{ id: "notifications", label: "Alerts", icon: Bell, path: "/dashboard/notifications" } as NavLeaf] : []),
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
            <img src={logo} alt="ChargeByte" width={28} height={28} />
            <span className="text-base font-bold text-foreground tracking-tight">ChargeByte</span>
          </button>

          <div className="flex items-center gap-1">
            {alertsAllowed && (
              <button
                onClick={() => navigate("/dashboard/notifications")}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-border sm:hidden">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                  </div>
                  {user.role === "super_admin" && (
                    <button
                      onClick={() => { setPinOpen(true); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <KeyRound className="h-4 w-4" />
                      Transaction PIN
                    </button>
                  )}
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
            <button
              className="sm:hidden p-2 text-muted-foreground"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Grouped Nav (desktop) */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="hidden sm:flex items-center gap-1 flex-wrap">
            {showOverview && (
              <button
                onClick={() => navigate(OVERVIEW.path)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  location.pathname === OVERVIEW.path
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <OVERVIEW.icon className="h-4 w-4" />
                Overview
              </button>
            )}
            {groups.map((g) => (
              <NavDropdown key={g.id} group={g} activePath={location.pathname} onNavigate={navigate} />
            ))}
          </div>
          {/* Mobile flat list */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-2 space-y-1">
              {flatItems.map((item) => {
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

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</main>

      <SetPinDialog open={pinOpen} onOpenChange={setPinOpen} />
    </div>
  );
};

export default DashboardLayout;
