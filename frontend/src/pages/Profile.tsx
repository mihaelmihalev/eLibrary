import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useProfileSummary, useFinesSummary, usePayAllFines } from "@/api/profile";

type NotificationDto = {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  borrowingId?: number | null;
};

function useMyNotifications(unreadOnly: boolean, limit: number) {
  return useQuery({
    queryKey: ["notifications", { unreadOnly, limit }],
    queryFn: async () =>
      (
        await api.get<NotificationDto[]>("/notifications", {
          params: { unreadOnly, limit },
        })
      ).data,
  });
}

function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });
}

type ActiveBorrowingDto = {
  id: number;
  bookId: number;
  borrowedAt: string;
  dueAt: string;
  isOverdue: boolean;
  daysLeft: number;
  overdueDays: number;
  bookTitle: string;
  author?: string | null;
};

type HistoryBorrowingDto = {
  id: number;
  bookId: number;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
  fineAmount: number;
  finePaid: boolean;
  wasOverdue: boolean;
  bookTitle: string;
  author?: string | null;
};

function useActiveBorrowings() {
  return useQuery({
    queryKey: ["borrowings-active"],
    queryFn: async () => (await api.get<ActiveBorrowingDto[]>("/borrowings/active")).data,
  });
}

function useBorrowingsHistory() {
  return useQuery({
    queryKey: ["borrowings-history"],
    queryFn: async () => (await api.get<HistoryBorrowingDto[]>("/borrowings/history")).data,
  });
}

function useReturnBorrowing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (borrowingId: number) => {
      const res = await api.post<{ fineAmount: number; finePaid: boolean }>(
        `/borrowings/${borrowingId}/return`,
      );
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["borrowings-active"] });
      await qc.invalidateQueries({ queryKey: ["borrowings-history"] });
      await qc.invalidateQueries({ queryKey: ["profile-summary"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["notifications-count"] });
      await qc.invalidateQueries({ queryKey: ["fines-summary"] });
    },
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDateShort(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("bg-BG");
}

