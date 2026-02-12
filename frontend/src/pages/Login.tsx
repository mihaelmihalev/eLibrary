import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";
import axios, { type AxiosError } from "axios";

function isValidEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}

type LoginErrorResponse = {
  field?: "email" | "password";
  message?: string;
};

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function setFieldError(field: string, message: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setFieldError("email", "Имейлът е задължителен.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError("email", "Невалиден имейл формат.");
      valid = false;
    }

    if (!password) {
      setFieldError("password", "Паролата е задължителна.");
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    if (!validate()) return;

    try {
      setPending(true);
      await login(email.trim(), password);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = (err as AxiosError<LoginErrorResponse>).response?.data;

        if (data?.field && data?.message) {
          setFieldError(data.field, data.message);
        } else {
          setFieldError("password", "Грешка при вход.");
        }
      } else {
        setFieldError("password", "Грешка при вход.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack" noValidate>
      <div className="field">
        <label>Имейл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            const v = e.target.value;
            setEmail(v);

            if (v && isValidEmail(v)) clearFieldError("email");
          }}
          className={fieldErrors.email ? "input error" : "input"}
        />
        {fieldErrors.email && (
          <div className="help error">{fieldErrors.email}</div>
        )}
      </div>

      <div className="field">
        <label>Парола</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            const v = e.target.value;
            setPassword(v);

            if (v) clearFieldError("password");
          }}
          className={fieldErrors.password ? "input error" : "input"}
        />
        {fieldErrors.password && (
          <div className="help error">{fieldErrors.password}</div>
        )}
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Влизане..." : "Влез"}
      </button>
    </form>
  );
}
