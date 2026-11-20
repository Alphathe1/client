import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Crown } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../lib/types";

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Chargement">
      <Crown size={40} weight="fill" className="animate-pulse text-brand" aria-hidden />
    </div>
  );
}

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
