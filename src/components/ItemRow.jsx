import { effectiveHave, effectiveIsBuy, effectiveEst, effectiveQty, sectionHasPrices, tagLabel } from "../logic.js";

export default function ItemRow({
  it,
  sectionId,
  state,
  budget,
  buyOverrides,
  customItems,
  customSections,
  detailOpen,
  childCount = 0,
  childOpen = false,
  onToggleCheck,
  onToggleDetail,
  onDeleteItem,
  onToggleBuy,
  onToggleHave,
  onToggleChildren,
  isChild = false,
  parentItem = null,
}) {
  const checked = !!state[it.id];
  const isBuy = !isChild && effectiveIsBuy(it, buyOverrides);
  const est = !isChild ? effectiveEst(it, buyOverrides) : undefined;
  const qty = !isChild ? effectiveQty(it, buyOverrides) : undefined;
  const ownerSectionId = it.__ownerSectionId || sectionId;
  const isBagageSec = !isChild && sectionHasPrices(ownerSectionId, customItems, customSections);
  const budgetRow = !isChild ? budget?.items?.find((b) => b.id === `b-${it.id}`) || null : null;
  const isBoughtInBudget = !isChild && budgetRow?.bought;
  const realUnit = budgetRow?.realUnit != null ? Number(budgetRow.realUnit) : undefined;
  const realQty = budgetRow?.realQty != null ? Number(budgetRow.realQty) : undefined;
  const realTotal = budgetRow?.real != null ? Number(budgetRow.real) : realUnit != null && realQty != null ? realUnit * realQty : null;
  const showQty = realQty != null ? Number(realQty) : Number(qty || 1);

  const childParent = isChild ? parentItem : null;
  const childBudgetRow = isChild
    ? budget?.items?.find((b) => b.id === `b-${childParent?.id}`) || null
    : null;
  const childEst = isChild
    ? childBudgetRow?.est ?? effectiveEst(childParent, buyOverrides)
    : undefined;
  const childRealUnit = isChild
    ? childBudgetRow?.realUnit != null
      ? Number(childBudgetRow.realUnit)
      : childBudgetRow?.real != null && childBudgetRow.qty
      ? Number(childBudgetRow.real) / Number(childBudgetRow.qty)
      : undefined
    : undefined;
  const hasChildPriceInfo = isChild && (childEst != null || childRealUnit != null);
  const baseTags = (it.g || []).filter((g) => g !== "buy");
  const isCustom = (it.g || []).includes("custom");
  const have = effectiveHave(it, buyOverrides);
  const hasDetail = it.s && it.s.trim().length > 0;

  return (
    <div className={`item ${checked ? "checked" : ""} ${isChild ? "item-child" : ""}`}>
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
        {((isBagageSec || isBuy || it.__linkedFromName || baseTags.length || isCustom) && !isChild) || childCount > 0 ? (
          <div className="item-tags">
            {isBagageSec ? (
              <button
                className={`tag ticket-tag ${isBuy ? "active" : ""}`}
                onClick={() => onToggleBuy(it)}
                title={isBuy ? "Retirer de la liste à acheter" : "Marquer à acheter"}
              >
                {isBuy ? (
                  showQty > 1 ?
                    realTotal != null
                      ? `à acheter · ${realTotal.toFixed(0)}€ (${realUnit?.toFixed(0) ?? est.toFixed(0)}€ × ${showQty})`
                      : `à acheter · ~${(est * showQty).toFixed(0)}€ (${est.toFixed(0)}€ × ${showQty})`
                    : realTotal != null
                      ? `à acheter · ${realTotal.toFixed(0)}€`
                      : `à acheter${est ? ` · ~${est}€` : ""}`
                ) : (
                  "marquer à acheter"
                )}
              </button>
            ) : isBuy && est ? (
              <span className="tag tag-free">~{est}€</span>
            ) : null}
            {it.__linkedFromName ? (
              <span className="tag tag-free">depuis « {it.__linkedFromName} »</span>
            ) : null}
            {isBoughtInBudget ? (
              <span className="tag ticket-tag active">acheté</span>
            ) : isBuy ? (
              <button
                className={`tag ticket-tag ${have ? "active" : ""}`}
                onClick={() => onToggleHave(it)}
                title={have ? "Retirer le statut déjà obtenu" : "Marquer déjà obtenu"}
                type="button"
              >
                {have ? "déjà obtenu" : "marquer déjà obtenu"}
              </button>
            ) : null}
            {childCount > 0 ? (
              <button
                className={`tag ticket-tag ${childOpen ? "active" : ""}`}
                onClick={() => onToggleChildren(it.id)}
                type="button"
              >
                {childOpen ? `Masquer ${childCount}` : `Voir ${childCount}`}
                {` sous-élément${childCount > 1 ? "s" : ""}`}
              </button>
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
        ) : null}
        {hasChildPriceInfo ? (
          <div className="child-price-info">
            {childRealUnit != null ? (
              <span className="tag tag-free">prix unitaire réel {childRealUnit.toFixed(0)}€</span>
            ) : null}
            {childEst != null ? (
              <span className="tag tag-free">prix unitaire estimé {childEst.toFixed(0)}€</span>
            ) : null}
          </div>
        ) : null}
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
