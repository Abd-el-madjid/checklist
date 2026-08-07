import { useEffect, useRef, useState } from "react";
import { CHAPTERS_META, BAGAGE_SECS, ACHETER_SECS } from "./data.js";
import {
  chapterSections,
  sectionItems,
  ownSectionItems,
  allItems,
  allOwnSectionsList,
  effectiveIsBuy,
  effectiveHave,
  effectiveEst,
  effectiveQty,
  findItemById,
  findItemOrigin,
} from "./logic.js";
import {
  loadCachedLocal,
  fetchRemoteState,
  saveRemoteState,
  defaultAppState,
} from "./storage.js";

import Ticket from "./components/Ticket.jsx";
import TabBar from "./components/TabBar.jsx";
import SectionBlock from "./components/SectionBlock.jsx";
import BudgetPanel from "./components/BudgetPanel.jsx";
import ConfirmModal from "./components/modals/ConfirmModal.jsx";
import BuyModal from "./components/modals/BuyModal.jsx";
import RealPriceModal from "./components/modals/RealPriceModal.jsx";
import AddItemModal from "./components/modals/AddItemModal.jsx";
import AddSectionModal from "./components/modals/AddSectionModal.jsx";

const CHAPTER_KEYS = CHAPTERS_META.map((c) => c.key);
const POLL_INTERVAL_MS = 6000;
// Don't let an incoming poll overwrite what we just typed/clicked locally —
// only apply remote changes once it's been a moment since our own last edit.
const QUIET_PERIOD_MS = 3000;

