import { acheterRows, tagLabel } from "../logic.js";

export default function BudgetPanel({
  budget,
  state,
  buyOverrides,
  customItems,
  customSections,
  onToggleRow,
  onEstQtyChange,
  onRealUnitChange,
  onRealQtyChange,
  onDeleteRow,
  onTargetChange,
}) {
  const rowsData = acheterRows(budget, state, customItems, customSections, buyOverrides);
  const totalEst = rowsData.reduce(
    (s, row) => s + (Number(row.b.est) || 0) * (Number(row.b.qty) || 1),
    0
  );
  const totalReal = rowsData.reduce((s, row) => {
    const realUnit = row.b.realUnit != null ? Number(row.b.realUnit || 0) : 0;
    const realQty = row.b.realQty != null ? Number(row.b.realQty || 1) : Number(row.b.qty || 1);
    const rowReal = row.b.real != null ? Number(row.b.real) : realUnit * realQty;
    return s + (rowReal || 0);
  }, 0);
  const diff = totalReal - budget.target;
  const diffClass = budget.target > 0 ? (diff > 0 ? "over" : "under") : "";

  return (
    <>
      <div className="budget-divider">
        <span className="section-name">Acheter — liste unique, suivi budget</span>
      </div>
      <div className="budget-summary">
        <div className="budget-card">
          <p className="budget-card-label">Estimé total</p>
          <p className="budget-card-value">{totalEst.toFixed(0)} €</p>
        </div>
        <div className="budget-card">
          <p className="budget-card-label">Réel total</p>
          <p className="budget-card-value">{totalReal.toFixed(0)} €</p>
        </div>
        <div className={`budget-card ${diffClass}`}>
          <p className="budget-card-label">Écart vs objectif</p>
          <p className="budget-card-value">
            {diff > 0 ? "+" : ""}
            {diff.toFixed(0)} €
          </p>
        </div>
        <div className="budget-card">
          <p className="budget-card-label">Objectif</p>
          <p className="budget-card-value">{budget.target.toFixed(0)} €</p>
        </div>
      </div>
      <div className="budget-target-row">
        <label htmlFor="budgetTargetInput">Objectif budget total (€)</label>
        <input
          id="budgetTargetInput"
          type="number"
          defaultValue={budget.target}
          onBlur={(e) => onTargetChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.target.blur();
          }}
        />
      </div>
      {rowsData.length ? (
        rowsData.map(({ b, linkedId, bought, checkedFromSection, name, desc, details, tags, origin }) => {
          const est = Number(b.est) || 0;
          const qty = Number(b.qty) || 1;
          const estTotal = est * qty;
          const real =
            b.real !== null && b.real !== undefined && b.real !== ""
              ? Number(b.real)
              : b.realUnit !== undefined && b.realQty !== undefined
              ? Number(b.realUnit || 0) * Number(b.realQty || 1)
              : null;
          const delta = real === null ? null : real - estTotal;
          const originLabel = origin
            ? origin.sectionName.startsWith(origin.chapterLabel)
              ? origin.sectionName
              : `${origin.chapterLabel} — ${origin.sectionName}`
            : "";
          return (
            <div key={b.id} className={`buy-row ${bought ? "checked" : ""}`}>
              <div className="stamp-wrap">
                <div
                  className={`stamp ${bought ? "checked" : ""}`}
                  onClick={() => onToggleRow({ b, linkedId, bought, checkedFromSection, name })}
                >
                  ✓
                </div>
              </div>
              <div className="buy-row-body">
                <p className="buy-row-name">{name}</p>
                {desc ? <p className="item-desc" dangerouslySetInnerHTML={{ __html: desc }} /> : null}
                {(tags && tags.length) || origin ? (
                  <div className="item-tags">
                    {tags && tags.map((g) =>
                      tagLabel[g] ? (
                        <span key={g} className={`tag tag-${g}`}>
                          {tagLabel[g]}
                        </span>
                      ) : g === "custom" ? (
                        <span key={g} className="tag tag-custom">
                          Ajouté
                        </span>
                      ) : g === "buy" ? null : (
                        <span key={g} className="tag tag-free">
                          {g}
                        </span>
                      ),
                    )}
                    {origin ? (
                      <span className="tag tag-free">depuis « {originLabel} »</span>
                    ) : null}
                  </div>
                ) : null}
                {details ? (
                  <p className="item-desc" dangerouslySetInnerHTML={{ __html: details }} />
                ) : null}
                {bought && checkedFromSection ? (
                  <span className="tag ticket-tag active">
                    déjà obtenu · {real !== null ? `${real.toFixed(0)}€` : "à confirmer"}
                    {qty > 1 && real !== null ? ` (${(real / qty).toFixed(0)}€ × ${qty})` : ""}
                  </span>
                ) : bought && !checkedFromSection ? (
                  <span className="tag ticket-tag active">
                    acheté · {real !== null ? `${real.toFixed(0)}€` : "à confirmer"}
                    {qty > 1 && real !== null ? ` (${(real / qty).toFixed(0)}€ × ${qty})` : ""}
                  </span>
                ) : null}
                <div className="buy-row-meta">
                  <span className="tag ticket-tag active">
                    ~{estTotal.toFixed(0)}€
                    {qty > 1 ? ` (${est.toFixed(0)}€ × ${qty})` : ""}
                  </span>
                  <label className="budget-field-label">
                    Prix unitaire
                    <input
                      type="number"
                      className="budget-real-input"
                      defaultValue={b.realUnit !== undefined ? b.realUnit : ""}
                      placeholder="€/u"
                      min="0"
                      step="1"
                      onBlur={(e) => onRealUnitChange(b.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                      }}
                    />
                  </label>
                  <label className="budget-field-label">
                    Quantité
                    <input
                      type="number"
                      className="budget-real-input"
                      defaultValue={b.realQty !== undefined ? b.realQty : qty}
                      placeholder="Qté"
                      min="1"
                      step="1"
                      onBlur={(e) => onRealQtyChange(b.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                      }}
                    />
                  </label>
                  <span className="mono">
                    {real === null ? "—" : `${real.toFixed(0)}€`}
                  </span>
                  <span className="mono">
                    {delta === null ? (
                      "—"
                    ) : (
                      <span className={delta > 0 ? "delta-over" : "delta-under"}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(0)}€
                      </span>
                    )}
                  </span>
                  <button className="del-budget" onClick={() => onDeleteRow(b.id)}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="budget-empty">
          Rien pour l'instant — utilise le bouton « + Ajouter un élément » en haut, ou marque « à
          acheter » sur un élément des autres onglets.
        </div>
      )}
    </>
  );
}
