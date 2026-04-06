import { useState, useEffect } from "react";
import api from "../../lib/api";
import styles from "./EmergencyContact.module.css";

export default function EmergencyContact({
  bookingId,
  bookingStatus,
  isWorker,
  existing,
  onSaved,
}) {
  const [editing, setEditing] = useState(!existing);
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [rel, setRel] = useState(existing?.relationship || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync form fields when `existing` prop updates (e.g. after page re-mount)
  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setRel(existing.relationship || "");
      setEditing(false);
    }
  }, [existing?.name, existing?.phone, existing?.relationship]);

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.patch(`/bookings/${bookingId}/emergency-contact`, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      });
      const saved = {
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      };
      onSaved?.(saved);
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || "Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Display mode ──
  if (!editing && existing) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>👤</span>
          <p className={styles.cardTitle}>Emergency Contact</p>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>Name</span>
          <span className={styles.contactValue}>{existing.name}</span>
        </div>
        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>Phone</span>
          <a href={`tel:${existing.phone}`} className={styles.contactPhone}>
            {existing.phone}
          </a>
        </div>
        {existing.relationship && (
          <div className={styles.contactRow}>
            <span className={styles.contactLabel}>Relationship</span>
            <span className={styles.contactValue}>{existing.relationship}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ──
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>👤</span>
        <p className={styles.cardTitle}>Emergency Contact</p>
        {existing && (
          <button
            className={styles.cancelBtn}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        )}
      </div>
      <p className={styles.hint}>
        Someone we can contact in case of an emergency during this job.
      </p>
      <div className={styles.formGroup}>
        <label className={styles.label}>Full Name *</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Amaka Johnson"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Phone Number *</label>
        <input
          className={styles.input}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +234 801 234 5678"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Relationship</label>
        <input
          className={styles.input}
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          placeholder="e.g. Sister, Friend, Spouse"
        />
      </div>
      {error && <p className={styles.error}>⚠️ {error}</p>}
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving
          ? "Saving..."
          : existing
            ? "Update Contact"
            : "Save Emergency Contact"}
      </button>
    </div>
  );
}
