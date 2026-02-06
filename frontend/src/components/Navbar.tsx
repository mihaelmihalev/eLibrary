import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";

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
  { to: "/catalog", label: "Каталог", icon: "📚", showWhen: "always" },

  { to: "/subscriptions", label: "Абонаменти", icon: "💳", showWhen: "always", hideForAdmin: true },
  { to: "/profile", label: "Профил", icon: "👤", showWhen: "auth", hideForAdmin: true },

  { to: "/admin/subscriptions", label: "Админ", icon: "🛠️", showWhen: "auth", onlyAdmin: true },
];

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.name || user?.email || "Потребител";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const links = NAV.filter((l) => {
    const showWhen = l.showWhen ?? "always";
    if (showWhen === "auth" && !isAuthenticated) return false;
    if (showWhen === "guest" && isAuthenticated) return false;

    if (l.onlyAdmin && !isAdmin) return false;
    if (l.hideForAdmin && isAdmin) return false;

    return true;
  });

  return (
    <header className="navx">
      <div className="navx-inner">
        <div className="navx-left">
          <NavLink to="/" className="navx-brand" onClick={() => setMobileOpen(false)}>
            <span className="navx-title">eLibrary</span>
          </NavLink>

          <nav className="navx-links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) => (isActive ? "navx-link active" : "navx-link")}
              >
                <span className="navx-ico">{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="navx-right">
          {isAuthenticated && (
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

                  {isAdmin && (
                    <NavLink
                      to="/admin/subscriptions"
                      className="navx-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      🛠️ Админ
                    </NavLink>
                  )}

                  <div className="navx-sep" />

                  <button
                    className="navx-item danger"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    🚪 Изход
                  </button>
                </div>
              )}
            </div>
          )}

          <button className="navx-burger" type="button" onClick={() => setMobileOpen((v) => !v)}>
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
              <button className="navx-btn ghost" onClick={() => setMobileOpen(false)}>
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

            {isAuthenticated && (
              <button
                className="navx-mobilelogout"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                🚪 Изход
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
