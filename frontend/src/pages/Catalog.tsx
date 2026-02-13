import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_BASE } from "@/api/client";
import {
  useBooks,
  useUpdateBook,
  useDeleteBook,
  uploadBookCover,
  type Book,
  type BookQuery,
} from "@/api/books";
import { useAuth } from "@/auth/useAuth";
import BookReviewsModal from "@/components/BookReviewsModal";
import BookForm from "@/components/BookForm";
import type { BookFormData } from "@/components/BookForm";
import Modal from "@/components/Modal";

const FILE_BASE = API_BASE.replace(/\/api\/?$/i, "");

type Mode =
  | { type: "none" }
  | { type: "reviews"; book: Book }
  | { type: "edit"; book: Book }
  | { type: "create" };

type StarStyle = CSSProperties & { ["--pct"]?: string };

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

type InfoModalState = null | {
  title: string;
  message: string;
  tone?: "info" | "ok" | "warn" | "danger";
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
};

export default function Catalog() {
  const nav = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  const [mode, setMode] = useState<Mode>({ type: "none" });
  const [infoModal, setInfoModal] = useState<InfoModalState>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [genre, setGenre] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [sortBy, setSortBy] = useState<BookQuery["sortBy"]>("newest");
  const [sortDir, setSortDir] = useState<BookQuery["sortDir"]>("desc");

  useEffect(() => {
    setSortDir("desc");
  }, [sortBy]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, genre, availableOnly, sortBy, sortDir]);

  const booksQ = useBooks({
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    genre: genre || undefined,
    availableOnly: availableOnly || undefined,
    sortBy: sortBy || undefined,
    sortDir: sortDir || undefined,
  });

  const updateBookM = useUpdateBook();
  const deleteBookM = useDeleteBook();

  const items = booksQ.data?.items ?? [];
  const total = booksQ.data?.totalCount ?? 0;

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  const [knownGenres, setKnownGenres] = useState<string[]>([]);
  useEffect(() => {
    const list = booksQ.data?.items ?? [];
    if (!list.length) return;

    setKnownGenres((prev) => {
      const set = new Set(prev);
      for (const b of list) {
        const g = (b.genre ?? "").trim();
        if (g) set.add(g);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, "bg"));
    });
  }, [booksQ.data?.items]);

  function showInfo(state: InfoModalState) {
    setInfoModal(state);
  }

  function clearFilters() {
    setSearch("");
    setGenre("");
    setAvailableOnly(false);
    setSortBy("newest");
    setSortDir("desc");
  }

  function getCoverSrc(b: Book) {
    if (!b.coverUrl) return null;
    return `${FILE_BASE}${b.coverUrl}`;
  }

  function getAvailabilityBadgeByAvail(avail: number) {
    if (avail <= 0) return "danger";
    if (avail <= 2) return "warn";
    return "ok";
  }

  function getRating(b: Book) {
    const raw = (b as unknown as { avgRating?: number | string | null }).avgRating;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return Number(raw) || 0;
    return 0;
  }

  function getCopiesAvailable(b: Book) {
    const raw = (b as unknown as { copiesAvailable?: number | string | null })
      .copiesAvailable;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return Number(raw) || 0;
    return 0;
  }

  function getBorrowBlock(): InfoModalState {
    if (isAdmin) {
      return {
        title: "Недостъпно действие",
        message: "Администраторски профил не може да заема книги.",
        tone: "warn",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      };
    }
    return null;
  }

  function showSubscriptionRequiredModal() {
    showInfo({
      title: "Няма активен абонамент",
      message:
        "За да заемете книга, е необходим активен абонамент. Изберете план от страницата с абонаменти.",
      tone: "warn",
      primaryText: "Към абонаменти",
      onPrimary: () => {
        setInfoModal(null);
        nav("/subscriptions");
      },
      secondaryText: "OK",
      onSecondary: () => setInfoModal(null),
    });
  }

  async function borrowBook(book: Book) {
    try {
      await api.post(`/borrowings/${book.id}`);
      showInfo({
        title: "Успешно",
        message: `Успешно заехте "${book.title}".`,
        tone: "ok",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
      await booksQ.refetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown; status?: number } };
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 401) {
        if (!isAuthenticated) {
          showSubscriptionRequiredModal();
          return;
        }

        showInfo({
          title: "Сесията е изтекла",
          message: "Моля, влезте отново.",
          tone: "warn",
          primaryText: "OK",
          onPrimary: () => setInfoModal(null),
        });
        return;
      }

      if (status === 403) {
        showSubscriptionRequiredModal();
        return;
      }

      if (typeof data === "string" && data.trim().length > 0) {
        showInfo({
          title: "Информация",
          message: data,
          tone: "info",
          primaryText: "OK",
          onPrimary: () => setInfoModal(null),
        });
        return;
      }

      showInfo({
        title: "Грешка",
        message: "Възникна грешка. Опитайте отново.",
        tone: "danger",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
    }
  }

  async function onCreateSubmit(data: BookFormData, coverFile: File | null) {
    try {
      const res = await api.post(`/books`, {
        title: data.title,
        author: data.author ?? null,
        genre: data.genre ?? null,
        isbn: data.isbn ?? null,
        publishedOn: null,
        copiesTotal: data.copiesTotal,
        copiesAvailable: data.copiesAvailable,
      });

      const created = res?.data as { id?: number } | undefined;
      const newId = created?.id;

      if (coverFile && typeof newId === "number") {
        await uploadBookCover(newId, coverFile);
      }

      setMode({ type: "none" });
      showInfo({
        title: "Успешно",
        message: "Книгата е добавена успешно.",
        tone: "ok",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
      await booksQ.refetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown; status?: number } };
      const dataMsg = err.response?.data;
      if (typeof dataMsg === "string" && dataMsg.trim()) {
        showInfo({
          title: "Информация",
          message: dataMsg,
          tone: "info",
          primaryText: "OK",
          onPrimary: () => setInfoModal(null),
        });
        return;
      }
      showInfo({
        title: "Грешка",
        message: "Грешка при добавяне на книга.",
        tone: "danger",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
    }
  }

  async function onEditSubmit(data: BookFormData, coverFile: File | null) {
    if (mode.type !== "edit") return;

    try {
      await updateBookM.mutateAsync({
        id: mode.book.id,
        ...data,
      });

      if (coverFile) {
        await uploadBookCover(mode.book.id, coverFile);
      }

      setMode({ type: "none" });
      await booksQ.refetch();
    } catch {
      showInfo({
        title: "Грешка",
        message: "Грешка при редакция.",
        tone: "danger",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
    }
  }

  async function onDelete(book: Book) {
    if (!confirm(`Да се изтрие ли "${book.title}"?`)) return;

    try {
      await deleteBookM.mutateAsync(book.id);
      await booksQ.refetch();
    } catch {
      showInfo({
        title: "Грешка",
        message: "Грешка при изтриване.",
        tone: "danger",
        primaryText: "OK",
        onPrimary: () => setInfoModal(null),
      });
    }
  }

  return (
    <div className="page stack">
      <h1>Каталог</h1>

      <div className="card card-pad stack catalog-toolbar" style={{ gap: 12 }}>
        <div className="catalog-toolbar-top">
          <div className="catalog-toolbar-left">
            <div className="catalog-field">
              <label className="catalog-label">
                Търсене (заглавие / автор / ISBN)
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Напр. Вазов, 978..., Под игото…"
              />
            </div>

            <div className="catalog-field" style={{ minWidth: 220 }}>
              <label className="catalog-label">Жанр</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">Всички</option>
                {knownGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <label className="catalog-check">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />
              <span>Само налични</span>
            </label>

            <div className="catalog-field" style={{ minWidth: 240 }}>
              <label className="catalog-label">Сортиране</label>
              <div className="catalog-sort">
                <select
                  value={sortBy ?? "newest"}
                  onChange={(e) =>
                    setSortBy(e.target.value as BookQuery["sortBy"])
                  }
                >
                  <option value="newest">Най-нови</option>
                  <option value="rating">Рейтинг</option>
                  <option value="reviews">Мнения</option>
                  <option value="borrowed">Най-заемани</option>
                  <option value="available">Наличност</option>

                  <option value="title">Заглавие</option>
                  <option value="author">Автор</option>
                  <option value="genre">Жанр</option>
                </select>

                <select
                  value={sortDir ?? "desc"}
                  onChange={(e) =>
                    setSortDir(e.target.value as BookQuery["sortDir"])
                  }
                  className="catalog-sortdir"
                  aria-label="Посока на сортиране"
                  title="Посока на сортиране"
                >
                  <option value="asc">↑</option>
                  <option value="desc">↓</option>
                </select>
              </div>
            </div>
          </div>

          <div className="catalog-toolbar-right">
            <button className="btn btn-ghost" onClick={clearFilters}>
              Изчисти
            </button>
          </div>
        </div>

        <div className="catalog-meta">
          <span>
            Намерени: <b>{total}</b>
          </span>
          {debouncedSearch.trim() ? (
            <span>
              • Търсене: <b>{debouncedSearch.trim()}</b>
            </span>
          ) : null}
          {genre ? (
            <span>
              • Жанр: <b>{genre}</b>
            </span>
          ) : null}
          {availableOnly ? (
            <span>
              • <b>Само налични</b>
            </span>
          ) : null}
        </div>
      </div>

      <div className="card card-pad">
        {isLoading || booksQ.isLoading ? (
          <div>Зареждане…</div>
        ) : booksQ.isError ? (
          <div className="alert danger">Грешка при зареждане.</div>
        ) : items.length === 0 ? (
          <div className="muted">Няма книги.</div>
        ) : (
          <div className="catalog-grid">
            {isAdmin && (
              <article className="book-card book-card-add">
                <div
                  className="book-card-add-inner"
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode({ type: "create" })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setMode({ type: "create" });
                  }}
                  title="Добавяне на нова книга"
                >
                  <div className="book-card-add-plus">+</div>
                  <div className="book-card-add-title">Добави книга</div>
                  <div className="book-card-add-sub">Нов запис в каталога</div>
                </div>
              </article>
            )}

            {items.map((b) => {
              const coverSrc = getCoverSrc(b);

              const rating = getRating(b);
              const ratingClamped = Math.max(0, Math.min(5, rating));
              const ratingPct = Math.max(
                0,
                Math.min(100, (ratingClamped / 5) * 100),
              );
              const starsStyle: StarStyle = { ["--pct"]: `${ratingPct}%` };

              const copiesAvail = getCopiesAvailable(b);
              const availClass = getAvailabilityBadgeByAvail(copiesAvail);

              const hasCopies = copiesAvail > 0;
              const isbn = (b as { isbn?: string }).isbn;

              return (
                <article className="book-card" key={b.id}>
                  <div className="book-cover" aria-hidden>
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={b.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div className="book-cover-placeholder">📚</div>
                    )}
                  </div>

                  <div className="book-body">
                    <div className="book-head">
                      <h3 className="book-title" title={b.title}>
                        {b.title}
                      </h3>
                      <span
                        className={`badge ${availClass}`}
                        title="Налични екземпляри"
                      >
                        {copiesAvail}/{b.copiesTotal} налични
                      </span>
                    </div>

                    <div className="book-meta">
                      <div className="book-meta-row">
                        <span className="book-meta-label">Автор</span>
                        <span className="book-meta-value">{b.author ?? "—"}</span>
                      </div>

                      <div className="book-meta-row">
                        <span className="book-meta-label">Жанр</span>
                        <span className="book-meta-value">{b.genre ?? "—"}</span>
                      </div>

                      <div className="book-meta-row">
                        <span className="book-meta-label">Рейтинг</span>
                        <span
                          className="book-meta-value"
                          style={{
                            display: "inline-flex",
                            gap: 8,
                            alignItems: "center",
                            whiteSpace: "nowrap",
                          }}
                          title={`Средна оценка ${ratingClamped.toFixed(1)} / 5`}
                        >
                          <span className="rating-value">
                            {ratingClamped.toFixed(1)}
                          </span>
                          <span className="stars" style={starsStyle} aria-hidden>
                            <span className="stars-back">★★★★★</span>
                            <span className="stars-front">★★★★★</span>
                          </span>
                        </span>
                      </div>

                      {isbn ? (
                        <div className="book-meta-row">
                          <span className="book-meta-label">ISBN</span>
                          <span className="book-meta-value">{isbn}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="book-actions">
                      <button
                        className="btn"
                        onClick={() => setMode({ type: "reviews", book: b })}
                      >
                        Мнения
                      </button>

                      {!isAdmin && (
                        <button
                          className="btn btn-primary"
                          disabled={!hasCopies}
                          onClick={() => {
                            if (!hasCopies) return;
                            if (!isAuthenticated) {
                              showSubscriptionRequiredModal();
                              return;
                            }

                            const block = getBorrowBlock();
                            if (block) {
                              showInfo(block);
                              return;
                            }

                            borrowBook(b);
                          }}
                          title={!hasCopies ? "Няма налични екземпляри" : undefined}
                        >
                          Заеми
                        </button>
                      )}

                      {isAdmin && (
                        <>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setMode({ type: "edit", book: b })}
                          >
                            Редактирай
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => onDelete(b)}
                          >
                            Изтрий
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="row center" style={{ gap: ".5rem" }}>
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ‹
        </button>
        <span>
          Страница {page} / {pages}
        </span>
        <button
          className="btn"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          ›
        </button>
      </div>

      {mode.type === "reviews" && (
        <BookReviewsModal
          bookId={mode.book.id}
          bookTitle={mode.book.title}
          onClose={() => setMode({ type: "none" })}
        />
      )}

      <Modal
        open={mode.type === "create"}
        width={760}
        title="Добавяне на книга"
        onClose={() => setMode({ type: "none" })}
      >
        {mode.type === "create" && (
          <BookForm
            onSubmit={onCreateSubmit}
            onCancel={() => setMode({ type: "none" })}
          />
        )}
      </Modal>

      <Modal
        open={mode.type === "edit"}
        width={760}
        title={mode.type === "edit" ? `Редакция: ${mode.book.title}` : undefined}
        onClose={() => setMode({ type: "none" })}
      >
        {mode.type === "edit" && (
          <BookForm
            initial={mode.book}
            onSubmit={onEditSubmit}
            onCancel={() => setMode({ type: "none" })}
          />
        )}
      </Modal>

      <Modal
        open={!!infoModal}
        title={infoModal?.title ?? "Информация"}
        onClose={() => setInfoModal(null)}
      >
        <div className="stack" style={{ gap: 12 }}>
          <p style={{ margin: 0 }}>{infoModal?.message ?? ""}</p>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            {infoModal?.secondaryText ? (
              <button
                className="btn btn-ghost"
                onClick={() =>
                  infoModal.onSecondary ? infoModal.onSecondary() : setInfoModal(null)
                }
              >
                {infoModal.secondaryText}
              </button>
            ) : null}

            <button
              className="btn btn-primary"
              onClick={() =>
                infoModal?.onPrimary ? infoModal.onPrimary() : setInfoModal(null)
              }
            >
              {infoModal?.primaryText ?? "OK"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
