import { useEffect, useMemo, useState } from "react";
import type { Book } from "../api/books";

export type BookFormData = {
  id?: number;
  title: string;
  author?: string;
  genre?: string;
  isbn?: string | null;
  copiesTotal: number;
  copiesAvailable: number;
};

type Props = {
  initial?: Partial<Book>;
  onSubmit: (data: BookFormData, coverFile: File | null) => void | Promise<void>;
  onCancel: () => void;
};

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:5000";

function coverSrc(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
}

export default function BookForm({ initial, onSubmit, onCancel }: Props) {
  const isEdit = typeof initial?.id === "number";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [isbn, setIsbn] = useState(initial?.isbn ?? "");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  const [copiesTotal, setCopiesTotal] = useState<number>(initial?.copiesTotal ?? 1);
  const [copiesAvailable, setCopiesAvailable] = useState<number>(
    isEdit ? initial?.copiesAvailable ?? 0 : initial?.copiesAvailable ?? initial?.copiesTotal ?? 1
  );

  const error = useMemo(() => {
    if (copiesTotal < 0) return "Общият брой не може да е отрицателен.";
    if (copiesAvailable < 0) return "Наличните не може да са отрицателни.";
    if (copiesAvailable > copiesTotal) return "Наличните не може да надвишават общия брой.";
    return "";
  }, [copiesTotal, copiesAvailable]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (error) return;

        await onSubmit(
          {
            id: initial?.id,
            title: title.trim(),
            author: author.trim() || undefined,
            genre: genre.trim() || undefined,
            isbn: isbn.trim() || null,
            copiesTotal,
            copiesAvailable,
          },
          coverFile
        );
      }}
      className="stack"
      style={{ maxWidth: 560 }}
    >
      <div className="field">
        <label>Заглавие</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="field">
        <label>Автор</label>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>

      <div className="field">
        <label>Жанр</label>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} />
      </div>

      <div className="field" style={{ maxWidth: 260 }}>
        <label>ISBN</label>
        <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-..." />
      </div>

      <div className="card card-pad">
        <div className="row row-wrap" style={{ gap: "1rem", alignItems: "center" }}>
          {initial?.coverUrl && !coverPreview && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <img
                src={coverSrc(initial.coverUrl)}
                alt="Текуща корица"
                style={{
                  width: 80,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,.1)",
                }}
              />
              <div className="small muted">
                Текуща корица.
                <br />
                За да я смените, изберете нов файл.
              </div>
            </div>
          )}
          {coverPreview && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <img
                src={coverPreview}
                alt="Нова корица"
                style={{
                  width: 80,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,.1)",
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview("");
                }}
              >
                Махни новия файл
              </button>
            </div>
          )}

          <div className="field" style={{ minWidth: 260 }}>
            <label>Качи нова корица (jpg/png/webp)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            <div className="small muted">
              Ако не избереш файл, текущата корица ще остане.
            </div>
          </div>
        </div>
      </div>

      <div className="row row-wrap">
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Бройки общо</label>
          <input
            type="number"
            min={0}
            value={copiesTotal}
            onChange={(e) => setCopiesTotal(+e.target.value)}
            required
          />
        </div>

        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Налични</label>
          <input
            type="number"
            min={0}
            max={copiesTotal}
            value={copiesAvailable}
            onChange={(e) => setCopiesAvailable(+e.target.value)}
            required
          />
        </div>
      </div>

      {error && <div className="alert danger">⚠ {error}</div>}

      <div className="row row-wrap" style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-primary" disabled={!!error}>
          Запази
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Откажи
        </button>
      </div>
    </form>
  );
}
