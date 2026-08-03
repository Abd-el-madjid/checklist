import { uniqueAllItems, countChecked } from "../logic.js";

export default function Ticket({ state, customItems, customSections }) {
  const total = uniqueAllItems(customItems, customSections);
  const done = countChecked(total, state);
  const pct = total.length ? Math.round((done / total.length) * 100) : 0;

  return (
    <div id="ticket" className="ticket">
      <div className="ticket-main">
        <p className="ticket-eyebrow">Dossier de départ</p>
        <p className="ticket-route">Constantine → Besançon</p>
        <p className="ticket-sub">M2 ISL · Université Marie et Louis Pasteur</p>
      </div>
      <div className="ticket-stub">
        <div className="stub-pct">{pct}%</div>
        <div className="stub-frac">
          {done} / {total.length} étapes
        </div>
      </div>
    </div>
  );
}
