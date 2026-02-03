import { useState } from "react";
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook, uploadBookCover } from "../api/books";
import type { Book } from "../api/books";
import BookForm from "../components/BookForm";
import type { BookFormData } from "../components/BookForm";
import BookReviewsModal from "../components/BookReviewsModal";
import { useAuth } from "../auth/useAuth";

type Mode =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; book: Book }
  | { type: "reviews"; book: Book };

export default function Catalog() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes("Admin");

  const [mode, setMode] = useState<Mode>({ type: "none" });

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const booksQ = useBooks({ page, pageSize });
  const createM = useCreateBook();
  const updateM = useUpdateBook();
  const deleteM = useDeleteBook();

  const items = booksQ.data?.items ?? [];
  const total = booksQ.data?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function toBookPayload(data: BookFormData) {
    return {
      title: data.title,
      author: data.author,
      genre: data.genre,
      isbn: data.isbn,
      copiesTotal: data.copiesTotal,
      copiesAvailable: data.copiesAvailable,
    };
  }

  async function onSubmitForm(data: BookFormData, coverFile: File | null) {
  try {
    if (mode.type === "create") {
      const created = await createM.mutateAsync(toBookPayload(data));

      if (coverFile) {
        await uploadBookCover(created.id, coverFile);
      }

      await booksQ.refetch();
      setMode({ type: "none" });
    }

    if (mode.type === "edit") {
      await updateM.mutateAsync({
        id: mode.book.id,
        ...toBookPayload(data),
      });

      if (coverFile) {
        await uploadBookCover(mode.book.id, coverFile);
      }

      await booksQ.refetch(); 
      setMode({ type: "none" })
    }
  } catch (e) {
    alert("Грешка при запис.");
    console.error(e);
  }
}

  async function onDelete(book: Book) {
    if (!confirm(`Да се изтрие ли "${book.title}"?`)) return;
    try {
      await deleteM.mutateAsync(book.id);
    } catch {
      alert("Грешка при изтриване.");
    }
  }

  return (
    <div className="page stack">
      <div className="row spread">
        <h1>Каталог</h1>

        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setMode({ type: "create" })}>
            + Добави книга
          </button>
        )}
      </div>

      <div className="card card-pad">
        {booksQ.isLoading ? (
          <div>Зареждане…</div>
        ) : booksQ.isError ? (
          <div className="alert danger">Грешка при зареждане.</div>
        ) : items.length === 0 ? (
          <div className="muted">Няма книги.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Корица</th>
                <th>Заглавие</th>
                <th>Автор</th>
                <th>Жанр</th>
                <th>Налични</th>
                <th>⭐</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td style={{ width: 70 }}>
                    {b.coverUrl ? (
                      <img
                        src={`http://localhost:5000${b.coverUrl}`}
                        alt={b.title}
                        style={{
                          width: 45,
                          height: 65,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td>{b.title}</td>
                  <td>{b.author ?? "—"}</td>
                  <td>{b.genre ?? "—"}</td>
                  <td>
                    {b.copiesAvailable}/{b.copiesTotal}
                  </td>
                  <td>{b.avgRating?.toFixed(1) ?? "0.0"}</td>

                  <td>
                    <div className="row" style={{ gap: ".5rem" }}>
                      <button className="btn" onClick={() => setMode({ type: "reviews", book: b })}>
                        Мнения
                      </button>

                      {isAdmin && (
                        <>
                          <button className="btn" onClick={() => setMode({ type: "edit", book: b })}>
                            Редактирай
                          </button>

                          <button className="btn btn-danger" onClick={() => onDelete(b)}>
                            Изтрий
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row center" style={{ gap: ".5rem" }}>
        <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ‹
        </button>
        <span>
          Страница {page} / {pages}
        </span>
        <button className="btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          ›
        </button>
      </div>

      {mode.type === "create" && (
        <BookForm
          onSubmit={onSubmitForm}
          onCancel={() => setMode({ type: "none" })}
        />
      )}

      {mode.type === "edit" && (
        <BookForm
          initial={mode.book}
          onSubmit={onSubmitForm}
          onCancel={() => setMode({ type: "none" })}
        />
      )}

      {mode.type === "reviews" && (
        <BookReviewsModal
          bookId={mode.book.id}
          bookTitle={mode.book.title}
          onClose={() => setMode({ type: "none" })}
        />
      )}
    </div>
  );
}