export default function App() {
  const initialCache = useState(() => loadCachedLocal(CHAPTER_KEYS))[0];

  // ----- core, shared-across-devices state -----
  const [state, setState] = useState(initialCache.state);
  const [customItems, setCustomItems] = useState(initialCache.customItems);
  const [budget, setBudget] = useState(initialCache.budget);
  const [buyOverrides, setBuyOverrides] = useState(initialCache.buyOverrides);
  const [customSections, setCustomSections] = useState(initialCache.customSections);
  const [bagagePacking, setBagagePacking] = useState(initialCache.bagagePacking || {});

  // ----- UI-only state -----
  const [activeChapter, setActiveChapter] = useState("depart");
  const [bagageFilter, setBagageFilter] = useState("all");
  const [openSections, setOpenSections] = useState({});
  const [openDetails, setOpenDetails] = useState({});
  const [openChildren, setOpenChildren] = useState({});
  const [syncNote, setSyncNote] = useState("chargement…");
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimerRef = useRef(null);

  // ----- modal state -----
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "" });
  const confirmCallbackRef = useRef(null);

  const [buyModal, setBuyModal] = useState({
    open: false,
    itemName: "",
    defaultPrice: 0,
    defaultQuantity: 1,
  });
  const buyModalItemRef = useRef(null);

  const [realPriceModal, setRealPriceModal] = useState({ open: false, itemName: "", defaultPrice: 0, defaultQuantity: 1 });
  const realPriceCallbackRef = useRef(null);

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);

  // ----- initial load from the shared API (falls back silently to the
  // local cache already in state if offline / API not deployed yet) -----
  const hasLoadedRemoteRef = useRef(false);
  const lastLocalEditRef = useRef(0);
  const applyingRemoteRef = useRef(false);

  function applyRemote(remote) {
    applyingRemoteRef.current = true;
    setState(remote.state);
    setCustomItems(remote.customItems);
    setBudget(remote.budget);
    setBuyOverrides(remote.buyOverrides);
    setCustomSections(remote.customSections);
    setBagagePacking(remote.bagagePacking || {});
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteState(CHAPTER_KEYS);
      if (cancelled) return;
      if (remote) applyRemote(remote);
      hasLoadedRemoteRef.current = true;
      setSyncNote(remote ? "synchronisé" : "prêt (rien de synchronisé pour l'instant)");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- poll for changes made from other devices/tabs, and refetch
  // whenever this tab becomes visible again -----
  useEffect(() => {
    async function poll() {
      if (!hasLoadedRemoteRef.current) return;
      if (Date.now() - lastLocalEditRef.current < QUIET_PERIOD_MS) return;
      const remote = await fetchRemoteState(CHAPTER_KEYS);
      if (!remote) return;
      const current = JSON.stringify({ state, customItems, budget, buyOverrides, customSections, bagagePacking });
      if (JSON.stringify(remote) !== current) {
        applyRemote(remote);
        setSyncNote("mis à jour depuis un autre appareil");
      }
    }
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, customItems, budget, buyOverrides, customSections, bagagePacking]);

  // ----- persistence: debounce-save whenever core state changes, push to
  // the shared API so every device picks it up -----
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!hasLoadedRemoteRef.current) return; // don't save before initial load resolves
    if (applyingRemoteRef.current) {
      // this change came FROM the server (poll/initial load) — no need to
      // immediately write it straight back
      applyingRemoteRef.current = false;
      return;
    }
    lastLocalEditRef.current = Date.now();
    setSyncNote("enregistrement…");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const ok = await saveRemoteState({ state, customItems, budget, buyOverrides, customSections, bagagePacking });
      setSyncNote(ok ? "synchronisé sur tous tes appareils" : "enregistré localement (hors ligne)");
    }, 400);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, customItems, budget, buyOverrides, customSections]);

  // ===== modal helpers =====
  function openConfirmModal(message, cb) {
    confirmCallbackRef.current = cb;
    setConfirmModal({ open: true, message });
  }
  function closeConfirmModal() {
    confirmCallbackRef.current = null;
    setConfirmModal({ open: false, message: "" });
  }
  function handleConfirmModalConfirm() {
    const cb = confirmCallbackRef.current;
    closeConfirmModal();
    if (cb) cb();
  }

  function openBuyModal(it) {
    const qty = effectiveQty(it, buyOverrides) || 1;
    buyModalItemRef.current = it;
    setBuyModal({
      open: true,
      itemName: it.t,
      defaultPrice: effectiveEst(it, buyOverrides) || "",
      defaultQuantity: qty,
    });
  }
  function closeBuyModal() {
    buyModalItemRef.current = null;
    setBuyModal({ open: false, itemName: "", defaultPrice: 0, defaultQuantity: 1 });
  }
  function handleBuyModalConfirm({ price, quantity }) {
    const it = buyModalItemRef.current;
    if (!it) return closeBuyModal();
    const est = Number(price) || 0;
    const qty = Number(quantity) || 1;
    setBuyOverrides((prev) => ({ ...prev, [it.id]: { buy: true, est, qty } }));
    setBudget((prev) => {
      const exists = prev.items.some((b) => b.id === "b-" + it.id);
      const items = exists
        ? prev.items.map((b) =>
            b.id === "b-" + it.id ? { ...b, est, qty, real: b.real } : b
          )
        : [...prev.items, { id: "b-" + it.id, name: it.t, est, qty, real: null }];
      return { ...prev, items };
    });
    closeBuyModal();
  }

  function openRealPriceModal(itemName, defaultPrice, defaultQuantity, cb) {
    realPriceCallbackRef.current = cb;
    setRealPriceModal({ open: true, itemName, defaultPrice: defaultPrice || "", defaultQuantity });
  }
  function closeRealPriceModal() {
    realPriceCallbackRef.current = null;
    setRealPriceModal({ open: false, itemName: "", defaultPrice: 0, defaultQuantity: 1 });
  }
  function handleRealPriceConfirm(price, quantity) {
    const cb = realPriceCallbackRef.current;
    closeRealPriceModal();
    if (cb) cb({ price: Number(price) || 0, quantity: Number(quantity) || 1 });
  }

  function getBudgetRowRealTotal(row) {
    if (!row) return null;
    if (row.realUnit !== undefined && row.realQty !== undefined) {
      return Number(row.realUnit || 0) * Number(row.realQty || 0);
    }
    if (row.real !== undefined && row.real !== null) {
      return Number(row.real);
    }
    return null;
  }

  function getBudgetRowRealUnit(row) {
    if (row.realUnit !== undefined) return Number(row.realUnit || 0);
    if (row.real !== undefined && row.real !== null && row.qty) {
      return Number(row.real) / Number(row.qty);
    }
    return 0;
  }

  function getBudgetRowRealQty(row) {
    if (row.realQty !== undefined) return Number(row.realQty || 0);
    if (row.real !== undefined && row.real !== null && row.realUnit) {
      return Math.max(1, Math.round(Number(row.real) / Number(row.realUnit)));
    }
    return row.qty || 1;
  }

  function findChildItems(parentId) {
    return allOwnSectionsList(customSections)
      .flatMap((sec) => ownSectionItems(sec, customItems))
      .filter((item) => item.childOf === parentId);
  }

  function ensureChildrenForParent(parentId, parentName, sectionId, qty) {
    setCustomItems((prev) => {
      const sectionItems = prev[sectionId] || [];
      const parentChildren = sectionItems.filter((item) => item.childOf === parentId);
      const otherItems = sectionItems.filter((item) => item.childOf !== parentId);
      if (qty <= 1) {
        return { ...prev, [sectionId]: otherItems };
      }
      const nextChildren = Array.from({ length: qty }, (_, index) => {
        const childId = `custom-${parentId}-child-${index + 1}`;
        const existingChild = parentChildren[index];
        return existingChild
          ? { ...existingChild, id: childId, t: `${parentName} (${index + 1}/${qty})` }
          : {
              id: childId,
              t: `${parentName} (${index + 1}/${qty})`,
              d: "",
              s: "",
              g: ["custom"],
              childOf: parentId,
            };
      });
      return { ...prev, [sectionId]: [...otherItems, ...nextChildren] };
    });
  }

  function removeChildrenForParent(parentId) {
    setCustomItems((prev) => {
      const next = {};
      Object.keys(prev).forEach((sectionId) => {
        next[sectionId] = (prev[sectionId] || []).filter((item) => item.childOf !== parentId);
      });
      return next;
    });
  }

  function syncChildParentState(itemId, nextChecked) {
    const children = findChildItems(itemId);
    if (!children.length) return;
    setState((prev) => {
      const next = { ...prev, [itemId]: nextChecked };
      children.forEach((child) => {
        next[child.id] = nextChecked;
      });
      return next;
    });
  }

  // ===== item / section interactions =====
  function toggleBuyTag(it) {
    const isBuyNow = effectiveIsBuy(it, buyOverrides);
    if (isBuyNow) {
      openConfirmModal(`Retirer « ${it.t} » de la liste à acheter ?`, () => {
        setBuyOverrides((prev) => ({ ...prev, [it.id]: { buy: false } }));
        setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== "b-" + it.id) }));
        removeChildrenForParent(it.id);
      });
    } else {
      openBuyModal(it);
    }
  }

  function handleItemToggleCheck(it, sectionId, isBuy) {
    const buyLinkId = "b-" + it.id;
    const isChild = !!it.childOf;
    const children = isChild ? [] : findChildItems(it.id);
    const origin = findItemOrigin(it.id, customItems, customSections);
    const isBagagePackingItem = origin?.chapterKey === "bagages" && origin?.sectionId !== "nl-bagages";

    if (state[it.id]) {
      openConfirmModal(`Décocher « ${it.t} » ?`, () => {
        setState((prev) => {
          const next = { ...prev, [it.id]: false };
          if (!isChild && children.length) {
            children.forEach((child) => {
              next[child.id] = false;
            });
          }
          if (isChild && it.childOf) {
            const siblings = findChildItems(it.childOf);
            const anyChecked = siblings.some((child) => child.id !== it.id ? prev[child.id] : false);
            next[it.childOf] = anyChecked;
          }
          return next;
        });
        if (isBagagePackingItem) {
          setBagagePacking((prev) => {
            const next = { ...prev };
            delete next[it.id];
            return next;
          });
        }
        if (isBuy) {
          setBudget((prev) => ({
            ...prev,
            items: prev.items.map((b) =>
              b.id === buyLinkId ? { ...b, bought: false } : b,
            ),
          }));
        }
      });
      return;
    }

    if (isChild && it.childOf) {
      setState((prev) => {
        const next = { ...prev, [it.id]: true };
        const parentId = it.childOf;
        const siblings = findChildItems(parentId);
        const allChecked = siblings.every((child) => child.id === it.id ? true : !!prev[child.id]);
        next[parentId] = allChecked;
        return next;
      });
      if (isBagagePackingItem) {
        setBagagePacking((prev) => ({ ...prev, [it.id]: prev[it.id] || "23" }));
      }
      return;
    }

    if (children.length) {
      setState((prev) => {
        const next = { ...prev, [it.id]: true };
        children.forEach((child) => {
          next[child.id] = true;
        });
        return next;
      });
      if (isBagagePackingItem) {
        setBagagePacking((prev) => ({ ...prev, [it.id]: prev[it.id] || "23" }));
      }
      if (isBuy) {
        setBudget((prev) => ({
          ...prev,
          items: prev.items.map((b) =>
            b.id === buyLinkId ? { ...b, bought: true } : b,
          ),
        }));
      }
      return;
    }

    if (isBuy) {
      const est = effectiveEst(it, buyOverrides) || 0;
      const qty = effectiveQty(it, buyOverrides) || 1;
      setState((prev) => ({ ...prev, [it.id]: true }));
      if (isBagagePackingItem) {
        setBagagePacking((prev) => ({ ...prev, [it.id]: prev[it.id] || "23" }));
      }
      setBudget((prev) => {
        const exists = prev.items.some((b) => b.id === buyLinkId);
        if (exists) {
          return {
            ...prev,
            items: prev.items.map((b) =>
              b.id === buyLinkId
                ? {
                    ...b,
                    est,
                    qty,
                    realUnit: b.realUnit,
                    realQty: b.realQty,
                    real: b.real,
                    bought: true,
                  }
                : b,
            ),
          };
        }
        return {
          ...prev,
          items: [
            ...prev.items,
            { id: buyLinkId, name: it.t, est, qty, realUnit: null, realQty: null, real: null, bought: true },
          ],
        };
      });
      return;
    }

    setState((prev) => ({ ...prev, [it.id]: true }));
  }

  function handleToggleSection(sectionId) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }
  function handleToggleDetail(itemId) {
    setOpenDetails((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function handleToggleChildren(itemId) {
    setOpenChildren((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function handleDeleteItem(ownerSectionId, itemId, itemName) {
    openConfirmModal(`Supprimer « ${itemName} » ?`, () => {
      const item = (customItems[ownerSectionId] || []).find((i) => i.id === itemId);
      setCustomItems((prev) => ({
        ...prev,
        [ownerSectionId]: (prev[ownerSectionId] || []).filter((i) => i.id !== itemId),
      }));
      setState((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setBagagePacking((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      if (item && (item.g || []).includes("buy")) {
        setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== "b-" + itemId) }));
      }
      if (item && !item.childOf) {
        removeChildrenForParent(item.id);
      }
    });
  }

  // ===== add item / add section =====
  function addItem({ sectionId, text, mustBuy, price, quantity, tag, comment }) {
    const value = (text || "").trim();
    if (!value) return null;
    const id = "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const g = ["custom"];
    if (tag) g.push(tag);
    if (mustBuy) g.push("buy");
    const item = { id, t: value, d: (comment || "").trim(), s: "", g };
    if (mustBuy) {
      item.est = Number(price) || 0;
      item.qty = Number(quantity) || 1;
    }
    setCustomItems((prev) => ({ ...prev, [sectionId]: [...(prev[sectionId] || []), item] }));
    if (mustBuy) {
      setBudget((prev) => ({
        ...prev,
        items: [...prev.items, { id: "b-" + id, name: value, est: item.est, qty: item.qty, real: null }],
      }));
    }
    return sectionId;
  }

  function handleAddItemConfirm(payload) {
    const target = addItem(payload);
    if (target) setOpenSections((prev) => ({ ...prev, [target]: true }));
    setAddItemModalOpen(false);
  }

  function handleAddSectionConfirm({ chapterKey, name, icon, hasPrices, linkedSectionId }) {
    const id = "custom-sec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const newSec = {
      id,
      ico: icon,
      nm: name,
      items: [],
      hasPrices,
      linkedSectionId: linkedSectionId || undefined,
      badge: linkedSectionId ? { t: "liée", c: "b-pur" } : undefined,
      note: linkedSectionId
        ? {
            t: "Cette section est liée : ses éléments apparaissent aussi dans la section liée, avec un seul état coché partagé.",
            c: "n-grn",
          }
        : undefined,
    };
    setCustomSections((prev) => ({ ...prev, [chapterKey]: [...(prev[chapterKey] || []), newSec] }));
    setActiveChapter(chapterKey);
    setOpenSections((prev) => ({ ...prev, [id]: true }));
    setAddSectionModalOpen(false);
  }

  // ===== budget panel interactions =====
  function toggleHaveTag(it) {
    const currentHave = effectiveHave(it, buyOverrides);
    setBuyOverrides((prev) => ({
      ...prev,
      [it.id]: { ...(prev[it.id] || {}), have: !currentHave },
    }));
  }

  function handleBuyRowToggle({ b, linkedId, bought, name }) {
    if (bought) {
      openConfirmModal(`Décocher « ${name} » ?`, () => {
        if (linkedId) {
          removeChildrenForParent(linkedId);
        }
        setBudget((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === b.id ? { ...it, bought: false } : it,
          ),
        }));
      });
      return;
    }
    const defaultUnit = b.realUnit ?? (b.real !== undefined && b.real !== null && b.qty ? Number(b.real) / Number(b.qty) : b.est) ?? 0;
    const defaultQty = b.realQty ?? b.qty ?? 1;
    openRealPriceModal(name, defaultUnit, defaultQty, ({ price, quantity }) => {
      const sectionOrigin = linkedId ? findItemOrigin(linkedId, customItems, customSections) : null;
      if (linkedId && sectionOrigin) {
        ensureChildrenForParent(linkedId, name, sectionOrigin.sectionId, quantity);
      }
      setBudget((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === b.id
            ? {
                ...it,
                realUnit: price,
                realQty: quantity,
                real: price * quantity,
                bought: true,
              }
            : it,
        ),
      }));
    });
  
  }

  function handleBudgetEstQtyChange(id, value) {
    setBudget((prev) => ({
      ...prev,
      items: prev.items.map((b) =>
        b.id === id
          ? {
              ...b,
              qty: value === "" ? 1 : Math.max(1, Number(value)),
            }
          : b,
      ),
    }));
  }

  function handleBudgetRealUnitChange(id, value) {
    setBudget((prev) => ({
      ...prev,
      items: prev.items.map((b) =>
        b.id === id
          ? {
              ...b,
              realUnit: value === "" ? null : Number(value),
              real:
                value === "" || b.realQty == null
                  ? b.real
                  : Number(value) * Number(b.realQty || 1),
            }
          : b,
      ),
    }));
  }

  function handleBudgetRealQtyChange(id, value) {
    setBudget((prev) => {
      const nextItems = prev.items.map((b) =>
        b.id === id
          ? {
              ...b,
              realQty: value === "" ? null : Math.max(1, Number(value)),
              real:
                value === "" || b.realUnit == null
                  ? b.real
                  : Number(b.realUnit || 0) * Math.max(1, Number(value)),
            }
          : b,
      );
      const updatedRow = nextItems.find((item) => item.id === id);
      if (updatedRow && updatedRow.bought && updatedRow.id.startsWith("b-")) {
        const linkedId = updatedRow.id.slice(2);
        const origin = findItemOrigin(linkedId, customItems, customSections);
        if (origin) {
          ensureChildrenForParent(linkedId, updatedRow.name, origin.sectionId, updatedRow.realQty || 1);
        }
      }
      return { ...prev, items: nextItems };
    });
  }

function handleBagageAssignmentChange(itemId, assignment, itemName) {
  const current = bagagePacking[itemId];

  // first-time assignment (or re-picking the same one) — just set it
  if (!current || current === assignment) {
    setBagagePacking((prev) => ({ ...prev, [itemId]: assignment }));
    return;
  }

  // already assigned to the other suitcase — confirm before switching
  const label = (v) => (v === "23" ? "Valise soute — 23 kg" : "Bagage cabine — 10 kg");
  openConfirmModal(
    `Déplacer « ${itemName} » de ${label(current)} vers ${label(assignment)} ?`,
    () => {
      setBagagePacking((prev) => ({ ...prev, [itemId]: assignment }));
    },
  );
}

  function handleDeleteBudgetRow(id) {
    const row = budget.items.find((b) => b.id === id);
    openConfirmModal(`Retirer « ${row ? row.name : "ce poste"} » du budget ?`, () => {
      setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== id) }));
      const linkedId = id.startsWith("b-") ? id.slice(2) : null;
      if (linkedId && findItemById(linkedId, customItems, customSections)) {
        setBuyOverrides((prev) => ({ ...prev, [linkedId]: { buy: false } }));
      }
      if (linkedId) {
        removeChildrenForParent(linkedId);
      }
    });
  }

  function handleBudgetTargetChange(value) {
    setBudget((prev) => ({ ...prev, target: Number(value) || 0 }));
  }

  // ===== reset section (arm-then-confirm, no modal — matches original) =====
  function handleResetClick() {
    if (activeChapter === "acheter") return;
    if (resetArmed) {
      const items = allItems(chapterSections(activeChapter, customSections), customItems);
      setState((prev) => {
        const next = { ...prev };
        items.forEach((it) => delete next[it.id]);
        return next;
      });
      setResetArmed(false);
      clearTimeout(resetTimerRef.current);
    } else {
      setResetArmed(true);
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setResetArmed(false), 3000);
    }
  }
  function handleRestoreOriginal() {
    openConfirmModal(
      "Restaurer l'état original ? Cela réinitialisera toutes les données et écrasera l'état actuel.",
      () => {
        const defaults = defaultAppState(CHAPTER_KEYS);
        setState(defaults.state);
        setCustomItems(defaults.customItems);
        setBudget(defaults.budget);
        setBuyOverrides(defaults.buyOverrides);
        setCustomSections(defaults.customSections);
        setBagagePacking(defaults.bagagePacking || {});
        setResetArmed(false);
        clearTimeout(resetTimerRef.current);
      },
    );
  }
  // ===== export data.js =====
  function buildExport() {
    const strip = (it) => {
      const isBuy = effectiveIsBuy(it, buyOverrides);
      const est = effectiveEst(it, buyOverrides);
      const qty = effectiveQty(it, buyOverrides);
      const outG = (it.g || []).filter((x) => x !== "custom" && x !== "buy");
      if (isBuy) outG.push("buy");
      const out = { id: it.id, t: it.t, d: it.d || "", s: it.s || "", g: outG };
      if (isBuy && est !== undefined) out.est = est;
      if (isBuy && qty !== undefined) out.qty = qty;
      return out;
    };
    const merge = (secs) =>
      secs.map((sec) => ({ ...sec, items: sectionItems(sec, customItems, customSections).map(strip) }));

    let out = "export const BAGAGE_SECS = " + JSON.stringify(merge(BAGAGE_SECS), null, 2) + ";\n\n";
    out += "export const ACHETER_SECS = " + JSON.stringify(merge(ACHETER_SECS), null, 2) + ";\n\n";
    out += "export const BUDGET = " + JSON.stringify(budget, null, 2) + ";\n";
    return out;
  }

  function handleExport() {
    const content = buildExport();
    const blob = new Blob([content], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== render =====
  const sectionsForActiveChapter = chapterSections(activeChapter, customSections);
  const bagageSectionItems = allItems(chapterSections("bagages", customSections), customItems);
  const bagagePreparationCandidates = bagageSectionItems.filter((it) => {
    const origin = findItemOrigin(it.id, customItems, customSections);
    return origin?.chapterKey === "bagages" && origin?.sectionId !== "nl-bagages";
  });
  const checkedBagagePreparation = bagagePreparationCandidates.filter((it) => state[it.id]);
  const bagageFilterOptions = [
    { id: "all", label: "Tous" },
    { id: "23", label: "23 kg" },
    { id: "10", label: "10 kg" },
    { id: "unassigned", label: "Non défini" },
  ];
  const filteredBagagePreparation = checkedBagagePreparation.filter((it) => {
    if (bagageFilter === "all") return true;
    if (bagageFilter === "unassigned") return !bagagePacking[it.id];
    return bagagePacking[it.id] === bagageFilter;
  });
  const groupedBagagePreparation = {
    "23": filteredBagagePreparation.filter((it) => bagagePacking[it.id] === "23"),
    "10": filteredBagagePreparation.filter((it) => bagagePacking[it.id] === "10"),
    unassigned: filteredBagagePreparation.filter((it) => !bagagePacking[it.id]),
  };

  return (
    <div className="app">
      <h1 className="sr-only">
        Checklist interactive du dossier de départ pour Besançon, avec suivi de budget et de progression
      </h1>
      <div className="app-header">
        <Ticket state={state} customItems={customItems} customSections={customSections} />
        <div className="header-actions">
          <button className="add-global-btn" onClick={() => setAddItemModalOpen(true)}>
            + Ajouter un élément
          </button>
          <button className="add-section-btn" onClick={() => setAddSectionModalOpen(true)}>
            + Nouvelle section
          </button>
          <button className="export-btn" onClick={handleExport}>
            ⬇ exporter data.js
          </button>
        </div>
        <TabBar
          activeChapter={activeChapter}
          onSelect={setActiveChapter}
          state={state}
          customItems={customItems}
          customSections={customSections}
          budget={budget}
          buyOverrides={buyOverrides}
        />
      </div>

      <div className="tab-panel-wrap">
        <div id="panel">
          {activeChapter === "acheter" ? (
            <BudgetPanel
              budget={budget}
              state={state}
              buyOverrides={buyOverrides}
              customItems={customItems}
              customSections={customSections}
              onToggleRow={handleBuyRowToggle}
              onEstQtyChange={handleBudgetEstQtyChange}
              onRealUnitChange={handleBudgetRealUnitChange}
              onRealQtyChange={handleBudgetRealQtyChange}
              onDeleteRow={handleDeleteBudgetRow}
              onTargetChange={handleBudgetTargetChange}
            />
          ) : (
            <>
                {activeChapter !== "preparation" &&
                  sectionsForActiveChapter.map((sec) => (
                <SectionBlock
                  key={sec.id}
                  sec={sec}
                  customItems={customItems}
                  customSections={customSections}
                  state={state}
                  budget={budget}
                  buyOverrides={buyOverrides}
                  openSections={openSections}
                  openDetails={openDetails}
                  openChildren={openChildren}
                  onToggleSection={handleToggleSection}
                  onToggleCheck={handleItemToggleCheck}
                  onToggleDetail={handleToggleDetail}
                  onDeleteItem={handleDeleteItem}
                  onToggleBuy={toggleBuyTag}
                  onToggleHave={toggleHaveTag}
                  onToggleChildren={handleToggleChildren}
                />
              ))}
              {activeChapter === "preparation" ? (
                <div className="bagage-preparation-panel">
                  <div className="bagage-packing-head">Préparation bagage</div>
                  <div className="bagage-packing-controls">
                    {bagageFilterOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`bagage-filter-btn ${bagageFilter === option.id ? "active" : ""}`}
                        onClick={() => setBagageFilter(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {checkedBagagePreparation.length === 0 ? (
                    <div className="bagage-packing-empty">Coche des éléments dans Bagages pour les ajouter à Préparation.</div>
                  ) : (
                    <>
                      {bagageFilter === "all" && groupedBagagePreparation["23"].length > 0 ? (
                        <div className="bagage-packing-group">
                          <div className="bagage-packing-group-title">Valise soute — 23 kg</div>
                          {groupedBagagePreparation["23"].map((it) => (
                          <div
                            key={it.id}
                            className={`bagage-packing-item ${bagagePacking[it.id] ? "assigned" : ""}`}
                          >
                            <span>{it.t}</span>
                            <div className="bagage-assignment-buttons">
                              <button
                                type="button"
                                className={bagagePacking[it.id] === "23" ? "active" : ""}
                                onClick={() => handleBagageAssignmentChange(it.id, "23", it.t)}
                              >
                                23 kg
                              </button>
                              <button
                                type="button"
                                className={bagagePacking[it.id] === "10" ? "active" : ""}
                                onClick={() => handleBagageAssignmentChange(it.id, "10", it.t)}
                              >
                                10 kg
                              </button>
                            </div>
                          </div>
                          ))}
                        </div>
                      ) : null}
                      {bagageFilter === "all" && groupedBagagePreparation["10"].length > 0 ? (
                        <div className="bagage-packing-group">
                          <div className="bagage-packing-group-title">Bagage cabine — 10 kg</div>
                          {groupedBagagePreparation["10"].map((it) => (
                            <div key={it.id} className={`bagage-packing-item ${bagagePacking[it.id] ? "assigned" : ""}`}
>
                              <span>{it.t}</span>
                              <div className="bagage-assignment-buttons">
                                <button
                                  type="button"
                                  className={bagagePacking[it.id] === "23" ? "active" : ""}
                                  onClick={() => handleBagageAssignmentChange(it.id, "23", it.t)}
                                >
                                  23 kg
                                </button>
                                <button
                                  type="button"
                                  className={bagagePacking[it.id] === "10" ? "active" : ""}
                                  onClick={() => handleBagageAssignmentChange(it.id, "10", it.t)}
                                >
                                  10 kg
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {bagageFilter === "all" && groupedBagagePreparation.unassigned.length > 0 ? (
                        <div className="bagage-packing-group">
                          <div className="bagage-packing-group-title">Non défini</div>
                          {groupedBagagePreparation.unassigned.map((it) => (
                            <div key={it.id} className={`bagage-packing-item ${bagagePacking[it.id] ? "assigned" : ""}`}
>
                              <span>{it.t}</span>
                              <div className="bagage-assignment-buttons">
                                <button
                                  type="button"
                                  className={bagagePacking[it.id] === "23" ? "active" : ""}
                                  onClick={() => handleBagageAssignmentChange(it.id, "23", it.t)}
                                >
                                  23 kg
                                </button>
                                <button
                                  type="button"
                                  className={bagagePacking[it.id] === "10" ? "active" : ""}
                                  onClick={() => handleBagageAssignmentChange(it.id, "10", it.t)}
                                >
                                  10 kg
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {bagageFilter !== "all" ? (
                        <div className="bagage-packing-group">
                          <div className="bagage-packing-group-title">
                            {bagageFilter === "23" ? "Valise soute — 23 kg" : bagageFilter === "10" ? "Bagage cabine — 10 kg" : "Non défini"}
                          </div>
                          {filteredBagagePreparation.length > 0 ? (
                            filteredBagagePreparation.map((it) => (
                              <div key={it.id} className={`bagage-packing-item ${bagagePacking[it.id] ? "assigned" : ""}`}
>
                                <span>{it.t}</span>
                                <div className="bagage-assignment-buttons">
                                  <button
                                    type="button"
                                    className={bagagePacking[it.id] === "23" ? "active" : ""}
                                    onClick={() => handleBagageAssignmentChange(it.id, "23", it.t)}
                                  >
                                    23 kg
                                  </button>
                                  <button
                                    type="button"
                                    className={bagagePacking[it.id] === "10" ? "active" : ""}
                                    onClick={() => handleBagageAssignmentChange(it.id, "10", it.t)}
                                  >
                                    10 kg
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bagage-packing-empty">Aucun élément dans cette vue.</div>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="foot-row" style={{ display: activeChapter === "acheter" ? "none" : "flex" }}>
        <button className="reset-btn" onClick={handleResetClick}>
          {resetArmed ? "cliquer à nouveau pour confirmer" : "réinitialiser cette section"}
        </button>
        <button className="reset-btn" onClick={handleRestoreOriginal}>
          restaurer l'original
        </button>
        <span className="sync-note">{syncNote}</span>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={handleConfirmModalConfirm}
        onCancel={closeConfirmModal}
      />
      <BuyModal
        open={buyModal.open}
        itemName={buyModal.itemName}
        defaultPrice={buyModal.defaultPrice}
        defaultQuantity={buyModal.defaultQuantity}
        onConfirm={handleBuyModalConfirm}
        onCancel={closeBuyModal}
      />
      <RealPriceModal
        open={realPriceModal.open}
        itemName={realPriceModal.itemName}
        defaultPrice={realPriceModal.defaultPrice}
        defaultQuantity={realPriceModal.defaultQuantity}
        onConfirm={handleRealPriceConfirm}
        onCancel={closeRealPriceModal}
      />
      <AddItemModal
        open={addItemModalOpen}
        activeChapter={activeChapter}
        openSections={openSections}
        customSections={customSections}
        customItems={customItems}
        onConfirm={handleAddItemConfirm}
        onCancel={() => setAddItemModalOpen(false)}
      />
      <AddSectionModal
        open={addSectionModalOpen}
        activeChapter={activeChapter}
        customSections={customSections}
        onConfirm={handleAddSectionConfirm}
        onCancel={() => setAddSectionModalOpen(false)}
      />
    </div>
  );
}
