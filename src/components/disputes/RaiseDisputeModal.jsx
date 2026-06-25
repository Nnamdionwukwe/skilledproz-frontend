import { useState, useRef } from "react";
import api from "../../lib/api";
import styles from "./Disputes.module.css";
import {
  FaExclamationTriangle,
  FaTimes,
  FaImage,
  FaTrashAlt,
  FaSpinner,
  FaFileImage,
} from "react-icons/fa";

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
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    // Reset input so same file can be re-selected if needed
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

    // Build FormData for multipart upload
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("reason", reason);
    formData.append("description", description);
    files.forEach((file) => {
      formData.append("files", file); // matches the field name in uploadMultiple
    });

    try {
      await api.post("/disputes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalWarning}>
          <FaExclamationTriangle />
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

          {/* ── Evidence upload ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              <FaImage style={{ marginRight: "0.4rem" }} /> Evidence (optional)
              <span className={styles.charCount}>
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </label>
            <div className={styles.fileUploadArea}>
              <button
                type="button"
                className={styles.fileSelectBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaFileImage /> Add Images / PDFs
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className={styles.fileInput}
                onChange={handleFileChange}
              />
            </div>
            {files.length > 0 && (
              <div className={styles.filePreviewGrid}>
                {files.map((file, index) => (
                  <div key={index} className={styles.filePreviewItem}>
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className={styles.filePreviewThumb}
                      />
                    ) : (
                      <div className={styles.filePreviewPdf}>
                        <FaFileImage />
                        <span>PDF</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className={styles.fileRemoveBtn}
                      onClick={() => removeFile(index)}
                    >
                      <FaTrashAlt />
                    </button>
                    <span className={styles.filePreviewName}>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className={styles.errorBox}>
              <FaExclamationTriangle /> {error}
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
                  <FaSpinner className={styles.spinner} /> Submitting...
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
