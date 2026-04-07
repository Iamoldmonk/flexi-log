import { useState, useRef, useEffect, useMemo } from "react";
import { initStock, getStock, applyUsage, isLowStock } from "./inventoryStore";
import { shouldShowToday, incrementSubmissionCount } from "./recurrenceUtils";

// ─── Image compression: resize + convert to WebP ────────────────────────────
function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.src = URL.createObjectURL(file);
  });
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ fields, values, sigDone = {} }) {
  if (fields.length === 0) return null;

  // Count field completions + sub-task completions
  let totalItems = 0, doneItems = 0;
  fields.forEach(f => {
    totalItems++; // the field itself
    const subTasks = f.subTasks || [];
    totalItems += subTasks.length; // each sub-task is its own item

    // sub-tasks done?
    const checked = values[f.id + "_sub"] || {};
    const allSubTasksDone = subTasks.length > 0 && subTasks.every((_, i) => checked[i]);
    subTasks.forEach((_, i) => { if (checked[i]) doneItems++; });

    // field done? — also counts as done if all its sub-tasks are completed
    let fieldDone = false;
    if (f.type === "signature") fieldDone = !!sigDone[f.id];
    else if (f.type === "toggle") fieldDone = !!values[f.id];
    else if (f.type === "rating") fieldDone = (values[f.id] || 0) > 0;
    else if (f.type === "timestamp") fieldDone = true;
    else fieldDone = !!values[f.id];
    if (fieldDone || allSubTasksDone) doneItems++;
  });

  const pct = Math.round((doneItems / totalItems) * 100);
  const color = pct === 100 ? "#2d9e2d" : pct >= 50 ? "#2980b9" : "#e67e22";
  const fieldsDone = fields.filter(f => {
    const sub = values[f.id + "_sub"] || {};
    const allSub = (f.subTasks || []).length > 0 && (f.subTasks || []).every((_, i) => sub[i]);
    if (allSub) return true;
    if (f.type === "signature") return !!sigDone[f.id];
    if (f.type === "toggle") return !!values[f.id];
    if (f.type === "rating") return (values[f.id] || 0) > 0;
    if (f.type === "timestamp") return true;
    return !!values[f.id];
  }).length;

  return (
    <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #F0F0F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>Progress</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {fieldsDone}/{fields.length} fields · {doneItems}/{totalItems} items {pct === 100 ? "✓" : `(${pct}%)`}
        </span>
      </div>
      <div style={{ height: 7, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ─── Sub-tasks component ──────────────────────────────────────────────────────
function SubTasks({ subTasks, fieldId, values, onChange, subtaskPhotos }) {
  const fileRefs = useRef({});
  if (!subTasks || subTasks.length === 0) return null;
  const checked = values[fieldId + "_sub"] || {};
  const photos = values[fieldId + "_subphotos"] || {};
  const doneCount = Object.values(checked).filter(Boolean).length;

  const handlePhoto = async (i, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    onChange(fieldId + "_subphotos", { ...photos, [i]: compressed });
  };

  return (
    <div style={{ marginTop: 10, padding: "10px 12px", background: "#F8F8F8", borderRadius: 9, border: "1.5px solid #EBEBEB" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.06em", marginBottom: 6 }}>
        SUB-TASKS — {doneCount}/{subTasks.length}
      </div>
      <div style={{ height: 4, background: "#E8E8E8", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${subTasks.length > 0 ? (doneCount / subTasks.length) * 100 : 0}%`, background: "#2d9e2d", borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      {subTasks.map((st, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", background: checked[i] ? "#F0FFF5" : "#fff", borderRadius: 8, border: `1.5px solid ${checked[i] ? "#B0EAC8" : "#E8E8E8"}`, transition: "all 0.15s", cursor: "pointer" }}
            onClick={() => onChange(fieldId + "_sub", { ...checked, [i]: !checked[i] })}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[i] ? "#2d9e2d" : "#D8D8D8"}`, background: checked[i] ? "#2d9e2d" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {checked[i] && <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 12, color: checked[i] ? "#2d9e2d" : "#1a1a1a", textDecoration: checked[i] ? "line-through" : "none", flex: 1 }}>{st}</span>
            {/* Photo capture button per sub-task — only if admin enabled */}
            {subtaskPhotos && (
              <>
                <div onClick={e => { e.stopPropagation(); fileRefs.current[i]?.click(); }} style={{ width: 28, height: 28, borderRadius: 6, background: photos[i] ? "#2d9e2d18" : "#F0F0F0", border: `1.5px solid ${photos[i] ? "#2d9e2d35" : "#E8E8E8"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", fontSize: 12, color: photos[i] ? "#2d9e2d" : "#aaa" }}>
                  {photos[i] ? "✓" : "◉"}
                </div>
                <input ref={el => fileRefs.current[i] = el} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handlePhoto(i, e)} />
              </>
            )}
          </div>
          {photos[i] && (
            <div style={{ marginTop: 4, paddingLeft: 36, display: "flex", alignItems: "center", gap: 6 }}>
              <img src={photos[i]} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1.5px solid #E8E8E8" }} />
              <button onClick={() => onChange(fieldId + "_subphotos", { ...photos, [i]: null })} style={{ fontSize: 11, color: "#ff6060", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Recurrence label helper ──────────────────────────────────────────────────
function recurrenceLabel(tpl) {
  const rec = tpl.recurrence;
  if (!rec || typeof rec === "string") return rec || "Daily";
  if (rec.quick !== "Custom...") return rec.quick || "Every day";
  const iv = rec.interval || 1;
  const unit = rec.unit || "day";
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let label = `Every ${iv > 1 ? iv + " " : ""}${unit}${iv > 1 ? "s" : ""}`;
  if (unit === "week" && (rec.days || []).length > 0) {
    label += " on " + rec.days.sort().map(d => DAYS[d]).join(", ");
  }
  if (rec.endsType === "on" && rec.endsDate) label += ` until ${rec.endsDate}`;
  if (rec.endsType === "after") label += `, ${rec.endsAfter || 1} time${(rec.endsAfter || 1) > 1 ? "s" : ""}`;
  return label;
}

// ─── Date + time helpers ─────────────────────────────────────────────────────
function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function elapsedLabel(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getExpiryTime(template) {
  const hours = template.expiryHours ?? 15;
  if (hours <= 0) return null; // 0 means no expiry
  const timeParts = (template.time || "08:00").split(":");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(timeParts[0]) || 8, parseInt(timeParts[1]) || 0);
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

function expiryStatus(template) {
  const expiry = getExpiryTime(template);
  if (!expiry) return { expired: false, label: "" };
  const now = Date.now();
  const diff = expiry.getTime() - now;
  if (diff <= 0) return { expired: true, label: "Expired" };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { expired: false, label: `Expires in ${mins}m` };
  const hrs = Math.floor(mins / 60);
  return { expired: false, label: `Expires in ${hrs}h ${mins % 60}m` };
}

const DEFAULT_TEMPLATES = [
  {
    id: "t1", name: "Morning Opening Checklist", recurrence: "Daily", time: "08:00",
    fields: [
      { id: "f1", type: "toggle", label: "Unlock and open premises", required: true, yesLabel: "Done", noLabel: "Skip", toggleColor: "#2d9e2d" },
      { id: "f2", type: "toggle", label: "Check refrigeration temperatures", required: true, yesLabel: "Done", noLabel: "Skip", toggleColor: "#2d9e2d" },
      { id: "f3", type: "number", label: "Coconuts used", required: false, unit: "pcs", trackInventory: true, openingStock: "500", minStock: "50", inventoryAction: "subtract" },
      { id: "f4", type: "photo", label: "Photo of storage area", required: false, forceCapture: false, maxPhotos: 1 },
      { id: "f5", type: "rating", label: "Overall readiness score", required: false, maxStars: 5, ratingLabel: "How ready is the station?" },
      { id: "f6", type: "text", label: "Any issues to report?", required: false, placeholder: "Describe any issues found", multiline: true },
      { id: "f7", type: "signature", label: "Staff sign-off", required: true, sigNote: "I confirm all opening tasks are complete" },
    ]
  }
];

const S = {
  label: { fontSize: 12, fontWeight: 600, color: "#1a1a1a", display: "block", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1.5px solid #E8E8E8",
    borderRadius: 9, fontSize: 13, color: "#1a1a1a", fontFamily: "inherit",
    background: "#FAFAFA", boxSizing: "border-box", outline: "none",
  },
};

function StockBadge({ fieldId, unit }) {
  const stock = getStock(fieldId);
  if (!stock) return null;
  const low = isLowStock(fieldId);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 12px", borderRadius: 9, marginBottom: 8,
      background: low ? "#FFF8F0" : "#F0FFF5",
      border: "1.5px solid " + (low ? "#FFD5A0" : "#B0EAC8"),
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: low ? "#e67e22" : "#2d9e2d", letterSpacing: "0.05em", marginBottom: 2 }}>
          {low ? "WARN LOW STOCK" : "CURRENT STOCK"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: low ? "#e67e22" : "#1a1a1a" }}>
          {stock.current} <span style={{ fontSize: 13, fontWeight: 400, color: "#888" }}>{stock.unit}</span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>Opening stock</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{stock.opening} {stock.unit}</div>
        {stock.min > 0 && <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }}>Min: {stock.min} {stock.unit}</div>}
      </div>
    </div>
  );
}

function ToggleField({ field, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[{ l: field.yesLabel || "Done", v: "yes", c: field.toggleColor || "#2d9e2d" },
        { l: field.noLabel || "Skip", v: "no", c: "#999" }].map(b => (
        <button key={b.v} onClick={() => onChange(value === b.v ? null : b.v)} style={{
          flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 700,
          border: "2px solid " + (value === b.v ? b.c : "#E8E8E8"),
          background: value === b.v ? b.c + "18" : "#FAFAFA",
          color: value === b.v ? b.c : "#aaa", cursor: "pointer", fontFamily: "inherit",
        }}>{b.l}</button>
      ))}
    </div>
  );
}

function NumberField({ field, value, onChange, wasteValue, onWasteChange }) {
  const stock = field.trackInventory ? getStock(field.id) : null;
  const totalDeduct = (Number(value) || 0) + (field.trackWaste ? (Number(wasteValue) || 0) : 0);
  const remaining = stock && totalDeduct > 0
    ? (field.inventoryAction === "subtract"
        ? Math.max(0, stock.current - totalDeduct)
        : stock.current + totalDeduct)
    : stock ? stock.current : null;
  const remLow = remaining !== null && stock && stock.min > 0 && remaining <= stock.min;

  return (
    <div>
      {field.trackInventory && <StockBadge fieldId={field.id} unit={field.unit} />}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="number" value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={field.trackInventory ? "Amount used" : "0"}
          min={field.minVal || undefined} max={field.maxVal || undefined}
          style={{ ...S.input, flex: 1 }}
          onFocus={e => e.target.style.borderColor = "#000"}
          onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
        {field.unit && <span style={{ fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>{field.unit}</span>}
      </div>
      {field.trackWaste && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e67e22", marginBottom: 5 }}>
            Wastage / Spoilage
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" value={wasteValue || ""} onChange={e => onWasteChange(e.target.value)}
              placeholder="0"
              min="0"
              style={{ ...S.input, flex: 1, borderColor: "#FFD5A0", background: "#FFF8F0" }}
              onFocus={e => e.target.style.borderColor = "#e67e22"}
              onBlur={e => e.target.style.borderColor = "#FFD5A0"} />
            {field.unit && <span style={{ fontSize: 13, color: "#e67e22", whiteSpace: "nowrap" }}>{field.unit} wasted</span>}
          </div>
          {field.trackInventory && wasteValue > 0 && (
            <div style={{ marginTop: 5, fontSize: 11.5, color: "#e67e22", padding: "5px 9px", background: "#FFF8F0", borderRadius: 7, border: "1px solid #FFD5A0" }}>
              Wastage will also deduct from inventory
            </div>
          )}
        </div>
      )}
      {field.trackInventory && stock && (value || wasteValue) && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#888", padding: "8px 10px", background: "#F5F5F5", borderRadius: 7, borderLeft: "3px solid " + (remLow ? "#e74c3c" : "#2d9e2d") }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Used: <strong>{Number(value) || 0} {field.unit}</strong></span>
            {field.trackWaste && <span style={{ color: "#e67e22" }}>Wasted: <strong>{Number(wasteValue) || 0} {field.unit}</strong></span>}
            <span>Remaining: <strong style={{ color: remLow ? "#e74c3c" : "#2d9e2d" }}>{remaining} {field.unit}</strong></span>
          </div>
          {remLow && <div style={{ color: "#e74c3c", marginTop: 4, fontWeight: 600 }}>Warning: below minimum stock level!</div>}
        </div>
      )}
    </div>
  );
}

function PhotoField({ field, value, onChange }) {
  const fileRef = useRef();
  const [previews, setPreviews] = useState(value || []);
  const handleFile = async (e) => {
    for (const file of Array.from(e.target.files)) {
      const compressed = await compressImage(file);
      const updated = [...previews, compressed].slice(0, field.maxPhotos || 1);
      setPreviews(updated); onChange(updated);
    }
  };
  return (
    <div>
      {previews.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E8E8E8" }} />
              <button onClick={() => { const u = previews.filter((_, j) => j !== i); setPreviews(u); onChange(u); }}
                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ff6060", border: "none", color: "#fff", fontSize: 10, cursor: "pointer" }}>x</button>
            </div>
          ))}
        </div>
      )}
      {previews.length < (field.maxPhotos || 1) && (
        <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #E0E0E0", borderRadius: 10, padding: "20px 0", textAlign: "center", cursor: "pointer", background: "#FAFAFA" }}>
          <div style={{ fontSize: 22, color: "#ccc" }}>O</div>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>Take a live photo</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple={field.maxPhotos > 1} onChange={handleFile} style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}

function RatingField({ field, value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      {field.ratingLabel && <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{field.ratingLabel}</div>}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: field.maxStars || 5 }).map((_, i) => (
          <span key={i} onMouseEnter={() => setHovered(i + 1)} onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
            style={{ fontSize: 28, cursor: "pointer", color: i < (hovered || value || 0) ? "#f4a825" : "#E8E8E8" }}>*</span>
        ))}
        {value > 0 && <span style={{ fontSize: 12, color: "#888", alignSelf: "center", marginLeft: 4 }}>{value}/{field.maxStars || 5}</span>}
      </div>
    </div>
  );
}

function SignatureField({ field, value, onChange }) {
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(!!value);
  const lastPos = useRef(null);
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasSig(true); onChange(canvas.toDataURL());
  };
  const clear = () => {
    canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSig(false); onChange(null);
  };
  return (
    <div>
      {field.sigNote && <div style={{ fontSize: 12, color: "#666", marginBottom: 8, fontStyle: "italic" }}>{field.sigNote}</div>}
      <div style={{ border: "1.5px dashed #D8D8D8", borderRadius: 10, overflow: "hidden", background: "#FAFAFA", position: "relative" }}>
        <canvas ref={canvasRef} width={400} height={100} style={{ width: "100%", height: 100, touchAction: "none", cursor: "crosshair", display: "block" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
        {!hasSig && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", fontSize: 12, color: "#ccc" }}>Sign here</div>}
      </div>
      {hasSig && <button onClick={clear} style={{ marginTop: 6, fontSize: 11.5, color: "#ff6060", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Clear signature</button>}
    </div>
  );
}

function StockHistory({ templates }) {
  const allTemplates = templates || DEFAULT_TEMPLATES;
  const inventoryFields = [];
  allTemplates.forEach(t => {
    t.fields.forEach(f => {
      if (f.type === "number" && f.trackInventory) {
        const stock = getStock(f.id);
        if (stock) inventoryFields.push({ field: f, stock, templateName: t.name });
      }
    });
  });

  if (inventoryFields.length === 0) return (
    <div style={{ textAlign: "center", padding: 48, color: "#bbb" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>BOX</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#aaa", marginBottom: 4 }}>No inventory tracked yet</div>
      <div style={{ fontSize: 12 }}>Ask your admin to enable inventory tracking on number fields</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 22px" }}>
      {inventoryFields.map(({ field, stock, templateName }) => {
        const low = isLowStock(field.id);
        const totalUsed = stock.opening - stock.current;
        return (
          <div key={field.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 8 }}>
              {field.label.toUpperCase()} -- {templateName}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { label: "Current", value: stock.current + " " + stock.unit, color: low ? "#e67e22" : "#2d9e2d" },
                { label: "Opening", value: stock.opening + " " + stock.unit, color: "#555" },
                { label: "Total used", value: Math.max(0, totalUsed) + " " + stock.unit, color: "#888" },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#bbb", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
            {low && (
              <div style={{ background: "#FFF8F0", border: "1.5px solid #FFD5A0", borderRadius: 9, padding: "9px 12px", fontSize: 12, color: "#e67e22", marginBottom: 10, fontWeight: 600 }}>
                Stock is below minimum ({stock.min} {stock.unit}) -- please restock
              </div>
            )}
            <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F0F0F0", fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.06em" }}>USAGE HISTORY</div>
              {stock.history.length === 0 ? (
                <div style={{ padding: "16px 14px", fontSize: 12, color: "#ccc", textAlign: "center" }}>No usage recorded yet -- submit a checklist to track</div>
              ) : stock.history.map((h, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < stock.history.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: h.change < 0 ? "#e74c3c" : "#2d9e2d" }}>
                        {h.change < 0 ? "↓" : "↑"} {Math.abs(h.change)} {stock.unit} {h.change < 0 ? "deducted" : "added"}
                      </div>
                      {h.wasted > 0 && (
                        <div style={{ fontSize: 11, color: "#e67e22", marginTop: 2 }}>
                          Used: {h.used} {stock.unit} · Wasted: {h.wasted} {stock.unit}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 2 }}>{h.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#aaa" }}>Remaining</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: stock.min > 0 && h.remaining <= stock.min ? "#e67e22" : "#1a1a1a" }}>{h.remaining} {stock.unit}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Submitted Logs View ─────────────────────────────────────────────────────
function SubmittedLogsView({ logs }) {
  const [exp, setExp] = useState(null);
  if (logs.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No logs yet</div>
      <div style={{ fontSize: 12 }}>Your submitted checklists will appear here</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 10 }}>MY SUBMITTED LOGS — {logs.length}</div>
      {logs.map(log => (
        <div key={log.id} style={{ border: "1.5px solid #EBEBEB", borderRadius: 12, overflow: "hidden", marginBottom: 8, background: "#fff" }}>
          <div onClick={() => setExp(exp === log.id ? null : log.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{log.templateName}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{log.submittedAt}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#2d9e2d18", border: "1px solid #2d9e2d35", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 700, color: "#2d9e2d" }}>✓ Submitted</span>
              <span style={{ fontSize: 11, color: "#ccc" }}>{exp === log.id ? "▴" : "▾"}</span>
            </div>
          </div>
          {exp === log.id && (
            <div style={{ borderTop: "1px solid #F0F0F0", padding: "12px 15px" }}>
              {log.fields.map(f => {
                const val = log.values[f.id];
                const sub = log.values[f.id + "_sub"] || {};
                return (
                  <div key={f.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #F8F8F8" }}>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>{f.label}</div>
                    {f.type === "toggle" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: val === "yes" ? "#2d9e2d18" : "#F5F5F5", color: val === "yes" ? "#2d9e2d" : "#999" }}>{val === "yes" ? f.yesLabel || "Done" : val === "no" ? f.noLabel || "Skip" : "—"}</span>}
                    {f.type === "text" && <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc" }}>{val ? `${val}${f.unit ? " " + f.unit : ""}` : "—"}</div>}
                    {f.type === "number" && (
                      <div>
                        <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc" }}>{val ? `${val}${f.unit ? " " + f.unit : ""}` : "—"}</div>
                        {f.trackWaste && log.values[f.id + "_waste"] > 0 && (
                          <div style={{ fontSize: 12, color: "#e67e22", marginTop: 3 }}>
                            Wastage: {log.values[f.id + "_waste"]}{f.unit ? " " + f.unit : ""}
                          </div>
                        )}
                      </div>
                    )}
                    {f.type === "rating" && <div style={{ display: "flex", gap: 2 }}>{Array.from({ length: f.maxStars || 5 }).map((_, i) => <span key={i} style={{ fontSize: 14, color: i < (val || 0) ? "#f4a825" : "#E8E8E8" }}>★</span>)}</div>}
                    {f.type === "dropdown" && <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc" }}>{val || "—"}</div>}
                    {f.type === "signature" && <div style={{ fontSize: 12, color: val ? "#2d9e2d" : "#ccc" }}>{val ? "✓ Signed" : "—"}</div>}
                    {f.type === "photo" && val && val.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 4 }}>{val.map((src, i) => <img key={i} src={src} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 7, border: "1.5px solid #E8E8E8" }} />)}</div>}
                    {(f.subTasks || []).length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {f.subTasks.map((st, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: sub[i] ? "#2d9e2d" : "#aaa", marginTop: 3 }}>
                            <span style={{ fontSize: 10 }}>{sub[i] ? "✓" : "○"}</span>
                            <span style={{ textDecoration: sub[i] ? "line-through" : "none" }}>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StaffView({ templates, onSubmit, logs = [], roleName = "" }) {
  const rawTemplates = templates || DEFAULT_TEMPLATES;
  // Filter templates by recurrence — only show checklists scheduled for today
  const allTemplates = useMemo(() => rawTemplates.filter(t => shouldShowToday(t)), [rawTemplates]);
  const [selectedId, setSelectedId] = useState(allTemplates[0]?.id || null);
  const [values, setValues] = useState(() => {
    // Restore submitted values if template was already submitted
    try {
      const saved = localStorage.getItem("flexi_submittedValues_" + roleName);
      if (saved) {
        const all = JSON.parse(saved);
        const firstTpl = allTemplates[0];
        if (firstTpl && all[firstTpl.id]) return all[firstTpl.id];
      }
    } catch {}
    return {};
  });
  const [submittedIds, setSubmittedIds] = useState(() => {
    // Restore from localStorage — filter out entries not from today
    try {
      const saved = localStorage.getItem("flexi_submittedIds_" + roleName);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        const filtered = {};
        Object.entries(parsed).forEach(([id, ts]) => {
          if (new Date(ts).toDateString() === today) filtered[id] = ts;
        });
        // Save cleaned version back
        localStorage.setItem("flexi_submittedIds_" + roleName, JSON.stringify(filtered));
        return filtered;
      }
    } catch {}
    return {};
  });
  const [submittedValues, setSubmittedValues] = useState(() => {
    try {
      const saved = localStorage.getItem("flexi_submittedValues_" + roleName);
      if (saved) {
        // Also reset submitted values daily
        const ids = JSON.parse(localStorage.getItem("flexi_submittedIds_" + roleName) || "{}");
        if (Object.keys(ids).length === 0) {
          localStorage.removeItem("flexi_submittedValues_" + roleName);
          return {};
        }
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("checklist");
  // Use Firestore logs filtered by role (persists across logout/login)
  const myLogs = useMemo(() => logs.filter(l => l.roleName === roleName).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)), [logs, roleName]);

  // Derive submitted state from Firestore logs on mount
  useEffect(() => {
    if (!logs || logs.length === 0) return;
    const today = new Date().toDateString();
    const todaySubmissions = {};
    logs.forEach(log => {
      if (log.roleName === roleName) {
        const logDate = log.submittedAt ? new Date(log.submittedAt).toDateString() : null;
        if (logDate === today) {
          // Find matching template by name
          const tpl = allTemplates.find(t => t.name === log.templateName);
          if (tpl && !todaySubmissions[tpl.id]) {
            todaySubmissions[tpl.id] = new Date(log.submittedAt).getTime();
          }
        }
      }
    });
    if (Object.keys(todaySubmissions).length > 0) {
      setSubmittedIds(prev => {
        const merged = { ...prev, ...todaySubmissions };
        try { localStorage.setItem("flexi_submittedIds_" + roleName, JSON.stringify(merged)); } catch {}
        return merged;
      });
    }
  }, [logs, roleName, allTemplates]);

  // Persist submittedIds to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("flexi_submittedIds_" + roleName, JSON.stringify(submittedIds)); } catch {}
  }, [submittedIds, roleName]);

  const template = allTemplates.find(t => t.id === selectedId) || allTemplates[0];

  useEffect(() => {
    allTemplates.forEach(t => {
      t.fields.forEach(f => {
        if (f.type === "number" && f.trackInventory && f.openingStock) {
          initStock(f.id, { openingStock: f.openingStock, minStock: f.minStock, unit: f.unit, label: f.label });
        }
      });
    });
  }, [allTemplates]);

  const setValue = (id, val) => {
    setValues(v => {
      const next = { ...v, [id]: val };
      // Auto-set parent toggle to "yes" when all subtasks are completed
      if (id.endsWith("_sub") && template) {
        const fieldId = id.replace(/_sub$/, "");
        const field = template.fields.find(f => f.id === fieldId);
        if (field && field.subTasks && field.subTasks.length > 0) {
          const allDone = field.subTasks.every((_, i) => val[i]);
          if (field.type === "toggle") {
            next[fieldId] = allDone ? "yes" : null;
          }
        }
      }
      return next;
    });
    setErrors(e => { const n = { ...e }; delete n[id]; return n; });
  };

  const canResubmit = (tpl) => {
    const policy = tpl.submitPolicy || "once";
    if (policy === "unlimited") return true;
    if (policy === "once_per_day") {
      const lastSubmit = submittedIds[tpl.id];
      if (!lastSubmit) return true;
      const today = new Date().toDateString();
      return new Date(lastSubmit).toDateString() !== today;
    }
    return !submittedIds[tpl.id]; // "once"
  };

  const handleSubmit = () => {
    if (!template) return;
    if (!canResubmit(template)) return;
    if (expiryStatus(template).expired) return;
    const newErrors = {};
    template.fields.forEach(f => {
      if (f.required && !values[f.id]) newErrors[f.id] = "This field is required";
      if (f.requirePhoto && f.type !== "photo") {
        const photos = values[f.id + "_reqphoto"];
        if (!photos || photos.length === 0) newErrors[f.id] = "Photo capture is required for this field";
      }
      if (f.type === "photo" && f.required) {
        const photos = values[f.id];
        if (!photos || photos.length === 0) newErrors[f.id] = "Photo is required";
      }
      if (f.subTasks && f.subTasks.length > 0) {
        const checked = values[f.id + "_sub"] || {};
        const allDone = f.subTasks.every((_, i) => checked[i]);
        if (!allDone) newErrors[f.id] = "All sub-tasks must be completed";
      }
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    template.fields.forEach(f => {
      if (f.type === "number" && f.trackInventory) {
        const used = Number(values[f.id]) || 0;
        const wasted = f.trackWaste ? (Number(values[f.id + "_waste"]) || 0) : 0;
        const total = used + wasted;
        if (total > 0) applyUsage(f.id, total, f.inventoryAction || "subtract", { used, wasted });
      }
    });
    const log = { id: Date.now(), templateName: template.name, submittedAt: new Date().toLocaleString(), values: { ...values }, fields: template.fields };
    onSubmit(log);
    setSubmittedIds(prev => ({ ...prev, [template.id]: Date.now() }));
    // Track submission count for "ends after N" recurrence
    incrementSubmissionCount(template.id);
    // Save submitted values so they persist across tab switches
    setSubmittedValues(prev => {
      const next = { ...prev, [template.id]: { ...values } };
      try { localStorage.setItem("flexi_submittedValues_" + roleName, JSON.stringify(next)); } catch {}
      return next;
    });
    // For unlimited/once_per_day, reset form after submit so staff can fill again
    if ((template.submitPolicy || "once") !== "once") {
      setValues({});
      setErrors({});
    }
  };

  // Live timer — updates elapsed/expiry labels every 30s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const isSubmitted = template && !canResubmit(template);
  const submittedCount = Object.keys(submittedIds).length;
  const expiry = template ? expiryStatus(template) : { expired: false, label: "" };
  const isExpired = expiry.expired && !isSubmitted;

  return (
    <div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 4, background: "#EBEBEB", borderRadius: 9, padding: 3, marginBottom: 16 }}>
          {[["checklist", "Checklist"], ["history", "Stock"], ["logs", `My Logs${myLogs.length > 0 ? " (" + myLogs.length + ")" : ""}`]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "7px 0", border: "none", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: tab === k ? "#fff" : "transparent", color: tab === k ? "#1a1a1a" : "#888",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: tab === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {tab === "history" && <StockHistory templates={allTemplates} />}
      {tab === "logs" && <SubmittedLogsView logs={myLogs} />}

      {tab === "checklist" && (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 22px" }}>

          {/* Checklists overall progress bar */}
          {allTemplates.length > 0 && (
            <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>Today's Checklists</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: submittedCount === allTemplates.length ? "#2d9e2d" : "#1a1a1a" }}>
                  {submittedCount}/{allTemplates.length} submitted {submittedCount === allTemplates.length ? "✓" : ""}
                </span>
              </div>
              <div style={{ height: 7, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${allTemplates.length > 0 ? (submittedCount / allTemplates.length) * 100 : 0}%`, background: submittedCount === allTemplates.length ? "#2d9e2d" : "#2980b9", borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {allTemplates.length > 1 && (() => {
            const open = allTemplates.filter(t => canResubmit(t) && !expiryStatus(t).expired);
            const submitted = allTemplates.filter(t => !canResubmit(t));
            const expired = allTemplates.filter(t => canResubmit(t) && expiryStatus(t).expired);
            const renderBtn = (t, done, exp) => {
              const sel = selectedId === t.id;
              return (
              <button key={t.id} onClick={() => { setSelectedId(t.id); setValues(submittedValues[t.id] || {}); setErrors({}); }} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: "1.5px solid " + (done ? "#2d9e2d" : exp ? "#e67e22" : sel ? "#555" : "#E8E8E8"),
                background: done ? "#2d9e2d18" : exp ? "#e67e2218" : sel ? "#f5f5f5" : "#fff",
                color: done ? "#2d9e2d" : exp ? "#e67e22" : "#555",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: sel ? "0 3px 10px rgba(0,0,0,0.18)" : "none",
                transition: "all 0.15s",
              }}>
                {done ? "✓ " : exp ? "⏰ " : ""}{t.name}
                {done && submittedIds[t.id] && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>
                  {new Date(submittedIds[t.id]).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>}
              </button>
            );};
            return (
              <div style={{ marginBottom: 16 }}>
                {open.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", letterSpacing: "0.08em", marginBottom: 6 }}>OPEN</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{open.map(t => renderBtn(t, false, false))}</div>
                  </div>
                )}
                {submitted.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#2d9e2d", letterSpacing: "0.08em", marginBottom: 6 }}>SUBMITTED</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{submitted.map(t => renderBtn(t, true, false))}</div>
                  </div>
                )}
                {expired.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", letterSpacing: "0.08em", marginBottom: 6 }}>EXPIRED</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{expired.map(t => renderBtn(t, false, true))}</div>
                  </div>
                )}
              </div>
            );
          })()}

          {template ? (
            <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${isSubmitted ? "#2d9e2d" : isExpired ? "#e67e22" : "#EBEBEB"}`, overflow: "hidden" }}>
              <div style={{ background: isSubmitted ? "#2d9e2d" : isExpired ? "#e67e22" : "#111", padding: "18px 20px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                    {recurrenceLabel(template)} · {template.time}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
                    {todayLabel()}
                    {isSubmitted && <div style={{ marginTop: 2 }}>Submitted: {new Date(submittedIds[template.id]).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{template.name}</div>
                  {isSubmitted && <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>✓ {elapsedLabel(submittedIds[template.id])}</span>}
                  {isExpired && <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>Expired</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{template.fields.length} fields</span>
                  {!isSubmitted && !isExpired && expiry.label && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{expiry.label}</span>}
                </div>
              </div>
              <ProgressBar fields={template.fields} values={values} />
              <div style={{ padding: 18, ...(isSubmitted || isExpired ? { pointerEvents: "none", opacity: 0.7 } : {}) }}>
                {template.fields.map((field, idx) => (
                  <div key={field.id} style={{ marginBottom: 18, padding: "14px 15px", border: "1.5px solid " + (errors[field.id] ? "#ffcccc" : "#EBEBEB"), borderRadius: 11, background: errors[field.id] ? "#FFFAFA" : "#fff" }}>
                    <label style={{ ...S.label, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#bbb", marginRight: 6 }}>{idx + 1}.</span>{field.label || "Untitled field"}
                      {field.required && <span style={{ color: "#ff4444" }}> *</span>}
                      {(field.subTasks || []).length > 0 && (
                        <span style={{ fontSize: 10, color: "#888", fontWeight: 400, marginLeft: 6 }}>
                          ({Object.values(values[field.id + "_sub"] || {}).filter(Boolean).length}/{field.subTasks.length} steps)
                        </span>
                      )}
                    </label>
                    {/* Reference photo from admin */}
                    {field.referencePhoto && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#4a90d9", letterSpacing: "0.05em", marginBottom: 5 }}>REFERENCE PHOTO</div>
                        <img src={field.referencePhoto} alt="reference" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 9, border: "1.5px solid #D5E8FF" }} />
                        <div style={{ fontSize: 10.5, color: "#888", marginTop: 4 }}>Use this as a guide when completing this task</div>
                      </div>
                    )}
                    {/* Require photo capture — actual camera input */}
                    {field.requirePhoto && field.type !== "photo" && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ padding: "6px 10px", background: "#FFF8F0", border: "1px solid #FFD5A0", borderRadius: 7, fontSize: 11, color: "#e67e22", fontWeight: 600, marginBottom: 6 }}>
                          📷 Photo capture required for this field
                        </div>
                        <PhotoField field={{ ...field, id: field.id + "_reqphoto", maxPhotos: field.maxRequiredPhotos || 1 }} value={values[field.id + "_reqphoto"]} onChange={v => setValue(field.id + "_reqphoto", v)} />
                      </div>
                    )}
                    {field.type === "toggle" && <ToggleField field={field} value={values[field.id]} onChange={v => setValue(field.id, v)} />}
                    {field.type === "text" && (
                      field.multiline
                        ? <textarea value={values[field.id] || ""} onChange={e => setValue(field.id, e.target.value)} placeholder={field.placeholder || "Type here..."} style={{ ...S.input, minHeight: 80, resize: "vertical" }} onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                        : <input value={values[field.id] || ""} onChange={e => setValue(field.id, e.target.value)} placeholder={field.placeholder || "Type here..."} style={S.input} onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                    )}
                    {field.type === "number" && <NumberField field={field} value={values[field.id]} onChange={v => setValue(field.id, v)} wasteValue={values[field.id + "_waste"]} onWasteChange={v => setValue(field.id + "_waste", v)} />}
                    {field.type === "photo" && <PhotoField field={field} value={values[field.id]} onChange={v => setValue(field.id, v)} />}
                    {field.type === "timestamp" && <div style={{ background: "#FAFAFA", border: "1.5px solid #EBEBEB", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#888", fontFamily: "monospace" }}>{new Date().toLocaleString()}</div>}
                    {field.type === "rating" && <RatingField field={field} value={values[field.id] || 0} onChange={v => setValue(field.id, v)} />}
                    {field.type === "dropdown" && (
                      <select value={values[field.id] || ""} onChange={e => setValue(field.id, e.target.value)} style={{ ...S.input, appearance: "none", cursor: "pointer" }} onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"}>
                        <option value="">Select...</option>
                        {field.dropdownOptions?.map(o => <option key={o}>{o}</option>)}
                      </select>
                    )}
                    {field.type === "signature" && <SignatureField field={field} value={values[field.id]} onChange={v => setValue(field.id, v)} />}
                    <SubTasks subTasks={field.subTasks} fieldId={field.id} values={values} onChange={setValue} subtaskPhotos={field.subtaskPhotos} />
                    {errors[field.id] && <div style={{ fontSize: 11.5, color: "#cc3333", marginTop: 7 }}>⚠ {errors[field.id]}</div>}
                  </div>
                ))}
                {isSubmitted ? (
                  <div style={{ width: "100%", padding: "13px 0", background: "#2d9e2d18", border: "1.5px solid #2d9e2d35", borderRadius: 10, color: "#2d9e2d", fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 4 }}>
                    ✓ Submitted {elapsedLabel(submittedIds[template.id])}
                  </div>
                ) : isExpired ? (
                  <div style={{ width: "100%", padding: "13px 0", background: "#e67e2218", border: "1.5px solid #e67e2235", borderRadius: 10, color: "#e67e22", fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 4 }}>
                    Checklist Expired
                  </div>
                ) : (
                  <button onClick={handleSubmit} style={{ width: "100%", padding: "13px 0", background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>Submit Log ✓</button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: 13 }}>
              {rawTemplates.length > 0 && allTemplates.length === 0
                ? "No checklists scheduled for today. Check back on your next scheduled day."
                : "No checklists available. Ask your admin to create one."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
