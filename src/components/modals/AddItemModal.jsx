import { useEffect, useRef, useState } from "react";
import { chapterSections, sectionHasPrices } from "../../logic.js";

export default function AddItemModal({
  open,
  activeChapter,
  openSections,
  customSections,
  customItems,
  onConfirm,
  onCancel,
}) {
  const [sectionId, setSectionId] = useState("");
  const [text, setText] = useState("");
  const [tag, setTag] = useState("req");
  const [mustBuy, setMustBuy] = useState(false);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const inputRef = useRef(null);

  const sections =
    activeChapter === "acheter" ? chapterSections("bagages", customSections) : chapterSections(activeChapter, customSections);
  const isAcheterChapter = activeChapter === "acheter";
  const sectionAllowsBuy = isAcheterChapter || sectionHasPrices(sectionId, customItems, customSections);

  useEffect(() => {
    if (!open) return;
    const openOne = sections.find((sec) => openSections[sec.id]);
    const initial = openOne ? openOne.id : sections[0] ? sections[0].id : "";
    setSectionId(initial);
    setText("");
    setTag("req");
    setMustBuy(isAcheterChapter);
    setPrice("");
    setQuantity(1);
    setComment("");
    setTimeout(() => inputRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    if (!text.trim()) {
      inputRef.current?.focus();
      return;
    }
    onConfirm({
      sectionId,
      text,
      mustBuy: isAcheterChapter ? true : mustBuy,
      price,
      quantity,
      tag,
      comment,
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onCancel();
      }}
    >
      <div className="modal-box">
        <p className="modal-title">Ajouter un élément</p>

        <label className="modal-label" htmlFor="addItemSectionSelect">
          Section
        </label>
        <select
          id="addItemSectionSelect"
          className="modal-input"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.nm}
            </option>
          ))}
        </select>

        <label className="modal-label" htmlFor="addItemTextInput">
          Élément
        </label>
        <input
          ref={inputRef}
          id="addItemTextInput"
          type="text"
          className="modal-input"
          placeholder="Nom de l'élément"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") onCancel();
          }}
        />

        <label className="modal-label" htmlFor="addItemTagSelect">
          Priorité
        </label>
        <select
          id="addItemTagSelect"
          className="modal-input"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="req">Obligatoire</option>
          <option value="opt">Optionnel</option>
          <option value="inf">Info</option>
        </select>

        {sectionAllowsBuy ? (
          <div className="modal-buy-row">
            <label className="add-buy-check">
              <input
                type="checkbox"
                checked={isAcheterChapter ? true : mustBuy}
                disabled={isAcheterChapter}
                onChange={(e) => setMustBuy(e.target.checked)}
              />{" "}
              à acheter
            </label>
            <input
              type="number"
              className="modal-input"
              placeholder="Estimé €"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="number"
              className="modal-input"
              min="1"
              step="1"
              placeholder="Quantité"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <span className="modal-hint">
              Total : {(Number(price) || 0) * (Number(quantity) || 1)} €
            </span>
          </div>
        ) : null}

        <label className="modal-label" htmlFor="addItemCommentInput">
          Commentaire (optionnel)
        </label>
        <input
          id="addItemCommentInput"
          type="text"
          className="modal-input"
          placeholder="Commentaire"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={confirm}>
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
