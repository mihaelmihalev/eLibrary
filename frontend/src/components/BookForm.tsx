import { useEffect, useMemo, useState } from "react";
import type { Book } from "../api/books";

type Props = {
  initial?: Partial<Book>;
  onSubmit: (data: {
    id?: number;
    title: string;
    author?: string;
    genre?: string;
    copiesTotal: number;
    copiesAvailable: number;
  }) => void;
  onCancel: () => void;
};

export default function BookForm({ initial, onSubmit, onCancel }: Props) {
  const isEdit = typeof initial?.id === "number";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [copiesTotal, setCopiesTotal] = useState<number>(initial?.copiesTotal ?? 1);
  const [copiesAvailable, setCopiesAvailable] = useState<number>(
    isEdit ? (initial?.copiesAvailable ?? 0) : (initial?.copiesAvailable ?? initial?.copiesTotal ?? 1)
  );

  const error = useMemo(() => {
    if (copiesTotal < 0) return "Общият брой не може да е отрицателен.";
    if (copiesAvailable < 0) return "Наличните не може да са отрицателни.";
    if (copiesAvailable > copiesTotal) return "Наличните не може да надвишават общия брой.";
    return "";
  }, [copiesTotal, copiesAvailable]);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setAuthor(initial?.author ?? "");
    setGenre(initial?.genre ?? "");
    setCopiesTotal(initial?.copiesTotal ?? 1);
    setCopiesAvailable(
      typeof initial?.id === "number"
        ? (initial?.copiesAvailable ?? 0)
        : (initial?.copiesAvailable ?? initial?.copiesTotal ?? 1)
    );
  }, [initial]);

  useEffect(() => {
    setCopiesAvailable(prev => Math.max(0, Math.min(prev, copiesTotal)));
  }, [copiesTotal]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        onSubmit({
          id: initial?.id,
          title: title.trim(),
          author: author.trim() || undefined,
          genre: genre.trim() || undefined,
          copiesTotal: Math.max(0, Number(copiesTotal)),
          copiesAvailable: Math.max(0, Math.min(Number(copiesAvailable), Number(copiesTotal))),
        });
      }}
      style={{ display: "grid", gap: 8, maxWidth: 420 }}
    >
      <label>Заглавие
        <input value={title} onChange={e=>setTitle(e.target.value)} required />
      </label>

      <label>Автор
        <input value={author} onChange={e=>setAuthor(e.target.value)} />
      </label>

      <label>Жанр
        <input value={genre} onChange={e=>setGenre(e.target.value)} />
      </label>

      <label>Бройки общо
        <input type="number" min={0} value={copiesTotal} onChange={e=>setCopiesTotal(+e.target.value)} required />
      </label>

      <label>Налични
        <input
          type="number"
          min={0}
          max={copiesTotal}
          value={copiesAvailable}
          onChange={e=>setCopiesAvailable(+e.target.value)}
          required
        />
      </label>

      {error && <div style={{ color: "#b00020" }}>⚠ {error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="submit" disabled={!!error}>Запази</button>
        <button type="button" onClick={onCancel}>Откажи</button>
      </div>
    </form>
  );
}
