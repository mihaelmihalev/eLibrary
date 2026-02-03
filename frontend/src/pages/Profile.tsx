import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  getMyActive,
  getMyHistory,
  returnBook,
  type BorrowItem,
} from "../api/borrowings";

export default function Profile() {
  const { user } = useAuth();
  const [active, setActive] = useState<BorrowItem[]>([]);
  const [history, setHistory] = useState<BorrowItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [a, h] = await Promise.all([getMyActive(), getMyHistory()]);
    setActive(a);
    setHistory(h);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onReturn(id: number) {
    await returnBook(id);
    await refresh();
  }

  if (loading)
    return (
      <main className="container">
        <div className="card card-pad">Зареждане…</div>
      </main>
    );

  return (
    <main className="container stack">
      <div className="row spread row-wrap">
        <div className="stack" style={{ gap: 6 }}>
          <h1>Профил</h1>
          <p>
            Потребител: <b>{user?.name || user?.email}</b>
          </p>
        </div>
      </div>

      <section className="card card-pad stack">
        <h2>Активни заемания</h2>

        {active.length === 0 ? (
          <div className="muted">Нямаш активни заемания.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Заглавие</th>
                <th>Автор</th>
                <th>Взета на</th>
                <th style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {active.map((x, i) => (
                <tr key={x.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 750 }}>{x.bookTitle}</td>
                  <td>{x.author}</td>
                  <td>{new Date(x.borrowedAt).toLocaleString()}</td>
                  <td className="actions">
                    <button className="btn btn-primary" onClick={() => onReturn(x.id)}>
                      Върни
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card card-pad stack">
        <h2>История</h2>

        {history.length === 0 ? (
          <div className="muted">Няма история.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Заглавие</th>
                <th>Автор</th>
                <th>Взета</th>
                <th>Върната</th>
              </tr>
            </thead>
            <tbody>
              {history.map((x, i) => (
                <tr key={x.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 750 }}>{x.bookTitle}</td>
                  <td>{x.author}</td>
                  <td>{new Date(x.borrowedAt).toLocaleString()}</td>
                  <td>
                    {x.returnedAt
                      ? new Date(x.returnedAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
