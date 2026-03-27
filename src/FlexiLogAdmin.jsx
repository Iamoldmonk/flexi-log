import { useState } from "react";
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

let _id = 100;
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
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => u({ referencePhoto: ev.target.result });
                reader.readAsDataURL(file);
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
      </div>
    </div>
  );
}

// ─── Field Row ─────────────────────────────────────────────────────────────────
function FieldRow({ field, onUpdate, onDelete, onMove, isFirst, isLast }) {
  const [open, setOpen] = useState(true);
  const type = FIELD_TYPES.find(t => t.id === field.type);
  return (
    <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, background: "#fff", marginBottom: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: open ? "#fff" : "#FAFAFA" }}
        onClick={() => setOpen(!open)}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F2F2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {type.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={field.label}
            onChange={e => onUpdate({ label: e.target.value })}
            onClick={e => e.stopPropagation()}
            placeholder={`Untitled ${type.label}`}
            style={{ width: "100%", fontSize: 12.5, fontWeight: 600, color: "#1a1a1a", border: "none", outline: "none", background: "transparent", padding: 0, cursor: "text", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 1 }}>{type.label}{field.required ? " · Required" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
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
function TemplatesSidebar({ templates, activeId, onSelect, onNew, onDelete }) {
  return (
    <div style={{ width: 210, flexShrink: 0, background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 14, padding: 14, position: "sticky", top: 68, height: "fit-content" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 10 }}>
        TEMPLATES · {templates.length}
      </div>
      {templates.map(t => (
        <div key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
          background: t.id === activeId ? "#000" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
          onMouseEnter={e => { if (t.id !== activeId) e.currentTarget.style.background = "#F5F5F5"; }}
          onMouseLeave={e => { if (t.id !== activeId) e.currentTarget.style.background = "transparent"; }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.id === activeId ? "#fff" : "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.name || "Untitled"}
            </div>
            <div style={{ fontSize: 10, color: t.id === activeId ? "rgba(255,255,255,0.45)" : "#bbb", marginTop: 1 }}>
              {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}
            </div>
          </div>
          {templates.length > 1 && t.id !== activeId && (
            <button onClick={e => { e.stopPropagation(); onDelete(t.id); }} style={{
              width: 18, height: 18, border: "none", background: "none",
              cursor: "pointer", color: "#ccc", fontSize: 12, padding: 0, flexShrink: 0,
            }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={onNew} style={{
        width: "100%", marginTop: 8, padding: "8px 0",
        border: "1.5px dashed #D8D8D8", borderRadius: 8, background: "none",
        cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#888", fontFamily: "inherit",
      }}>+ New Template</button>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function Preview({ template }) {
  const { name, recurrence, time, fields } = template;
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #EBEBEB", overflow: "hidden", boxShadow: "0 6px 28px rgba(0,0,0,0.07)" }}>
        <div style={{ background: "#111", padding: "18px 20px 16px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{recurrence} · {time}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{name || "Untitled Checklist"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{fields.length} fields · Staff view</div>
        </div>
        <div style={{ padding: 16 }}>
          {fields.length === 0 ? (
            <div style={{ textAlign: "center", padding: 28, color: "#ccc", fontSize: 12 }}>No fields added yet</div>
          ) : fields.map(field => {
            const type = FIELD_TYPES.find(t => t.id === field.type);
            return (
              <div key={field.id} style={{ marginBottom: 10, padding: "11px 13px", border: "1.5px solid #EBEBEB", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {field.label || `Untitled ${type.label}`}
                    {field.required && <span style={{ color: "#ff4444" }}> *</span>}
                  </span>
                  <span style={{ fontSize: 10, color: "#bbb" }}>{type.icon}</span>
                </div>
                {field.type === "toggle" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ l: field.yesLabel || "Done", c: field.toggleColor }, { l: field.noLabel || "Skip", c: "#999" }].map((b, i) => (
                      <div key={i} style={{ flex: 1, padding: "7px 0", borderRadius: 7, textAlign: "center", fontSize: 11.5, fontWeight: 700, background: i === 0 ? field.toggleColor + "15" : "#F5F5F5", border: `1.5px solid ${i === 0 ? field.toggleColor + "35" : "#E8E8E8"}`, color: i === 0 ? field.toggleColor : "#999" }}>{b.l}</div>
                    ))}
                  </div>
                )}
                {field.type === "text" && (
                  <div style={{ background: "#FAFAFA", border: "1.5px solid #EBEBEB", borderRadius: 7, padding: "8px 10px", fontSize: 11.5, color: "#ccc", minHeight: field.multiline ? 60 : "auto" }}>{field.placeholder || "Type here…"}</div>
                )}
                {field.type === "number" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1, background: "#FAFAFA", border: "1.5px solid #EBEBEB", borderRadius: 7, padding: "8px 10px", fontSize: 12, color: "#ccc" }}>0 {field.unit}</div>
                    {field.trackWaste && <div style={{ flex: 1, background: "#FFF8F5", border: "1.5px solid #FFE5D5", borderRadius: 7, padding: "8px 10px", fontSize: 11, color: "#e8a87c" }}>Wasted: 0</div>}
                  </div>
                )}
                {field.type === "photo" && (
                  <div style={{ background: "#F8F8F8", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "16px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: "#ccc" }}>◉</div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{field.forceCapture ? "Live capture only" : "Tap to add photo"}</div>
                  </div>
                )}
                {field.type === "timestamp" && (
                  <div style={{ background: "#FAFAFA", border: "1.5px solid #EBEBEB", borderRadius: 7, padding: "7px 10px", fontSize: 11, color: "#bbb", fontFamily: "monospace" }}>Auto · Wed 25 Mar 2026, 08:00</div>
                )}
                {field.type === "rating" && (
                  <div>
                    {field.ratingLabel && <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5 }}>{field.ratingLabel}</div>}
                    <div style={{ display: "flex", gap: 3 }}>{Array.from({ length: field.maxStars }).map((_, i) => <span key={i} style={{ fontSize: 20, color: "#E8E8E8" }}>★</span>)}</div>
                  </div>
                )}
                {field.type === "dropdown" && (
                  <div style={{ background: "#FAFAFA", border: "1.5px solid #EBEBEB", borderRadius: 7, padding: "8px 10px", fontSize: 12, color: "#aaa", display: "flex", justifyContent: "space-between" }}>
                    <span>{field.dropdownOptions[0] || "Select…"}</span><span>▾</span>
                  </div>
                )}
                {field.type === "signature" && (
                  <div>
                    {field.sigNote && <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>{field.sigNote}</div>}
                    <div style={{ background: "#FAFAFA", border: "1.5px dashed #D8D8D8", borderRadius: 8, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, color: "#ccc" }}>Sign here</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {fields.length > 0 && (
            <button style={{ width: "100%", padding: "12px 0", background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Submit Log</button>
          )}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 10.5, color: "#ccc", marginTop: 10 }}>Staff Preview · Read Only</div>
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
  autoReset: "schedule",   // schedule|completion
});
const emptyTemplate = () => ({ id: uid(), name: "", time: "08:00", recurrence: emptyRecurrence(), escalate: false, escalateMin: 30, fields: [] });

export default function FlexiLogAdmin({ onLogout, logs = [], templates: externalTemplates, onTemplatesChange }) {
  const initTemplates = externalTemplates || [emptyTemplate()];
  const [templates, setTemplatesLocal] = useState(initTemplates);
  const [activeId, setActiveId] = useState(initTemplates[0].id);
  const [mode, setMode] = useState("builder"); // builder | preview | dashboard | roles | outlets
  const [toast, setToast] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(""); // Outlet filter for templates
  const [roles, saveRole, deleteRole] = useRoles();
  const [outlets, saveOutlet, deleteOutlet] = useOutlets();

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

  const active = templates.find(t => t.id === activeId);
  const updateActive = (patch) => setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, ...patch } : t));
  const addField = (type) => updateActive({ fields: [...active.fields, defaultField(type.id)] });
  const updateField = (id, patch) => updateActive({ fields: active.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const deleteField = (id) => updateActive({ fields: active.fields.filter(f => f.id !== id) });
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
    } else {
      // If no outlet selected, ask user which outlets to copy to
      const outletList = outlets.map(o => o.name).join(", ");
      const shouldCopy = window.confirm(`Create template for all outlets?\n\n${outletList}\n\nClick OK to copy to all, Cancel to create for current selection only.`);
      if (shouldCopy && outlets.length > 0) {
        // Create template for each outlet
        const newTemplates = outlets.map(o => ({ ...t, outletId: o._docId, id: uid() }));
        setTemplates(ts => [...ts, ...newTemplates]);
        setActiveId(newTemplates[0].id);
        setMode("builder");
        return;
      }
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
  const saveAll = () => { setToast("All templates saved"); setTimeout(() => setToast(null), 2500); };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#F5F5F3", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        button { font-family: inherit; }
      `}</style>

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
              {outlets && outlets.map(o => (
                <option key={o._docId} value={o._docId}>{o.name}</option>
              ))}
            </select>
          )}
          <div style={{ display: "flex", gap: 3, background: "#F2F2F2", borderRadius: 8, padding: 3 }}>
            {[["builder", "Builder"], ["preview", "Preview"], ["dashboard", `Dashboard${logs.length > 0 ? " (" + logs.length + ")" : ""}`], ["roles", "Roles"], ["outlets", "Outlets"]].map(([m, lbl]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "5px 11px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "#1a1a1a" : "#888", cursor: "pointer", fontFamily: "inherit",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>{lbl}</button>
            ))}
          </div>
          {mode === "builder" && <button onClick={saveAll} style={{ padding: "6px 15px", border: "none", borderRadius: 7, background: "#000", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>Save All</button>}
          {onLogout && <button onClick={onLogout} style={{ padding: "6px 13px", border: "1.5px solid #E0E0E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#555" }}>Sign Out</button>}
        </div>
      </div>

      {mode === "dashboard" && <AdminDashboard logs={logs} templates={templates} />}

      {mode === "roles" && <RoleManager roles={roles} templates={templates} outlets={outlets} onSaveRole={saveRole} onDeleteRole={deleteRole} />}

      {mode === "outlets" && <OutletManager outlets={outlets} onSaveOutlet={saveOutlet} onDeleteOutlet={deleteOutlet} />}

      {mode !== "dashboard" && mode !== "roles" && mode !== "outlets" && <div style={{ display: "flex", gap: 16, maxWidth: 1020, margin: "0 auto", padding: "22px 16px", alignItems: "flex-start" }}>
        <TemplatesSidebar templates={filteredTemplates} activeId={activeId} onSelect={id => { setActiveId(id); setMode("builder"); }} onNew={addTemplate} onDelete={deleteTemplate} />

        {mode === "builder" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #EBEBEB", padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 14 }}>CHECKLIST SETTINGS</div>
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
                      {/* Day picker — shown for Every day, Every week, and Custom week */}
                      {(rec.quick === "Every day" || rec.quick === "Every week") && (
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
                          {/* Auto-reset */}
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #E8E8E8" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Auto-reset</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[["schedule","On Schedule"],["completion","On Completion"]].map(([v,lbl]) => (
                                <button key={v} onClick={() => upRec({ autoReset: v })} style={S.chip((rec.autoReset || "schedule") === v)}>{lbl}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              {/* Start time */}
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Start Time</label>
                  <input type="time" value={active.time} onChange={e => updateActive({ time: e.target.value })} style={S.input}
                    onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
                </div>
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
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em" }}>FIELDS — {active.fields.length}</span>
              {active.fields.length > 0 && <span style={{ fontSize: 10.5, color: "#bbb" }}>{active.fields.filter(f => f.required).length} required</span>}
            </div>

            {active.fields.length === 0 ? (
              <div style={{ border: "2px dashed #E8E8E8", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#ccc", fontSize: 12.5 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>＋</div>Add your first field from the panel on the right
              </div>
            ) : active.fields.map((field, i) => (
              <FieldRow key={field.id} field={field}
                onUpdate={p => updateField(field.id, p)}
                onDelete={() => deleteField(field.id)}
                onMove={d => moveField(field.id, d)}
                isFirst={i === 0} isLast={i === active.fields.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1 }}><Preview template={active} /></div>
        )}

        {mode === "builder" && (
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
        )}
      </div>}
    </div>
  );
}
