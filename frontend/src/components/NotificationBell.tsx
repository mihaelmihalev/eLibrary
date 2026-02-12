import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useUnreadNotificationsCount } from "../api/notifications";

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const q = useUnreadNotificationsCount(!!isAuthenticated);

  const count = q.data?.count ?? 0;

  if (!isAuthenticated) return null;

  return (
    <Link to="/profile" className="btn btn-ghost" style={{ position: "relative" }} title="Известия">
      <span style={{ fontSize: "1.05rem" }}>🔔</span>
      {count > 0 ? (
        <span
          className="badge danger"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            padding: "0.15rem 0.45rem",
            fontSize: "0.72rem",
            borderRadius: 999,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
