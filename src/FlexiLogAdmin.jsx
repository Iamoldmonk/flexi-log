import { useState, useEffect } from "react";
import StaffView from "./StaffView";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}
import AdminDashboard from "./AdminDashboard";
import RoleManager from "./RoleManager";
import OutletManager from "./OutletManager";
import { useRoles, useOutlets } from "./useFirestore";

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { id: "toggle",    label: "Toggle",      icon: "✓", desc: "Yes / No completion" },
  { id: "text",      label: "Short Text",  icon: "T", desc: "Notes or observations" },
  { id: "number",    label: "Number",      icon: "#", desc: "Quantities & counts" },
  { id: "photo",     label: "Live Photo",  icon: "◉", desc: "Live camera capture" },
  { id: "timestamp", label: "Timestamp",   icon: "◷", desc: "Auto date & time log" },
  { id: "rating",    label: "Rating",      icon: "★", desc: "1–5 star scale" },
  { id: "dropdown",  label: "Dropdown",    icon: "▾", desc: "Predefined choices" },
  { id: "signature", label: "Signature",   icon: "✍", desc: "Staff sign-off" },
];

const RECURRENCE = ["None", "Hourly", "Every X Hours", "Daily", "Weekdays", "Mon / Wed / Fri", "Every X Days", "Weekly", "Fortnightly", "Monthly", "Last Weekday of Month", "Custom"];
const INVENTORY_ITEMS = ["— None —", "Coconuts", "Milk (L)", "Oil (L)", "Sugar (kg)", "Packaging"];

let _id = Date.now();
const uid = () => String(_id++);

const defaultField = (typeId) => ({
  id: uid(), type: typeId, label: "", required: false,
  yesLabel: "Done", noLabel: "Skip", toggleColor: "#2d9e2d",
  placeholder: "", multiline: false, minLength: "", maxLength: "",
  unit: "", minVal: "", maxVal: "", decimalAllowed: false,
  trackWaste: false, inventoryLink: "— None —", inventoryAction: "subtract",
  trackInventory: false, openingStock: "", minStock: "",
  forceCapture: true, allowAnnotation: false, beforeAfter: false,
  maxPhotos: 1, requireCaption: false,
  autoStamp: true, showDate: true, showTime: true,
  maxStars: 5, ratingLabel: "",
  dropdownOptions: ["Option 1", "Option 2"], multiSelect: false,
  sigNote: "",
  subTasks: [],
  subtaskPhotos: false,
  requirePhoto: false,
  referencePhoto: null,
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  label: {
    display: "block", fontSize: 10, fontWeight: 700,
    color: "#999", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em",
  },
  input: {
    width: "100%", padding: "8px 10px", border: "1.5px solid #E8E8E8",
    borderRadius: 8, fontSize: 12.5, color: "#1a1a1a",
    fontFamily: "inherit", background: "#FAFAFA",
    boxSizing: "border-box", outline: "none",
  },
  section: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F0F0" },
  chip: (active) => ({
    padding: "5px 11px", fontSize: 11.5, fontWeight: 600,
    border: `1.5px solid ${active ? "#000" : "#E8E8E8"}`,
    borderRadius: 20, background: active ? "#000" : "#fff",
    color: active ? "#fff" : "#555", cursor: "pointer", fontFamily: "inherit",
  }),
  check: { accentColor: "#000", width: 13, height: 13, cursor: "pointer" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Inp({ value, onChange, placeholder, type = "text", min, max }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} style={S.input}
      onFocus={e => e.target.style.borderColor = "#000"}
      onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
  );
}
function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...S.input, appearance: "none", cursor: "pointer" }}
      onFocus={e => e.target.style.borderColor = "#000"}
      onBlur={e => e.target.style.borderColor = "#E8E8E8"}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}
function CheckRow({ label, checked, onChange, children }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 7, cursor: "pointer", marginBottom: 7 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ ...S.check, marginTop: 2 }} />
      <div>
        <span style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>{label}</span>
        {children && <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 1 }}>{children}</div>}
      </div>
    </label>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.07em", marginBottom: 10 }}>{children}</div>;
}

