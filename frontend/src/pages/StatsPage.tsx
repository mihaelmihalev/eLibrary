import React from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/useAuth";
import "../styles/stats.css";

type Overview = {
  usersCount: number;
  activeSubs: number;
  totalBorrowings: number;
  totalBooks: number;
};

type TopBorrowedRow = {
  bookId: number;
  title: string;
  author: string;
  borrowings: number;
};

type TopReviewedRow = {
  bookId: number;
  title: string;
  author: string;
  reviews: number;
};

type TopRatedRow = {
  bookId: number;
  title: string;
  author: string;
  avgRating: number;
  reviewsCount: number;
};

type UserWithRoles = { roles: string[] };
type UserWithRole = { role: string };
type UserWithIsAdmin = { isAdmin: boolean };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasRoles(u: unknown): u is UserWithRoles {
  return isObject(u) && Array.isArray(u.roles);
}
function hasRole(u: unknown): u is UserWithRole {
  return isObject(u) && typeof u.role === "string";
}
function hasIsAdmin(u: unknown): u is UserWithIsAdmin {
  return isObject(u) && typeof u.isAdmin === "boolean";
}
function isAdminUser(u: unknown): boolean {
  if (hasRoles(u)) return u.roles.includes("Admin");
  if (hasRole(u)) return u.role === "Admin";
  if (hasIsAdmin(u)) return u.isAdmin;
  return false;
}

type TabKey = "borrowed" | "reviewed" | "rated";

export default function StatsPage() {
  const { user } = useAuth() as { user?: unknown };
  const isAdmin = isAdminUser(user);

  const [tab, setTab] = React.useState<TabKey>("borrowed");

  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [topBorrowed, setTopBorrowed] = React.useState<TopBorrowedRow[]>([]);
  const [topReviewed, setTopReviewed] = React.useState<TopReviewedRow[]>([]);
  const [topRated, setTopRated] = React.useState<TopRatedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    const reqTopBorrowed = api.get<TopBorrowedRow[]>("/stats/top-borrowed", {
      params: { limit: 5 },
    });
    const reqTopReviewed = api.get<TopReviewedRow[]>("/stats/top-reviewed", {
      params: { limit: 5 },
    });
    const reqTopRated = api.get<TopRatedRow[]>("/stats/top-rated", {
      params: { limit: 5 },
    });

    const requests: Promise<unknown>[] = isAdmin
      ? [
          api.get<Overview>("/stats/overview"),
          reqTopBorrowed,
          reqTopReviewed,
          reqTopRated,
        ]
      : [reqTopBorrowed, reqTopReviewed, reqTopRated];

    Promise.all(requests)
      .then((res) => {
        if (!alive) return;

        if (isAdmin) {
          const [o, tb, tr, tra] = res as [
            { data: Overview },
            { data: TopBorrowedRow[] },
            { data: TopReviewedRow[] },
            { data: TopRatedRow[] }
          ];
          setOverview(o.data);
          setTopBorrowed(tb.data ?? []);
          setTopReviewed(tr.data ?? []);
          setTopRated(tra.data ?? []);
        } else {
          const [tb, tr, tra] = res as [
            { data: TopBorrowedRow[] },
            { data: TopReviewedRow[] },
            { data: TopRatedRow[] }
          ];
          setOverview(null);
          setTopBorrowed(tb.data ?? []);
          setTopReviewed(tr.data ?? []);
          setTopRated(tra.data ?? []);
        }
      })
      .catch(() => {
        if (!alive) return;
        setErr("Грешка при зареждане на статистиката.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const active = React.useMemo(() => {
    if (tab === "borrowed") {
      return {
        title: "Най-заемани книги",
        subtitle: undefined as string | undefined,
        headers: ["Заглавие", "Автор", "Заемания"],
        rows: topBorrowed.map((r) => [r.title, r.author, r.borrowings]),
      };
    }
    if (tab === "reviewed") {
      return {
        title: "Най-ревюирани книги",
        headers: ["Заглавие", "Автор", "Ревюта"],
        rows: topReviewed.map((r) => [r.title, r.author, r.reviews]),
      };
    }
    return {
      title: "Най-високо оценени книги",
      headers: ["Заглавие", "Автор", "Средна оценка", "Ревюта"],
      rows: topRated.map((r) => [
        r.title,
        r.author,
        r.avgRating.toFixed(2),
        r.reviewsCount,
      ]),
    };
  }, [tab, topBorrowed, topReviewed, topRated]);

  return (
    <main className="container stack stats-page">
      <div className="stats-header">
        <h1>Статистика</h1>
      </div>

      {loading ? (
        <div className="muted">Зареждане…</div>
      ) : err ? (
        <div className="alert danger">{err}</div>
      ) : (
        <>
          {isAdmin && (
            <section className="card card-pad stats-overview">
              <StatCard title="Потребители" value={overview?.usersCount ?? 0} hint="Общо" />
              <StatCard title="Активни абонаменти" value={overview?.activeSubs ?? 0} hint="В момента" />
              <StatCard title="Заемания" value={overview?.totalBorrowings ?? 0} hint="Общо" />
              <StatCard title="Книги" value={overview?.totalBooks ?? 0} hint="В каталога" />
            </section>
          )}

          <section className="card card-pad stats-tabs-card">
            <div className="stats-tabs">
              <button
                type="button"
                className={`stats-tab ${tab === "borrowed" ? "active" : ""}`}
                onClick={() => setTab("borrowed")}
              >
                📚 Най-заемани
              </button>
              <button
                type="button"
                className={`stats-tab ${tab === "reviewed" ? "active" : ""}`}
                onClick={() => setTab("reviewed")}
              >
                💬 Най-ревюирани
              </button>
              <button
                type="button"
                className={`stats-tab ${tab === "rated" ? "active" : ""}`}
                onClick={() => setTab("rated")}
              >
                ⭐ Най-високо оценени
              </button>
            </div>

            <div className="stats-tabcontent">
              <TableCard
                title={active.title}
                subtitle={active.subtitle}
                headers={active.headers}
                rows={active.rows}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="card card-pad">
      <div className="small muted">{title}</div>
      <div className="stats-number">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

function TableCard({
  title,
  subtitle,
  headers,
  rows,
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="stats-tablecard stack">
      <div className="stats-tablehead">
        <h2 className="stats-card-title">{title}</h2>
        {subtitle && <div className="small muted">{subtitle}</div>}
      </div>

      {rows.length === 0 ? (
        <div className="muted">Няма данни.</div>
      ) : (
        <div className="stats-table-wrapper">
          <table className="table stats-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
