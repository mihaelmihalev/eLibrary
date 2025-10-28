import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string)?.trim();
    const password = (form.get("password") as string) ?? "";

    if (!email || !password) {
      setError("Моля, попълнете имейл и парола.");
      return;
    }

    try {
      setPending(true);
      await login(email, password);
    } catch {
      setError("Неуспешен вход. Опитайте отново.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formWrap}>
      <div style={field}>
        <label>Имейл</label>
        <input name="email" type="email" placeholder="you@example.com" required />
      </div>

      <div style={field}>
        <label>Парола</label>
        <input name="password" type="password" placeholder="••••••••" required />
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <button type="submit" disabled={pending} style={btnPrimary}>
        {pending ? "Влизане..." : "Влез"}
      </button>
    </form>
  );
}

const formWrap: React.CSSProperties = { display: "grid", gap: 12 };
const field: React.CSSProperties = { display: "grid", gap: 6 };
const errorBox: React.CSSProperties = { border: "1px solid #f66", padding: 8, borderRadius: 8, background: "#fff6f6" };
const btnPrimary: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" };
