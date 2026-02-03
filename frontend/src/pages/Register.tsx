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
      const err = ex as AxiosError<
        { description?: string } | { description?: string }[]
      >;
      const data = err.response?.data;
      const msg = Array.isArray(data)
        ? data.map((x) => x.description ?? "").join("\n")
        : data?.description ?? "Регистрацията се провали.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label>Потребителско име</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="напр. ivan.petrov"
          required
        />
      </div>

      <div className="field">
        <label>Имейл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="field">
        <label>Телефон (по желание)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+359 888 123 456"
        />
      </div>

      <div className="field">
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

      <div className="field">
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

      {err && (
        <div className="alert danger" style={{ whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      <button disabled={busy} className="btn btn-primary">
        {busy ? "Изпращане…" : "Регистрирай се"}
      </button>
    </form>
  );
}
