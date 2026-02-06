import { useAuth } from "../auth/useAuth";

export default function Profile() {
  const { user } = useAuth();

  return (
    <main className="container stack">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Профил</h1>
        <p className="muted">Информация за профила и настройките на акаунта.</p>
      </div>

      <section className="card card-pad stack">
        <div className="row row-wrap" style={{ justifyContent: "space-between", gap: 12 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="small muted">Потребител</div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {user?.name || user?.email || "—"}
            </div>
            <div className="small">
              <span className="muted">Email:</span> <b>{user?.email || "—"}</b>
            </div>
          </div>

          <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
            <div className="small muted">Роля</div>
            <span className="badge">User</span>
          </div>
        </div>
      </section>
    </main>
  );
}
