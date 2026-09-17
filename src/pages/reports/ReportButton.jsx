import { useState } from "react";
import styles from "./Reports.module.css";
import api from "../../lib/api";
import {
  FiFlag,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiExternalLink,
} from "react-icons/fi";

// ── Constants (mirror backend) ────────────────────────────────────────────────
const REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "FAKE_PROFILE", label: "Fake profile" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "FRAUD", label: "Fraud / scam activity" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SCAM", label: "Scam" },
  { value: "MISLEADING_INFORMATION", label: "Misleading information" },
  { value: "FAKE_REVIEWS", label: "Fake reviews" },
  { value: "UNDERAGE_USER", label: "Underage user" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "OTHER", label: "Other" },
];

const TYPE_LABEL = {
  USER: "user",
  JOB_POST: "job post",
  POST: "community post",
  REVIEW: "review",
  BOOKING: "booking",
  MESSAGE: "message",
};

// Silently drop anything that isn't a URL — the backend validator requires
// every evidence entry to be a valid URL. Users often type free text here
// by mistake; those get filtered out instead of failing the whole report.
const URL_RE = /^https?:\/\/\S+$/i;

// ── ReportModal ───────────────────────────────────────────────────────────────
function ReportModal({ targetType, targetId, targetName, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // { ref }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const evidenceArr = evidence
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => URL_RE.test(l))
        .slice(0, 5);

      const res = await api.post("/reports", {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        evidence: evidenceArr,
      });
      setDone({ ref: res.data.data.ref });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <span className={styles.modalHeaderIcon}>
              <FiFlag size={16} />
            </span>
            <div>
              <p className={styles.modalEyebrow}>Report</p>
              <h3 id="report-modal-title" className={styles.modalTitle}>
                {targetName
                  ? `Report "${targetName}"`
                  : `Report this ${TYPE_LABEL[targetType] || "content"}`}
              </h3>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className={styles.doneState}>
            <span className={styles.doneIcon}>
              <FiCheckCircle size={44} />
            </span>
            <p className={styles.doneTitle}>Report submitted</p>
            <p className={styles.doneSub}>
              Reference: <strong>{done.ref}</strong>
              <br />
              Our team will review it within 24–48 hours. We'll notify you of
              the outcome.
            </p>
            <button
              className={styles.btnPrimary}
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.formError} role="alert">
                <FiAlertTriangle size={15} className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            {/* Reason */}
            <div className={styles.field}>
              <label className={styles.label}>
                Reason <span className={styles.req}>*</span>
              </label>
              <div className={styles.reasonGrid}>
                {REASONS.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    className={`${styles.reasonChip} ${
                      reason === r.value ? styles.reasonChipActive : ""
                    }`}
                    onClick={() => {
                      setReason(r.value);
                      setError("");
                    }}
                  >
                    {reason === r.value && (
                      <FiCheckCircle size={12} className={styles.chipTick} />
                    )}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label}>
                Additional details{" "}
                <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Describe what happened. The more detail you provide, the faster we can act."
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className={styles.charCount}>{description.length}/1000</p>
            </div>

            {/* Evidence */}
            <div className={styles.field}>
              <label className={styles.label}>
                Evidence URLs{" "}
                <span className={styles.optional}>
                  (optional, one per line, max 5)
                </span>
              </label>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder={
                  "https://example.com/screenshot1.png\nhttps://example.com/screenshot2.png"
                }
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </div>

            {/* Disclaimer */}
            <p className={styles.disclaimer}>
              False or malicious reports may result in action against your
              account. Reports are reviewed by our moderation team and are
              confidential.
            </p>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnDanger}
                disabled={loading || !reason}
              >
                {loading ? (
                  <span className={styles.spinner} />
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── ReportButton (exported) ───────────────────────────────────────────────────
/**
 * Drop this component anywhere on the page.
 *
 * <ReportButton targetType="USER"     targetId={worker.userId} targetName={worker.name} />
 * <ReportButton targetType="JOB_POST" targetId={job.id}        targetName={job.title} />
 * <ReportButton targetType="REVIEW"   targetId={review.id}     variant="icon" />
 * <ReportButton targetType="POST"     targetId={post.id}       variant="menu-item" />
 *
 * variant: "button" (default) | "icon" | "menu-item" | "link"
 */
export default function ReportButton({
  targetType,
  targetId,
  targetName,
  variant = "button",
  onSuccess,
}) {
  const [open, setOpen] = useState(false);

  if (!targetType || !targetId) return null;

  const trigger = () => setOpen(true);

  const renderTrigger = () => {
    const tooltip = `Report this ${TYPE_LABEL[targetType] || "content"}`;
    switch (variant) {
      case "icon":
        return (
          <button
            className={styles.triggerIcon}
            onClick={trigger}
            title={tooltip}
            aria-label={tooltip}
            type="button"
          >
            <FiFlag size={14} />
          </button>
        );
      case "menu-item":
        return (
          <button
            className={styles.triggerMenuItem}
            onClick={trigger}
            type="button"
          >
            <FiFlag size={14} />
            <span>Report</span>
          </button>
        );
      case "link":
        return (
          <button
            className={styles.triggerLink}
            onClick={trigger}
            type="button"
          >
            Report this {TYPE_LABEL[targetType] || "content"}
          </button>
        );
      case "button":
      default:
        return (
          <button className={styles.triggerBtn} onClick={trigger} type="button">
            <FiFlag size={13} />
            <span>Report</span>
          </button>
        );
    }
  };

  return (
    <>
      {renderTrigger()}
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          onClose={() => setOpen(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
