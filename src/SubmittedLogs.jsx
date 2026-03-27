import { useState } from "react";

const FIELD_ICONS = {
  toggle: "✓", text: "T", number: "#", photo: "◉",
  timestamp: "◷", rating: "★", dropdown: "▾", signature: "✍",
};

function LogCard({ log, onExpand, expanded }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
      {/* Summary row */}
      <div onClick={onExpand} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" }}>{log.templateName}</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
            Submitted {log.submittedAt}
            {log.roleName && <span style={{ marginLeft: 8 }}>• {log.roleName}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#2d9e2d18", border: "1.5px solid #2d9e2d35", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#2d9e2d" }}>✓ Submitted</div>
          <span style={{ fontSize: 12, color: "#ccc" }}>{expanded ? "▴" : "▾"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #F0F0F0", padding: "14px 16px" }}>
          {log.fields.map(field => {
            const val = log.values[field.id];
            return (
              <div key={field.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F5F5F5" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "#bbb" }}>{FIELD_ICONS[field.type]}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>{field.label || "Untitled"}</span>
                  {field.required && !val && <span style={{ fontSize: 10, color: "#ff9900" }}>⚠ skipped</span>}
                </div>

                {/* Render value by type */}
                {field.type === "toggle" && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: val === "yes" ? "#2d9e2d18" : val === "no" ? "#F5F5F5" : "#FFF8F0",
                    color: val === "yes" ? "#2d9e2d" : val === "no" ? "#999" : "#e67e22",
                    border: `1.5px solid ${val === "yes" ? "#2d9e2d35" : val === "no" ? "#E8E8E8" : "#ffe0b2"}`,
                  }}>
                    {val === "yes" ? field.yesLabel || "Done" : val === "no" ? field.noLabel || "Skip" : "— Not answered"}
                  </span>
                )}
                {(field.type === "text" || field.type === "number") && (
                  <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc", fontStyle: val ? "normal" : "italic" }}>
                    {val ? `${val}${field.unit ? ` ${field.unit}` : ""}` : "Not filled"}
                  </div>
                )}
                {field.type === "rating" && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: field.maxStars || 5 }).map((_, i) => (
                      <span key={i} style={{ fontSize: 18, color: i < (val || 0) ? "#f4a825" : "#E8E8E8" }}>★</span>
                    ))}
                    {val > 0 && <span style={{ fontSize: 12, color: "#888", alignSelf: "center", marginLeft: 4 }}>{val}/{field.maxStars || 5}</span>}
                  </div>
                )}
                {field.type === "dropdown" && (
                  <div style={{ fontSize: 13, color: val ? "#1a1a1a" : "#ccc" }}>{val || "Not selected"}</div>
                )}
                {field.type === "timestamp" && (
                  <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>{val || "Auto-recorded"}</div>
                )}
                {field.type === "photo" && val && val.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {val.map((src, i) => (
                      <img key={i} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E8E8E8" }} />
                    ))}
                  </div>
                )}
                {field.type === "photo" && (!val || val.length === 0) && (
                  <div style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>No photo captured</div>
                )}
                {field.type === "signature" && val && (
                  <img src={val} alt="signature" style={{ maxWidth: 200, height: 60, border: "1.5px solid #E8E8E8", borderRadius: 8, background: "#FAFAFA" }} />
                )}
                {field.type === "signature" && !val && (
                  <div style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>No signature</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SubmittedLogs({ logs, roleName }) {
  const [expandedId, setExpandedId] = useState(null);

  // Use all logs (no staff name filtering)
  const filteredLogs = logs;

  if (filteredLogs.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 52px)", color: "#bbb" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No logs yet</div>
      <div style={{ fontSize: 12 }}>Submitted checklists will appear here</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em" }}>
          SUBMITTED LOGS — {filteredLogs.length}
          {roleName && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#999" }}>({roleName})</span>}
        </span>
      </div>
      {filteredLogs.map(log => (
        <LogCard key={log._docId || log.id} log={log}
          expanded={expandedId === (log._docId || log.id)}
          onExpand={() => setExpandedId(expandedId === (log._docId || log.id) ? null : (log._docId || log.id))} />
      ))}
    </div>
  );
}
