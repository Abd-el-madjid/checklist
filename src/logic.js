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
    }))
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
  const linkedFrom = allSectionsFlat(customSections).filter(
    (x) => x.sec.linkedSectionId === sec.id
  );
  const linkedItems = linkedFrom.flatMap((x) =>
    ownSectionItems(x.sec, customItems).map((it) => ({
      ...it,
      __linkedFromName: x.sec.nm,
      __ownerSectionId: x.sec.id,
    }))
  );
  return own.concat(linkedItems);
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
    const found = ownSectionItems(x.sec, customItems).find((it) => it.id === id);
    if (found) return { chapterLabel: x.chapterLabel, sectionName: x.sec.nm };
  }
  return null;
}

// A section allows the "à acheter" (buy) ticket if it's one of the two
// built-in bagage sections, or a custom section explicitly flagged as
// containing prices when it was created.
export function sectionHasPrices(sectionId, customSections) {
  if (sectionId === "valise-emporter" || sectionId === "valise-acheter") return true;
  const found = allSectionsFlat(customSections).find((x) => x.sec.id === sectionId);
  return !!(found && found.sec.hasPrices);
}

export function effectiveIsBuy(it, buyOverrides) {
  if (Object.prototype.hasOwnProperty.call(buyOverrides, it.id)) {
    return !!buyOverrides[it.id].buy;
  }
  return (it.g || []).includes("buy");
}

export function effectiveEst(it, buyOverrides) {
  if (
    Object.prototype.hasOwnProperty.call(buyOverrides, it.id) &&
    buyOverrides[it.id].est !== undefined
  ) {
    return buyOverrides[it.id].est;
  }
  return it.est;
}

// The Acheter tab is driven entirely off budget.items, each optionally
// linked back to a real checklist item (id "b-" + itemId).
export function acheterRows(budget, state, customItems, customSections) {
  return budget.items.map((b) => {
    const linkedId = b.id.startsWith("b-") ? b.id.slice(2) : null;
    const linkedItem = linkedId ? findItemById(linkedId, customItems, customSections) : null;
    const bought = linkedItem ? !!state[linkedId] : !!b.bought;
    const name = linkedItem ? linkedItem.t : b.name;
    const desc = linkedItem ? linkedItem.d : "";
    const origin = linkedId ? findItemOrigin(linkedId, customItems, customSections) : null;
    return { b, linkedId, linkedItem, bought, name, desc, origin };
  });
}
