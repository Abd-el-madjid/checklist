import { sectionItems, countChecked, railClass } from "../logic.js";
import ItemRow from "./ItemRow.jsx";

export default function SectionBlock({
  sec,
  customItems,
  customSections,
  state,
  buyOverrides,
  openSections,
  openDetails,
  onToggleSection,
  onToggleCheck,
  onToggleDetail,
  onDeleteItem,
  onToggleBuy,
}) {
  const items = sectionItems(sec, customItems, customSections);
  const done = countChecked(items, state);
  const open = !!openSections[sec.id];
  const rail = railClass[sec.badge && sec.badge.c] || "";

  return (
    <div className={`section ${rail} ${open ? "open" : ""}`} id={`sec-${sec.id}`}>
      <button className="section-head" onClick={() => onToggleSection(sec.id)}>
        <span className="section-ico">{sec.ico || ""}</span>
        <span className="section-name">{sec.nm}</span>
        {sec.badge ? <span className={`section-badge ${sec.badge.c}`}>{sec.badge.t}</span> : null}
        <span className="section-frac">
          {done}/{items.length}
        </span>
        <span className="chev">▸</span>
      </button>
      <div className="section-body">
        {sec.note ? <div className={`section-note ${sec.note.c}`}>{sec.note.t}</div> : null}
        {items.map((it) => (
          <ItemRow
            key={it.id}
            it={it}
            sectionId={sec.id}
            state={state}
            buyOverrides={buyOverrides}
            customSections={customSections}
            detailOpen={!!openDetails[it.id]}
            onToggleCheck={onToggleCheck}
            onToggleDetail={onToggleDetail}
            onDeleteItem={onDeleteItem}
            onToggleBuy={onToggleBuy}
          />
        ))}
      </div>
    </div>
  );
}
