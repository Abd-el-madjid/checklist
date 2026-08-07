import { CHAPTERS_META } from "./data.js";

export const tagLabel = { req: "Obligatoire", opt: "Optionnel", inf: "Info" };
export const railClass = {
  "b-blu": "rail-blu",
  "b-red": "rail-red",
  "b-amb": "rail-amb",
  "b-pur": "rail-pur",
  "b-grn": "rail-grn",
};

// Sections belonging to a chapter: built-in (from data.js) + any custom
// sections the person created and attached to that chapter.
export function chapterSections(chapterKey, customSections) {
  const chapter = CHAPTERS_META.find((c) => c.key === chapterKey);
  const builtIn = chapter ? chapter.data : [];
  const custom = customSections[chapterKey] || [];
  return builtIn.concat(custom);
}

// Flat list of every section across every chapter, each tagged with its
// chapter key/label — used for "link to another section" pickers and for
// figuring out where an item originally lives.
export function allSectionsFlat(customSections) {
  return CHAPTERS_META.flatMap((c) =>
    chapterSections(c.key, customSections).map((sec) => ({
      sec,
      chapterKey: c.key,
      chapterLabel: c.label,
    })),
  );
}

export function allOwnSectionsList(customSections) {
  return CHAPTERS_META.flatMap((c) => chapterSections(c.key, customSections));
}

// A section's own items = its built-in items + whatever the person added
// to it (custom items keyed by section id). Does NOT include items pulled
// in from a linked section — see sectionItems() below for that.
export function ownSectionItems(sec, customItems) {
  return (sec.items || []).concat(customItems[sec.id] || []);
}

// Full rendered list for a section: its own items, plus (if any other
// section declares `linkedSectionId === sec.id`) that other section's own
// items too, each annotated with where they actually came from. This is
// what gives the "one checkbox, two lists" behaviour.
export function sectionItems(sec, customItems, customSections) {
  const own = ownSectionItems(sec, customItems);
  const childrenByParent = {};
  const parentItems = [];

  own.forEach((it) => {
    if (it.childOf) {
      childrenByParent[it.childOf] = childrenByParent[it.childOf] || [];
      childrenByParent[it.childOf].push(it);
    } else {
      parentItems.push(it);
    }
  });

  const sortedOwn = parentItems.flatMap((parent) =>
    [parent].concat(childrenByParent[parent.id] || []),
  );
  const orphanChildren = Object.values(childrenByParent)
    .flat()
    .filter(
      (child) => !parentItems.some((parent) => parent.id === child.childOf),
    );

  const linkedFrom = allSectionsFlat(customSections).filter(
    (x) => x.sec.linkedSectionId === sec.id,
  );
  const linkedItems = linkedFrom.flatMap((x) =>
    ownSectionItems(x.sec, customItems).map((it) => ({
      ...it,
      __linkedFromName: x.sec.nm,
      __ownerSectionId: x.sec.id,
    })),
  );

  return sortedOwn.concat(linkedItems).concat(orphanChildren);
}

export function allItems(secs, customItems) {
  return secs.flatMap((s) => ownSectionItems(s, customItems));
}

// De-duplicated set of every item across the whole app (own items only,
// each counted once even if it's also mirrored into a linked section) —
// used for the header ticket's global progress percentage.
export function uniqueAllItems(customItems, customSections) {
  const seen = new Set();
  const result = [];
  allOwnSectionsList(customSections).forEach((sec) => {
    ownSectionItems(sec, customItems).forEach((it) => {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        result.push(it);
      }
    });
  });
  return result;
}

export function countChecked(items, state) {
  return items.filter((it) => state[it.id]).length;
}

export function findItemById(id, customItems, customSections) {
  for (const sec of allOwnSectionsList(customSections)) {
    const found = ownSectionItems(sec, customItems).find((it) => it.id === id);
    if (found) return found;
  }
  return null;
}

export function findItemOrigin(id, customItems, customSections) {
  for (const x of allSectionsFlat(customSections)) {
    const found = ownSectionItems(x.sec, customItems).find(
      (it) => it.id === id,
    );
    if (found) {
      return {
        chapterKey: x.chapterKey,
        chapterLabel: x.chapterLabel,
        sectionId: x.sec.id,
        sectionName: x.sec.nm,
        section: x.sec,
      };
    }
  }
  return null;
}

// A section allows the "à acheter" (buy) ticket if it is a built-in
// Bagages/Acheter section, or a custom section explicitly flagged with
// hasPrices when it was created.
export function sectionHasPrices(sectionId, customItems, customSections) {
  const found = allSectionsFlat(customSections).find(
    (x) => x.sec.id === sectionId,
  );
  if (!found) return false;
  if (found.sec.hasPrices) return true;
  if (found.chapterKey === "bagages") return true;

  const ownBuyItem = (found.sec.items || []).some((it) =>
    (it.g || []).includes("buy"),
  );
  if (ownBuyItem) return true;

  const customBuyItem = (customItems[sectionId] || []).some((it) =>
    (it.g || []).includes("buy"),
  );
  if (customBuyItem) return true;

  const linkedFrom = allSectionsFlat(customSections).some(
    (x) => x.sec.linkedSectionId === sectionId,
  );
  return linkedFrom;
}