// ─── Field Config ─────────────────────────────────────────────────────────────
function FieldConfig({ field, onUpdate }) {
  const u = onUpdate;
  const t = field.type;
  return (
    <div style={{ padding: "14px 16px", background: "#FAFAFA", borderRadius: "0 0 11px 11px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "8px 10px", background: "#F0F0F0", borderRadius: 8 }}>
        <input type="checkbox" checked={field.required} onChange={e => u({ required: e.target.checked })} style={S.check} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Required</span>
        <span style={{ fontSize: 11, color: "#aaa" }}>— Staff cannot submit without completing this</span>
      </div>

      {t === "toggle" && <div style={S.section}>
        <SectionTitle>BUTTON LABELS & STYLE</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Positive Label</label>
            <Inp value={field.yesLabel} onChange={v => u({ yesLabel: v })} placeholder="Done" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Negative Label</label>
            <Inp value={field.noLabel} onChange={v => u({ noLabel: v })} placeholder="Skip" />
          </div>
        </div>
        <label style={S.label}>Accent Color</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["#2d9e2d", "#e67e22", "#e74c3c", "#2980b9", "#8e44ad", "#000"].map(c => (
            <div key={c} onClick={() => u({ toggleColor: c })} style={{
              width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
              border: field.toggleColor === c ? "2.5px solid #1a1a1a" : "2.5px solid transparent",
              boxSizing: "border-box",
            }} />
          ))}
          <input type="color" value={field.toggleColor} onChange={e => u({ toggleColor: e.target.value })}
            style={{ width: 28, height: 28, border: "1.5px solid #E8E8E8", borderRadius: 6, cursor: "pointer", padding: 2, background: "#fff" }} />
          <span style={{ fontSize: 10.5, color: "#bbb" }}>Custom</span>
        </div>
      </div>}

      {t === "text" && <div style={S.section}>
        <SectionTitle>TEXT OPTIONS</SectionTitle>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Placeholder Hint</label>
          <Inp value={field.placeholder} onChange={v => u({ placeholder: v })} placeholder="e.g. Describe any issues found" />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Min Characters</label>
            <Inp type="number" value={field.minLength} onChange={v => u({ minLength: v })} placeholder="0" min="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Max Characters</label>
            <Inp type="number" value={field.maxLength} onChange={v => u({ maxLength: v })} placeholder="500" min="1" />
          </div>
        </div>
        <CheckRow label="Multiline (paragraph)" checked={field.multiline} onChange={v => u({ multiline: v })}>
          Input box expands to multiple lines
        </CheckRow>
      </div>}

      {t === "number" && <div style={S.section}>
        <SectionTitle>NUMBER OPTIONS</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Unit Label</label>
            <Inp value={field.unit} onChange={v => u({ unit: v })} placeholder="kg, pcs, L" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Min Value</label>
            <Inp type="number" value={field.minVal} onChange={v => u({ minVal: v })} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Max Value</label>
            <Inp type="number" value={field.maxVal} onChange={v => u({ maxVal: v })} placeholder="999" />
          </div>
        </div>
        <CheckRow label="Allow decimal values" checked={field.decimalAllowed} onChange={v => u({ decimalAllowed: v })}>
          e.g. 2.5 kg instead of whole numbers only
        </CheckRow>
        <CheckRow label="Waste / Spoilage sub-field" checked={field.trackWaste} onChange={v => u({ trackWaste: v })}>
          Adds a separate "Wasted" input to calculate yield automatically
        </CheckRow>
        <CheckRow label="Enable inventory tracking" checked={field.trackInventory} onChange={v => u({ trackInventory: v })}>
          Track opening stock and auto-deduct when staff submits
        </CheckRow>
        {field.trackInventory && (
          <div style={{ marginTop: 10, padding: "12px", background: "#F5F9FF", border: "1.5px solid #D5E8FF", borderRadius: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4a90d9", letterSpacing: "0.06em", marginBottom: 10 }}>INVENTORY SETTINGS</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Opening Stock</label>
                <Inp type="number" value={field.openingStock} onChange={v => u({ openingStock: v })} placeholder="e.g. 500" min="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Low Stock Warning</label>
                <Inp type="number" value={field.minStock} onChange={v => u({ minStock: v })} placeholder="e.g. 50" min="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["subtract", "add"].map(a => (
                <button key={a} onClick={() => u({ inventoryAction: a })} style={S.chip(field.inventoryAction === a)}>
                  {a === "subtract" ? "↓ Deduct on submit" : "↑ Add on submit"}
                </button>
              ))}
            </div>
            {field.openingStock && (
              <div style={{ marginTop: 10, padding: "8px 10px", background: "#fff", borderRadius: 7, border: "1px solid #D5E8FF", fontSize: 11.5, color: "#555" }}>
                Current stock: <strong style={{ color: "#1a1a1a" }}>{field.openingStock} {field.unit}</strong>
                {field.minStock && <span style={{ color: "#e67e22", marginLeft: 8 }}>· Warning below {field.minStock} {field.unit}</span>}
              </div>
            )}
          </div>
        )}
      </div>}

      {t === "photo" && <div style={S.section}>
        <SectionTitle>PHOTO OPTIONS</SectionTitle>
        <CheckRow label="Force live capture" checked={field.forceCapture} onChange={v => u({ forceCapture: v })}>
          Disables gallery upload — staff must take a fresh live photo
        </CheckRow>
        <CheckRow label="Allow annotation / drawing" checked={field.allowAnnotation} onChange={v => u({ allowAnnotation: v })}>
          Staff can draw on the photo to highlight specific issues
        </CheckRow>
        <CheckRow label="Require Before & After shots" checked={field.beforeAfter} onChange={v => u({ beforeAfter: v })}>
          Forces two photos: one before the task, one after
        </CheckRow>
        <CheckRow label="Require photo caption" checked={field.requireCaption} onChange={v => u({ requireCaption: v })}>
          Staff must add a short text note alongside the photo
        </CheckRow>
        <div style={{ marginTop: 8 }}>
          <label style={S.label}>Max Photos Allowed</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 5].map(n => (
              <button key={n} onClick={() => u({ maxPhotos: n })} style={S.chip(field.maxPhotos === n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>}

      {t === "timestamp" && <div style={S.section}>
        <SectionTitle>TIMESTAMP OPTIONS</SectionTitle>
        <CheckRow label="Auto-stamp when log is opened" checked={field.autoStamp} onChange={v => u({ autoStamp: v })}>
          Automatically records the time without staff input
        </CheckRow>
        <div style={{ display: "flex", gap: 16, marginTop: 2 }}>
          <CheckRow label="Show Date" checked={field.showDate} onChange={v => u({ showDate: v })} />
          <CheckRow label="Show Time" checked={field.showTime} onChange={v => u({ showTime: v })} />
        </div>
      </div>}

      {t === "rating" && <div style={S.section}>
        <SectionTitle>RATING OPTIONS</SectionTitle>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Context Label (optional)</label>
          <Inp value={field.ratingLabel} onChange={v => u({ ratingLabel: v })} placeholder="e.g. Cleanliness score" />
        </div>
        <label style={S.label}>Scale</label>
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 5, 10].map(n => (
            <button key={n} onClick={() => u({ maxStars: n })} style={S.chip(field.maxStars === n)}>{n} ★</button>
          ))}
        </div>
      </div>}

      {t === "dropdown" && <div style={S.section}>
        <SectionTitle>DROPDOWN OPTIONS</SectionTitle>
        <CheckRow label="Allow multiple selections" checked={field.multiSelect} onChange={v => u({ multiSelect: v })} />
        <div style={{ marginTop: 8 }}>
          <label style={S.label}>Options</label>
          {field.dropdownOptions.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={opt} onChange={e => {
                const arr = [...field.dropdownOptions]; arr[i] = e.target.value; u({ dropdownOptions: arr });
              }} placeholder={`Option ${i + 1}`} style={S.input}
                onFocus={e => e.target.style.borderColor = "#000"}
                onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
              <button onClick={() => u({ dropdownOptions: field.dropdownOptions.filter((_, j) => j !== i) })}
                disabled={field.dropdownOptions.length <= 1}
                style={{ width: 32, height: 36, border: "1.5px solid #E8E8E8", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#ff6060", fontSize: 13, flexShrink: 0, opacity: field.dropdownOptions.length <= 1 ? 0.3 : 1 }}>✕</button>
            </div>
          ))}
          <button onClick={() => u({ dropdownOptions: [...field.dropdownOptions, ""] })} style={{
            fontSize: 12, fontWeight: 600, color: "#666", background: "none",
            border: "1.5px dashed #D8D8D8", borderRadius: 8, padding: "7px 12px",
            cursor: "pointer", fontFamily: "inherit", width: "100%",
          }}>+ Add option</button>
        </div>
      </div>}

      {t === "signature" && <div style={S.section}>
        <SectionTitle>SIGNATURE OPTIONS</SectionTitle>
        <label style={S.label}>Instruction shown above sign box</label>
        <Inp value={field.sigNote} onChange={v => u({ sigNote: v })} placeholder="e.g. I confirm all tasks above are complete" />
      </div>}

      <div style={S.section}>
        <SectionTitle>PHOTO CAPTURE & REFERENCE</SectionTitle>
        <CheckRow label="Require photo for this field" checked={field.requirePhoto || false} onChange={v => u({ requirePhoto: v })}>
          Staff must capture a photo to complete this field
        </CheckRow>
        <div style={{ marginTop: 8 }}>
          <label style={S.label}>Reference Photo (shown to staff)</label>
          {field.referencePhoto ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={field.referencePhoto} alt="reference" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E8E8E8" }} />
              <button onClick={() => u({ referencePhoto: null })} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#ff6060", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ) : (
            <label style={{ display: "block", border: "2px dashed #D8D8D8", borderRadius: 9, padding: "14px 0", textAlign: "center", cursor: "pointer", background: "#FAFAFA" }}>
              <div style={{ fontSize: 18, color: "#ccc" }}>◉</div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>Upload reference photo</div>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  let w = img.width, h = img.height;
                  if (w > 1200) { h = Math.round(h * (1200 / w)); w = 1200; }
                  canvas.width = w; canvas.height = h;
                  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                  u({ referencePhoto: canvas.toDataURL("image/webp", 0.75) });
                };
                img.src = URL.createObjectURL(file);
              }} />
            </label>
          )}
          {field.referencePhoto && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Staff will see this as a guide when filling the field</div>}
        </div>
      </div>

      <div style={S.section}>
        <SectionTitle>SUB-TASKS (NESTED CHECKLIST)</SectionTitle>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>Break this field into smaller steps staff must complete</div>
        {(field.subTasks || []).map((st, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #D8D8D8", background: "#fff", flexShrink: 0 }} />
            <input value={st} onChange={e => { const arr = [...(field.subTasks || [])]; arr[i] = e.target.value; u({ subTasks: arr }); }}
              placeholder={`Sub-task ${i + 1}`} style={{ ...S.input, flex: 1 }}
              onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
            <button onClick={() => u({ subTasks: (field.subTasks || []).filter((_, j) => j !== i) })}
              style={{ width: 28, height: 34, border: "1.5px solid #E8E8E8", borderRadius: 7, background: "#fff", color: "#ff6060", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <button onClick={() => u({ subTasks: [...(field.subTasks || []), ""] })} style={{
          width: "100%", padding: "7px", border: "1.5px dashed #D8D8D8", borderRadius: 8,
          background: "none", fontSize: 12, fontWeight: 600, color: "#888", cursor: "pointer", fontFamily: "inherit",
        }}>+ Add sub-task</button>
        {(field.subTasks || []).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <CheckRow label="Enable photo capture for sub-tasks" checked={field.subtaskPhotos || false} onChange={v => u({ subtaskPhotos: v })}>
              Staff can take a live photo for each sub-task
            </CheckRow>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field Row ─────────────────────────────────────────────────────────────────
function FieldRow({ field, onUpdate, onDelete, onMove, onDuplicate, isFirst, isLast, index, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const type = FIELD_TYPES.find(t => t.id === field.type);
  return (
    <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, background: "#fff", marginBottom: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: open ? "#fff" : "#FAFAFA" }}
        onClick={() => setOpen(!open)}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F2F2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, position: "relative" }}>
          {type.icon}
          <span style={{ position: "absolute", top: -6, left: -6, width: 16, height: 16, borderRadius: "50%", background: "#000", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{index}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={field.label}
            onChange={e => onUpdate({ label: e.target.value })}
            onClick={e => e.stopPropagation()}
            placeholder={`Untitled ${type.label}`}
            style={{ width: "100%", fontSize: 12.5, fontWeight: 600, color: "#1a1a1a", border: "none", outline: "none", background: "transparent", padding: 0, cursor: "text", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span>{type.label}</span>
            {field.required && (
              <span title="Required" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", background: "#ffecec", color: "#e74c3c", borderRadius: 10, fontSize: 9.5, fontWeight: 700 }}>
                ★ Required
              </span>
            )}
            {field.requirePhoto && (
              <span title="Photo capture required" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", background: "#FFF8F0", color: "#e67e22", borderRadius: 10, fontSize: 9.5, fontWeight: 700 }}>
                📷 Photo
              </span>
            )}
            {field.subTasks && field.subTasks.length > 0 && (
              <span title="Has sub-tasks" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", background: "#F0F5FF", color: "#4a90d9", borderRadius: 10, fontSize: 9.5, fontWeight: 700 }}>
                ☰ {field.subTasks.length}
              </span>
            )}
            {field.referencePhoto && (
              <span title="Reference photo attached" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", background: "#F0FFF5", color: "#2d9e2d", borderRadius: 10, fontSize: 9.5, fontWeight: 700 }}>
                🖼 Ref
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, position: "relative" }}>
          {[
            { icon: "↑", fn: () => onMove(-1), disabled: isFirst },
            { icon: "↓", fn: () => onMove(1), disabled: isLast },
            { icon: "✕", fn: onDelete, color: "#ff6060" },
          ].map((b, i) => (
            <button key={i} disabled={b.disabled} onClick={e => { e.stopPropagation(); b.fn(); }} style={{
              width: 24, height: 24, border: "none", background: "#F2F2F2", borderRadius: 6,
              cursor: b.disabled ? "default" : "pointer", fontSize: 10, color: b.color || "#666",
              opacity: b.disabled ? 0.2 : 1,
            }}>{b.icon}</button>
          ))}
          <button onClick={e => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
            setMenuOpen(v => !v);
          }} style={{
            width: 24, height: 24, border: "none", background: "#F2F2F2", borderRadius: 6,
            cursor: "pointer", fontSize: 14, color: "#666", lineHeight: 1, padding: 0,
          }}>⋮</button>
          {menuOpen && (
            <>
              <div onClick={e => { e.stopPropagation(); setMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
              <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999, background: "#fff", border: "1.5px solid #E8E8E8", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 160, overflow: "hidden" }}>
                <button onClick={e => { e.stopPropagation(); if (onDuplicate) onDuplicate(); setMenuOpen(false); }} style={{
                  width: "100%", padding: "10px 14px", border: "none", background: "#fff", textAlign: "left",
                  fontSize: 12, fontWeight: 600, color: "#1a1a1a", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5F5F5"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <span>⧉</span> Duplicate Field
                </button>
              </div>
            </>
          )}
          <div style={{ width: 22, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#ccc" }}>
            {open ? "▴" : "▾"}
          </div>
        </div>
      </div>
      {open && <FieldConfig field={field} onUpdate={onUpdate} />}
    </div>
  );
}

// ─── Templates Sidebar ─────────────────────────────────────────────────────────
function TemplatesSidebar({ templates, activeId, onSelect, onNew, onDelete, isMobile, outlets = [] }) {
  // Group templates by outlet
  const outletMap = {};
  outlets.forEach(o => { outletMap[o._docId] = o.name; });

  const groups = [];
  const unassigned = templates.filter(t => !t.outletId || !outletMap[t.outletId]);
  const outletIds = [...new Set(templates.map(t => t.outletId).filter(id => id && outletMap[id]))];

  outletIds.forEach(oid => {
    groups.push({ id: oid, name: outletMap[oid], items: templates.filter(t => t.outletId === oid) });
  });
  if (unassigned.length > 0) groups.push({ id: "_none", name: "Unassigned", items: unassigned });

  // If no outlets exist, show flat list
  const hasGroups = outlets.length > 0 && groups.length > 0;

  const renderItem = (t, compact) => {
    const sel = t.id === activeId;
    return (
    <div key={t.id} onClick={() => onSelect(t.id)} style={{
      padding: compact ? "7px 12px" : "9px 10px", borderRadius: 10, cursor: "pointer",
      marginBottom: compact ? 0 : 4, flexShrink: compact ? 0 : undefined,
      background: sel ? "#F0F0F0" : compact ? "#F5F5F5" : "transparent",
      border: sel ? "1.5px solid #D8D8D8" : "1.5px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "all 0.15s",
    }}
      onMouseEnter={!compact ? e => { if (!sel) e.currentTarget.style.background = "#F8F8F8"; } : undefined}
      onMouseLeave={!compact ? e => { if (!sel) e.currentTarget.style.background = "transparent"; } : undefined}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: compact ? 120 : undefined }}>{t.name || "Untitled"}</div>
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>{t.fields.length} field{t.fields.length !== 1 ? "s" : ""}</div>
      </div>
      {templates.length > 1 && !sel && (
        <button onClick={e => { e.stopPropagation(); onDelete(t.id); }} style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer", color: "#ccc", fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
      )}
    </div>
  );};

  if (isMobile) {
    return (
      <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 14, padding: "10px 12px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em" }}>TEMPLATES · {templates.length}</div>
          <button onClick={onNew} style={{ padding: "4px 10px", border: "1.5px dashed #D8D8D8", borderRadius: 7, background: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#888", fontFamily: "inherit" }}>+ New</button>
        </div>
        {hasGroups ? groups.map(g => (
          <div key={g.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", letterSpacing: "0.04em", marginBottom: 4, padding: "0 4px" }}>
              {g.name} <span style={{ color: "#bbb", fontWeight: 600 }}>({g.items.length})</span>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
              {g.items.map(t => renderItem(t, true))}
            </div>
          </div>
        )) : (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
            {templates.map(t => renderItem(t, true))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: vertical sidebar grouped by outlet
  return (
    <div style={{ width: 210, flexShrink: 0, background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 14, padding: 14, position: "sticky", top: 68, height: "fit-content", maxHeight: "calc(100vh - 90px)", overflowY: "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 10 }}>TEMPLATES · {templates.length}</div>
      {hasGroups ? groups.map(g => (
        <div key={g.id} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", letterSpacing: "0.04em", marginBottom: 5, padding: "4px 6px", background: "#FFF8F0", borderRadius: 5, border: "1px solid #FFE8CC" }}>
            {g.name} <span style={{ color: "#ccc", fontWeight: 600 }}>· {g.items.length}</span>
          </div>
          {g.items.map(t => renderItem(t, false))}
        </div>
      )) : templates.map(t => renderItem(t, false))}
      <button onClick={onNew} style={{ width: "100%", marginTop: 8, padding: "8px 0", border: "1.5px dashed #D8D8D8", borderRadius: 8, background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#888", fontFamily: "inherit" }}>+ New Template</button>
    </div>
  );
}

// ─── Preview — uses real StaffView with test log submission ──────────────────
function Preview({ template, onTestSubmit }) {
  if (!template) return <div style={{ textAlign: "center", padding: 40, color: "#ccc", fontSize: 13 }}>Select a template to preview</div>;
  // Render StaffView with this single template, mark submissions as test
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0", marginBottom: 4 }}>
        <span style={{ display: "inline-block", background: "#4a90d918", border: "1px solid #4a90d935", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "#4a90d9" }}>
          🧪 Test Mode — submissions saved as test logs
        </span>
      </div>
      <StaffView
        templates={[{ ...template, submitPolicy: "unlimited", expiryHours: 0 }]}
        onSubmit={log => onTestSubmit && onTestSubmit({ ...log, isTest: true, roleName: "Admin (Test)" })}
        logs={[]}
        roleName="__admin_test__"
        bypassRecurrence={true}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const emptyRecurrence = () => ({
  quick: "Every day",      // quick preset
  unit: "day",             // hour|day|week|month
  interval: 1,             // every N units
  days: [],                // for weekly: [0-6] sun=0
  endsType: "never",       // never|on|after
  endsDate: "",
  endsAfter: 1,
});
const emptyTemplate = () => ({ id: uid(), name: "", startDate: new Date().toISOString().split("T")[0], time: "08:00", expiryHours: 15, recurrence: emptyRecurrence(), escalate: false, escalateMin: 30, submitPolicy: "once", fields: [] });

export default function FlexiLogAdmin({ onLogout, logs = [], templates: externalTemplates, onTemplatesChange, onDeleteLog, onAddLog }) {
  // Normalize: ensure every template has an `id` field (Firestore uses _docId)
  const initTemplates = (externalTemplates || [emptyTemplate()]).map(t => ({ ...t, id: t.id || t._docId || uid() }));
  const [templates, setTemplatesLocal] = useState(initTemplates);
  const [activeId, setActiveId] = useState(initTemplates[0]?.id);
  const [mode, setMode] = useState("builder"); // builder | preview | dashboard | roles | outlets
  const [toast, setToast] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(""); // Outlet filter for templates
  const [roles, saveRole, deleteRole] = useRoles();
  const [outlets, saveOutlet, deleteOutlet] = useOutlets();
  const isMobile = useIsMobile();

  // Sync when externalTemplates changes (Firestore load)
  // Preserve the actively-edited template from local state so typing isn't overwritten
  useEffect(() => {
    if (externalTemplates && externalTemplates.length > 0) {
      const normalized = externalTemplates.map(t => ({ ...t, id: t.id || t._docId || uid() }));
      setTemplatesLocal(prev => {
        const localActive = prev.find(t => t.id === activeId);
        if (localActive) {
          // Keep local version of the active template, sync everything else
          return normalized.map(t => t.id === activeId ? localActive : t);
        }
        return normalized;
      });
      setActiveId(prev => {
        if (normalized.find(t => t.id === prev)) return prev;
        return normalized[0].id;
      });
    }
  }, [externalTemplates, activeId]);

  const setTemplates = (updater) => {
    setTemplatesLocal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (onTemplatesChange) onTemplatesChange(next, selectedOutlet);
      return next;
    });
  };

  // Filter templates by selected outlet
  const filteredTemplates = selectedOutlet
    ? templates.filter(t => t.outletId === selectedOutlet)
    : templates;

  const active = templates.find(t => t.id === activeId) || templates[0];
  const [fieldsOpenKey, setFieldsOpenKey] = useState({ k: 0, open: true }); // force re-render with open state
  const updateActive = (patch) => setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, ...patch } : t));
  const addField = (type) => updateActive({ fields: [...active.fields, defaultField(type.id)] });
  const updateField = (id, patch) => updateActive({ fields: active.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const deleteField = (id) => updateActive({ fields: active.fields.filter(f => f.id !== id) });
  const duplicateField = (id) => {
    const idx = active.fields.findIndex(f => f.id === id);
    if (idx === -1) return;
    const original = active.fields[idx];
    const copy = { ...original, id: uid(), label: (original.label || "Untitled") + " (copy)" };
    const newFields = [...active.fields.slice(0, idx + 1), copy, ...active.fields.slice(idx + 1)];
    updateActive({ fields: newFields });
  };
  const moveField = (id, dir) => {
    const arr = [...active.fields];
    const i = arr.findIndex(f => f.id === id), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateActive({ fields: arr });
  };
  const addTemplate = () => {
    // Ensure new template has a unique ID
    let t = emptyTemplate();
    while (templates.some(existing => existing.id === t.id)) {
      t = emptyTemplate();
    }

    // If outlet is selected, assign template to it
    if (selectedOutlet) {
      t.outletId = selectedOutlet;
    }

    setTemplates(ts => [...ts, t]);
    setActiveId(t.id);
    setMode("builder");
  };
  const deleteTemplate = (id) => {
    if (templates.length === 1) return;
    const rem = templates.filter(t => t.id !== id);
    setTemplates(rem);
    if (activeId === id) setActiveId(rem[0].id);
  };
  const duplicateTemplate = () => {
    if (!active) return;
    const { _docId, ...rest } = active;
    const dup = { ...rest, id: uid(), name: (active.name || "Untitled") + " (copy)", fields: active.fields.map(f => ({ ...f, id: uid() })) };
    setTemplates(ts => [...ts, dup]);
    setActiveId(dup.id);
    setToast("Template duplicated"); setTimeout(() => setToast(null), 2500);
  };
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState([]);
  const copyToOutlets = () => {
    if (!active || copyTargets.length === 0) return;
    const newOnes = copyTargets.map(outletId => {
      const { _docId, ...rest } = active;
      return { ...rest, id: uid(), outletId, fields: active.fields.map(f => ({ ...f, id: uid() })) };
    });
    setTemplates(ts => [...ts, ...newOnes]);
    setShowCopyModal(false);
    setCopyTargets([]);
    setToast(`Copied to ${newOnes.length} outlet${newOnes.length > 1 ? "s" : ""}`); setTimeout(() => setToast(null), 2500);
  };
  const saveAll = () => { setToast("All templates saved"); setTimeout(() => setToast(null), 2500); };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#F5F5F3", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        button { font-family: inherit; }
      `}</style>

      {/* ── NAVBAR ── */}
      {isMobile ? (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #EBEBEB" }}>
          <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div style={{ width: 22, height: 22, background: "#000", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>FL</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Flexi-Log</span>
              <span style={{ color: "#ddd" }}>›</span>
              <span style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active?.name || "Admin"}</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              {toast && <span style={{ fontSize: 11, color: "#2d9e2d", fontWeight: 600 }}>✓ {toast}</span>}
              {mode !== "roles" && mode !== "outlets" && (
                <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} style={{ padding: "4px 6px", border: "1.5px solid #E8E8E8", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "#fff", cursor: "pointer", maxWidth: 110 }}>
                  <option value="">All Outlets</option>
                  {outlets && outlets.map(o => <option key={o._docId} value={o._docId}>{o.name}</option>)}
                </select>
              )}
              {mode === "builder" && <button onClick={saveAll} style={{ padding: "5px 12px", border: "none", borderRadius: 7, background: "#000", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff" }}>Save</button>}
              {onLogout && <button onClick={onLogout} style={{ padding: "5px 10px", border: "1.5px solid #E0E0E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#555" }}>Out</button>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 3, background: "#F2F2F2", padding: 3, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {[["builder", "Builder"], ["preview", "Preview"], ["dashboard", `Logs${logs.length > 0 ? " (" + logs.length + ")" : ""}`], ["roles", "Roles"], ["outlets", "Outlets"]].map(([m, lbl]) => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1a1a1a" : "#888", cursor: "pointer", fontFamily: "inherit", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap", flex: 1 }}>{lbl}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #EBEBEB", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 22, height: 22, background: "#000", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>FL</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Flexi-Log</span>
            <span style={{ color: "#ddd" }}>›</span>
            <span style={{ fontSize: 12, color: "#888" }}>Admin</span>
            <span style={{ color: "#ddd" }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active?.name || "New Checklist"}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {toast && <span style={{ fontSize: 11.5, color: "#2d9e2d", fontWeight: 600 }}>✓ {toast}</span>}
            {mode !== "roles" && mode !== "outlets" && (
              <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} style={{ padding: "5px 10px", border: "1.5px solid #E8E8E8", borderRadius: 7, fontSize: 11.5, fontWeight: 600, background: "#fff", cursor: "pointer" }}>
                <option value="">All Outlets</option>
                {outlets && outlets.map(o => <option key={o._docId} value={o._docId}>{o.name}</option>)}
              </select>
            )}
            <div style={{ display: "flex", gap: 3, background: "#F2F2F2", borderRadius: 8, padding: 3 }}>
              {[["builder", "Builder"], ["preview", "Preview"], ["dashboard", `Dashboard${logs.length > 0 ? " (" + logs.length + ")" : ""}`], ["roles", "Roles"], ["outlets", "Outlets"]].map(([m, lbl]) => (
                <button key={m} onClick={() => setMode(m)} style={{ padding: "5px 11px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1a1a1a" : "#888", cursor: "pointer", fontFamily: "inherit", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{lbl}</button>
              ))}
            </div>
            {mode === "builder" && <button onClick={saveAll} style={{ padding: "6px 15px", border: "none", borderRadius: 7, background: "#000", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>Save All</button>}
            {onLogout && <button onClick={onLogout} style={{ padding: "6px 13px", border: "1.5px solid #E0E0E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#555" }}>Sign Out</button>}
          </div>
        </div>
      )}

      {mode === "dashboard" && <AdminDashboard logs={logs} templates={templates} onDeleteLog={onDeleteLog} />}

      {mode === "roles" && <RoleManager roles={roles} templates={templates} outlets={outlets} onSaveRole={saveRole} onDeleteRole={deleteRole} />}

      {mode === "outlets" && <OutletManager outlets={outlets} onSaveOutlet={saveOutlet} onDeleteOutlet={deleteOutlet} />}

      {mode !== "dashboard" && mode !== "roles" && mode !== "outlets" && <div style={isMobile ? { maxWidth: 1020, margin: "0 auto", padding: "12px 10px" } : { display: "flex", gap: 16, maxWidth: 1020, margin: "0 auto", padding: "22px 16px", alignItems: "flex-start" }}>
        <TemplatesSidebar templates={filteredTemplates} activeId={activeId} onSelect={id => { setActiveId(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} onNew={addTemplate} onDelete={deleteTemplate} isMobile={isMobile} outlets={outlets} />

        {mode === "builder" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #EBEBEB", padding: isMobile ? "14px 12px" : 18, marginBottom: isMobile ? 10 : 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em" }}>CHECKLIST SETTINGS</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={duplicateTemplate} style={{ padding: "4px 10px", border: "1.5px solid #E8E8E8", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#555", fontFamily: "inherit" }}>⧉ Duplicate</button>
                  {outlets && outlets.length > 0 && (
                    <button onClick={() => { setCopyTargets([]); setShowCopyModal(true); }} style={{ padding: "4px 10px", border: "1.5px solid #E8E8E8", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#555", fontFamily: "inherit" }}>📋 Copy to Outlets</button>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Template Name</label>
                <input value={active.name} onChange={e => updateActive({ name: e.target.value })} placeholder="e.g. Coconut Milk Production"
                  style={{ ...S.input, fontSize: 14.5, fontWeight: 500, padding: "10px 12px" }}
                  onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
              </div>
              {/* ── Recurrence (Google Calendar-style) ── */}
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Recurrence</label>
                {(() => {
                  const rec = active.recurrence || emptyRecurrence();
                  const upRec = patch => updateActive({ recurrence: { ...rec, ...patch } });
                  const DAYS = ["S","M","T","W","T","F","S"];
                  return (
                    <div>
                      {/* Quick presets */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {["Does not repeat","Every day","Every week","Every month","Custom..."].map(q => (
                          <button key={q} onClick={() => upRec({ quick: q })} style={{
                            ...S.chip(rec.quick === q), fontSize: 11, padding: "5px 10px",
                          }}>{q}</button>
                        ))}
                      </div>
                      {/* Day picker — shown for Every week only */}
                      {rec.quick === "Every week" && (
                        <div style={{ padding: "12px 14px", background: "#F8F8F8", border: "1.5px solid #E0E0E0", borderRadius: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: "#666", marginBottom: 7 }}>
                            {rec.quick === "Every day" ? "Repeats on these days" : "Repeats on"}
                          </div>
                          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                            {["S","M","T","W","T","F","S"].map((d, i) => {
                              const sel = (rec.days || []).includes(i);
                              return <div key={i} onClick={() => {
                                const arr = rec.days || [];
                                upRec({ days: sel ? arr.filter(x => x !== i) : [...arr, i] });
                              }} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", background: sel ? "#000" : "#fff", color: sel ? "#fff" : "#555", border: "1.5px solid " + (sel ? "#000" : "#D8D8D8") }}>{d}</div>;
                            })}
                          </div>
                          {(rec.days || []).length === 0 && (
                            <div style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>No days selected — will run every day by default</div>
                          )}
                        </div>
                      )}

                      {/* Custom panel */}
                      {rec.quick === "Custom..." && (
                        <div style={{ padding: "12px 14px", background: "#F8F8F8", border: "1.5px solid #E0E0E0", borderRadius: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.06em", marginBottom: 10 }}>CUSTOM RECURRENCE</div>
                          {/* Repeats every N unit */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>Repeats every</span>
                            <input type="number" min="1" max="99" value={rec.interval || 1}
                              onChange={e => upRec({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
                              style={{ ...S.input, width: 56, textAlign: "center", padding: "6px 8px" }}
                              onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                            <select value={rec.unit || "day"} onChange={e => upRec({ unit: e.target.value })}
                              style={{ ...S.input, width: 100, padding: "6px 8px" }}
                              onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"}>
                              {["hour","day","week","month"].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          {/* Day picker for weekly */}
                          {rec.unit === "week" && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Repeats on</div>
                              <div style={{ display: "flex", gap: 5 }}>
                                {["S","M","T","W","T","F","S"].map((d, i) => {
                                  const sel = (rec.days || []).includes(i);
                                  return <div key={i} onClick={() => {
                                    const arr = rec.days || [];
                                    upRec({ days: sel ? arr.filter(x => x !== i) : [...arr, i] });
                                  }} style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", background: sel ? "#000" : "#fff", color: sel ? "#fff" : "#555", border: "1.5px solid " + (sel ? "#000" : "#D8D8D8") }}>{d}</div>;
                                })}
                              </div>
                            </div>
                          )}
                          {/* Ends */}
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Ends</div>
                            {[{ v: "never", label: "Never" }, { v: "on", label: "On" }, { v: "after", label: "After" }].map(opt => (
                              <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: "pointer" }}>
                                <div onClick={() => upRec({ endsType: opt.v })} style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid " + (rec.endsType === opt.v ? "#000" : "#D8D8D8"), background: rec.endsType === opt.v ? "#000" : "#fff", flexShrink: 0 }}/>
                                <span style={{ fontSize: 12, color: "#555" }}>{opt.label}</span>
                                {opt.v === "on" && rec.endsType === "on" && (
                                  <input type="date" value={rec.endsDate || ""} onChange={e => upRec({ endsDate: e.target.value })}
                                    style={{ ...S.input, flex: 1, padding: "5px 8px" }}
                                    onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                                )}
                                {opt.v === "after" && rec.endsType === "after" && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input type="number" min="1" value={rec.endsAfter || 1} onChange={e => upRec({ endsAfter: Math.max(1, parseInt(e.target.value) || 1) })}
                                      style={{ ...S.input, width: 56, textAlign: "center", padding: "5px 8px" }}
                                      onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                                    <span style={{ fontSize: 12, color: "#888" }}>occurrence{(rec.endsAfter || 1) !== 1 ? "s" : ""}</span>
                                  </div>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              {/* Start date & time */}
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Start Date</label>
                  <input type="date" value={active.startDate || ""} onChange={e => updateActive({ startDate: e.target.value })} style={S.input}
                    onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Start Time</label>
                  <input type="time" value={active.time} onChange={e => updateActive({ time: e.target.value })} style={S.input}
                    onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                </div>
              </div>
              {/* Expiry hours */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 10 }}>
                <label style={{ ...S.label, marginBottom: 0, whiteSpace: "nowrap" }}>Checklist Expiry</label>
                <input type="number" min="0" max="72" value={active.expiryHours ?? 15} onChange={e => updateActive({ expiryHours: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...S.input, width: 60, textAlign: "center", padding: "6px 8px" }}
                  onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                <span style={{ fontSize: 12, color: "#666" }}>hours after start time</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#aaa", marginBottom: 10 }}>
                {(active.expiryHours ?? 15) === 0 ? "No expiry — staff can submit anytime" : `Staff must submit within ${active.expiryHours ?? 15} hours of ${active.time || "08:00"}`}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#FAFAFA", borderRadius: 9, border: "1.5px solid #EBEBEB" }}>
                <CheckRow label="Escalation Alert" checked={active.escalate} onChange={v => updateActive({ escalate: v })}>Notify supervisor if checklist is overdue</CheckRow>
                {active.escalate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#666" }}>Alert after</span>
                    <input type="number" value={active.escalateMin} onChange={e => updateActive({ escalateMin: e.target.value })}
                      style={{ ...S.input, width: 54, padding: "5px 8px", textAlign: "center" }}
                      onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                    <span style={{ fontSize: 12, color: "#666" }}>minutes past deadline</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#FAFAFA", borderRadius: 9, border: "1.5px solid #EBEBEB" }}>
                <label style={S.label}>Submission Policy</label>
                <select value={active.submitPolicy || "once"} onChange={e => updateActive({ submitPolicy: e.target.value })}
                  style={S.input} onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"}>
                  <option value="once">Once only — cannot resubmit</option>
                  <option value="once_per_day">Once per day — resets daily</option>
                  <option value="unlimited">Unlimited — can resubmit anytime</option>
                </select>
                <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 2 }}>
                  {(active.submitPolicy || "once") === "once" && "Staff can submit this checklist only once per session"}
                  {active.submitPolicy === "once_per_day" && "Staff can resubmit after midnight each day"}
                  {active.submitPolicy === "unlimited" && "Staff can submit multiple times without restriction"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em" }}>FIELDS — {active.fields.length}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {active.fields.length > 1 && (
                  <>
                    <button onClick={() => setFieldsOpenKey(v => ({ k: v.k + 1, open: true }))} style={{ padding: "3px 8px", border: "1px solid #E8E8E8", borderRadius: 6, background: "#fff", fontSize: 10, fontWeight: 600, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>Expand All</button>
                    <button onClick={() => setFieldsOpenKey(v => ({ k: v.k + 1, open: false }))} style={{ padding: "3px 8px", border: "1px solid #E8E8E8", borderRadius: 6, background: "#fff", fontSize: 10, fontWeight: 600, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>Collapse All</button>
                  </>
                )}
                {active.fields.length > 0 && <span style={{ fontSize: 10.5, color: "#bbb" }}>{active.fields.filter(f => f.required).length} required</span>}
              </div>
            </div>

            {active.fields.length === 0 ? (
              <div style={{ border: "2px dashed #E8E8E8", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#ccc", fontSize: 12.5 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>＋</div>Add your first field from the panel on the right
              </div>
            ) : active.fields.map((field, i) => (
              <FieldRow key={field.id + "_" + fieldsOpenKey.k} field={field} index={i + 1} defaultOpen={fieldsOpenKey.open}
                onUpdate={p => updateField(field.id, p)}
                onDelete={() => deleteField(field.id)}
                onMove={d => moveField(field.id, d)}
                onDuplicate={() => duplicateField(field.id)}
                isFirst={i === 0} isLast={i === active.fields.length - 1} />
            ))}
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ width: "100%", padding: "10px 0", background: "none", border: "1.5px solid #E8E8E8", borderRadius: 10, color: "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 10 }}>↑ Scroll to Top</button>
          </div>
        ) : (
          <div style={{ flex: 1 }}><Preview template={active} onTestSubmit={onAddLog} /></div>
        )}

        {mode === "builder" && (isMobile ? (
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #EBEBEB", padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 8 }}>ADD FIELD</div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
              {FIELD_TYPES.map(type => (
                <button key={type.id} onClick={() => addField(type)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", border: "1.5px solid #EBEBEB", borderRadius: 9, background: "#fff", cursor: "pointer", textAlign: "left", flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{type.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap" }}>{type.label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ width: 205, flexShrink: 0, position: "sticky", top: 68 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #EBEBEB", padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 10 }}>ADD FIELD</div>
              {FIELD_TYPES.map(type => (
                <button key={type.id} onClick={() => addField(type)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", border: "1.5px solid #EBEBEB", borderRadius: 9, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 5 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#000"; e.currentTarget.style.background = "#FAFAFA"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#EBEBEB"; e.currentTarget.style.background = "#fff"; }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{type.icon}</div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1a1a1a" }}>{type.label}</div>
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{type.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {active.fields.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #EBEBEB", padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 8 }}>SUMMARY</div>
                {FIELD_TYPES.map(type => {
                  const count = active.fields.filter(f => f.type === type.id).length;
                  if (!count) return null;
                  return <div key={type.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#666", marginBottom: 4 }}>
                    <span>{type.icon} {type.label}</span><span style={{ fontWeight: 700, color: "#1a1a1a" }}>{count}</span>
                  </div>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>}

      {/* Copy to Outlets Modal */}
      {showCopyModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}
          onClick={() => setShowCopyModal(false)}>
          <div style={{ background: "#fff", borderRadius: isMobile ? "18px 18px 0 0" : 16, padding: isMobile ? "20px 16px 28px" : "24px 28px", width: "100%", maxWidth: isMobile ? "100%" : 360, boxShadow: "0 12px 48px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Copy to Outlets</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Select outlets to copy "{active?.name || "Untitled"}" to:</div>
            <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 16 }}>
              {outlets.map(o => {
                const checked = copyTargets.includes(o._docId);
                return (
                  <label key={o._docId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, cursor: "pointer", marginBottom: 4, background: checked ? "#F0F0F0" : "#FAFAFA", border: `1.5px solid ${checked ? "#000" : "#EBEBEB"}` }}>
                    <input type="checkbox" checked={checked} onChange={() => setCopyTargets(prev => checked ? prev.filter(id => id !== o._docId) : [...prev, o._docId])}
                      style={{ accentColor: "#000", width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{o.name}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCopyModal(false)} style={{ flex: 1, padding: "10px 0", border: "1.5px solid #E0E0E0", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#666", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={copyToOutlets} disabled={copyTargets.length === 0} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 9, background: copyTargets.length > 0 ? "#000" : "#ccc", cursor: copyTargets.length > 0 ? "pointer" : "default", fontSize: 12.5, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Copy ({copyTargets.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
