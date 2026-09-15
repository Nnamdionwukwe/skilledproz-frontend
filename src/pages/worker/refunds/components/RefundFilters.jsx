// src/pages/worker/refunds/components/RefundFilters.jsx
import styles from "../WorkerRefunds.module.css";

const STATUSES = [
  "ALL",
  "COMPLETED",
  "APPROVED",
  "PENDING",
  "FAILED",
  "REVERSED",
];
const TYPES = ["ALL", "FULL", "PARTIAL", "CUSTOM_AMOUNT", "DISPUTE"];

const TYPE_LABEL = {
  ALL: "All types",
  FULL: "Full",
  PARTIAL: "Partial",
  CUSTOM_AMOUNT: "Custom",
  DISPUTE: "Dispute",
};

export default function RefundFilters({ status, refundType, onChange }) {
  const setStatus = (s) => onChange({ status: s, refundType });
  const setType = (t) => onChange({ status, refundType: t });

  return (
    <div className={styles.filtersBar}>
      <div className={styles.filterGroup}>
        <span className={styles.filterGroupLabel}>Status</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.filterChip} ${
              status === s ? styles.active : ""
            }`}
            onClick={() => setStatus(s)}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <span className={styles.filterGroupLabel}>Type</span>
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.filterChip} ${
              refundType === t ? styles.active : ""
            }`}
            onClick={() => setType(t)}
          >
            {TYPE_LABEL[t] || t}
          </button>
        ))}
      </div>
    </div>
  );
}
