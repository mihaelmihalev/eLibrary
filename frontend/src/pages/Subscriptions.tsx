import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useMySubscription, usePlans } from "@/api/subscriptions";
import PaymentModal from "@/components/PaymentModal";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import Modal from "@/components/Modal";

function fmtDate(iso?: string) {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SubscriptionsPage() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) return <Navigate to="/admin/subscriptions" replace />;

  return (
    <main className="container stack">
      <div
        className="row row-wrap"
        style={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div className="stack" style={{ gap: 6 }}>
          <h1>Абонаменти</h1>
          <p className="muted">
            Управление на абонамент и преглед на наличните планове.
          </p>
        </div>
      </div>

      {!user ? <GuestSubscriptions /> : <AuthedSubscriptions />}
    </main>
  );
}

function GuestSubscriptions() {
  const nav = useNavigate();
  const plansQ = usePlans();
  const [infoOpen, setInfoOpen] = React.useState(false);

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
                onClick={() => setInfoOpen(true)}
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

      <Modal
        open={infoOpen}
        title="Информация"
        onClose={() => setInfoOpen(false)}
        width={520}
      >
        <p style={{ marginBottom: 16 }}>
          Моля, влезте в профила си, за да заявите абонамент.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button className="btn btn-ghost" onClick={() => setInfoOpen(false)}>
            OK
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              setInfoOpen(false);
              nav("/login");
            }}
          >
            Вход
          </button>
        </div>
      </Modal>
    </section>
  );
}

function AuthedSubscriptions() {
  const plansQ = usePlans();
  const myQ = useMySubscription();

  const [payOpen, setPayOpen] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState<number | null>(
    null,
  );

  const [successOpen, setSuccessOpen] = React.useState(false);
  const [successEnd, setSuccessEnd] = React.useState<string | null>(null);

  const selectedPlan = React.useMemo(() => {
    return plansQ.data?.find((p) => p.id === selectedPlanId) ?? null;
  }, [plansQ.data, selectedPlanId]);

  function openPay(planId: number) {
    setSelectedPlanId(planId);
    setPayOpen(true);
  }

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
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                    {p.name}
                  </div>
                  <div className="small">
                    {p.durationDays} дни • {p.price.toFixed(2)} лв.
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => openPay(p.id)}
                >
                  Заяви
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <PaymentModal
        open={payOpen}
        plan={selectedPlan}
        onClose={() => setPayOpen(false)}
        onSuccess={(subscriptionEnd) => {
          setSuccessEnd(subscriptionEnd ?? null);
          setSuccessOpen(true);
        }}
      />

      <PaymentSuccessModal
        open={successOpen}
        subscriptionEnd={successEnd}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}
