import { useState, useEffect } from "react";

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}
import FlexiLogAdmin from "./FlexiLogAdmin";
import StaffView from "./StaffView";
import SubmittedLogs from "./SubmittedLogs";
import { useTemplates, useLogs, useRoles, useOutlets } from "./useFirestore";

const ADMIN_PASSWORD = "admin123";
const STAFF_PASSWORD = "staff123";

const S = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#F5F5F3", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  card: {
    background: "#fff", borderRadius: 18, border: "1.5px solid #EBEBEB",
    padding: "36px 32px", width: "100%", maxWidth: 380,
    boxShadow: "0 8px 40px rgba(0,0,0,0.07)",
  },
  logo: {
    width: 36, height: 36, background: "#000", borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  label: {
    display: "block", fontSize: 11, fontWeight: 700, color: "#999",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
  },
  input: {
    width: "100%", padding: "10px 12px", border: "1.5px solid #E8E8E8",
    borderRadius: 9, fontSize: 13.5, color: "#1a1a1a", fontFamily: "inherit",
    background: "#FAFAFA", boxSizing: "border-box", outline: "none", marginBottom: 14,
  },
  btn: (dark) => ({
    width: "100%", padding: "11px 0", border: "none", borderRadius: 9,
    background: dark ? "#000" : "#F0F0F0", color: dark ? "#fff" : "#555",
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  }),
  error: {
    background: "#FFF0F0", border: "1.5px solid #FFD5D5", borderRadius: 8,
    padding: "9px 12px", fontSize: 12, color: "#cc3333", marginBottom: 14,
  },
  tab: (active) => ({
    flex: 1, padding: "8px 0", border: "none", borderRadius: 7,
    background: active ? "#000" : "transparent", color: active ? "#fff" : "#888",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  }),
};

