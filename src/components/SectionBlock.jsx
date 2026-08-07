import { sectionItems, countChecked, railClass } from "../logic.js";
import ItemRow from "./ItemRow.jsx";

export default function SectionBlock({
  sec,
  customItems,
  customSections,
  state,
  budget,
  buyOverrides,
  openSections,
  openDetails,
  openChildren,
  onToggleSection,
  onToggleCheck,
  onToggleDetail,
  onDeleteItem,
  onToggleBuy,
  onToggleHave,
  onToggleChildren,
}) {
  const items = sectionItems(sec, customItems, customSections);
  const groups = [];
  const parentMap = {};
  const orphanChildren = [];

  items.forEach((it) => {
    if (it.childOf) {
      const parent = parentMap[it.childOf];
      if (parent) {
        parent.children.push(it);
      } else {
        orphanChildren.push(it);
      }
    } else {
      const group = { parent: it, children: [] };
      groups.push(group);
      parentMap[it.id] = group;
    }
  });

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
        {groups.map(({ parent, children }) => (
          <div key={parent.id}>
            <ItemRow
              key={parent.id}
              it={parent}
              sectionId={sec.id}
              state={state}
              budget={budget}
              buyOverrides={buyOverrides}
              customItems={customItems}
              customSections={customSections}
              detailOpen={!!openDetails[parent.id]}
              childCount={children.length}
              childOpen={!!openChildren[parent.id]}
              onToggleCheck={onToggleCheck}
              onToggleDetail={onToggleDetail}
              onDeleteItem={onDeleteItem}
              onToggleBuy={onToggleBuy}
              onToggleHave={onToggleHave}
              onToggleChildren={onToggleChildren}
            />
            {children.length > 0 && openChildren[parent.id]
              ? children.map((child) => (
                  <ItemRow
                    key={child.id}
                    it={child}
                    sectionId={sec.id}
                    state={state}
                    budget={budget}
                    buyOverrides={buyOverrides}
                    customItems={customItems}
                    customSections={customSections}
                    detailOpen={!!openDetails[child.id]}
                    parentItem={parent}
                    isChild
                    onToggleCheck={onToggleCheck}
                    onToggleDetail={onToggleDetail}
                    onDeleteItem={onDeleteItem}
                    onToggleBuy={onToggleBuy}
                    onToggleHave={onToggleHave}
                  />
                ))
              : children.length > 0 ? (
                  <div className="child-summary">
                    {children.length} sous-élément{children.length > 1 ? "s" : ""} masqué{children.length > 1 ? "s" : ""}.
                  </div>
                ) : null}
          </div>
        ))}
        {orphanChildren.length > 0 && (
          <div className="orphan-children">
            {orphanChildren.map((it) => (
              <ItemRow
                key={it.id}
                it={it}
                sectionId={sec.id}
                state={state}
                budget={budget}
                buyOverrides={buyOverrides}
                customItems={customItems}
                customSections={customSections}
                detailOpen={!!openDetails[it.id]}
                isChild
                onToggleCheck={onToggleCheck}
                onToggleDetail={onToggleDetail}
                onDeleteItem={onDeleteItem}
                onToggleBuy={onToggleBuy}
                onToggleHave={onToggleHave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
