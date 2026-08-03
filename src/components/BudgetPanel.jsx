import { acheterRows } from "../logic.js";

export default function BudgetPanel({
  budget,
  state,
  customItems,
  customSections,
  onToggleRow,
  onRealChange,
  onDeleteRow,
  onTargetChange,
}) {
  const rowsData = acheterRows(budget, state, customItems, customSections);
  const totalEst = budget.items.reduce((s, i) => s + (Number(i.est) || 0), 0);
  const totalReal = budget.items.reduce((s, i) => s + (Number(i.real) || 0), 0);
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
        rowsData.map(({ b, linkedId, bought, name, desc, origin }) => {
          const est = Number(b.est) || 0;
          const real = b.real === null || b.real === undefined || b.real === "" ? null : Number(b.real);
          const delta = real === null ? null : real - est;
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
                  onClick={() => onToggleRow({ b, linkedId, bought, name })}
                >
                  ✓
                </div>
              </div>
              <div className="buy-row-body">
                <p className="buy-row-name">{name}</p>
                {desc ? <p className="item-desc" dangerouslySetInnerHTML={{ __html: desc }} /> : null}
                {origin ? (
                  <div className="item-tags">
                    <span className="tag tag-free">depuis « {originLabel} »</span>
                  </div>
                ) : null}
                <div className="buy-row-meta">
                  <span className="tag ticket-tag active">~{est.toFixed(0)}€</span>
                  <input
                    type="number"
                    className="budget-real-input"
                    defaultValue={real === null ? "" : real}
                    placeholder="Réel €"
                    onBlur={(e) => onRealChange(b.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                  />
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
