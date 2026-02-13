import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/useAuth";
import type { AxiosError } from "axios";

type Props = {
  onRegistered?: () => void;
};

type FieldErrors = Record<string, string[]>;

type ApiValidation = {
  errors?: Record<string, string[]>;
  message?: string;
};

type Touched = {
  userName: boolean;
  email: boolean;
  phoneNumber: boolean;
  password: boolean;
  password2: boolean;
};

function normalize(k: string) {
  return k.toLowerCase();
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function mapIdentityPasswordErrors(errors: string[]): string[] {
  const mapped: string[] = [];

  for (const e of errors) {
    if (e.includes("PasswordRequiresNonAlphanumeric")) {
      mapped.push(
        "Паролата трябва да съдържа поне един специален символ (напр. ! @ # $).",
      );
      continue;
    }
    if (e.includes("PasswordRequiresLower")) {
      mapped.push("Паролата трябва да съдържа поне една малка буква (a-z).");
      continue;
    }
    if (e.includes("PasswordRequiresUpper")) {
      mapped.push("Паролата трябва да съдържа поне една главна буква (A-Z).");
      continue;
    }
    if (e.includes("PasswordTooShort")) {
      mapped.push("Паролата е твърде кратка.");
      continue;
    }
    if (e.includes("PasswordRequiresDigit")) {
      mapped.push("Паролата трябва да съдържа поне една цифра (0-9).");
      continue;
    }

    mapped.push(e);
  }

  return uniq(mapped);
}

function mapIdentityFieldErrors(errors: string[]): string[] {
  const mapped: string[] = [];

  for (const e of errors) {
    if (e === "DuplicateUserName") {
      mapped.push("Потребителското име вече е заето.");
      continue;
    }
    if (e === "InvalidUserName") {
      mapped.push("Невалидно потребителско име.");
      continue;
    }
    if (e === "DuplicateEmail") {
      mapped.push("Имейлът вече е регистриран.");
      continue;
    }
    if (e === "InvalidEmail") {
      mapped.push("Невалиден имейл адрес.");
      continue;
    }

    mapped.push(e);
  }

  return uniq(mapped);
}

function validatePasswordRules(v: string): string[] {
  const errs: string[] = [];

  if (v.length < 6) errs.push("Паролата трябва да е поне 6 символа.");

  if (!/[a-zа-я]/.test(v))
    errs.push("Паролата трябва да съдържа поне една малка буква (a-z или а-я).");

  if (!/[A-ZА-Я]/.test(v))
    errs.push("Паролата трябва да съдържа поне една главна буква (A-Z или А-Я).");

  if (!/[^a-zA-Zа-яА-Я0-9]/.test(v))
    errs.push(
      "Паролата трябва да съдържа поне един специален символ (напр. ! @ # $).",
    );

  return errs;
}

export default function Register({ onRegistered }: Props) {
  const { register } = useAuth();

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [touched, setTouched] = useState<Touched>({
    userName: false,
    email: false,
    phoneNumber: false,
    password: false,
    password2: false,
  });
  const [submitted, setSubmitted] = useState(false);

  function touch(field: keyof Touched) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function shouldShow(field: keyof Touched) {
    return submitted || touched[field];
  }

  function setFieldErrorsMerged(field: string, messages: string[]) {
    setFieldErrors((prev) => ({
      ...prev,
      [normalize(field)]: uniq([...(prev[normalize(field)] ?? []), ...messages]),
    }));
  }

  function setFieldError(field: string, message: string) {
    setFieldErrors((prev) => ({
      ...prev,
      [normalize(field)]: [message],
    }));
  }

  function clearErrors() {
    setFieldErrors({});
    setFormErrors([]);
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[normalize(field)];
      return copy;
    });
  }

  function hasError(field: string) {
    return !!fieldErrors[normalize(field)]?.length;
  }

  function renderErrors(field: string, gate?: boolean) {
    if (!gate) return null;

    const errs = fieldErrors[normalize(field)];
    if (!errs?.length) return null;

    return (
      <ul className="help error">
        {errs.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    );
  }

  function isValidUserName(v: string) {
    return v.trim().length >= 4;
  }

  function isValidEmail(v: string) {
    return /^\S+@\S+\.\S+$/.test(v.trim());
  }

  function isValidPhoneRequired(v: string) {
    const t = v.trim();
    if (!t) return false;

    const cleaned = t.replace(/[\s\-().]/g, "");
    if (!/^\+?\d+$/.test(cleaned)) return false;

    const isBgLike = cleaned.startsWith("+359") || cleaned.startsWith("0");
    if (!isBgLike) return false;

    const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
    return digits.length >= 9 && digits.length <= 13;
  }

  function validateClient(): boolean {
    let valid = true;

    if (!isValidUserName(userName)) {
      setFieldError("UserName", "Потребителското име трябва да е поне 4 символа.");
      valid = false;
    }

    if (!isValidEmail(email)) {
      setFieldError("Email", "Невалиден имейл формат.");
      valid = false;
    }

    if (!isValidPhoneRequired(phone)) {
      setFieldError(
        "PhoneNumber",
        "Невалиден телефон. Пример: +359888123456 или 0888123456",
      );
      valid = false;
    }

    const pwdErrs = validatePasswordRules(password);
    if (pwdErrs.length > 0) {
      setFieldErrorsMerged("Password", pwdErrs);
      valid = false;
    }

    if (password !== password2) {
      setFieldError("Password2", "Паролите не съвпадат.");
      valid = false;
    }

    return valid;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setSubmitted(true);
    setTouched({
      userName: true,
      email: true,
      phoneNumber: true,
      password: true,
      password2: true,
    });

    clearErrors();

    if (!validateClient()) return;

    try {
      setBusy(true);

      await register({
        userName: userName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phone.trim(),
      });

      onRegistered?.();
    } catch (ex: unknown) {
      const ax = ex as AxiosError<ApiValidation>;
      const data = ax.response?.data;

      if (data?.errors) {
        const normalized: FieldErrors = {};

        for (const [k, v] of Object.entries(data.errors)) {
          const key = normalize(k);

          if (key === "password") {
            normalized[key] = mapIdentityPasswordErrors(v);
          } else {
            normalized[key] = mapIdentityFieldErrors(v);
          }
        }

        setFieldErrors(normalized);
      } else if (data?.message) {
        setFormErrors([data.message]);
      } else {
        setFormErrors(["Неуспешна регистрация. Проверете полетата и опитайте пак."]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate autoComplete="off">
      <div className="field">
        <label htmlFor="reg-username">Потребителско име</label>
        <input
          id="reg-username"
          name="userName"
          className={
            shouldShow("userName") && hasError("UserName") ? "input error" : "input"
          }
          value={userName}
          onChange={(e) => {
            const v = e.target.value;
            setUserName(v);
            touch("userName");

            if (!v.trim()) {
              clearFieldError("UserName");
              return;
            }

            if (isValidUserName(v)) {
              clearFieldError("UserName");
            } else {
              setFieldError("UserName", "Потребителското име трябва да е поне 4 символа.");
            }
          }}
          onBlur={() => touch("userName")}
        />
        {renderErrors("UserName", shouldShow("userName"))}
      </div>

      <div className="field">
        <label htmlFor="reg-email">Имейл</label>
        <input
          id="reg-email"
          name="email"
          type="email"
          className={shouldShow("email") && hasError("Email") ? "input error" : "input"}
          value={email}
          onChange={(e) => {
            const v = e.target.value;
            setEmail(v);
            touch("email");

            if (!v.trim()) {
              clearFieldError("Email");
              return;
            }

            if (isValidEmail(v)) {
              clearFieldError("Email");
            } else {
              setFieldError("Email", "Невалиден имейл формат.");
            }
          }}
          onBlur={() => touch("email")}
        />
        {renderErrors("Email", shouldShow("email"))}
      </div>

      <div className="field">
        <label htmlFor="reg-phone">Телефон</label>
        <input
          id="reg-phone"
          name="phoneNumber"
          type="tel"
          className={
            shouldShow("phoneNumber") && hasError("PhoneNumber")
              ? "input error"
              : "input"
          }
          value={phone}
          onChange={(e) => {
            const v = e.target.value;
            setPhone(v);
            touch("phoneNumber");

            if (!v.trim()) {
              clearFieldError("PhoneNumber");
              return;
            }

            if (isValidPhoneRequired(v)) {
              clearFieldError("PhoneNumber");
            } else {
              setFieldError(
                "PhoneNumber",
                "Невалиден телефон. Пример: +359888123456 или 0888123456",
              );
            }
          }}
          onBlur={() => touch("phoneNumber")}
        />
        {renderErrors("PhoneNumber", shouldShow("phoneNumber"))}
      </div>

      <div className="field">
        <label htmlFor="reg-password">Парола</label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={
            shouldShow("password") && hasError("Password") ? "input error" : "input"
          }
          value={password}
          onChange={(e) => {
            const v = e.target.value;
            setPassword(v);
            touch("password");

            if (!v) {
              clearFieldError("Password");
            } else {
              const errs = validatePasswordRules(v);
              if (errs.length === 0) {
                clearFieldError("Password");
              } else {
                setFieldErrors((prev) => ({
                  ...prev,
                  password: errs,
                }));
              }
            }

            if (password2) {
              touch("password2");
              if (v === password2) {
                clearFieldError("Password2");
              } else {
                setFieldError("Password2", "Паролите не съвпадат.");
              }
            }
          }}
          onBlur={() => touch("password")}
        />
        {renderErrors("Password", shouldShow("password"))}
      </div>

      <div className="field">
        <label htmlFor="reg-password2">Повтори паролата</label>
        <input
          id="reg-password2"
          name="password2"
          type="password"
          className={
            shouldShow("password2") && hasError("Password2") ? "input error" : "input"
          }
          value={password2}
          onChange={(e) => {
            const v = e.target.value;
            setPassword2(v);
            touch("password2");

            if (!v) {
              clearFieldError("Password2");
              return;
            }
            if (password && v === password) {
              clearFieldError("Password2");
            } else if (password) {
              setFieldError("Password2", "Паролите не съвпадат.");
            }
          }}
          onBlur={() => touch("password2")}
        />
        {renderErrors("Password2", shouldShow("password2"))}
      </div>

      {formErrors.length > 0 && (
        <div className="alert danger">
          {formErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <button disabled={busy} className="btn btn-primary">
        {busy ? "Изпращане..." : "Регистрирай се"}
      </button>
    </form>
  );
}
