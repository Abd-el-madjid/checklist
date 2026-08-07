import { useEffect, useRef, useState } from "react";

export default function RealPriceModal({ open, itemName, defaultPrice, defaultQuantity, onConfirm, onCancel }) {
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPrice(defaultPrice === null || defaultPrice === undefined ? "" : defaultPrice);
      setQuantity(defaultQuantity || 1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, defaultPrice, defaultQuantity]);

  if (!open) return null;

  const total = (Number(price) || 0) * (Number(quantity) || 1);
  const confirm = () => onConfirm(Number(price) || 0, Number(quantity) || 1);

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
          Prix réel unitaire (€)
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
        <label className="modal-label" htmlFor="realModalQtyInput">
          Quantité réelle
        </label>
        <input
          id="realModalQtyInput"
          type="number"
          className="modal-input"
          min="1"
          step="1"
          placeholder="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") onCancel();
          }}
        />
        <p className="modal-hint">
          Total réel : {total.toFixed(0)} € {quantity > 1 ? `( ${Number(price || 0).toFixed(0)}€ × ${quantity} )` : null}
        </p>
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
