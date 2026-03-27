// In-memory inventory store
// key: fieldId, value: { current, opening, min, unit, label, history: [{date, change, remaining, submittedBy}] }

const store = {};

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
  } else {
    // update settings without resetting stock
    store[fieldId].opening = Number(openingStock) || 0;
    store[fieldId].min = Number(minStock) || 0;
    store[fieldId].unit = unit || "";
    store[fieldId].label = label || "";
  }
}

export function resetStock(fieldId, openingStock) {
  if (store[fieldId]) {
    store[fieldId].current = Number(openingStock) || 0;
    store[fieldId].history = [];
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
