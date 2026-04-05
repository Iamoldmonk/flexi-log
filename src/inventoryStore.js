// Persistent inventory store — backed by localStorage
// key: fieldId, value: { current, opening, min, unit, label, history: [{date, change, remaining}] }

const STORAGE_KEY = "flexi_inventory";

function loadStore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
}

let store = loadStore();

export function initStock(fieldId, { openingStock, minStock, unit, label }) {
  if (!store[fieldId]) {
    store[fieldId] = {
      current: Number(openingStock) || 0,
      opening: Number(openingStock) || 0,
      min: Number(minStock) || 0,
      unit: unit || "",
      label: label || "",
      history: [],
    };
    saveStore();
  } else {
    // update settings without resetting stock
    store[fieldId].opening = Number(openingStock) || 0;
    store[fieldId].min = Number(minStock) || 0;
    store[fieldId].unit = unit || "";
    store[fieldId].label = label || "";
    saveStore();
  }
}

export function resetStock(fieldId, openingStock) {
  if (store[fieldId]) {
    store[fieldId].current = Number(openingStock) || 0;
    store[fieldId].history = [];
    saveStore();
  }
}

export function getStock(fieldId) {
  return store[fieldId] || null;
}

export function applyUsage(fieldId, total, action = "subtract", breakdown = {}) {
  if (!store[fieldId]) return null;
  const amt = Number(total) || 0;
  const prev = store[fieldId].current;
  store[fieldId].current = action === "subtract"
    ? Math.max(0, prev - amt)
    : prev + amt;
  store[fieldId].history.unshift({
    date: new Date().toLocaleString(),
    change: action === "subtract" ? -amt : amt,
    used: breakdown.used || amt,
    wasted: breakdown.wasted || 0,
    remaining: store[fieldId].current,
  });
  saveStore();
  return store[fieldId];
}

export function isLowStock(fieldId) {
  const s = store[fieldId];
  if (!s || !s.min) return false;
  return s.current <= s.min;
}

export function getAllStock() {
  return { ...store };
}
