// Small localStorage-backed persistence helpers, ported from the vanilla
// checklist.html app. Kept as plain functions (not a React hook) so the
// same logic can be called from the App's central save/load effect.

const KEYS = {
  state: "dossier-checklist-progress",
  customItems: "dossier-custom-items",
  budget: "dossier-budget",
  buyOverrides: "dossier-buy-overrides",
  customSections: "dossier-custom-sections",
  bagagePacking: "dossier-bagage-packing",
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
    return JSON.parse(
      localStorage.getItem(KEYS.budget) || '{"target":0,"items":[]}',
    );
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
        '{"depart":[],"bagages":[],"acheter":[],"after":[]}',
    );
  } catch {
    parsed = {};
  }
  chapterKeys.forEach((k) => {
    if (!parsed[k]) parsed[k] = [];
  });
  return parsed;
}

export function loadBagagePacking() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.bagagePacking) || "{}");
  } catch {
    return {};
  }
}

export function saveAll({
  state,
  customItems,
  budget,
  buyOverrides,
  customSections,
  bagagePacking,
}) {
  try {
    localStorage.setItem(KEYS.state, JSON.stringify(state));
    localStorage.setItem(KEYS.customItems, JSON.stringify(customItems));
    localStorage.setItem(KEYS.budget, JSON.stringify(budget));
    localStorage.setItem(KEYS.buyOverrides, JSON.stringify(buyOverrides));
    localStorage.setItem(KEYS.customSections, JSON.stringify(customSections));
    localStorage.setItem(KEYS.bagagePacking, JSON.stringify(bagagePacking));
    return true;
  } catch {
    return false;
  }
}

// Shared persistence: the app's state now lives in a Cloudflare KV
// namespace behind a small Pages Function (see /functions/api/state.js),
// so every device/browser that opens the app sees the same data — not a
// separate copy per browser.
//
// localStorage is still used, but only as an instant local cache: it lets
// the UI paint immediately on load (no blank screen while the network
// request is in flight) and keeps working if the network/API is briefly
// unavailable. The Cloudflare KV copy is the source of truth; whenever a
// fresh copy is fetched from the API, it overwrites the local cache.

const API_URL = "/api/state";
const LOCAL_CACHE_KEY = "dossier-app-state-cache-v1";

export function defaultAppState(chapterKeys) {
  const customSections = {};
  chapterKeys.forEach((k) => {
    customSections[k] = [];
  });
  return {
    state: {},
    customItems: {},
    budget: { target: 0, items: [] },
    buyOverrides: {},
    customSections,
    bagagePacking: {},
  };
}

// Synchronous — used as the initial React state so the UI has something to
// render instantly, before the network round-trip to the API resolves.
export function loadCachedLocal(chapterKeys) {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return defaultAppState(chapterKeys);
    const parsed = JSON.parse(raw);
    if (!parsed.customSections) parsed.customSections = {};
    if (!parsed.bagagePacking) parsed.bagagePacking = {};
    chapterKeys.forEach((k) => {
      if (!parsed.customSections[k]) parsed.customSections[k] = [];
    });
    return parsed;
  } catch {
    return defaultAppState(chapterKeys);
  }
}

function cacheLocal(data) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota/availability errors — the API copy is still safe
  }
}

// Fetch the shared state from the API. Returns null on any failure (offline,
// API not deployed yet, etc.) so callers can fall back to the local cache.
export async function fetchRemoteState(chapterKeys) {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    if (!data.customSections) data.customSections = {};
    chapterKeys.forEach((k) => {
      if (!data.customSections[k]) data.customSections[k] = [];
    });
    cacheLocal(data);
    return data;
  } catch {
    return null;
  }
}

// Push the full state to the API so every other device picks it up. Always
// updates the local cache immediately (works offline); the network push is
// best-effort — if it fails, the next successful poll/save will retry.
export async function saveRemoteState(data) {
  cacheLocal(data);
  try {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}
