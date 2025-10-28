import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import type { AxiosError } from "axios";

type Props = {
  onRegistered?: () => void;
};

export default function Register({ onRegistered }: Props) {
  const { register } = useAuth();

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");

    if (password !== password2) {
      setErr("Паролите не съвпадат.");
      return;
    }

    try {
      setBusy(true);
      await register({ userName, email, password, phoneNumber: phone || null });
      onRegistered?.();     
    } catch (ex: unknown) {
      const err = ex as AxiosError<{ description?: string } | { description?: string }[]>;
      const data = err.response?.data;
      const msg = Array.isArray(data)
        ? data.map(x => x.description ?? "").join("\n")
        : data?.description ?? "Регистрацията се провали.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={card}>
      <h3>Регистрация</h3>

      <div style={row}>
        <label>Потребителско име</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="напр. ivan.petrov"
          required
        />
      </div>

      <div style={row}>
        <label>Имейл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div style={row}>
        <label>Телефон (по желание)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+359 888 123 456"
        />
      </div>

      <div style={row}>
        <label>Парола</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="минимум 6 символа"
          minLength={6}
          required
        />
      </div>

      <div style={row}>
        <label>Повтори паролата</label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="повтори паролата"
          minLength={6}
          required
        />
      </div>

      {err && <div style={error}>{err}</div>}

      <button disabled={busy} style={btn}>
        {busy ? "Изпращане…" : "Регистрирай се"}
      </button>
    </form>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  width: 520,
  display: "grid",
  gap: 10,
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};
const row: React.CSSProperties = { display: "grid", gap: 6 };
const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #d0d0d0",
  background: "#efefef",
  cursor: "pointer",
};
const error: React.CSSProperties = {
  border: "1px solid #f66",
  background: "#ffecec",
  color: "#900",
  padding: 8,
  borderRadius: 8,
};
