import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, UserRole } from "@/types/dashboard";
import { api, tokenStore } from "@/services/api";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session: read cached user immediately, then validate via /auth/me.
  useEffect(() => {
    let cancelled = false;
    const cached = tokenStore.getUser();
    const token = tokenStore.getAccessToken();

    if (cached && token) setUser(cached as User);

    if (!token) {
      setIsLoading(false);
      return;
    }

    // Validate token (will auto-refresh if needed inside api.ts)
    api.auth.getMe()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          const u = res.data as User;
          const merged: User = {
            id: u.id, name: u.name, email: u.email, role: u.role,
            phone: u.phone, partner_id: u.partner_id, partner_type: u.partner_type,
          };
          tokenStore.setUser(merged);
          setUser(merged);
        } else {
          tokenStore.clearTokens();
          setUser(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network down — keep cached user so the app still works offline-ish
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await api.auth.login(email, password);
      if (result.success && result.data) {
        const { user: userData, accessToken, refreshToken } = result.data as {
          user: {
            id: string; name: string; email: string; role: UserRole;
            phone?: string; partner_id?: string; partner_type?: string;
          };
          accessToken: string; refreshToken: string;
        };
        tokenStore.setTokens(accessToken, refreshToken);
        const u: User = {
          id: userData.id, name: userData.name, email: userData.email, role: userData.role,
          phone: userData.phone, partner_id: userData.partner_id, partner_type: userData.partner_type,
        };
        tokenStore.setUser(u);
        setUser(u);
        return { success: true };
      }
      return { success: false, error: result.error || "Login failed" };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Network error" };
    }
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    tokenStore.clearTokens();
    setUser(null);
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
