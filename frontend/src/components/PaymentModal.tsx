import React from "react";
import Modal from "./Modal";
import { usePurchasePlan, type SubscriptionPlan } from "../api/subscriptions";

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      response?: { data?: unknown };
    };

    const data = e.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const d = data as { message?: unknown };
      if (typeof d.message === "string") return d.message;
    }

    if (typeof e.message === "string") return e.message;
  }

  return "Неуспешно плащане.";
}

type Props = {
  open: boolean;
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSuccess?: (subscriptionEnd?: string | null) => void;
};

function normalizeDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCardInput(v: string) {
  const digits = normalizeDigits(v).slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const d = normalizeDigits(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function validateCardName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) return "Моля, въведи име на картодържател.";

  if (!/^[A-Za-zА-Яа-яЁё\s]+$/.test(trimmed))
    return "Името може да съдържа само букви.";

  if (trimmed.length < 3) return "Името изглежда твърде кратко.";

  return null;
}

function validateCardNumber(cardNumber: string): string | null {
  const token = normalizeDigits(cardNumber);
  if (!token) return "Моля, въведи номер на карта.";
  if (!/^\d{16}$/.test(token))
    return "Номерът на картата трябва да е точно 16 цифри.";
  return null;
}

function validateExp(exp: string): string | null {
  if (!exp.trim()) return "Моля, въведи валидност.";
  if (!/^\d{2}\/\d{2}$/.test(exp)) return "Валидност: ММ/ГГ.";

  const [mmStr, yyStr] = exp.split("/");
  const month = Number(mmStr);
  const year = Number(yyStr);

  if (!(month >= 1 && month <= 12)) return "Невалиден месец (01–12).";

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return "Картата е изтекла.";
  }

  if (year > currentYear + 15) {
    return "Невалидна година на валидност.";
  }

  return null;
}

function validateCvc(cvc: string): string | null {
  const token = normalizeDigits(cvc);
  if (!token) return "Моля, въведи CVC.";
  if (!/^\d{3,4}$/.test(token)) return "CVC трябва да е 3–4 цифри.";
  return null;
}

