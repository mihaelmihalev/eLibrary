import { NavLink, useLocation } from "react-router-dom";
import React from "react";
import { useAuth } from "../auth/useAuth";
import NotificationBell from "./NotificationBell";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  showWhen?: "always" | "auth" | "guest";
  hideForAdmin?: boolean;
  onlyAdmin?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Начало", icon: "🏠", showWhen: "always" },
  { to: "/stats", label: "Статистика", icon: "📊", showWhen: "always" },
  { to: "/catalog", label: "Каталог", icon: "📚", showWhen: "always" },

  {
    to: "/subscriptions",
    label: "Абонаменти",
    icon: "💳",
    showWhen: "always",
    hideForAdmin: true,
  },
  {
    to: "/profile",
    label: "Профил",
    icon: "👤",
    showWhen: "auth",
    hideForAdmin: true,
  },

  {
    to: "/admin",
    label: "Админ",
    icon: "🛠️",
    showWhen: "auth",
    onlyAdmin: true,
  },
];

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);

  const displayName =
    user?.name?.trim() || user?.email?.trim() || "Потребител";

  React.useEffect(() => {
    setMobileOpen(false);

  }, [location.pathname]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const links = React.useMemo(() => {
    return NAV.filter((l) => {
      const showWhen = l.showWhen ?? "always";
      if (showWhen === "auth" && !isAuthenticated) return false;
      if (showWhen === "guest" && isAuthenticated) return false;

      if (l.onlyAdmin && !isAdmin) return false;
      if (l.hideForAdmin && isAdmin) return false;

      return true;
    });
  }, [isAuthenticated, isAdmin]);

  async function doLogout(closeAll: boolean) {
    try {
      await Promise.resolve(logout());
    } finally {
      if (closeAll) setMobileOpen(false);
      setUserMenuOpen(false);
    }
  }

  return (
    <header className="navx">
      <div className="navx-inner">
        <div className="navx-left">
          <NavLink to="/" className="navx-brand">
            <span className="navx-title">eLibrary</span>
          </NavLink>

          <nav className="navx-links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  isActive ? "navx-link active" : "navx-link"
                }
              >
                <span className="navx-ico">{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="navx-right">
          {!isAuthenticated && (
            <div className="navx-auth">
              <NavLink to="/login" className="navx-btn ghost">
                Вход
              </NavLink>
              <NavLink to="/register" className="navx-btn primary">
                Регистрация
              </NavLink>
            </div>
          )}

          {isAuthenticated && (
            <>
              <NotificationBell />

              <div className="navx-user" ref={menuRef}>
                <button
                  type="button"
                  className="navx-userbtn"
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <span className="navx-dot" />
                  <span className="navx-username">{displayName}</span>
                  <span className="navx-chev">▾</span>
                </button>

                {userMenuOpen && (
                  <div className="navx-menu">
                    {!isAdmin && (
                      <NavLink
                        to="/profile"
                        className="navx-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        👤 Профил
                      </NavLink>
                    )}

                    <div className="navx-sep" />

                    <button
                      type="button"
                      className="navx-item danger"
                      onClick={() => void doLogout(false)}
                    >
                      🚪 Изход
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            className="navx-burger"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Отвори меню"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="navx-mobile">
          <div className="navx-mobilecard">
            <div className="navx-mobilehead">
              <span className="navx-mobiletitle">Меню</span>
              <button
                type="button"
                className="navx-btn ghost"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="navx-mobilelinks">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    isActive ? "navx-mobilelink active" : "navx-mobilelink"
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{l.icon}</span>
                  {l.label}
                </NavLink>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="navx-mobileauth">
                <NavLink
                  to="/login"
                  className="navx-mobilebtn"
                  onClick={() => setMobileOpen(false)}
                >
                  🔐 Вход
                </NavLink>
                <NavLink
                  to="/register"
                  className="navx-mobilebtn"
                  onClick={() => setMobileOpen(false)}
                >
                  ✍️ Регистрация
                </NavLink>
              </div>
            )}

            {isAuthenticated && (
              <div className="navx-mobileauth">
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <NotificationBell />
                </div>

                <button
                  type="button"
                  className="navx-mobilelogout"
                  onClick={() => void doLogout(true)}
                >
                  🚪 Изход
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
