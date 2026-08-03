import { useEffect, useRef, useState } from "react";
import { CHAPTERS_META, DEPART_SECS, BAGAGE_SECS, ACHETER_SECS, AFTER_SECS } from "./data.js";
import {
  chapterSections,
  sectionItems,
  allItems,
  effectiveIsBuy,
  effectiveEst,
  findItemById,
} from "./logic.js";
import {
  loadState,
  loadCustomItems,
  loadBudget,
  loadBuyOverrides,
  loadCustomSections,
  saveAll,
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

export default function App() {
  // ----- core persisted state -----
  const [state, setState] = useState(() => loadState());
  const [customItems, setCustomItems] = useState(() => loadCustomItems());
  const [budget, setBudget] = useState(() => loadBudget());
  const [buyOverrides, setBuyOverrides] = useState(() => loadBuyOverrides());
  const [customSections, setCustomSections] = useState(() => loadCustomSections(CHAPTER_KEYS));

  // ----- UI-only state -----
  const [activeChapter, setActiveChapter] = useState("depart");
  const [openSections, setOpenSections] = useState({});
  const [openDetails, setOpenDetails] = useState({});
  const [syncNote, setSyncNote] = useState("enregistré dans ce navigateur");
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimerRef = useRef(null);

  // ----- modal state -----
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "" });
  const confirmCallbackRef = useRef(null);

  const [buyModal, setBuyModal] = useState({ open: false, itemName: "", defaultPrice: 0 });
  const buyModalItemRef = useRef(null);

  const [realPriceModal, setRealPriceModal] = useState({ open: false, itemName: "", defaultPrice: 0 });
  const realPriceCallbackRef = useRef(null);

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);

  // ----- persistence: debounce-save whenever core state changes -----
  const saveTimerRef = useRef(null);
  useEffect(() => {
    setSyncNote("enregistrement…");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const ok = saveAll({ state, customItems, budget, buyOverrides, customSections });
      setSyncNote(ok ? "enregistré dans ce navigateur" : "non enregistré");
    }, 200);
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
    buyModalItemRef.current = it;
    setBuyModal({ open: true, itemName: it.t, defaultPrice: effectiveEst(it, buyOverrides) || "" });
  }
  function closeBuyModal() {
    buyModalItemRef.current = null;
    setBuyModal({ open: false, itemName: "", defaultPrice: 0 });
  }
  function handleBuyModalConfirm(price) {
    const it = buyModalItemRef.current;
    if (!it) return closeBuyModal();
    const est = Number(price) || 0;
    setBuyOverrides((prev) => ({ ...prev, [it.id]: { buy: true, est } }));
    setBudget((prev) => {
      const exists = prev.items.some((b) => b.id === "b-" + it.id);
      const items = exists
        ? prev.items.map((b) => (b.id === "b-" + it.id ? { ...b, est } : b))
        : [...prev.items, { id: "b-" + it.id, name: it.t, est, real: null }];
      return { ...prev, items };
    });
    closeBuyModal();
  }

  function openRealPriceModal(itemName, defaultPrice, cb) {
    realPriceCallbackRef.current = cb;
    setRealPriceModal({ open: true, itemName, defaultPrice: defaultPrice || "" });
  }
  function closeRealPriceModal() {
    realPriceCallbackRef.current = null;
    setRealPriceModal({ open: false, itemName: "", defaultPrice: 0 });
  }
  function handleRealPriceConfirm(price) {
    const cb = realPriceCallbackRef.current;
    closeRealPriceModal();
    if (cb) cb(Number(price) || 0);
  }

  // ===== item / section interactions =====
  function toggleBuyTag(it) {
    const isBuyNow = effectiveIsBuy(it, buyOverrides);
    if (isBuyNow) {
      openConfirmModal(`Retirer « ${it.t} » de la liste à acheter ?`, () => {
        setBuyOverrides((prev) => ({ ...prev, [it.id]: { buy: false } }));
        setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== "b-" + it.id) }));
      });
    } else {
      openBuyModal(it);
    }
  }

  function handleItemToggleCheck(it, sectionId, isBuy) {
    if (state[it.id]) {
      openConfirmModal(`Décocher « ${it.t} » ?`, () => {
        setState((prev) => ({ ...prev, [it.id]: false }));
      });
      return;
    }
    if (isBuy) {
      const buyLinkId = "b-" + it.id;
      const bItem = budget.items.find((b) => b.id === buyLinkId);
      const defaultPrice = bItem ? (bItem.real ?? bItem.est) : 0;
      openRealPriceModal(it.t, defaultPrice, (price) => {
        setState((prev) => ({ ...prev, [it.id]: true }));
        setBudget((prev) => ({
          ...prev,
          items: prev.items.map((b) => (b.id === buyLinkId ? { ...b, real: price } : b)),
        }));
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
      if (item && (item.g || []).includes("buy")) {
        setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== "b-" + itemId) }));
      }
    });
  }

  // ===== add item / add section =====
  function addItem({ sectionId, text, mustBuy, price, tag, comment }) {
    const value = (text || "").trim();
    if (!value) return null;
    const id = "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const g = ["custom"];
    if (tag) g.push(tag);
    if (mustBuy) g.push("buy");
    const item = { id, t: value, d: (comment || "").trim(), s: "", g };
    if (mustBuy) item.est = Number(price) || 0;
    setCustomItems((prev) => ({ ...prev, [sectionId]: [...(prev[sectionId] || []), item] }));
    if (mustBuy) {
      setBudget((prev) => ({
        ...prev,
        items: [...prev.items, { id: "b-" + id, name: value, est: item.est, real: null }],
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
  function handleBuyRowToggle({ b, linkedId, bought, name }) {
    if (bought) {
      openConfirmModal(`Décocher « ${name} » ?`, () => {
        if (linkedId) {
          setState((prev) => ({ ...prev, [linkedId]: false }));
        } else {
          setBudget((prev) => ({
            ...prev,
            items: prev.items.map((it) => (it.id === b.id ? { ...it, bought: false } : it)),
          }));
        }
      });
      return;
    }
    const defaultPrice = b.real ?? b.est;
    openRealPriceModal(name, defaultPrice, (price) => {
      if (linkedId) setState((prev) => ({ ...prev, [linkedId]: true }));
      setBudget((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === b.id ? { ...it, real: price, bought: linkedId ? it.bought : true } : it
        ),
      }));
    });
  }

  function handleBudgetRealChange(id, value) {
    setBudget((prev) => ({
      ...prev,
      items: prev.items.map((b) => (b.id === id ? { ...b, real: value === "" ? null : Number(value) } : b)),
    }));
  }

  function handleDeleteBudgetRow(id) {
    const row = budget.items.find((b) => b.id === id);
    openConfirmModal(`Retirer « ${row ? row.name : "ce poste"} » du budget ?`, () => {
      setBudget((prev) => ({ ...prev, items: prev.items.filter((b) => b.id !== id) }));
      const linkedId = id.startsWith("b-") ? id.slice(2) : null;
      if (linkedId && findItemById(linkedId, customItems, customSections)) {
        setBuyOverrides((prev) => ({ ...prev, [linkedId]: { buy: false } }));
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

  // ===== export data.js =====
  function buildExport() {
    const strip = (it) => {
      const isBuy = effectiveIsBuy(it, buyOverrides);
      const est = effectiveEst(it, buyOverrides);
      const outG = (it.g || []).filter((x) => x !== "custom" && x !== "buy");
      if (isBuy) outG.push("buy");
      const out = { id: it.id, t: it.t, d: it.d || "", s: it.s || "", g: outG };
      if (isBuy && est !== undefined) out.est = est;
      return out;
    };
    const merge = (secs) =>
      secs.map((sec) => ({ ...sec, items: sectionItems(sec, customItems, customSections).map(strip) }));

    let out = "export const DEPART_SECS = " + JSON.stringify(merge(DEPART_SECS), null, 2) + ";\n\n";
    out += "export const BAGAGE_SECS = " + JSON.stringify(merge(BAGAGE_SECS), null, 2) + ";\n\n";
    out += "export const ACHETER_SECS = " + JSON.stringify(merge(ACHETER_SECS), null, 2) + ";\n\n";
    out += "export const AFTER_SECS = " + JSON.stringify(merge(AFTER_SECS), null, 2) + ";\n\n";
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
        />
      </div>

      <div className="tab-panel-wrap">
        <div id="panel">
          {activeChapter === "acheter" ? (
            <BudgetPanel
              budget={budget}
              state={state}
              customItems={customItems}
              customSections={customSections}
              onToggleRow={handleBuyRowToggle}
              onRealChange={handleBudgetRealChange}
              onDeleteRow={handleDeleteBudgetRow}
              onTargetChange={handleBudgetTargetChange}
            />
          ) : (
            sectionsForActiveChapter.map((sec) => (
              <SectionBlock
                key={sec.id}
                sec={sec}
                customItems={customItems}
                customSections={customSections}
                state={state}
                buyOverrides={buyOverrides}
                openSections={openSections}
                openDetails={openDetails}
                onToggleSection={handleToggleSection}
                onToggleCheck={handleItemToggleCheck}
                onToggleDetail={handleToggleDetail}
                onDeleteItem={handleDeleteItem}
                onToggleBuy={toggleBuyTag}
              />
            ))
          )}
        </div>
      </div>

      <div className="foot-row" style={{ display: activeChapter === "acheter" ? "none" : "flex" }}>
        <button className="reset-btn" onClick={handleResetClick}>
          {resetArmed ? "cliquer à nouveau pour confirmer" : "réinitialiser cette section"}
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
        onConfirm={handleBuyModalConfirm}
        onCancel={closeBuyModal}
      />
      <RealPriceModal
        open={realPriceModal.open}
        itemName={realPriceModal.itemName}
        defaultPrice={realPriceModal.defaultPrice}
        onConfirm={handleRealPriceConfirm}
        onCancel={closeRealPriceModal}
      />
      <AddItemModal
        open={addItemModalOpen}
        activeChapter={activeChapter}
        openSections={openSections}
        customSections={customSections}
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