export default function App() {
  const [role, setRole] = useState(null); // null | 'admin' | staff
  const [loginAs, setLoginAs] = useState("staff"); // 'admin' | 'staff'
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [rolePassword, setRolePassword] = useState("");
  const [error, setError] = useState("");
  const [staffTab, setStaffTab] = useState("checklist"); // 'checklist' | 'logs'
  const isMobile = useIsMobile();
  // Real-time Firestore sync for templates, logs & roles
  const [templates, setTemplates, templatesLoading] = useTemplates();
  const [logs, addLog, logsLoading, deleteLog] = useLogs();
  const [roles] = useRoles();
  const [outlets] = useOutlets();

  const login = () => {
    if (loginAs === "admin" && password === ADMIN_PASSWORD) {
      setRole("admin"); setError("");
    } else if (loginAs === "staff") {
      if (!selectedRole) {
        setError("Please select a role.");
        return;
      }
      const matchedRole = roles?.find(r => r._docId === selectedRole);
      if (!matchedRole || matchedRole.password !== rolePassword) {
        setError("Incorrect role or password.");
        return;
      }
      setRole(matchedRole); // Store role object with checklists
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
    setPassword("");
    setRolePassword("");
  };

  const logout = () => {
    setRole(null);
    setPassword("");
    setSelectedRole("");
    setSelectedOutlet("");
    setRolePassword("");
    setError("");
  };

  if (!role) return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={S.card}>
        <div style={S.logo}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>FL</span>
        </div>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Flexi-Log</div>
          <div style={{ fontSize: 12.5, color: "#aaa", marginTop: 4 }}>Sign in to continue</div>
        </div>

        {/* Role tabs */}
        <div style={{ display: "flex", gap: 4, background: "#F2F2F2", borderRadius: 9, padding: 4, marginBottom: 22 }}>
          {["staff", "admin"].map(r => (
            <button key={r} onClick={() => { setLoginAs(r); setError(""); }}
              style={S.tab(loginAs === r)}>
              {r === "admin" ? "⚙ Admin" : "👤 Staff"}
            </button>
          ))}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {loginAs === "admin" ? (
          <>
            <label style={S.label}>Admin Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Enter admin password"
              style={S.input}
              onFocus={e => e.target.style.borderColor = "#000"}
              onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
          </>
        ) : (
          <>
            <label style={S.label}>Select Role</label>
            <select value={selectedRole} onChange={e => { setSelectedRole(e.target.value); setSelectedOutlet(""); }}
              style={S.input}
              onFocus={e => e.target.style.borderColor = "#000"}
              onBlur={e => e.target.style.borderColor = "#E8E8E8"}>
              <option value="">-- Choose a role --</option>
              {roles && roles.map(r => (
                <option key={r._docId} value={r._docId}>{r.name}</option>
              ))}
            </select>

            {/* Outlet selection removed — role determines which templates staff sees */}

            <label style={S.label}>Role Password</label>
            <input type="password" value={rolePassword} onChange={e => setRolePassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Enter role password"
              style={S.input}
              onFocus={e => e.target.style.borderColor = "#000"}
              onBlur={e => e.target.style.borderColor = "#E8E8E8"} />
          </>
        )}

        <button onClick={login} style={S.btn(true)}>Sign In</button>

        {installPrompt && (
          <button onClick={() => {
            installPrompt.prompt();
            installPrompt.userChoice.then(() => setInstallPrompt(null));
          }} style={{
            width: "100%", padding: "10px 0", border: "1.5px dashed #ccc", borderRadius: 9,
            background: "transparent", color: "#888", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginTop: 10,
          }}>
            📲 Install App
          </button>
        )}

        {loginAs === "staff" && (
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "#ccc" }}>
            Select your role and enter the password provided by admin
          </div>
        )}
      </div>
    </div>
  );

  if (role === "admin") return (
    <FlexiLogAdmin
      onLogout={logout}
      logs={logs}
      templates={templates}
      onTemplatesChange={setTemplates}
      onDeleteLog={deleteLog}
    />
  );

  // Staff view - filter templates by role's assigned outlets + directly assigned checklists
  const roleOutletIds = (role && typeof role === 'object' && role.assignedOutlets) || [];
  const roleChecklistIds = (role && typeof role === 'object' && role.assignedChecklists) || [];
  const roleChecklists = templates?.filter(t =>
    roleChecklistIds.includes(t._docId) ||
    (t.outletId && roleOutletIds.includes(t.outletId))
  ) || [];

  // Wrap addLog to include staff details + outlet (from template's outlet)
  const addLogWithStaff = (log) => {
    const logTemplate = templates?.find(t => (t._docId || t.id) === log.templateId);
    const logOutlet = logTemplate?.outletId ? outlets?.find(o => o._docId === logTemplate.outletId) : null;
    return addLog({
      ...log,
      roleId: role._docId,
      roleName: role.name,
      outletId: logTemplate?.outletId || null,
      outletName: logOutlet?.name || null,
    });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#F5F5F3", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } button { font-family: inherit; }`}</style>

      {/* Topbar */}
      {isMobile ? (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #EBEBEB" }}>
          <div style={{ height: 46, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, background: "#000", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>FL</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{role?.name || "Staff"}</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 3, background: "#F2F2F2", borderRadius: 8, padding: 3 }}>
                {[["checklist", "📋"], ["logs", "📁"]].map(([k, icon]) => (
                  <button key={k} onClick={() => setStaffTab(k)} style={{ padding: "5px 10px", border: "none", borderRadius: 6, fontSize: 13, background: staffTab === k ? "#fff" : "transparent", cursor: "pointer", boxShadow: staffTab === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{icon}</button>
                ))}
              </div>
              <button onClick={logout} style={{ padding: "5px 10px", border: "1.5px solid #E0E0E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#555" }}>Out</button>
            </div>
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
            <span style={{ fontSize: 12, color: "#888" }}>{role?.name || "Staff"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 3, background: "#F2F2F2", borderRadius: 8, padding: 3 }}>
              {[["checklist", "📋 Checklist"], ["logs", "📁 My Logs"]].map(([k, label]) => (
                <button key={k} onClick={() => setStaffTab(k)} style={{ padding: "5px 12px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: staffTab === k ? "#fff" : "transparent", color: staffTab === k ? "#1a1a1a" : "#888", cursor: "pointer", boxShadow: staffTab === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
              ))}
            </div>
            <button onClick={logout} style={{ padding: "6px 13px", border: "1.5px solid #E0E0E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#555" }}>Sign Out</button>
          </div>
        </div>
      )}

      {staffTab === "checklist"
        ? <StaffView templates={roleChecklists} onSubmit={addLogWithStaff} logs={logs} roleName={role?.name} />
        : <SubmittedLogs logs={logs} roleName={role?.name} />
      }
    </div>
  );
}
