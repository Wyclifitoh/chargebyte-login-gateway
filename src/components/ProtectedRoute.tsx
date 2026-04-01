import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_NAV_ACCESS } from "@/types/dashboard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: string;
}

const ProtectedRoute = ({ children, requiredSection }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (requiredSection && !ROLE_NAV_ACCESS[user.role].includes(requiredSection)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
