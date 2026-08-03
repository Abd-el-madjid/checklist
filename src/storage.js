// Small localStorage-backed persistence helpers, ported from the vanilla
// checklist.html app. Kept as plain functions (not a React hook) so the
// same logic can be called from the App's central save/load effect.

const KEYS = {
  state: "dossier-checklist-progress",
  customItems: "dossier-custom-items",
  budget: "dossier-budget",
  buyOverrides: "dossier-buy-overrides",
  customSections: "dossier-custom-sections",
};

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.state) || "{}");
  } catch {
    return {};
  }
}

export function loadCustomItems() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.customItems) || "{}");
  } catch {
    return {};
  }
}

export function loadBudget() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.budget) || '{"target":0,"items":[]}');
  } catch {
    return { target: 0, items: [] };
  }
}

export function loadBuyOverrides() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.buyOverrides) || "{}");
  } catch {
    return {};
  }
}

export function loadCustomSections(chapterKeys) {
  let parsed;
  try {
    parsed = JSON.parse(
      localStorage.getItem(KEYS.customSections) ||
        '{"depart":[],"bagages":[],"acheter":[],"after":[]}'
    );
  } catch {
    parsed = {};
  }
  chapterKeys.forEach((k) => {
    if (!parsed[k]) parsed[k] = [];
  });
  return parsed;
}

export function saveAll({ state, customItems, budget, buyOverrides, customSections }) {
  try {
    localStorage.setItem(KEYS.state, JSON.stringify(state));
    localStorage.setItem(KEYS.customItems, JSON.stringify(customItems));
    localStorage.setItem(KEYS.budget, JSON.stringify(budget));
    localStorage.setItem(KEYS.buyOverrides, JSON.stringify(buyOverrides));
    localStorage.setItem(KEYS.customSections, JSON.stringify(customSections));
    return true;
  } catch {
    return false;
  }
}
