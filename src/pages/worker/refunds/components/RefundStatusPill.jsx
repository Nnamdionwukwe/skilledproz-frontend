// src/pages/worker/refunds/components/RefundStatusPill.jsx
import styles from "../WorkerRefunds.module.css";

const LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REJECTED: "Rejected",
  REVERSED: "Reversed",
  DISPUTED: "Disputed",
};

export default function RefundStatusPill({ status }) {
  const s = String(status || "PENDING").toUpperCase();
  return (
    <span className={`${styles.statusPill} ${styles[`status_${s}`] || ""}`}>
      {LABELS[s] || s}
    </span>
  );
}
