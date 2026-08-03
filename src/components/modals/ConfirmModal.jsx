import { useEffect, useState } from "react";

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    if (!open) return;
    setRemaining(5);
  }, [open, message]);

  useEffect(() => {
    if (!open || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [open, remaining]);

  if (!open) return null;
  const ready = remaining <= 0;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onCancel();
      }}
    >
      <div className="modal-box">
        <p className="modal-title">{message}</p>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button
            className="modal-btn modal-btn-confirm"
            disabled={!ready}
            onClick={() => ready && onConfirm()}
          >
            {ready ? "Confirmer" : `Confirmer (${remaining})`}
          </button>
        </div>
      </div>
    </div>
  );
}
