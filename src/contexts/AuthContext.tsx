import { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole } from "@/types/dashboard";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demo
const MOCK_USERS: User[] = [
  { id: "1", name: "Alex Rivera", email: "superadmin@chargebyte.com", role: "super_admin" },
  { id: "2", name: "Jordan Lee", email: "admin@chargebyte.com", role: "admin" },
  { id: "3", name: "Sam Chen", email: "staff@chargebyte.com", role: "staff" },
  { id: "4", name: "Morgan Blake", email: "partner@chargebyte.com", role: "location_partner" },
  { id: "5", name: "Taylor Swift", email: "adclient@chargebyte.com", role: "advertising_client" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, _password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    const found = MOCK_USERS.find((u) => u.email === email);
    if (found) {
      setUser(found);
      return { success: true };
    }
    return { success: false, error: "Invalid email or password" };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
