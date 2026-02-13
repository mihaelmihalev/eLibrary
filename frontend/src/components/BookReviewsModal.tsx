import React from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

import { useAuth } from "@/auth/useAuth";
import { useReviews, useUpsertReview, useDeleteReview } from "@/api/reviews";
import type { Review } from "@/api/reviews";
import StarRating from "./StarRating";
import Modal from "./Modal";

function formatBgDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("bg-BG");
}

function getAxiosErrorMessage(e: unknown) {
  if (!isAxiosError(e)) return "Грешка при запис.";
  const data = e.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data) return JSON.stringify(data);
  return e.message || "Грешка при запис.";
}

function getAvgRatingClass(avg: number) {
  if (avg < 2.5) return "danger";
  if (avg < 4) return "warn";
  return "ok";
}

export default function BookReviewsModal({
  bookId,
  bookTitle,
  onClose,
}: {
  bookId: number;
  bookTitle: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const q = useReviews(bookId);
  const upsert = useUpsertReview(bookId);
  const del = useDeleteReview(bookId);

  const reviews = q.data ?? [];
  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  const isAdmin = !!user?.roles?.includes("Admin");
  const myReview: Review | undefined = user
    ? reviews.find((r) => r.userId === user.id)
    : undefined;

  const [editing, setEditing] = React.useState(false);
  const [rating, setRating] = React.useState<number>(0);
  const [comment, setComment] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Review | null>(null);

  React.useEffect(() => {
    if (editing) return;
    setRating(myReview ? myReview.rating : 0);
    setComment("");
  }, [myReview, editing]);

  function startEdit(r: Review) {
    setRating(r.rating);
    setComment(r.comment ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setRating(myReview ? myReview.rating : 0);
    setComment("");
  }

  async function submit() {
    if (!user) {
      alert("За да добавите мнение, трябва да влезете в системата.");
      navigate("/login");
      return;
    }

    if (isAdmin) {
      alert("Администраторът не може да добавя или редактира мнения.");
      return;
    }

    if (!rating || rating < 1) {
      alert("Моля, изберете оценка (звезди).");
      return;
    }

    const text = comment.trim();

    if (myReview && !editing) {
      alert("Вече имаш мнение за тази книга. Натисни „Редактирай“.");
      return;
    }

    try {
      await upsert.mutateAsync({ rating, comment: text });

      try {
        await q.refetch();
      } catch (e) {
        console.warn("Refetch after upsert failed (ignored):", e);
      }

      cancelEdit();
    } catch (e: unknown) {
      console.error("Upsert review failed:", e);
      alert(getAxiosErrorMessage(e));
    }
  }

  function askDelete(r: Review) {
    setDeleteTarget(r);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const deletingMine = myReview?.id === deleteTarget.id;

    try {
      await del.mutateAsync(deleteTarget.id);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Грешка при изтриване.");
      return;
    } finally {
      setDeleteTarget(null);
    }

    if (deletingMine) {
      setEditing(false);
      setRating(0);
      setComment("");
    }

    try {
      await q.refetch();
    } catch (e) {
      console.warn("Refetch after delete failed (ignored):", e);
    }
  }

  const showAddForm = !!user && !isAdmin && !myReview;
  const showEditForm = !!user && !isAdmin && !!myReview && editing;
  const avgClass = reviews.length === 0 ? "" : getAvgRatingClass(avg);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal stack" style={{ width: "min(760px, 100%)" }}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>
            Оценки и мнения – <span className="muted">{bookTitle}</span>
          </h2>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="row row-wrap">
          <span className={`badge ${avgClass}`}>
            Средна оценка: <b>{avg.toFixed(1)}</b> / 5
          </span>
          <span className="badge">{reviews.length} мнения</span>
        </div>

        <div className="hr" />

        <div className="stack">
          {q.isLoading ? (
            <div className="card card-pad">Зареждане…</div>
          ) : q.isError ? (
            <div className="alert danger">Грешка при зареждане.</div>
          ) : reviews.length === 0 ? (
            <div className="card card-pad muted">Все още няма мнения.</div>
          ) : (
            reviews.map((r) => {
              const isOwner = !!user && user.id === r.userId;
              const canDelete = !!user && (isAdmin || isOwner);

              return (
                <div
                  key={r.id}
                  className="card card-pad stack"
                  style={{ gap: 6 }}
                >
                  <div className="row spread">
                    <div style={{ fontWeight: 800 }}>{r.userName}</div>

                    <div className="row" style={{ gap: ".5rem" }}>
                      <span className="badge warn">⭐ {r.rating}</span>

                      {isOwner && !isAdmin && (
                        <button
                          className="btn"
                          onClick={() => startEdit(r)}
                          disabled={upsert.isPending}
                        >
                          Редактирай
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="btn btn-danger"
                          onClick={() => askDelete(r)}
                          disabled={del.isPending}
                        >
                          Изтрий
                        </button>
                      )}
                    </div>
                  </div>

                  {r.comment?.trim() ? <div>{r.comment}</div> : null}

                  <div className="small muted">
                    {formatBgDateTime(r.updatedAt ?? r.createdAt)}
                    {r.updatedAt ? " (редактирано)" : ""}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showAddForm && (
          <div className="card card-pad stack">
            <div style={{ fontWeight: 800 }}>Добави твоето мнение</div>

            <StarRating value={rating} onChange={setRating} />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Коментар (по желание, до 500 символа)…"
              rows={3}
            />

            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={upsert.isPending}
            >
              Запази
            </button>
          </div>
        )}

        {showEditForm && (
          <div className="card card-pad stack">
            <div style={{ fontWeight: 800 }}>Редактирай твоето мнение</div>

            <StarRating value={rating} onChange={setRating} />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Коментар (по желание)…"
              rows={3}
            />

            <div className="row" style={{ gap: ".5rem" }}>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={upsert.isPending}
              >
                Запази
              </button>
              <button
                className="btn btn-ghost"
                onClick={cancelEdit}
                disabled={upsert.isPending}
              >
                Откажи
              </button>
            </div>
          </div>
        )}

        {!user && (
          <div className="small muted">Само за логнати потребители.</div>
        )}

        {user && isAdmin && (
          <div className="small muted">
            Администраторът може да изтрива неподходящи мнения, но не може да
            добавя или редактира мнение.
          </div>
        )}

        <Modal
          open={!!deleteTarget}
          title="Потвърди изтриване"
          onClose={() => setDeleteTarget(null)}
          width={520}
        >
          <div className="stack" style={{ gap: 12 }}>
            <p style={{ margin: 0 }}>Да се изтрие ли това мнение?</p>

            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 10 }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={del.isPending}
              >
                Откажи
              </button>

              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={del.isPending}
              >
                Изтрий
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
