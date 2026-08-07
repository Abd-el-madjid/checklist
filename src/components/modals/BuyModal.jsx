import { useEffect, useRef, useState } from "react";

export default function BuyModal({ open, itemName, defaultPrice, defaultQuantity, onConfirm, onCancel }) {
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPrice(defaultPrice || "");
      setQuantity(defaultQuantity || 1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, defaultPrice, defaultQuantity]);

  if (!open) return null;

  const unitPrice = Number(price) || 0;
  const qty = Number(quantity) || 1;
  const total = unitPrice * qty;
  const confirm = () => onConfirm({ price: unitPrice, quantity: qty });

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onCancel();
      }}
    >
      <div className="modal-box">
        <p className="modal-title">
          Marquer « <span>{itemName}</span> » à acheter
        </p>
        <label className="modal-label" htmlFor="buyModalPriceInput">
          Prix unitaire estimé (€)
        </label>
        <input
          ref={inputRef}
          id="buyModalPriceInput"
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
        <label className="modal-label" htmlFor="buyModalQtyInput">
          Quantité
        </label>
        <input
          id="buyModalQtyInput"
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
          Total estimé : {total.toFixed(0)} € {qty > 1 ? `( ${unitPrice.toFixed(0)}€ × ${qty} )` : null}
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
