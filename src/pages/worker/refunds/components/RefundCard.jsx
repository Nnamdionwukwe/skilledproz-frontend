// src/pages/worker/refunds/components/RefundCard.jsx
import { useNavigate } from "react-router-dom";
import {
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";
import styles from "../WorkerRefunds.module.css";
import RefundStatusPill from "./RefundStatusPill";
import { formatCurrency } from "./RefundSummaryCard";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function iconForRefund(refund) {
  if (refund.status === "COMPLETED" && refund.workerAmountDeducted > 0) {
    return { Icon: FiFileText, tone: "red" };
  }
  if (refund.resultedInDebt) {
    return { Icon: FiAlertTriangle, tone: "red" };
  }
  if (refund.status === "COMPLETED") {
    return { Icon: FiCheckCircle, tone: "green" };
  }
  return { Icon: FiFileText, tone: "" };
}

export default function RefundCard({ refund }) {
  const navigate = useNavigate();
  const { Icon, tone } = iconForRefund(refund);

  const deducted = refund.workerAmountDeducted ?? 0;
  const deductedIsZero = deducted === 0;

  const bookingTitle = refund.booking?.title || "Booking";
  const categoryName = refund.booking?.category?.name;
  const currency = refund.currency || "NGN";

  return (
    <div
      className={styles.refundCard}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/dashboard/worker/refunds/${refund.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/dashboard/worker/refunds/${refund.id}`);
        }
      }}
    >
      <div className={`${styles.refundCardIcon} ${tone ? styles[tone] : ""}`}>
        <Icon size={20} />
      </div>

      <div className={styles.refundCardBody}>
        <div className={styles.refundCardTitle}>{bookingTitle}</div>
        <div className={styles.refundCardMeta}>
          <RefundStatusPill status={refund.status} />
          {categoryName && (
            <>
              <span className={styles.refundCardMetaDot} />
              <span>{categoryName}</span>
            </>
          )}
          <span className={styles.refundCardMetaDot} />
          <span>{formatDate(refund.createdAt)}</span>
        </div>
        {refund.reason && (
          <div className={styles.refundCardReason}>{refund.reason}</div>
        )}
      </div>

      <div className={styles.refundCardAmount}>
        <span
          className={`${styles.refundAmountValue} ${
            deductedIsZero ? styles.zero : ""
          }`}
        >
          {deductedIsZero ? "—" : formatCurrency(deducted, currency)}
        </span>
        <span className={styles.refundAmountLabel}>
          {deductedIsZero ? "No deduction" : "Deducted"}
        </span>
      </div>
    </div>
  );
}