export default function PaymentModal({
  open,
  plan,
  onClose,
  onSuccess,
}: Props) {
  const purchase = usePurchasePlan();

  const [cardName, setCardName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [exp, setExp] = React.useState("");
  const [cvc, setCvc] = React.useState("");

  const [err, setErr] = React.useState<string | null>(null);

  const [touched, setTouched] = React.useState({
    cardName: false,
    cardNumber: false,
    exp: false,
    cvc: false,
  });

  const expRef = React.useRef<HTMLInputElement | null>(null);

  const resetForm = React.useCallback(() => {
    setErr(null);
    setCardName("");
    setCardNumber("");
    setExp("");
    setCvc("");
    setTouched({ cardName: false, cardNumber: false, exp: false, cvc: false });
  }, []);

  React.useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const cardNameError = React.useMemo(
    () => validateCardName(cardName),
    [cardName],
  );
  const cardNumberError = React.useMemo(
    () => validateCardNumber(cardNumber),
    [cardNumber],
  );
  const expError = React.useMemo(() => validateExp(exp), [exp]);
  const cvcError = React.useMemo(() => validateCvc(cvc), [cvc]);

  const hasAnyError = !!(
    cardNameError ||
    cardNumberError ||
    expError ||
    cvcError
  );
  const canPay = !!plan && !purchase.isPending && !hasAnyError;

  function markTouched<K extends keyof typeof touched>(key: K) {
    setTouched((p) => ({ ...p, [key]: true }));
  }

  function onExpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExp(formatExpiry(e.target.value));
  }

  function onExpKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;

    const el = e.currentTarget;
    const pos = el.selectionStart ?? 0;
    const posEnd = el.selectionEnd ?? 0;
    if (pos !== posEnd) return;

    if (pos === 3 && exp.includes("/")) {
      e.preventDefault();
      const digits = normalizeDigits(exp);
      const next = digits.slice(0, 2);
      setExp(next);

      requestAnimationFrame(() => {
        expRef.current?.setSelectionRange(next.length, next.length);
      });
    }
  }

  async function onPay() {
    if (purchase.isPending) return;
    if (!plan) return;

    setErr(null);

    setTouched({ cardName: true, cardNumber: true, exp: true, cvc: true });

    const e1 = validateCardName(cardName);
    const e2 = validateCardNumber(cardNumber);
    const e3 = validateExp(exp);
    const e4 = validateCvc(cvc);
    if (e1 || e2 || e3 || e4) return;

    try {
      const res = await purchase.mutateAsync({
        planId: plan.id,
        cardToken: normalizeDigits(cardNumber),
      });

      if (res?.status === "Paid") {
        resetForm();
        onClose();
        onSuccess?.(res.subscriptionEnd ?? null);
      } else {
        setErr("Плащането е отказано (демо).");
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Плащане (виртуално)"
      width={560}
    >
      {!plan ? (
        <div className="muted">Няма избран план.</div>
      ) : (
        <form autoComplete="off">
          <div className="stack" style={{ gap: 12 }}>
            <div
              className="card"
              style={{
                padding: "0.9rem",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div className="stack" style={{ gap: 4 }}>
                <div style={{ fontWeight: 900 }}>{plan.name}</div>
                <div className="small muted">{plan.durationDays} дни</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>
                {plan.price.toFixed(2)} лв.
              </div>
            </div>

            <div className="small muted">
              Това е демонстрационен (виртуален) checkout за дипломна работа. Не
              се извършват реални плащания.
            </div>

            {err && <div className="alert danger">{err}</div>}

            <label className="stack" style={{ gap: 6 }}>
              <span className="small muted">Име на картодържател</span>
              <input
                value={cardName}
                onChange={(e) =>
                  setCardName(
                    e.target.value.replace(/[^A-Za-zА-Яа-яЁё\s]/g, ""),
                  )
                }
                onBlur={() => markTouched("cardName")}
                autoComplete="off"
              />
              {touched.cardName && cardNameError ? (
                <div
                  className="small"
                  style={{ color: "var(--danger, #c62828)" }}
                >
                  {cardNameError}
                </div>
              ) : null}
            </label>

            <label className="stack" style={{ gap: 6 }}>
              <span className="small muted">Номер на карта (тест)</span>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                onBlur={() => markTouched("cardNumber")}
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                autoComplete="off"
              />
              {touched.cardNumber && cardNumberError ? (
                <div
                  className="small"
                  style={{ color: "var(--danger, #c62828)" }}
                >
                  {cardNumberError}
                </div>
              ) : null}
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <label className="stack" style={{ gap: 6 }}>
                <span className="small muted">Валидност (ММ/ГГ)</span>
                <input
                  ref={expRef}
                  value={exp}
                  onChange={onExpChange}
                  onKeyDown={onExpKeyDown}
                  onBlur={() => markTouched("exp")}
                  inputMode="numeric"
                  placeholder="MM/YY"
                  autoComplete="off"
                  maxLength={5}
                />
                <div
                  className="small field-error"
                  style={{ color: "var(--danger, #c62828)" }}
                >
                  {touched.exp ? (expError ?? "") : ""}
                </div>
              </label>

              <label className="stack" style={{ gap: 6 }}>
                <span className="small muted">CVC</span>
                <input
                  value={cvc}
                  onChange={(e) =>
                    setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onBlur={() => markTouched("cvc")}
                  inputMode="numeric"
                  placeholder="123"
                  autoComplete="off"
                  maxLength={4}
                />

                <div
                  className="small field-error"
                  style={{ color: "var(--danger, #c62828)" }}
                >
                  {touched.cvc ? (cvcError ?? "") : ""}
                </div>
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onPay}
              disabled={!canPay}
              title={
                hasAnyError
                  ? "Попълни коректно данните, за да продължиш."
                  : undefined
              }
            >
              {purchase.isPending ? "Обработва се…" : "Плати"}
            </button>

            <div className="small muted">
              Тестови карти: <b>...4242</b> → успех, <b>...0002</b> → отказ.
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
