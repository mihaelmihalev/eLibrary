import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./auth/useAuth";

import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import SubscriptionsPage from "./pages/Subscriptions";
import AdminSubscriptionsPage from "./pages/AdminSubscriptions";

import Navbar from "./components/Navbar";
import "./styles/navbar.css";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PrivateLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/subscriptions"
            element={
              <HideFromAdmin>
                <SubscriptionsPage />
              </HideFromAdmin>
            }
          />

          <Route
            path="/admin/subscriptions"
            element={
              <AdminOnly>
                <AdminSubscriptionsPage />
              </AdminOnly>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HideFromAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.roles?.includes("Admin"))
    return <Navigate to="/admin/subscriptions" replace />;
  return <>{children}</>;
}

function LoginPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-head">
          <div className="brand" style={{ justifyContent: "center" }}>
            <span className="brand-badge" />
            <span>eLibrary</span>
          </div>
          <p className="small" style={{ textAlign: "center", marginTop: 6 }}>
            Вход в системата
          </p>
        </div>

        <div className="auth-body stack">
          <Login />
          <div className="small" style={{ textAlign: "center" }}>
            Нямаш акаунт? <Link to="/register">Регистрация</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-head">
          <div className="brand" style={{ justifyContent: "center" }}>
            <span className="brand-badge" />
            <span>eLibrary</span>
          </div>
          <p className="small" style={{ textAlign: "center", marginTop: 6 }}>
            Регистрация
          </p>
        </div>

        <div className="auth-body stack">
          <Register onRegistered={() => navigate("/login")} />
          <div className="small" style={{ textAlign: "center" }}>
            Имаш акаунт? <Link to="/login">Вход</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function RequireAuth() {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <main className="auth-shell">
        <div className="card card-pad">Зареждане…</div>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles?.includes("Admin")) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicLayout() {
  const { user, logout } = useAuth();

  return (
    <>
      <Navbar
        userName={user ? user.name || user.email : undefined}
        isAdmin={!!user?.roles?.includes("Admin")}
        onLogout={logout}
      />
      <Outlet />
    </>
  );
}

function PrivateLayout() {
  return <PublicLayout />;
}
