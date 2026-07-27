import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_NAV_ACCESS, ROLE_DASHBOARD_PATHS } from "@/types/dashboard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: string;
}

const ProtectedRoute = ({ children, requiredSection }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  const home = ROLE_DASHBOARD_PATHS[user.role] || "/dashboard";
  if (
    requiredSection &&
    !ROLE_NAV_ACCESS[user.role].includes(requiredSection) &&
    location.pathname !== home
  ) {
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
