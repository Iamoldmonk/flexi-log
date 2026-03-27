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

export default function OutletManager({ outlets = [], onSaveOutlet, onDeleteOutlet }) {
  const [showForm, setShowForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [formData, setFormData] = useState({ name: "", location: "", code: "" });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [outletsToCopyTo, setOutletsToCopyTo] = useState([]);
  const [pendingOutlet, setPendingOutlet] = useState(null);

  const handleNewOutlet = () => {
    setFormData({ name: "", location: "", code: "" });
    setEditingOutlet(null);
    setShowForm(true);
  };

  const handleEditOutlet = (outlet) => {
    setFormData({
      name: outlet.name,
      location: outlet.location || "",
      code: outlet.code || "",
    });
    setEditingOutlet(outlet._docId);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Outlet name is required");
      return;
    }

    // If creating new outlet (not editing), show copy options
    if (!editingOutlet && outlets.length > 0) {
      setPendingOutlet({
        name: formData.name,
        location: formData.location,
        code: formData.code,
      });
      setShowCopyModal(true);
      return;
    }

    await onSaveOutlet({
      _docId: editingOutlet,
      name: formData.name,
      location: formData.location,
      code: formData.code,
    });

    setShowForm(false);
    setFormData({ name: "", location: "", code: "" });
  };

  const handleConfirmCopy = async () => {
    if (!pendingOutlet) return;

    // Create outlet in selected outlets
    const outletsToCreate = outletsToCopyTo.length > 0
      ? outletsToCopyTo
      : [null]; // If none selected, create standalone

    for (const outletId of outletsToCreate) {
      await onSaveOutlet({
        _docId: null,
        name: pendingOutlet.name,
        location: pendingOutlet.location,
        code: pendingOutlet.code,
      });
    }

    setShowCopyModal(false);
    setOutletsToCopyTo([]);
    setPendingOutlet(null);
    setShowForm(false);
    setFormData({ name: "", location: "", code: "" });
  };

  return (
    <div style={{ padding: "20px", maxWidth: 800, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Outlet Management</h2>

      <button onClick={handleNewOutlet} style={{ ...S.btn, marginBottom: 20 }}>
        + Add New Outlet
      </button>

      {showForm && (
        <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, padding: 20, marginBottom: 20, background: "#FAFAFA" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            {editingOutlet ? "Edit Outlet" : "New Outlet"}
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Outlet Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Downtown, Airport, Mall"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Location / Address</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., 123 Main St, City"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Outlet Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., DT001"
              style={S.input}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} style={S.btn}>Save Outlet</button>
            <button onClick={() => setShowForm(false)} style={{ ...S.btn, background: "#E8E8E8", color: "#555" }}>Cancel</button>
          </div>
        </div>
      )}

      {showCopyModal && (
        <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, padding: 20, marginBottom: 20, background: "#FAFAFA" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            Copy "{pendingOutlet?.name}" to other outlets?
          </h3>

          <p style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
            Select which existing outlets should also have this outlet created, or leave empty to create standalone.
          </p>

          <div style={{ border: "1.5px solid #E8E8E8", borderRadius: 8, padding: 12, background: "#fff", maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
            {outlets && outlets.length > 0 ? (
              outlets.map(outlet => (
                <label key={outlet._docId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F0F0F0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={outletsToCopyTo.includes(outlet._docId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOutletsToCopyTo([...outletsToCopyTo, outlet._docId]);
                      } else {
                        setOutletsToCopyTo(outletsToCopyTo.filter(id => id !== outlet._docId));
                      }
                    }}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 12 }}>{outlet.name}</span>
                </label>
              ))
            ) : (
              <div style={{ fontSize: 12, color: "#aaa" }}>No outlets available</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleConfirmCopy} style={S.btn}>Create Outlet</button>
            <button onClick={() => { setShowCopyModal(false); setOutletsToCopyTo([]); setPendingOutlet(null); }} style={{ ...S.btn, background: "#E8E8E8", color: "#555" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Outlets</h3>
        {outlets && outlets.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {outlets.map(outlet => (
              <div key={outlet._docId} style={{ border: "1.5px solid #E8E8E8", borderRadius: 12, padding: 16, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{outlet.name}</div>
                    {outlet.location && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{outlet.location}</div>}
                    {outlet.code && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Code: {outlet.code}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEditOutlet(outlet)} style={{ ...S.btn, background: "#000", padding: "6px 12px", fontSize: 11 }}>Edit</button>
                    <button onClick={() => {
                      if (window.confirm(`Delete "${outlet.name}"?`)) {
                        onDeleteOutlet(outlet._docId);
                      }
                    }} style={{ ...S.btn, background: "#E0553F", padding: "6px 12px", fontSize: 11 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#aaa", padding: 20, textAlign: "center" }}>No outlets created yet</div>
        )}
      </div>
    </div>
  );
}
