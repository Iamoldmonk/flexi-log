import { useState } from "react";

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
  btn: {
    padding: "8px 16px", border: "none", borderRadius: 8, fontSize: 12.5,
    fontWeight: 600, cursor: "pointer", background: "#000", color: "#fff",
    fontFamily: "inherit",
  },
};

export default function RoleManager({ roles = [], templates = [], outlets = [], onSaveRole, onDeleteRole }) {
  const [editingRole, setEditingRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", password: "", assignedChecklists: [] });

  const handleNewRole = () => {
    setFormData({ name: "", password: "", assignedChecklists: [], assignedOutlets: [] });
    setEditingRole(null);
    setShowForm(true);
  };

  const handleEditRole = (role) => {
    setFormData({
      name: role.name,
      password: role.password,
      assignedChecklists: role.assignedChecklists || [],
      assignedOutlets: role.assignedOutlets || [],
    });
    setEditingRole(role._docId);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.password.trim()) {
      alert("Role name and password are required");
      return;
    }

    await onSaveRole({
      _docId: editingRole,
      name: formData.name,
      password: formData.password,
      assignedChecklists: formData.assignedChecklists,
      assignedOutlets: formData.assignedOutlets,
    });

    setShowForm(false);
    setFormData({ name: "", password: "", assignedChecklists: [], assignedOutlets: [] });
  };

  const toggleChecklist = (checklistId) => {
    setFormData(prev => ({
      ...prev,
      assignedChecklists: prev.assignedChecklists.includes(checklistId)
        ? prev.assignedChecklists.filter(id => id !== checklistId)
        : [...prev.assignedChecklists, checklistId],
    }));
  };

  const toggleOutlet = (outletId) => {
    setFormData(prev => ({
      ...prev,
      assignedOutlets: prev.assignedOutlets.includes(outletId)
        ? prev.assignedOutlets.filter(id => id !== outletId)
        : [...prev.assignedOutlets, outletId],
    }));
  };

  return (
    <div style={{ padding: "20px", maxWidth: 800, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Role Management</h2>

      <button onClick={handleNewRole} style={{ ...S.btn, marginBottom: 20 }}>
        + Create New Role
      </button>

      {showForm && (
        <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, padding: 20, marginBottom: 20, background: "#FAFAFA" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            {editingRole ? "Edit Role" : "New Role"}
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Role Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Kitchen, Floor Staff, Manager"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Role Password</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password for this role"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Assigned Outlets</label>
            <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 8, padding: 12, background: "#fff", maxHeight: 150, overflowY: "auto", marginBottom: 14 }}>
              {outlets && outlets.length > 0 ? (
                outlets.map(outlet => (
                  <label key={outlet._docId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F0F0F0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.assignedOutlets.includes(outlet._docId)}
                      onChange={() => toggleOutlet(outlet._docId)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 12 }}>{outlet.name}</span>
                  </label>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#aaa" }}>No outlets available. Create outlets first.</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Assigned Checklists</label>
            <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>Checklists from assigned outlets are included automatically</div>
            <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 8, padding: 12, background: "#fff", maxHeight: 260, overflowY: "auto" }}>
              {templates && templates.length > 0 ? (() => {
                const outletMap = {};
                outlets.forEach(o => { outletMap[o._docId] = o.name; });
                const groups = {};
                templates.forEach(t => {
                  const groupName = t.outletId && outletMap[t.outletId] ? outletMap[t.outletId] : "Unassigned";
                  if (!groups[groupName]) groups[groupName] = [];
                  groups[groupName].push(t);
                });
                return Object.entries(groups).map(([groupName, items]) => (
                  <div key={groupName} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#e67e22", letterSpacing: "0.04em", padding: "4px 0", borderBottom: "1px solid #F5F5F5", marginBottom: 4 }}>
                      {groupName} <span style={{ color: "#ccc" }}>({items.length})</span>
                    </div>
                    {items.map(template => (
                      <label key={template._docId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 6px 8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.assignedChecklists.includes(template._docId)}
                          onChange={() => toggleChecklist(template._docId)}
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 12 }}>{template.name}</span>
                      </label>
                    ))}
                  </div>
                ));
              })() : (
                <div style={{ fontSize: 12, color: "#aaa" }}>No checklists available</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} style={S.btn}>Save Role</button>
            <button onClick={() => setShowForm(false)} style={{ ...S.btn, background: "#E8E8E8", color: "#555" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Existing Roles</h3>
        {roles && roles.length > 0 ? (
          roles.map(role => (
            <div key={role._docId} style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, padding: 16, marginBottom: 12, background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Password: {role.password}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleEditRole(role)} style={{ ...S.btn, background: "#000", padding: "6px 12px", fontSize: 11 }}>Edit</button>
                  <button onClick={() => {
                    if (window.confirm(`Delete role "${role.name}"?`)) {
                      onDeleteRole(role._docId);
                    }
                  }} style={{ ...S.btn, background: "#E0553F", padding: "6px 12px", fontSize: 11 }}>Delete</button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#666", marginTop: 10 }}>
                <strong>Assigned Outlets:</strong>
                {role.assignedOutlets && role.assignedOutlets.length > 0 ? (
                  <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                    {role.assignedOutlets.map(outletId => {
                      const outlet = outlets?.find(o => o._docId === outletId);
                      return <li key={outletId}>{outlet?.name || outletId}</li>;
                    })}
                  </ul>
                ) : (
                  <div style={{ marginTop: 6, color: "#aaa" }}>No outlets assigned</div>
                )}
              </div>

              {role.assignedChecklists && role.assignedChecklists.length > 0 && (() => {
                const outletMap = {};
                outlets.forEach(o => { outletMap[o._docId] = o.name; });
                const named = role.assignedChecklists.map(id => {
                  const t = templates?.find(t => t._docId === id);
                  if (!t) return null;
                  const outlet = t.outletId && outletMap[t.outletId] ? ` (${outletMap[t.outletId]})` : "";
                  return t.name + outlet;
                }).filter(Boolean);
                return named.length > 0 ? (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 10 }}>
                    <strong>Assigned Checklists:</strong> {named.join(", ")}
                  </div>
                ) : null;
              })()}
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: "#aaa", padding: 20, textAlign: "center" }}>No roles created yet</div>
        )}
      </div>
    </div>
  );
}
