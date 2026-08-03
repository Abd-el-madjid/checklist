import { effectiveIsBuy, effectiveEst, sectionHasPrices, tagLabel } from "../logic.js";

export default function ItemRow({
  it,
  sectionId,
  state,
  buyOverrides,
  customSections,
  detailOpen,
  onToggleCheck,
  onToggleDetail,
  onDeleteItem,
  onToggleBuy,
}) {
  const checked = !!state[it.id];
  const isBuy = effectiveIsBuy(it, buyOverrides);
  const est = effectiveEst(it, buyOverrides);
  const ownerSectionId = it.__ownerSectionId || sectionId;
  const isBagageSec = sectionHasPrices(ownerSectionId, customSections);
  const baseTags = (it.g || []).filter((g) => g !== "buy");
  const isCustom = (it.g || []).includes("custom");
  const hasDetail = it.s && it.s.trim().length > 0;

  return (
    <div className={`item ${checked ? "checked" : ""}`}>
      <div className="stamp-wrap">
        <div
          className={`stamp ${checked ? "checked" : ""}`}
          onClick={() => onToggleCheck(it, sectionId, isBuy)}
        >
          ✓
        </div>
      </div>
      <div className="item-body">
        <p className="item-title">{it.t}</p>
        {it.d ? <p className="item-desc" dangerouslySetInnerHTML={{ __html: it.d }} /> : null}
        {(isBagageSec || isBuy || it.__linkedFromName || baseTags.length || isCustom) && (
          <div className="item-tags">
            {isBagageSec ? (
              <button
                className={`tag ticket-tag ${isBuy ? "active" : ""}`}
                onClick={() => onToggleBuy(it)}
                title={isBuy ? "Retirer de la liste à acheter" : "Marquer à acheter"}
              >
                {isBuy ? `à acheter${est ? ` · ~${est}€` : ""}` : "marquer à acheter"}
              </button>
            ) : isBuy && est ? (
              <span className="tag tag-free">~{est}€</span>
            ) : null}
            {it.__linkedFromName ? (
              <span className="tag tag-free">depuis « {it.__linkedFromName} »</span>
            ) : null}
            {baseTags.map((g) =>
              tagLabel[g] ? (
                <span key={g} className={`tag tag-${g}`}>
                  {tagLabel[g]}
                </span>
              ) : g === "custom" ? (
                <span key={g} className="tag tag-custom">
                  Ajouté
                </span>
              ) : (
                <span key={g} className="tag tag-free">
                  {g}
                </span>
              )
            )}
            {isCustom ? (
              <button
                className="del-item"
                title="Supprimer"
                onClick={() => onDeleteItem(ownerSectionId, it.id, it.t)}
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        {hasDetail ? (
          <>
            <button className="detail-btn" onClick={() => onToggleDetail(it.id)}>
              {detailOpen ? "masquer les détails" : "voir les détails"}
            </button>
            <div
              className={`detail-box ${detailOpen ? "open" : ""}`}
              dangerouslySetInnerHTML={{ __html: it.s }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
