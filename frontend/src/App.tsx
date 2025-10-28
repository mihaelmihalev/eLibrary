import React, { useMemo, useState } from "react";
import {
  useBooks,
  useCreateBook,
  useUpdateBook,
  useDeleteBook,
  type Book,
  type BookQuery,
} from "./api/books";
import BookForm from "./components/BookForm";
import { useDebounce } from "./hooks/useDebounce";
import AuthProvider from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";

type Mode =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; book: Book };

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <LibraryApp />
      </AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [view, setView] = useState<"login" | "register">("login");

  if (isLoading) {
    return (
      <main style={centered}>
        <p>Зареждане…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "system-ui" }}>
        <h1>eLibrary</h1>
        <p style={{ marginTop: -8, color: "#555" }}>Моля, влезте в профила си.</p>

        <div style={authTabsWrap}>
          <button
            onClick={() => setView("login")}
            style={{ ...tabBtn, ...(view === "login" ? tabBtnActive : null) }}
          >
            Вход
          </button>
          <button
            onClick={() => setView("register")}
            style={{ ...tabBtn, ...(view === "register" ? tabBtnActive : null) }}
          >
            Регистрация
          </button>
        </div>

        <div style={card}>
          {view === "login" ? <Login /> : <Register onRegistered={() => setView("login")} />}
        </div>
      </main>
    );
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontWeight: 600 }}>eLibrary</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#444" }}>{user?.name || user?.email || "Потребител"}</span>
          <button onClick={logout}>Изход</button>
        </div>
      </header>
      {children}
    </>
  );
}

function LibraryApp() {
  const [search, setSearch] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<BookQuery["sortBy"]>("id");
  const [sortDir, setSortDir] = useState<BookQuery["sortDir"]>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const dSearch = useDebounce(search, 350);
  const dAuthor = useDebounce(author, 350);
  const dGenre = useDebounce(genre, 350);

  const query = useMemo<BookQuery>(
    () => ({
      search: dSearch || undefined,
      author: dAuthor || undefined,
      genre: dGenre || undefined,
      availableOnly: availableOnly || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [dSearch, dAuthor, dGenre, availableOnly, sortBy, sortDir, page, pageSize]
  );

  const { data, isLoading, error } = useBooks(query);
  const createM = useCreateBook();
  const updateM = useUpdateBook();
  const deleteM = useDeleteBook();
  const [mode, setMode] = useState<Mode>({ type: "none" });

  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <main style={{ maxWidth: 1000, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Каталог</h1>
      <p style={{ marginTop: 4 }}>Търсене, филтри, сортиране и странициране</p>

      <section style={filtersWrap}>
        <input
          placeholder="Търси (заглавие, автор, ISBN)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetToFirstPage();
          }}
        />
        <input
          placeholder="Автор"
          value={author}
          onChange={(e) => {
            setAuthor(e.target.value);
            resetToFirstPage();
          }}
        />
        <input
          placeholder="Жанр"
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            resetToFirstPage();
          }}
        />
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => {
              setAvailableOnly(e.target.checked);
              resetToFirstPage();
            }}
          />
          Само налични
        </label>
        <select
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSortBy(e.target.value as BookQuery["sortBy"]);
            resetToFirstPage();
          }}
        >
          <option value="id">ID</option>
          <option value="title">Заглавие</option>
          <option value="author">Автор</option>
          <option value="genre">Жанр</option>
          <option value="publishedOn">Публикувана</option>
          <option value="copies">Бройки</option>
        </select>
        <select
          value={sortDir}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSortDir(e.target.value as BookQuery["sortDir"]);
            resetToFirstPage();
          }}
        >
          <option value="asc">↑ Възходящо</option>
          <option value="desc">↓ Низходящо</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(+e.target.value);
            resetToFirstPage();
          }}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}/стр.
            </option>
          ))}
        </select>

        <button onClick={() => setMode({ type: "create" })}>+ Добави книга</button>
      </section>

      {error && (
        <div style={{ border: "1px solid #f66", padding: 8 }}>Грешка при зареждане.</div>
      )}
      {isLoading && <p>Зареждане…</p>}

      {!isLoading && (
        <>
          <div style={{ margin: "6px 0", fontSize: 14 }}>
            Резултати: <b>{total}</b> · Страница {page}/{totalPages}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Заглавие</th>
                <th style={th}>Автор</th>
                <th style={th}>Жанр</th>
                <th style={th}>Налични</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((b) => (
                <tr key={b.id}>
                  <td style={td}>{b.id}</td>
                  <td style={td}>{b.title}</td>
                  <td style={td}>{b.author ?? "-"}</td>
                  <td style={td}>{b.genre ?? "-"}</td>
                  <td style={td}>
                    {b.copiesAvailable}/{b.copiesTotal}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button onClick={() => setMode({ type: "edit", book: b })}>Редакция</button>{" "}
                    <button
                      onClick={() => {
                        if (confirm(`Изтриване на "${b.title}"?`)) deleteM.mutate(b.id);
                      }}
                    >
                      Изтрий
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    <i>Няма записи по текущите филтри.</i>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={pager}>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Предишна
            </button>
            <span>
              Стр. {page} от {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Следваща →
            </button>
          </div>
        </>
      )}

      {mode.type !== "none" && (
        <div style={overlay}>
          <div style={modal}>
            <h3>{mode.type === "create" ? "Нова книга" : `Редакция: ${mode.book.title}`}</h3>
            <BookForm
              initial={mode.type === "edit" ? mode.book : undefined}
              onCancel={() => setMode({ type: "none" })}
              onSubmit={(data) => {
                if (mode.type === "create") {
                  createM.mutate(
                    {
                      title: data.title,
                      author: data.author,
                      genre: data.genre,
                      copiesTotal: data.copiesTotal,
                      copiesAvailable: data.copiesAvailable,
                    },
                    {
                      onSuccess: () => {
                        setMode({ type: "none" });
                        setPage(1);
                      },
                    }
                  );
                } else {
                  const updated: Book = {
                    ...mode.book,
                    ...data,
                  };
                  updateM.mutate(updated, { onSuccess: () => setMode({ type: "none" }) });
                }
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

const filtersWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr auto auto auto auto auto",
  gap: 8,
  alignItems: "center",
  margin: "12px 0",
};

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "6px 8px" };

const pager: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "flex-end",
  marginTop: 10,
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.15)",
  display: "grid",
  placeItems: "center",
};
const modal: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  width: 480,
  boxShadow: "0 6px 24px rgba(0,0,0,.2)",
};

const centered: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  fontFamily: "system-ui",
};

const topbar: React.CSSProperties = {
  height: 56,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #eee",
  position: "sticky",
  top: 0,
  background: "#fff",
  zIndex: 10,
};

const authTabsWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  margin: "12px 0",
};

const tabBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "#f5f7ff",
  borderColor: "#8aa0ff",
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 4px 14px rgba(0,0,0,.06)",
};
