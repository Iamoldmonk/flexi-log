import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * Real-time sync for templates collection.
 * Returns [templates, setTemplates] where setTemplates writes to Firestore.
 */
export function useTemplates() {
  const [templates, setLocal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "templates"), (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), _docId: d.id }));
      setLocal(docs.length > 0 ? docs : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const setTemplates = useCallback(async (newTemplates) => {
    if (!newTemplates) return;

    // Get current doc IDs in Firestore
    const currentDocIds = new Set(
      (templates || []).map((t) => t._docId).filter(Boolean)
    );
    const newIds = new Set(newTemplates.map((t) => t._docId).filter(Boolean));

    // Delete removed templates
    for (const docId of currentDocIds) {
      if (!newIds.has(docId)) {
        await deleteDoc(doc(db, "templates", docId));
      }
    }

    // Upsert each template
    for (const t of newTemplates) {
      const { _docId, ...data } = t;
      if (_docId) {
        await setDoc(doc(db, "templates", _docId), data);
      } else {
        // New template — use its id as the doc ID for consistency
        await setDoc(doc(db, "templates", data.id), data);
      }
    }
  }, [templates]);

  return [templates, setTemplates, loading];
}

/**
 * Real-time sync for submitted logs collection.
 * Returns [logs, addLog] where addLog writes a new log to Firestore.
 */
export function useLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), _docId: d.id }));
      setLogs(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const addLog = useCallback(async (log) => {
    await addDoc(collection(db, "logs"), {
      ...log,
      submittedAt: new Date().toISOString(),
      submittedAtDisplay: new Date().toLocaleString(),
    });
  }, []);

  return [logs, addLog, loading];
}
