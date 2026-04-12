import { useState, useMemo } from "react";
import { getAllStock, isLowStock } from "./inventoryStore";

// ─── Photo Lightbox ──────────────────────────────────────────────────────────
function PhotoLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
      <img src={src} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
      <div style={{ position: "absolute", top: 16, right: 20, color: "#fff", fontSize: 28, cursor: "pointer", fontWeight: 300 }}>✕</div>
    </div>
  );
}

const FIELD_ICONS = {
  toggle: "✓", text: "T", number: "#", photo: "◉",
  timestamp: "◷", rating: "★", dropdown: "▾", signature: "✍",
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1a1a1a" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function LogRow({ log, expanded, onToggle, onPhotoClick, onDelete }) {
  return (
    <div style={{ border: "1.5px solid #EBEBEB", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", cursor: "pointer", background: expanded ? "#FAFAFA" : "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>📋</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{log.templateName}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{log.submittedAt}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {log.isTest && <span style={{ background: "#4a90d918", border: "1px solid #4a90d935", borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "#4a90d9" }}>TEST</span>}
          <div style={{ background: "#2d9e2d18", border: "1px solid #2d9e2d35", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#2d9e2d" }}>✓ Submitted</div>
          {onDelete && <button onClick={e => { e.stopPropagation(); if (window.confirm("Delete this log?")) onDelete(log._docId); }} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #E8E8E8", background: "#fff", color: "#cc3333", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>}
          <span style={{ fontSize: 11, color: "#ccc" }}>{expanded ? "▴" : "▾"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #F0F0F0", padding: "14px 16px" }}>
          {log.fields.map(field => {
            const val = log.values[field.id];
            return (
              <div key={field.id} style={{ display: "flex", gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #F8F8F8" }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: "#F2F2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#888", flexShrink: 0, marginTop: 1 }}>
                  {FIELD_ICONS[field.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>{field.label}</div>
                  {field.type === "toggle" && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: val === "yes" ? "#2d9e2d18" : val === "no" ? "#F5F5F5" : "#FFF8F0", color: val === "yes" ? "#2d9e2d" : val === "no" ? "#999" : "#e67e22", border: `1px solid ${val === "yes" ? "#2d9e2d35" : val === "no" ? "#E8E8E8" : "#FFD5A0"}` }}>
                      {val === "yes" ? field.yesLabel || "Done" : val === "no" ? field.noLabel || "Skip" : "— Not answered"}
                    </span>
                  )}
                  {(field.type === "text" || field.type === "number") && (
                    <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc", fontStyle: val ? "normal" : "italic" }}>
                      {val ? `${val}${field.unit ? ` ${field.unit}` : ""}` : "Not filled"}
                    </div>
                  )}
                  {field.type === "rating" && (
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      {Array.from({ length: field.maxStars || 5 }).map((_, i) => (
                        <span key={i} style={{ fontSize: 14, color: i < (val || 0) ? "#f4a825" : "#E8E8E8" }}>★</span>
                      ))}
                      {val > 0 && <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>{val}/{field.maxStars || 5}</span>}
                    </div>
                  )}
                  {field.type === "dropdown" && <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc" }}>{val || "Not selected"}</div>}
                  {field.type === "timestamp" && <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>{val || "Auto-recorded"}</div>}
                  {field.type === "photo" && val && val.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {val.map((src, i) => <img key={i} src={src} alt="" onClick={e => { e.stopPropagation(); onPhotoClick(src); }} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #E8E8E8", cursor: "zoom-in" }} />)}
                    </div>
                  )}
                  {field.type === "signature" && val && (
                    <img src={val} alt="sig" onClick={e => { e.stopPropagation(); onPhotoClick(val); }} style={{ maxWidth: 160, height: 48, border: "1px solid #E8E8E8", borderRadius: 6, background: "#FAFAFA", marginTop: 4, cursor: "zoom-in" }} />
                  )}
                  {!val && field.type !== "toggle" && <div style={{ fontSize: 12, color: "#ccc", fontStyle: "italic" }}>Not filled</div>}
                  {/* Required photo for field */}
                  {(() => {
                    const reqPhotos = log.values[field.id + "_reqphoto"];
                    if (!reqPhotos || !Array.isArray(reqPhotos) || reqPhotos.length === 0) return null;
                    return (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", marginBottom: 4 }}>CAPTURED PHOTO</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {reqPhotos.map((src, i) => <img key={i} src={src} alt="" onClick={e => { e.stopPropagation(); onPhotoClick(src); }} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #E8E8E8", cursor: "zoom-in" }} />)}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Sub-tasks */}
                  {field.subTasks && field.subTasks.length > 0 && (() => {
                    const checked = log.values[field.id + "_sub"] || {};
                    const subPhotos = log.values[field.id + "_subphotos"] || {};
                    return (
                      <div style={{ marginTop: 6, padding: "8px 10px", background: "#F8F8F8", borderRadius: 7, border: "1px solid #EBEBEB" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 4 }}>SUB-TASKS</div>
                        {field.subTasks.map((st, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                            <span style={{ color: checked[i] ? "#2d9e2d" : "#ccc", fontWeight: 700 }}>{checked[i] ? "✓" : "✕"}</span>
                            <span style={{ color: checked[i] ? "#1a1a1a" : "#aaa", textDecoration: checked[i] ? "none" : "line-through" }}>{st}</span>
                            {subPhotos[i] && <img src={subPhotos[i]} alt="" onClick={e => { e.stopPropagation(); onPhotoClick(subPhotos[i]); }} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #E8E8E8", marginLeft: "auto", cursor: "zoom-in" }} />}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InventoryOverview() {
  const stock = getAllStock();
  const entries = Object.entries(stock);
  if (entries.length === 0) return (
    <div style={{ textAlign: "center", padding: "28px 16px", color: "#ccc", fontSize: 12.5 }}>
      No inventory tracked yet — enable tracking on a number field in your template
    </div>
  );
  return (
    <div>
      {entries.map(([fieldId, s]) => {
        const low = isLowStock(fieldId);
        const pct = s.opening > 0 ? Math.round((s.current / s.opening) * 100) : 0;
        return (
          <div key={fieldId} style={{ marginBottom: 14, padding: "13px 15px", background: "#fff", border: `1.5px solid ${low ? "#FFD5A0" : "#EBEBEB"}`, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{s.label || fieldId}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                  {s.current} / {s.opening} {s.unit} remaining
                  {s.min > 0 && <span style={{ color: low ? "#e67e22" : "#bbb" }}> · min {s.min} {s.unit}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {low && <div style={{ fontSize: 11, fontWeight: 700, color: "#e67e22", marginBottom: 2 }}>⚠ Low stock</div>}
                <div style={{ fontSize: 18, fontWeight: 700, color: low ? "#e67e22" : "#1a1a1a" }}>{pct}%</div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: pct > 50 ? "#2d9e2d" : pct > 20 ? "#e67e22" : "#e74c3c", transition: "width 0.3s" }} />
            </div>
            {/* Recent history */}
            {s.history.length > 0 && (
              <div style={{ marginTop: 10, borderTop: "1px solid #F5F5F5", paddingTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.05em", marginBottom: 6 }}>RECENT USAGE</div>
                {s.history.slice(0, 3).map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#666", marginBottom: 4 }}>
                    <span style={{ color: h.change < 0 ? "#e74c3c" : "#2d9e2d" }}>{h.change < 0 ? "↓" : "↑"} {Math.abs(h.change)} {s.unit}</span>
                    <span style={{ color: "#aaa" }}>{h.date} · {h.remaining} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Cell value formatter ────────────────────────────────────────────────────
function cellValue(field, log) {
  const val = log.values[field.id];
  if (val === undefined || val === null || val === "") return "—";
  if (field.type === "toggle") return val === "yes" ? (field.yesLabel || "Done") : val === "no" ? (field.noLabel || "Skip") : "—";
  if (field.type === "rating") return `${val}/${field.maxStars || 5}`;
  if (field.type === "photo") return Array.isArray(val) ? `${val.length} photo(s)` : "—";
  if (field.type === "signature") return val ? "Signed" : "—";
  if (field.type === "number") return val + (field.unit ? ` ${field.unit}` : "");
  return String(val);
}

// ─── Build table data from logs ─────────────────────────────────────────────
function buildTableData(logs, filterTemplate) {
  const filtered = filterTemplate ? logs.filter(l => l.templateName === filterTemplate) : logs;
  // Collect all unique field labels across logs
  const fieldMap = new Map();
  filtered.forEach(log => {
    (log.fields || []).forEach(f => {
      if (!fieldMap.has(f.id)) fieldMap.set(f.id, f);
    });
  });
  const columns = Array.from(fieldMap.values());
  return { filtered, columns, fieldMap };
}

// ─── CSV export ─────────────────────────────────────────────────────────────
function exportCSV(logs, columns) {
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Checklist", "Submitted At", ...columns.map(c => c.label)];
  const rows = logs.map(log =>
    [log.templateName, log.submittedAt || log.submittedAtDisplay, ...columns.map(c => cellValue(c, log))]
  );
  const csv = [header, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `flexi-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Google Sheets export (opens CSV in Google Sheets import) ───────────────
function exportGoogleSheets(logs, columns) {
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Checklist", "Submitted At", ...columns.map(c => c.label)];
  const rows = logs.map(log =>
    [log.templateName, log.submittedAt || log.submittedAtDisplay, ...columns.map(c => cellValue(c, log))]
  );
  const csv = [header, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `flexi-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  // After download, prompt user to import into Google Sheets
  setTimeout(() => window.open("https://sheets.google.com/create", "_blank"), 500);
}

// ─── Spreadsheet Table View ─────────────────────────────────────────────────
function LogTable({ logs, templates }) {
  const templateNames = [...new Set(logs.map(l => l.templateName))];
  const [filterTpl, setFilterTpl] = useState("");
  const [sortCol, setSortCol] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");

  const { filtered, columns } = useMemo(() => buildTableData(logs, filterTpl || null), [logs, filterTpl]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va, vb;
      if (sortCol === "submittedAt") {
        va = a.submittedAt || ""; vb = b.submittedAt || "";
      } else if (sortCol === "templateName") {
        va = a.templateName; vb = b.templateName;
      } else {
        const field = columns.find(c => c.id === sortCol);
        va = field ? cellValue(field, a) : "";
        vb = field ? cellValue(field, b) : "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir, columns]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortArrow = (col) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const thStyle = {
    padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#555",
    background: "#F5F5F5", borderBottom: "2px solid #E0E0E0", cursor: "pointer",
    position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap", textAlign: "left",
    userSelect: "none", letterSpacing: "0.03em",
  };
  const tdStyle = {
    padding: "7px 12px", fontSize: 12, color: "#1a1a1a", borderBottom: "1px solid #F0F0F0",
    whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <select value={filterTpl} onChange={e => setFilterTpl(e.target.value)}
          style={{ padding: "7px 10px", border: "1.5px solid #E8E8E8", borderRadius: 8, fontSize: 12, background: "#FAFAFA", fontFamily: "inherit", outline: "none" }}>
          <option value="">All Checklists</option>
          {templateNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => exportCSV(sorted, columns)} style={{
          padding: "7px 14px", border: "1.5px solid #2d9e2d", borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: "#2d9e2d18", color: "#2d9e2d", cursor: "pointer", fontFamily: "inherit",
        }}>Export CSV</button>
        <button onClick={() => exportGoogleSheets(sorted, columns)} style={{
          padding: "7px 14px", border: "1.5px solid #4285f4", borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: "#4285f418", color: "#4285f4", cursor: "pointer", fontFamily: "inherit",
        }}>Open in Sheets</button>
      </div>

      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>{sorted.length} row(s)</div>

      {/* Scrollable table */}
      <div style={{ overflow: "auto", border: "1.5px solid #E8E8E8", borderRadius: 10, maxHeight: "60vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr>
              <th onClick={() => toggleSort("templateName")} style={thStyle}>Checklist{sortArrow("templateName")}</th>
              <th onClick={() => toggleSort("submittedAt")} style={thStyle}>Submitted{sortArrow("submittedAt")}</th>
              {columns.map(col => (
                <th key={col.id} onClick={() => toggleSort(col.id)} style={thStyle}>
                  {col.label}{sortArrow(col.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={2 + columns.length} style={{ ...tdStyle, textAlign: "center", color: "#ccc", padding: 30 }}>No logs found</td></tr>
            ) : sorted.map((log, idx) => (
              <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                <td style={tdStyle}>{log.templateName}</td>
                <td style={{ ...tdStyle, fontSize: 11, color: "#888" }}>{log.submittedAt || log.submittedAtDisplay}</td>
                {columns.map(col => {
                  const val = log.values[col.id];
                  const display = cellValue(col, log);
                  const isYes = col.type === "toggle" && val === "yes";
                  const isNo = col.type === "toggle" && val === "no";
                  return (
                    <td key={col.id} style={{ ...tdStyle, color: isYes ? "#2d9e2d" : isNo ? "#999" : display === "—" ? "#ddd" : "#1a1a1a", fontWeight: isYes ? 700 : 400 }}>
                      {col.type === "photo" && Array.isArray(val) && val.length > 0
                        ? <div style={{ display: "flex", gap: 3 }}>{val.slice(0, 3).map((src, i) => <img key={i} src={src} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} />)}</div>
                        : col.type === "signature" && val
                          ? <img src={val} alt="sig" style={{ height: 24, maxWidth: 80 }} />
                          : display
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard({ logs, templates, onDeleteLog }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const filteredLogs = logs.filter(l =>
    l.templateName.toLowerCase().includes(search.toLowerCase()) ||
    l.submittedAt.toLowerCase().includes(search.toLowerCase())
  );

  const totalFields = logs.reduce((acc, l) => acc + l.fields.length, 0);
  const completionRate = logs.length > 0
    ? Math.round((logs.reduce((acc, l) => {
        const filled = l.fields.filter(f => l.values[f.id]).length;
        return acc + (filled / l.fields.length);
      }, 0) / logs.length) * 100)
    : 0;

  const stockEntries = Object.entries(getAllStock());
  const lowStockCount = stockEntries.filter(([id]) => isLowStock(id)).length;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "22px 16px" }}>
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#EBEBEB", borderRadius: 9, padding: 3, marginBottom: 20 }}>
        {[["overview", "Overview"], ["logs", `All Logs (${logs.length})`], ["table", "Table View"], ["inventory", `Inventory (${stockEntries.length})`]].map(([k, lbl]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            flex: 1, padding: "8px 0", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: activeTab === k ? "#fff" : "transparent",
            color: activeTab === k ? "#1a1a1a" : "#888", cursor: "pointer", fontFamily: "inherit",
            boxShadow: activeTab === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{lbl}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard label="TOTAL SUBMISSIONS" value={logs.length} sub="All time" />
            <StatCard label="COMPLETION RATE" value={`${completionRate}%`} sub="Fields filled avg" color={completionRate > 80 ? "#2d9e2d" : "#e67e22"} />
            <StatCard label="LOW STOCK ITEMS" value={lowStockCount} sub="Need restocking" color={lowStockCount > 0 ? "#e67e22" : "#2d9e2d"} />
            <StatCard label="ACTIVE TEMPLATES" value={templates?.length || 0} sub="Configured" />
          </div>

          {/* Recent activity */}
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", marginBottom: 10 }}>RECENT SUBMISSIONS</div>
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", border: "2px dashed #E8E8E8", borderRadius: 12, color: "#ccc", fontSize: 13 }}>
              No submissions yet — staff will appear here after they submit checklists
            </div>
          ) : logs.slice(0, 5).map(log => (
            <LogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} onPhotoClick={setLightboxSrc} onDelete={onDeleteLog} />
          ))}
          {logs.length > 5 && (
            <button onClick={() => setActiveTab("logs")} style={{ width: "100%", padding: "10px 0", border: "1.5px dashed #D8D8D8", borderRadius: 10, background: "none", fontSize: 12, fontWeight: 600, color: "#888", cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}>
              View all {logs.length} submissions →
            </button>
          )}

          {/* Inventory snapshot */}
          {stockEntries.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", margin: "20px 0 10px" }}>INVENTORY SNAPSHOT</div>
              <InventoryOverview />
            </>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === "logs" && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by template name or date…"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E8E8E8", borderRadius: 10, fontSize: 13, background: "#FAFAFA", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#000"} onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
          </div>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "#ccc", fontSize: 13 }}>
              {logs.length === 0 ? "No submissions yet" : "No results match your search"}
            </div>
          ) : filteredLogs.map(log => (
            <LogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} onPhotoClick={setLightboxSrc} onDelete={onDeleteLog} />
          ))}
        </div>
      )}

      {/* TABLE VIEW TAB */}
      {activeTab === "table" && <LogTable logs={logs} templates={templates} />}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && <InventoryOverview />}
    </div>
  );
}
