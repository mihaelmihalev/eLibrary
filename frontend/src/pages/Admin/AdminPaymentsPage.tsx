import React from "react";
import { useAdminPayments, type AdminPaymentStatus } from "../../api/subscriptions";

type StatusFilter = "All" | AdminPaymentStatus;

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("bg-BG");
}

function fmtMoney(n: number) {
  return `${n.toFixed(2)} лв.`;
}

export default function AdminPaymentsPage() {
  const [status, setStatus] = React.useState<StatusFilter>("All");
  const [limit, setLimit] = React.useState(100);

  const q = useAdminPayments({ status, limit });
  const rows = React.useMemo(() => q.data ?? [], [q.data]);

  const totals = React.useMemo(() => {
    let paidCount = 0;
    let paidSum = 0;
    let rejCount = 0;
    let rejSum = 0;

    for (const r of rows) {
      if (r.status === "Paid") {
        paidCount++;
        paidSum += r.amount ?? 0;
      } else if (r.status === "Rejected") {
        rejCount++;
        rejSum += r.amount ?? 0;
      }
    }

    return {
      totalCount: rows.length,
      paidCount,
      paidSum,
      rejCount,
      rejSum,
    };
  }, [rows]);

  return (
    <main className="container stack">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Админ: Плащания</h1>
        <p className="muted">
          Одит на последните плащания (сортирани по дата от backend). По
          подразбиране показваме последните 100.
        </p>
      </div>

      <section className="card card-pad">
        <div className="row row-wrap" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="field" style={{ minWidth: 220 }}>
            <label>Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="All">Всички</option>
              <option value="Paid">Paid (успешни)</option>
              <option value="Rejected">Rejected (отказани)</option>
            </select>
          </div>

          <div className="field" style={{ minWidth: 220 }}>
            <label>Лимит</label>
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <div className="muted small" style={{ marginLeft: "auto" }}>
            {q.isLoading ? "Зареждане…" : `Показани: ${totals.totalCount}`}
          </div>
        </div>
      </section>

      <section className="row row-wrap" style={{ gap: 12 }}>
        <div className="card card-pad" style={{ flex: 1, minWidth: 240 }}>
          <div className="small muted">Успешни (Paid)</div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>
            {totals.paidCount} • {fmtMoney(totals.paidSum)}
          </div>
        </div>

        <div className="card card-pad" style={{ flex: 1, minWidth: 240 }}>
          <div className="small muted">Отказани (Rejected)</div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>
            {totals.rejCount} • {fmtMoney(totals.rejSum)}
          </div>
        </div>

        <div className="card card-pad" style={{ flex: 1, minWidth: 240 }}>
          <div className="small muted">Общо</div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>
            {totals.totalCount} • {fmtMoney(totals.paidSum + totals.rejSum)}
          </div>
        </div>
      </section>

      <section className="card card-pad stack">
        <h2 style={{ margin: 0 }}>Последни плащания</h2>

        {q.isLoading ? (
          <div className="muted">Зареждане…</div>
        ) : q.isError ? (
          <div className="alert danger">Грешка при зареждане на плащанията.</div>
        ) : rows.length === 0 ? (
          <div className="muted">Няма записи.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Потребител</th>
                  <th>План</th>
                  <th>Сума</th>
                  <th>Метод</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const when = r.paidAt ?? r.createdAt;
                  const who = r.userName || r.email || r.userId;

                  return (
                    <tr key={r.id}>
                      <td>{fmtDate(when)}</td>
                      <td title={r.email ?? ""}>{who}</td>
                      <td>{r.plan}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtMoney(r.amount)}</td>
                      <td>{r.method}</td>
                      <td>
                        {r.status === "Paid" ? (
                          <span className="badge ok">Paid</span>
                        ) : (
                          <span className="badge danger">Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
