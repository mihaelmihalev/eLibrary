import Modal from "./Modal";

type Props = {
  open: boolean;
  subscriptionEnd?: string | null;
  onClose: () => void;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

export default function PaymentSuccessModal({
  open,
  subscriptionEnd,
  onClose,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Успешно плащане" width={420}>
      <div className="stack" style={{ gap: 16, textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem" }}>✅</div>

        <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
          Плащането е успешно
        </div>

        <div className="muted">
          Абонаментът е активиран
          {subscriptionEnd && (
            <>
              <br />
              до <b>{fmtDate(subscriptionEnd)}</b>
            </>
          )}
        </div>

        <button className="btn btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}
