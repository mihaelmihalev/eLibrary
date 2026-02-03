import React from "react";
import {
  apiOrigin,
  useApproveRequest,
  usePendingRequests,
  useRejectRequest,
  useAdminActiveSubscriptions,
} from "../api/subscriptions";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

type Tab = "pending" | "active";

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = React.useState<Tab>("pending");

  const pendingQ = usePendingRequests();
  const activeQ = useAdminActiveSubscriptions();

  const approve = useApproveRequest();
  const reject = useRejectRequest();

  const [noteById, setNoteById] = React.useState<Record<number, string>>({});

  return (
    <main className="container stack">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Админ: Абонаменти</h1>
        <p>Одобряване/отказ на заявки и преглед на активните абонаменти.</p>
      </div>

      <div className="row row-wrap">
        <button
          onClick={() => setTab("pending")}
          className={"btn " + (tab === "pending" ? "btn-primary" : "")}
        >
          Чакащи одобрение
        </button>

        <button
          onClick={() => setTab("active")}
          className={"btn " + (tab === "active" ? "btn-primary" : "")}
        >
          Активни абонаменти
        </button>
      </div>

      {tab === "pending" && (
        <section className="card card-pad stack">
          <h2>Чакащи заявки</h2>

          {pendingQ.isLoading ? (
            <div className="muted">Зареждане…</div>
          ) : pendingQ.isError ? (
            <div className="alert danger">Грешка при зареждане.</div>
          ) : pendingQ.data!.length === 0 ? (
            <div className="muted">Няма чакащи заявки.</div>
          ) : (
            <div className="stack">
              {pendingQ.data!.map((r) => (
                <div key={r.id} className="card" style={{ padding: "1rem" }}>
                  <div
                    className="row spread row-wrap"
                    style={{ alignItems: "flex-start" }}
                  >
                    <div className="stack" style={{ gap: 2 }}>
                      <div style={{ fontWeight: 850 }}>
                        Заявка #{r.id} • План: {r.plan}
                      </div>
                      <div className="small">
                        Потребител: {r.userId} • Заявена: {fmtDate(r.requestedAt)}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        const ok = window.confirm(
                          `Сигурни ли сте, че искате да ОДОБРИТЕ заявка #${r.id}?\n\nЩе се активира абонаментът и ще се генерира касова бележка (PDF).`
                        );
                        if (!ok) return;

                        try {
                          const res = await approve.mutateAsync(r.id);
                          const pdfUrl = `${apiOrigin()}${res.receiptPdf}`;
                          window.open(pdfUrl, "_blank");
                        } catch {
                          alert("Грешка при одобряване на заявката.");
                        }
                      }}
                      disabled={approve.isPending}
                    >
                      Одобри (PDF)
                    </button>
                  </div>

                  <hr className="hr" />

                  <div className="row row-wrap" style={{ alignItems: "flex-end" }}>
                    <div className="field" style={{ flex: 1, minWidth: 260 }}>
                      <label>Причина за отказ</label>
                      <input
                        value={noteById[r.id] ?? ""}
                        onChange={(e) =>
                          setNoteById((p) => ({ ...p, [r.id]: e.target.value }))
                        }
                        placeholder="Задължително при отказ"
                      />
                    </div>

                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        const note = noteById[r.id]?.trim();
                        if (!note) {
                          alert("Моля, въведете причина за отказ.");
                          return;
                        }

                        const ok = window.confirm(
                          `Сигурни ли сте, че искате да ОТКАЖЕТЕ заявка #${r.id}?\n\nПричина:\n"${note}"`
                        );
                        if (!ok) return;

                        try {
                          await reject.mutateAsync({
                            requestId: r.id,
                            dto: { note },
                          });
                        } catch {
                          alert("Грешка при отказване на заявката.");
                        }
                      }}
                      disabled={reject.isPending}
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "active" && (
        <section className="card card-pad stack">
          <h2>Активни абонаменти</h2>

          {activeQ.isLoading ? (
            <div className="muted">Зареждане…</div>
          ) : activeQ.isError ? (
            <div className="alert danger">
              Грешка при зареждане на активните абонаменти.
            </div>
          ) : activeQ.data!.length === 0 ? (
            <div className="muted">Няма активни абонаменти.</div>
          ) : (
            <div className="stack">
              {activeQ.data!.map((s) => (
                <div key={s.id} className="card" style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 850 }}>
                    Потребител: {s.userName || s.email || s.userId} • План: {s.plan}
                  </div>
                  <div className="small">
                    Период: {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
