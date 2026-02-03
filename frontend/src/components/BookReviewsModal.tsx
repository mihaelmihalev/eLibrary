import React from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

import { useAuth } from "../auth/useAuth";
import { useReviews, useUpsertReview, useDeleteReview } from "../api/reviews";
import type { Review } from "../api/reviews";
import StarRating from "./StarRating";

function parseApiDate(s: string) {
  if (!s) return new Date(NaN);
  const hasTz =
    s.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(s) ||
    /[+-]\d{4}$/.test(s);
  return new Date(hasTz ? s : `${s}Z`);
}

function formatBgDateTime(s: string) {
  const d = parseApiDate(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("bg-BG");
}

function getAxiosErrorMessage(e: unknown) {
  if (!isAxiosError(e)) return "Грешка при запис.";
  const data = e.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data) return JSON.stringify(data);
  return e.message || "Грешка при запис.";
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
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    setEditing(false);
    setRating(5);
    setComment("");
  }, [myReview]);

  function startEdit(r: Review) {
    setRating(r.rating);
    setComment(r.comment);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setRating(5);
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

    const text = comment.trim();
    if (!text) {
      alert("Моля, напишете кратък коментар.");
      return;
    }

    if (myReview && !editing) {
      alert("Вече имаш мнение за тази книга. Натисни „Редактирай“.");
      return;
    }

    try {
      await upsert.mutateAsync({ rating, comment: text });
      cancelEdit();
    } catch (e: unknown) {
      console.error("Upsert review failed:", e);
      alert(getAxiosErrorMessage(e));
    }
  }

  async function onDelete(reviewId: number) {
    if (!confirm("Да се изтрие ли това мнение?")) return;

    try {
      await del.mutateAsync(reviewId);
      if (myReview?.id === reviewId) cancelEdit();
    } catch {
      alert("Грешка при изтриване.");
    }
  }

  const showAddForm = !!user && !isAdmin && !myReview;
  const showEditForm = !!user && !isAdmin && !!myReview && editing;

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
          <span className="badge">
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
                <div key={r.id} className="card card-pad stack" style={{ gap: 6 }}>
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
                          onClick={() => onDelete(r.id)}
                          disabled={del.isPending}
                        >
                          Изтрий
                        </button>
                      )}
                    </div>
                  </div>

                  <div>{r.comment}</div>

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
              placeholder="Кратък коментар (до 500 символа)…"
              rows={3}
            />

            <button className="btn btn-primary" onClick={submit} disabled={upsert.isPending}>
              Запази
            </button>
          </div>
        )}

        {showEditForm && (
          <div className="card card-pad stack">
            <div style={{ fontWeight: 800 }}>Редактирай твоето мнение</div>

            <StarRating value={rating} onChange={setRating} />

            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />

            <div className="row" style={{ gap: ".5rem" }}>
              <button className="btn btn-primary" onClick={submit} disabled={upsert.isPending}>
                Запази
              </button>
              <button className="btn btn-ghost" onClick={cancelEdit} disabled={upsert.isPending}>
                Откажи
              </button>
            </div>
          </div>
        )}

        {!user && <div className="small muted">Само за логнати потребители.</div>}

        {user && isAdmin && (
          <div className="small muted">
            Администраторът може да изтрива неподходящи мнения, но не може да добавя или редактира мнение.
          </div>
        )}
      </div>
    </div>
  );
}
