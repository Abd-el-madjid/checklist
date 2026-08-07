import { CHAPTERS_META } from "../data.js";
import { chapterSections, allItems, countChecked, acheterRows } from "../logic.js";

export default function TabBar({ activeChapter, onSelect, state, customItems, customSections, budget, buyOverrides }) {
  return (
    <div id="tabs" className="tabs">
      {CHAPTERS_META.map((c) => {
        let done, total;
        if (c.key === "acheter") {
          const rows = acheterRows(budget, state, customItems, customSections, buyOverrides);
          total = rows.length;
          done = rows.filter((r) => r.bought).length;
        } else {
          const items = allItems(chapterSections(c.key, customSections), customItems);
          total = items.length;
          done = countChecked(items, state);
        }
        return (
          <button
            key={c.key}
            className={`tab ${c.key === activeChapter ? "active" : ""}`}
            onClick={() => onSelect(c.key)}
          >
            <span className="tab-label">{c.label}</span>
            <span className="tab-count">
              {done}/{total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
