// src/components/booking/Refund/RefundStatus.jsx
import styles from "./Refund.module.css";
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaMoneyBillWave,
  FaUser,
  FaCalendarAlt,
} from "react-icons/fa";

const STATUS_CONFIG = {
  PENDING: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    description: {
      hirer: "Your refund request is being reviewed by our team.",
      worker:
        "The hirer has requested a refund. This is being reviewed by our team.",
    },
  },
  APPROVED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Approved",
    description: {
      hirer: "Your refund has been approved and is being processed.",
      worker:
        "The refund for this booking has been approved and is being processed.",
    },
  },
  PROCESSING: {
    icon: FaSpinner,
    color: "#818cf8",
    label: "Processing",
    description: {
      hirer: "Your refund is currently being processed.",
      worker: "The refund for this booking is currently being processed.",
    },
  },
  COMPLETED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    description: {
      hirer: "Your refund has been completed successfully.",
      worker: "The refund for this booking has been completed.",
    },
  },
  FAILED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    description: {
      hirer: "Your refund failed. Please contact support.",
      worker: "The refund for this booking failed. Please contact support.",
    },
  },
  REJECTED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Rejected",
    description: {
      hirer: "Your refund request was rejected.",
      worker: "The refund request for this booking was rejected.",
    },
  },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
    description: {
      hirer: "This refund is under dispute review.",
      worker: "This refund is under dispute review.",
    },
  },
};

export default function RefundStatus({ refund, onViewDetails, isHirer }) {
  if (!refund) return null;

  const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  const roleKey = isHirer ? "hirer" : "worker";
  const description =
    config.description?.[roleKey] ||
    config.description?.hirer ||
    "Your refund is being processed.";

  return (
    <div className={styles.refundStatusCard}>
      <h2 className={styles.sectionTitle}>Refund</h2>
      <div className={styles.refundStatusHeader}>
        <div
          className={styles.refundStatusIcon}
          style={{ color: config.color }}
        >
          <Icon size={24} />
        </div>
        <div className={styles.refundStatusInfo}>
          <h4 className={styles.refundStatusTitle}>{config.label}</h4>
          <p className={styles.refundStatusDesc}>{description}</p>
        </div>
        <span
          className={styles.refundStatusBadge}
          style={{ background: config.color }}
        >
          {refund.status}
        </span>
      </div>

      <div className={styles.refundStatusDetails}>
        <div className={styles.refundStatusRow}>
          <span className={styles.refundStatusLabel}>Reference</span>
          <span className={styles.refundStatusValue}>{refund.reference}</span>
        </div>
        <div className={styles.refundStatusRow}>
          <span className={styles.refundStatusLabel}>Amount</span>
          <span className={styles.refundStatusValue}>
            {refund.currency} {refund.amount.toLocaleString()}
          </span>
        </div>
        <div className={styles.refundStatusRow}>
          <span className={styles.refundStatusLabel}>Type</span>
          <span className={styles.refundStatusValue}>
            {refund.refundType?.replace("_", " ")}
          </span>
        </div>
        <div className={styles.refundStatusRow}>
          <span className={styles.refundStatusLabel}>Requested</span>
          <span className={styles.refundStatusValue}>
            {new Date(refund.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {refund.processedAt && (
          <div className={styles.refundStatusRow}>
            <span className={styles.refundStatusLabel}>Processed</span>
            <span className={styles.refundStatusValue}>
              {new Date(refund.processedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {refund.adminNotes && (
        <div className={styles.refundAdminNote}>
          <p className={styles.refundAdminNoteLabel}>Admin Note:</p>
          <p className={styles.refundAdminNoteText}>{refund.adminNotes}</p>
        </div>
      )}

      <button
        className={styles.refundDetailsBtn}
        onClick={() => onViewDetails?.(refund)}
      >
        View Full Details
      </button>
    </div>
  );
}
