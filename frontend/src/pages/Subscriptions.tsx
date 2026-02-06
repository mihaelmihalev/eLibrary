import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useMySubscription, usePlans, useRequestPlan } from "../api/subscriptions";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function SubscriptionsPage() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) return <Navigate to="/admin/subscriptions" replace />;

  return (
    <main className="container stack">
      <div
        className="row row-wrap"
        style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}
      >
        <div className="stack" style={{ gap: 6 }}>
          <h1>Абонаменти</h1>
          <p className="muted">Управление на абонамент и преглед на наличните планове.</p>
        </div>
      </div>

      {!user ? <GuestSubscriptions /> : <AuthedSubscriptions />}
    </main>
  );
}

function GuestSubscriptions() {
  const plansQ = usePlans();

  return (
    <section className="card card-pad stack">
      <h2>Планове</h2>

      {plansQ.isLoading ? (
        <div className="muted">Зареждане…</div>
      ) : plansQ.isError ? (
        <div className="alert danger">Грешка при зареждане на плановете.</div>
      ) : (
        <div className="stack">
          {plansQ.data!.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div className="stack" style={{ gap: 2 }}>
                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                  {p.name}
                </div>
                <div className="small">
                  {p.durationDays} дни • {p.price.toFixed(2)} лв.
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  alert("Моля, влезте в профила си, за да заявите абонамент.");
                }}
              >
                Заяви
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="small muted" style={{ marginTop: 8 }}>
        За заявяване на абонамент е необходим активен потребителски профил.
      </div>
    </section>
  );
}

function AuthedSubscriptions() {
  const plansQ = usePlans();
  const myQ = useMySubscription();
  const requestPlan = useRequestPlan();

  const [lastRequestId, setLastRequestId] = React.useState<number | null>(null);

  return (
    <>
      <section className="card card-pad stack">
        <h2>Моят абонамент</h2>

        {myQ.isLoading ? (
          <div className="muted">Зареждане…</div>
        ) : myQ.data ? (
          <div className="row row-wrap">
            <span className="badge ok">✅ Активен</span>
            <span className="small">
              Начало: <b>{fmtDate(myQ.data.startDate)}</b>
            </span>
            <span className="small">
              Край: <b>{fmtDate(myQ.data.endDate)}</b>
            </span>
          </div>
        ) : (
          <div className="alert danger">Нямаш активен абонамент.</div>
        )}
      </section>

      <section className="card card-pad stack">
        <h2>Планове</h2>

        {plansQ.isLoading ? (
          <div className="muted">Зареждане…</div>
        ) : plansQ.isError ? (
          <div className="alert danger">Грешка при зареждане на плановете.</div>
        ) : (
          <div className="stack">
            {plansQ.data!.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div className="stack" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{p.name}</div>
                  <div className="small">
                    {p.durationDays} дни • {p.price.toFixed(2)} лв.
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const res = await requestPlan.mutateAsync(p.id);
                    setLastRequestId(res.requestId);
                    alert("Заявката е изпратена за одобрение.");
                  }}
                  disabled={requestPlan.isPending}
                >
                  Заяви
                </button>
              </div>
            ))}
          </div>
        )}

        {lastRequestId && (
          <div className="small">
            Последна заявка (Request ID): <b>{lastRequestId}</b>
          </div>
        )}
      </section>
    </>
  );
}
