import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

type AdminCardProps = {
  title: string;
  desc: string;
  to?: string;
  icon: string;
  disabled?: boolean;
};

export default function AdminPage() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <main className="container stack">
        <div className="muted">Зареждане…</div>
      </main>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <main className="container stack">
        <section className="card card-pad stack">
          <h1>Нямаш достъп</h1>
          <p className="muted">Тази страница е само за администратори.</p>
          <div className="row row-wrap" style={{ marginTop: 6 }}>
            <Link className="btn btn-primary" to="/">
              Към началото
            </Link>
            <Link className="btn" to="/catalog">
              Каталог
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container stack">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Администраторски опции</h1>
        <p className="muted">Избери какво искаш да управляваш.</p>
      </div>

      <section className="card card-pad">
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <AdminCard
            title="Книги (каталог)"
            desc="Добавяне, редакция, изтриване, корици."
            to="/catalog"
            icon="📚"
          />

          <AdminCard
            title="Плащания"
            desc="Преглед и одит на плащания."
            to="/admin/payments"
            icon="💳"
          />

          <AdminCard
            title="Потребители"
            desc="Списък и търсене на потребители."
            icon="👤"
            to="/admin/users"
          />

          <AdminCard
            title="Статистика"
            desc="Най-заемани, най-високо оценени и др."
            icon="📈"
            to="/stats"
          />
        </div>
      </section>
    </main>
  );
}

function AdminCard({ title, desc, to, icon, disabled }: AdminCardProps) {
  const card = (
    <div
      className="card card-pad"
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition:
          "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
      }}
    >
      <div className="row spread" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 6 }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div>
          <div style={{ fontWeight: 900, color: "var(--text)" }}>{title}</div>
          <div className="small muted">{desc}</div>
        </div>
        <div className="badge" style={{ marginLeft: 10 }}>
          {disabled ? "Скоро" : "Отвори"}
        </div>
      </div>
    </div>
  );

  if (disabled || !to) return card;

  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      {card}
    </Link>
  );
}
