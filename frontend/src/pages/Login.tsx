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
    <form onSubmit={handleSubmit} className="stack">
      <div className="field">
        <label>Имейл</label>
        <input name="email" type="email" placeholder="you@example.com" required />
      </div>

      <div className="field">
        <label>Парола</label>
        <input name="password" type="password" placeholder="••••••••" required />
      </div>

      {error && <div className="alert danger">{error}</div>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Влизане..." : "Влез"}
      </button>
    </form>
  );
}
