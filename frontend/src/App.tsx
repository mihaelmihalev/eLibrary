import { Routes, Route, Navigate, Link, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import RequireRole from "./routing/RequireRole";

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
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />

        <Route
          path="/profile"
          element={
            <RequireRole role="User">
              <Profile />
            </RequireRole>
          }
        />

        <Route
          path="/admin/subscriptions"
          element={
            <RequireRole role="Admin">
              <AdminSubscriptionsPage />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function AppLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function LoginPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;

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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (isAuthenticated) return <Navigate to="/" replace />;

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
