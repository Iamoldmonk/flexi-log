import { useState } from "react";
import { getAllStock, isLowStock } from "./inventoryStore";

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

function LogRow({ log, expanded, onToggle }) {
  return (
    <div style={{ border: "1.5px solid #EBEBEB", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", cursor: "pointer", background: expanded ? "#FAFAFA" : "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>📋</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{log.templateName}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{log.submittedAtDisplay || log.submittedAt}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#2d9e2d18", border: "1px solid #2d9e2d35", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#2d9e2d" }}>✓ Submitted</div>
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
                      {val.map((src, i) => <img key={i} src={src} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #E8E8E8" }} />)}
                    </div>
                  )}
                  {field.type === "signature" && val && (
                    <img src={val} alt="sig" style={{ maxWidth: 160, height: 48, border: "1px solid #E8E8E8", borderRadius: 6, background: "#FAFAFA", marginTop: 4 }} />
                  )}
                  {!val && field.type !== "toggle" && <div style={{ fontSize: 12, color: "#ccc", fontStyle: "italic" }}>Not filled</div>}
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

export default function AdminDashboard({ logs, templates }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredLogs = logs.filter(l =>
    l.templateName.toLowerCase().includes(search.toLowerCase()) ||
    (l.submittedAtDisplay || l.submittedAt || "").toLowerCase().includes(search.toLowerCase())
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#EBEBEB", borderRadius: 9, padding: 3, marginBottom: 20 }}>
        {[["overview", "Overview"], ["logs", `All Logs (${logs.length})`], ["inventory", `Inventory (${stockEntries.length})`]].map(([k, lbl]) => (
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
            <LogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} />
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
            <LogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} />
          ))}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && <InventoryOverview />}
    </div>
  );
}