export function effectiveIsBuy(it, buyOverrides) {
  if (Object.prototype.hasOwnProperty.call(buyOverrides, it.id)) {
    return !!buyOverrides[it.id].buy;
  }
  return (it.g || []).includes("buy");
}

export function effectiveHave(it, buyOverrides) {
  if (Object.prototype.hasOwnProperty.call(buyOverrides, it.id)) {
    return !!buyOverrides[it.id].have;
  }
  return false;
}

function parseEstimatedPrice(it) {
  if (typeof it.d !== "string") return undefined;
  const estMatch = it.d.match(/prix estim[eé]\s*[:]?\s*([0-9]+)\s*(?:DA|€)/i);
  if (estMatch) return Number(estMatch[1]);
  return undefined;
}

function parseEstimatedQty(it) {
  if (typeof it.d !== "string") return undefined;
  const qtyMatch = it.d.match(
    /([0-9]+)\s*(?:unit(?:é|és)|pi[eè]ce|paire|paires|unité|unités)/i,
  );
  if (qtyMatch) return Number(qtyMatch[1]);
  return undefined;
}

function budgetRowRealTotal(row) {
  if (row.real !== undefined && row.real !== null) return Number(row.real);
  if (row.realUnit !== undefined && row.realQty !== undefined) {
    return Number(row.realUnit || 0) * Number(row.realQty || 0);
  }
  return null;
}

export function effectiveEst(it, buyOverrides) {
  if (
    Object.prototype.hasOwnProperty.call(buyOverrides, it.id) &&
    buyOverrides[it.id].est !== undefined
  ) {
    return buyOverrides[it.id].est;
  }
  if (it.est !== undefined) return it.est;
  return parseEstimatedPrice(it);
}

export function effectiveQty(it, buyOverrides) {
  if (
    Object.prototype.hasOwnProperty.call(buyOverrides, it.id) &&
    buyOverrides[it.id].qty !== undefined
  ) {
    return buyOverrides[it.id].qty;
  }
  if (it.qty !== undefined) return it.qty;
  return parseEstimatedQty(it) || 1;
}

function buildBuyChecklistRows(
  budget,
  state,
  customItems,
  customSections,
  buyOverrides,
) {
  const rows = [];
  const seenBudgetIds = new Set();

  allOwnSectionsList(customSections).forEach((sec) => {
    ownSectionItems(sec, customItems)
      .filter((it) => effectiveIsBuy(it, buyOverrides))
      .forEach((it) => {
        const rowId = "b-" + it.id;
        const budgetRow = budget.items.find((b) => b.id === rowId);
        const est = budgetRow ? budgetRow.est : effectiveEst(it, buyOverrides);
        const qty = budgetRow ? budgetRow.qty : effectiveQty(it, buyOverrides);
        const real = budgetRow ? budgetRowRealTotal(budgetRow) : null;
        const realUnit = budgetRow ? budgetRow.realUnit : undefined;
        const realQty = budgetRow ? budgetRow.realQty : undefined;
        const checkedFromSection = !!state[it.id];
        const boughtFromBudget = !!(budgetRow && budgetRow.bought);
        const bought = checkedFromSection || boughtFromBudget;
        rows.push({
          b: { id: rowId, name: it.t, est, qty, real, realUnit, realQty },
          linkedId: it.id,
          linkedItem: it,
          bought,
          checkedFromSection,
          boughtFromBudget,
          name: it.t,
          desc: it.d || "",
          details: it.s || "",
          tags: it.g || [],
          origin: findItemOrigin(it.id, customItems, customSections),
        });
        if (budgetRow) seenBudgetIds.add(rowId);
      });
  });

  budget.items.forEach((b) => {
    if (b.id.startsWith("b-") && seenBudgetIds.has(b.id)) return;
    const linkedId = b.id.startsWith("b-") ? b.id.slice(2) : null;
    const linkedItem = linkedId
      ? findItemById(linkedId, customItems, customSections)
      : null;
    if (linkedItem) return;

    rows.push({
      b,
      linkedId,
      linkedItem: null,
      bought: !!b.bought,
      checkedFromSection: false,
      boughtFromBudget: !!b.bought,
      name: b.name,
      desc: "",
      origin: null,
    });
  });

  return rows;
}

// The Acheter tab is driven off the budget rows plus any checklist items
// marked as buy-enabled, even if they were not explicitly added first.
export function acheterRows(
  budget,
  state,
  customItems,
  customSections,
  buyOverrides,
) {
  return buildBuyChecklistRows(
    budget,
    state,
    customItems,
    customSections,
    buyOverrides,
  );
}
