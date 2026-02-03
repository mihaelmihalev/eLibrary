type Props = {
  value: number;
  onChange?: (v: number) => void;
};

export default function StarRating({ value, onChange }: Props) {
  return (
    <div className="row" style={{ gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="btn btn-ghost"
          onClick={() => onChange?.(n)}
          style={{
            padding: ".35rem .55rem",
            lineHeight: 1,
            fontSize: "1.2rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "transparent",
          }}
          aria-label={`Оценка ${n}`}
        >
          <span
            style={{
              color: n <= value ? "var(--warn)" : "color-mix(in oklab, var(--muted) 55%, transparent 45%)",
            }}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
