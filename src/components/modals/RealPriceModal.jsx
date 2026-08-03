import { useEffect, useRef, useState } from "react";

export default function RealPriceModal({ open, itemName, defaultPrice, onConfirm, onCancel }) {
  const [price, setPrice] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPrice(defaultPrice === null || defaultPrice === undefined ? "" : defaultPrice);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, defaultPrice]);

  if (!open) return null;

  const confirm = () => onConfirm(Number(price) || 0);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onCancel();
      }}
    >
      <div className="modal-box">
        <p className="modal-title">
          Acheté : « <span>{itemName}</span> »
        </p>
        <label className="modal-label" htmlFor="realModalPriceInput">
          Prix réel payé (€)
        </label>
        <input
          ref={inputRef}
          id="realModalPriceInput"
          type="number"
          className="modal-input"
          min="0"
          step="1"
          placeholder="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={confirm}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
