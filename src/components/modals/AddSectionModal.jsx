import { useEffect, useRef, useState } from "react";
import { CHAPTERS_META } from "../../data.js";
import { allSectionsFlat } from "../../logic.js";

export default function AddSectionModal({ open, activeChapter, customSections, onConfirm, onCancel }) {
  const [chapterKey, setChapterKey] = useState("depart");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📌");
  const [hasPrices, setHasPrices] = useState(false);
  const [linkedSectionId, setLinkedSectionId] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setChapterKey(activeChapter);
    setName("");
    setIcon("📌");
    setHasPrices(activeChapter === "bagages" || activeChapter === "acheter");
    setLinkedSectionId("");
    setTimeout(() => inputRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const allSections = allSectionsFlat(customSections);

  const confirm = () => {
    if (!name.trim()) {
      inputRef.current?.focus();
      return;
    }
    onConfirm({
      chapterKey,
      name: name.trim(),
      icon: icon.trim() || "📌",
      hasPrices,
      linkedSectionId: linkedSectionId || null,
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
        <p className="modal-title">Nouvelle section</p>

        <label className="modal-label" htmlFor="addSectionChapterSelect">
          Onglet
        </label>
        <select
          id="addSectionChapterSelect"
          className="modal-input"
          value={chapterKey}
          onChange={(e) => setChapterKey(e.target.value)}
        >
          {CHAPTERS_META.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <label className="modal-label" htmlFor="addSectionNameInput">
          Nom de la section
        </label>
        <input
          ref={inputRef}
          id="addSectionNameInput"
          type="text"
          className="modal-input"
          placeholder="ex : Papiers administratifs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") onCancel();
          }}
        />

        <label className="modal-label" htmlFor="addSectionIconInput">
          Icône (emoji)
        </label>
        <input
          id="addSectionIconInput"
          type="text"
          className="modal-input"
          placeholder="📌"
          maxLength={4}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />

        <label className="modal-check-solo">
          <input
            type="checkbox"
            checked={hasPrices}
            onChange={(e) => setHasPrices(e.target.checked)}
          />
          Cette section contient des prix (autorise « à acheter »)
        </label>

        <label className="modal-label" htmlFor="addSectionLinkSelect">
          Lier à une section existante (optionnel)
        </label>
        <select
          id="addSectionLinkSelect"
          className="modal-input"
          value={linkedSectionId}
          onChange={(e) => setLinkedSectionId(e.target.value)}
        >
          <option value="">Aucune</option>
          {allSections.map((x) => (
            <option key={x.sec.id} value={x.sec.id}>
              {x.chapterLabel} — {x.sec.nm}
            </option>
          ))}
        </select>
        <p className="modal-hint">
          Si liée, les éléments de cette nouvelle section apparaîtront aussi dans la section liée
          — une seule case à cocher, deux listes.
        </p>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={confirm}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
