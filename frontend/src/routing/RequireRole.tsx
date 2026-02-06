import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Props = {
  children: React.ReactNode;
  role?: "Admin" | "User";
  redirectTo?: string;
};

export default function RequireRole({ children, role, redirectTo }: Props) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="auth-shell">
        <div className="card card-pad">Зареждане…</div>
      </main>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === "Admin" && !isAdmin) return <Navigate to={redirectTo ?? "/"} replace />;
  if (role === "User" && isAdmin) return <Navigate to={redirectTo ?? "/admin/subscriptions"} replace />;

  return <>{children}</>;
}
