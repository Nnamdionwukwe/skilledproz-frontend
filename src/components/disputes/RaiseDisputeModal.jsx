import { useState } from "react";
import api from "../../lib/api";
import styles from "./Disputes.module.css";

const REASONS = [
  { value: "PAYMENT_NOT_RELEASED", label: "Payment not released" },
  { value: "WORK_NOT_COMPLETED", label: "Work not completed" },
  { value: "POOR_QUALITY_WORK", label: "Poor quality of work" },
  { value: "NO_SHOW", label: "Worker/Hirer no-show" },
  { value: "OVERCHARGING", label: "Overcharging / wrong amount" },
  { value: "HARASSMENT", label: "Harassment or misconduct" },
  { value: "DAMAGE_TO_PROPERTY", label: "Damage to property" },
  { value: "OTHER", label: "Other" },
];

export default function RaiseDisputeModal({
  bookingId,
  bookingTitle,
  onClose,
  onSuccess,
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Please provide a description of at least 20 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/disputes", { bookingId, reason, description });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to raise dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Raise a Dispute</h2>
            {bookingTitle && (
              <p className={styles.modalSub}>For: {bookingTitle}</p>
            )}
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalWarning}>
          <span>⚠️</span>
          <p>
            Disputes are reviewed by our support team within 24–48 hours. Please
            provide as much detail as possible.
          </p>
        </div>

        <form className={styles.disputeForm} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Reason *</label>
            <select
              className={styles.input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select a reason</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Description *{" "}
              <span className={styles.charCount}>{description.length}/500</span>
            </label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Describe the issue in detail. Include dates, amounts, and any relevant context that will help our team resolve this quickly..."
              rows={5}
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitDisputeBtn}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} /> Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