function daysBetweenNow(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function Profile() {
  const [historyLimit, setHistoryLimit] = React.useState(5);

  const summary = useProfileSummary();

  const activeQ = useActiveBorrowings();
  const historyQ = useBorrowingsHistory();
  const ret = useReturnBorrowing();

  const fines = useFinesSummary();
  const payAll = usePayAllFines();

  const notifs = useMyNotifications(true, 20);
  const markAllRead = useMarkAllNotificationsRead();

  const loading =
    summary.isLoading ||
    activeQ.isLoading ||
    historyQ.isLoading ||
    notifs.isLoading ||
    fines.isLoading;

  const errored =
    summary.isError ||
    activeQ.isError ||
    historyQ.isError ||
    notifs.isError ||
    fines.isError;

  if (loading) {
    return (
      <div className="container">
        <div className="card card-pad">
          <p className="muted">Зареждане…</p>
        </div>
      </div>
    );
  }

  if (errored || !summary.data) {
    return (
      <div className="container">
        <div className="alert danger">Грешка при зареждане на профила.</div>
      </div>
    );
  }

  const s = summary.data;

  const activeRows = activeQ.data ?? [];
  const fullHistory = historyQ.data ?? [];

  const returnedAll = fullHistory.filter((x) => !!x.returnedAt);
  const returnedTotal = returnedAll.length;

  const effectiveLimit = Math.min(historyLimit, Math.max(0, returnedTotal));
  const returnedHistory = returnedAll.slice(0, effectiveLimit);

  const unreadNotifs = notifs.data ?? [];

  const returnedCount = Math.max(
    0,
    s.activity.borrowingsCount - s.activity.activeBorrowingsCount,
  );

  const finesCount = fines.data?.count ?? 0;
  const finesTotal = fines.data?.total ?? 0;

  const baseOptions = [5, 10, 15, 20, 50, 100];
  const limitOptions = (() => {
    if (returnedTotal <= 0) return [5];
    const opts = baseOptions.filter((n) => n <= returnedTotal);
    if (!opts.includes(returnedTotal)) opts.push(returnedTotal);
    return opts.sort((a, b) => a - b);
  })();

  return (
    <div className="container">
      <div className="card card-pad">
        <div className="row spread row-wrap">
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={{ margin: 0 }}>Профил</h1>
            <p className="muted" style={{ margin: 0 }}>
              Лични данни и обобщение на активност
            </p>
          </div>

          <div className="row row-wrap">
            {s.subscription ? (
              <span className="badge ok">
                Активен абонамент: {s.subscription.planName} • до{" "}
                {fmtDateShort(s.subscription.endDate)}
              </span>
            ) : (
              <span className="badge warn">Няма активен абонамент</span>
            )}
          </div>
        </div>

        <div className="hr" />

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            alignItems: "start",
          }}
        >
          <div className="stack">
            <div className="row row-wrap">
              <span className="muted" style={{ minWidth: 160 }}>
                Потребителско име:
              </span>
              <b>{s.user.name ?? "—"}</b>
            </div>

            <div className="row row-wrap">
              <span className="muted" style={{ minWidth: 160 }}>
                Имейл:
              </span>
              <span>{s.user.email ?? "—"}</span>
            </div>

            <div className="row row-wrap">
              <span className="muted" style={{ minWidth: 160 }}>
                Телефон:
              </span>
              <span>{s.user.phone ?? "—"}</span>
            </div>
          </div>

          <div className="stack">
            <div className="row spread row-wrap">
              <span className="muted">Обобщение</span>
              <span className="badge">
                {s.activity.borrowingsCount} заемания • {s.activity.reviewsCount} ревюта
              </span>
            </div>

            <p className="muted">
              Виж последната активност, уведомленията, неустойките и историята по-долу.
            </p>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card card-pad">
        <div className="row spread row-wrap">
          <h2>Неустойки</h2>

          <div className="row row-wrap" style={{ gap: 10 }}>
            {finesCount > 0 ? (
              <span className="badge danger">
                Неплатени: {finesCount} • {finesTotal.toFixed(2)} лв.
              </span>
            ) : (
              <span className="badge ok">Няма неплатени неустойки</span>
            )}

            <button
              className="btn btn-primary"
              disabled={finesCount === 0 || payAll.isPending}
              onClick={() => payAll.mutate()}
            >
              Плати неустойки
            </button>
          </div>
        </div>

        <div className="hr" />

        <p className="muted" style={{ margin: 0 }}>
          Ако имаш неплатени неустойки, системата няма да ти позволи да заемаш нови книги,
          докато не ги платиш.
        </p>
      </div>

      <div style={{ height: 14 }} />

      <div className="card card-pad">
        <div className="row spread row-wrap">
          <h2>Известия</h2>

          <div className="row row-wrap" style={{ gap: 10 }}>
            <span className={`badge ${unreadNotifs.length ? "warn" : "ok"}`}>
              {unreadNotifs.length ? `${unreadNotifs.length} непрочетени` : "Няма нови"}
            </span>

            <button
              className="btn btn-ghost"
              disabled={!unreadNotifs.length || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Маркирай всички прочетени
            </button>
          </div>
        </div>

        <div className="hr" />

        {unreadNotifs.length === 0 ? (
          <div className="alert">Нямаш нови известия.</div>
        ) : (
          <div className="stack">
            {unreadNotifs.map((n) => (
              <div key={n.id} className="card" style={{ padding: "0.9rem" }}>
                <div className="row spread row-wrap" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 950 }}>{n.title}</div>
                    <div className="muted small">{fmtDate(n.createdAt)}</div>
                  </div>

                  <span
                    className={`badge ${
                      n.type === "Overdue"
                        ? "danger"
                        : n.type === "DueSoon"
                          ? "warn"
                          : n.type === "Fine"
                            ? "danger"
                            : "ok"
                    }`}
                    title={n.type}
                  >
                    {n.type}
                  </span>
                </div>

                <div style={{ height: 8 }} />

                <p className="muted" style={{ margin: 0 }}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 14 }} />

      <div className="home-features">
        <div className="card card-pad">
          <div
            className="muted"
            style={{
              fontSize: ".78rem",
              fontWeight: 900,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Активни заемания
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 950, marginTop: 6 }}>
            {s.activity.activeBorrowingsCount}
          </div>
        </div>

        <div className="card card-pad">
          <div
            className="muted"
            style={{
              fontSize: ".78rem",
              fontWeight: 900,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Върнати книги
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 950, marginTop: 6 }}>
            {returnedCount}
          </div>
        </div>

        <div className="card card-pad">
          <div
            className="muted"
            style={{
              fontSize: ".78rem",
              fontWeight: 900,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Ревюта
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 950, marginTop: 6 }}>
            {s.activity.reviewsCount}
          </div>
        </div>

        <div className="card card-pad">
          <div
            className="muted"
            style={{
              fontSize: ".78rem",
              fontWeight: 900,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Активност
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 950, marginTop: 6 }}>
            {s.activity.score}
          </div>
          <p className="muted" style={{ marginTop: 4 }}>
            {s.activity.borrowingsCount} заемания • {s.activity.reviewsCount} ревюта
          </p>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card card-pad">
        <div className="row spread row-wrap">
          <h2>Активни заемания</h2>
          <span className="badge">{activeRows.length} активни</span>
        </div>

        <div className="hr" />

        {activeRows.length === 0 ? (
          <div className="alert">Нямаш активни заемания.</div>
        ) : (
          <div className="stack">
            {activeRows.map((x) => {
              const dueInDays = x.dueAt ? daysBetweenNow(x.dueAt) : null;
              const isOverdue =
                typeof x.isOverdue === "boolean"
                  ? x.isOverdue
                  : dueInDays !== null
                    ? dueInDays < 0
                    : false;

              return (
                <div key={x.id} className="row spread row-wrap">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 950 }}>{x.bookTitle}</div>
                    <p className="muted" style={{ margin: 0 }}>
                      {x.author ? `${x.author} • ` : ""}
                      Заета: {fmtDate(x.borrowedAt)}
                    </p>

                    <p className="muted" style={{ margin: 0 }}>
                      Срок за връщане: <b>{fmtDate(x.dueAt)}</b>
                      {dueInDays !== null ? (
                        <>
                          {" "}
                          •{" "}
                          {isOverdue ? (
                            <span className="badge danger" style={{ marginLeft: 6 }}>
                              Просрочена
                            </span>
                          ) : dueInDays <= 1 ? (
                            <span className="badge warn" style={{ marginLeft: 6 }}>
                              Наближава
                            </span>
                          ) : (
                            <span className="badge ok" style={{ marginLeft: 6 }}>
                              Остават {dueInDays} дни
                            </span>
                          )}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="row row-wrap" style={{ gap: 10 }}>
                    <button
                      className="btn btn-primary"
                      disabled={ret.isPending}
                      onClick={() => ret.mutate(x.id)}
                    >
                      Върни книга
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 14 }} />

      <div className="card card-pad">
        <div className="row spread row-wrap">
          <h2>История на заеманията (върнати)</h2>

          <div className="row row-wrap" style={{ alignItems: "center", gap: 8 }}>
            <span className="muted">Показвай:</span>

            <select
              className="input"
              value={effectiveLimit || historyLimit}
              onChange={(e) => setHistoryLimit(Number(e.target.value))}
              style={{ width: 100 }}
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <span className="muted small">
              {returnedTotal > 0 ? `Показани ${returnedHistory.length} от ${returnedTotal}` : ""}
            </span>
          </div>
        </div>

        <div className="hr" />

        {returnedHistory.length === 0 ? (
          <div className="alert">Няма върнати книги за показване.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Книга</th>
                <th>Заета</th>
                <th>Върната</th>
              </tr>
            </thead>
            <tbody>
              {returnedHistory.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div style={{ fontWeight: 900 }}>{x.bookTitle}</div>
                    {x.author ? <div className="muted">{x.author}</div> : null}
                    {typeof x.fineAmount === "number" && x.fineAmount > 0 ? (
                      <div className="muted">Глоба: {x.fineAmount.toFixed(2)} лв.</div>
                    ) : null}
                  </td>
                  <td>{fmtDate(x.borrowedAt)}</td>
                  <td>{fmtDate(x.returnedAt ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
