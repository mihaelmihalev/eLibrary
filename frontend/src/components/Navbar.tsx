import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

type Props = {
  userName?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  hideForAdmin?: boolean;
};

const linksPublic: NavItem[] = [
  { to: "/", label: "Начало", icon: "🏠" },
  { to: "/catalog", label: "Каталог", icon: "📚" },
];

const linksPrivate: NavItem[] = [
  { to: "/profile", label: "Профил", icon: "👤" },
  { to: "/subscriptions", label: "Абонамент", icon: "💳", hideForAdmin: true },
];

export default function Navbar({ userName, isAdmin, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isLogged = !!userName;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const links: NavItem[] = [
    ...linksPublic,
    ...(isLogged
      ? linksPrivate.filter((l) => !(isAdmin && l.hideForAdmin))
      : []),
    ...(isLogged && isAdmin
      ? [{ to: "/admin/subscriptions", label: "Админ", icon: "🛠️" }]
      : []),
  ];

  return (
    <header className="navx">
      <div className="navx-inner">
        <div className="navx-left">
          <NavLink to="/" className="navx-brand" onClick={() => setMobileOpen(false)}>
            <span className="navx-logo" aria-hidden />
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
          {isLogged ? (
            <div className="navx-user" ref={menuRef}>
              <button
                type="button"
                className="navx-userbtn"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span className="navx-dot" />
                <span className="navx-username">{userName}</span>
                <span className="navx-chev">▾</span>
              </button>

              {userMenuOpen && (
                <div className="navx-menu">
                  <NavLink
                    to="/profile"
                    className="navx-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    👤 Профил
                  </NavLink>

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
                      onLogout?.();
                    }}
                  >
                    🚪 Изход
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navx-auth">
              <NavLink className="navx-btn ghost" to="/login">
                Вход
              </NavLink>
              <NavLink className="navx-btn primary" to="/register">
                Регистрация
              </NavLink>
            </div>
          )}

          <button
            className="navx-burger"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
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

            {isLogged && (
              <button
                className="navx-mobilelogout"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout?.();
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
