import { Navigate, Outlet, useLocation } from "react-router";
import type { UserRole } from "@/shared/api";
import { useSessionStore } from "@/shared/auth";

export function RequireAuth({ roles }: { roles?: readonly UserRole[] }) {
  const user = useSessionStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    );
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/profile" replace />;
  }
  return <Outlet />;
}
