import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { api } from "../api/client";
import Modal from "../components/Modal";
import { usePlans, type SubscriptionPlan } from "../api/subscriptions";

type StatusFilter = "All" | "Active" | "Inactive";

type SortOption =
  | "borrowings_desc"
  | "borrowings_asc"
  | "subscription_end_asc"
  | "subscription_end_desc"
  | "reviews_desc"
  | "reviews_asc"
  | "activity_desc"
  | "activity_asc";

type AdminUserRow = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;

  subscriptionEnd?: string | null;
  borrowingsCount?: number;
  reviewsCount?: number;
};

function fmtBgPhone(raw?: string | null) {
  if (!raw) return "—";

  const digits = raw.replace(/\D/g, "");
  let d = digits;

  if (d.length === 10 && d.startsWith("0")) d = "359" + d.slice(1);

  if (d.length === 12 && d.startsWith("359")) {
    const p1 = d.slice(3, 5);
    const p2 = d.slice(5, 8);
    const p3 = d.slice(8, 12);
    return `+359 ${p1} ${p2} ${p3}`;
  }

  return raw.trim();
}

function isActiveSub(end?: string | null) {
  if (!end) return false;
  const d = new Date(end);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

function fmtSubscription(end?: string | null) {
  const green = { color: "#2e7d32", fontWeight: 600 };
  const red = { color: "#c62828", fontWeight: 600 };

  if (!isActiveSub(end)) return <span style={red}>Няма активен абонамент</span>;

  const d = new Date(end!);
  return (
    <span style={green}>Активен до {d.toLocaleDateString("bg-BG")} </span>
  );
}

export default function AdminUsersPage() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const plansQ = usePlans();

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("All");
  const [sort, setSort] = React.useState<SortOption>("borrowings_desc");

  const [rows, setRows] = React.useState<AdminUserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [grantOpen, setGrantOpen] = React.useState(false);
  const [grantUser, setGrantUser] = React.useState<AdminUserRow | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<number | "">("");
  const [grantBusy, setGrantBusy] = React.useState(false);
  const [grantErr, setGrantErr] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(() => {
    if (!isAuthenticated || !isAdmin) return;

    let alive = true;
    setLoading(true);
    setErr(null);

    api
      .get("/admin/users", { params: { q, status, sort, limit: 50 } })
      .then((r) => {
        if (!alive) return;
        setRows(r.data ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setErr("Грешка при зареждане на потребителите.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isAuthenticated, isAdmin, q, status, sort]);

  React.useEffect(() => {
    const cleanup = loadUsers();
    return () => {
      if (cleanup) cleanup();
    };
  }, [loadUsers]);

  function openGrant(u: AdminUserRow) {
    setGrantErr(null);
    setGrantUser(u);

    const firstPlan = plansQ.data?.[0]?.id ?? "";
    setSelectedPlanId(firstPlan);

    setGrantOpen(true);
  }

  async function submitGrant() {
    if (!grantUser) return;
    if (selectedPlanId === "") {
      setGrantErr("Избери план.");
      return;
    }

    try {
      setGrantBusy(true);
      setGrantErr(null);

      await api.post(`/admin/users/${grantUser.id}/subscription`, {
        planId: selectedPlanId,
      });

      setGrantOpen(false);
      setGrantUser(null);

      loadUsers();
    } catch {
      setGrantErr("Грешка при добавяне на абонамент.");
    } finally {
      setGrantBusy(false);
    }
  }

  if (isLoading)
    return (
      <main className="container stack">
        <div className="muted">Зареждане…</div>
      </main>
    );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  return (
    <main className="container stack">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Потребители</h1>
        <p className="muted">
          Списък на потребители (без админи) + базова статистика.
        </p>
      </div>

      <section className="card card-pad stack">
        <div
          className="row row-wrap"
          style={{ gap: 10, justifyContent: "space-between" }}
        >
          <div className="row row-wrap" style={{ gap: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търси по email / име / телефон…"
              className="input"
              style={{ maxWidth: 360 }}
            />

            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              style={{ maxWidth: 260 }}
              aria-label="Филтър по абонамент"
            >
              <option value="All">Всички</option>
              <option value="Active">С активен абонамент</option>
              <option value="Inactive">Без активен абонамент</option>
            </select>

            <select
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              style={{ maxWidth: 320 }}
              aria-label="Сортиране"
            >
              <option value="borrowings_desc">Най-много заемания</option>
              <option value="borrowings_asc">Най-малко заемания</option>
              <option value="subscription_end_asc">
                Най-бързо изтичащ абонамент
              </option>
              <option value="subscription_end_desc">
                Най-късно изтичащ абонамент
              </option>
              <option value="reviews_desc">Най-много ревюта</option>
              <option value="reviews_asc">Най-малко ревюта</option>
              <option value="activity_desc">
                Най-активни (заемания + ревюта)
              </option>
              <option value="activity_asc">Най-слабо активни</option>
            </select>
          </div>

          <span className="small muted">Показани: {rows.length}</span>
        </div>

        {loading ? (
          <div className="muted">Зареждане…</div>
        ) : err ? (
          <div className="alert danger">{err}</div>
        ) : rows.length === 0 ? (
          <div className="muted">Няма намерени потребители.</div>
        ) : (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Email</th>
                  <th style={{ textAlign: "left" }}>Име</th>
                  <th style={{ textAlign: "left" }}>Телефон</th>
                  <th style={{ textAlign: "left" }}>Абонамент</th>
                  <th style={{ textAlign: "left" }}>Заемания</th>
                  <th style={{ textAlign: "left" }}>Ревюта</th>
                  <th style={{ textAlign: "left" }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const active = isActiveSub(u.subscriptionEnd);

                  return (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.name || "—"}</td>
                      <td>{fmtBgPhone(u.phone)}</td>
                      <td>{fmtSubscription(u.subscriptionEnd)}</td>
                      <td>{u.borrowingsCount ?? 0}</td>
                      <td>{u.reviewsCount ?? 0}</td>
                      <td>
                        <button
                          className="btn btn-primary"
                          onClick={() => openGrant(u)}
                          disabled={plansQ.isLoading || plansQ.isError}
                          title={
                            plansQ.isError
                              ? "Неуспешно зареждане на планове"
                              : undefined
                          }
                        >
                          {active ? "Удължи абонамент" : "Добави абонамент"}
                        </button>
                      </td>
                    </tr>
                  ); 
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={grantOpen}
        title={grantUser ? `Абонамент за ${grantUser.email}` : "Абонамент"}
        onClose={() => {
          if (grantBusy) return;
          setGrantOpen(false);
          setGrantUser(null);
          setGrantErr(null);
        }}
        width={560}
      >
        <div className="stack" style={{ gap: 12 }}>
          <div className="small muted">
            Избери план и потвърди. (Администраторско действие, без плащане)
          </div>

          {plansQ.isLoading ? (
            <div className="muted">Зареждане на планове…</div>
          ) : plansQ.isError ? (
            <div className="alert danger">Грешка при зареждане на плановете.</div>
          ) : (
            <>
              <div className="stack" style={{ gap: 6 }}>
                <label className="small" style={{ fontWeight: 700 }}>
                  План
                </label>

                <select
                  className="input"
                  value={selectedPlanId}
                  onChange={(e) =>
                    setSelectedPlanId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  {plansQ.data!.map((p: SubscriptionPlan) => (
                    <option key={p.id} value={p.id}>
                      {p.name} • {p.durationDays} дни • {p.price.toFixed(2)} лв.
                    </option>
                  ))}
                </select>
              </div>

              {grantErr && <div className="alert danger">{grantErr}</div>}

              <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  onClick={() => {
                    if (grantBusy) return;
                    setGrantOpen(false);
                    setGrantUser(null);
                    setGrantErr(null);
                  }}
                >
                  Отказ
                </button>

                <button
                  className="btn btn-primary"
                  onClick={submitGrant}
                  disabled={grantBusy || selectedPlanId === ""}
                >
                  {grantBusy ? "Запис…" : "Потвърди"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </main>
  );
}
