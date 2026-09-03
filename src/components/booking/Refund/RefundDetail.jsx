// src/pages/refund/RefundDetail.jsx
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./Refund.module.css";
import HirerLayout from "../../layout/HirerLayout";
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaFileInvoice,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { calcPricing } from "../../utils/pricing";

const STATUS_CONFIG = {
  PENDING: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    bg: "rgba(251, 191, 36, 0.1)",
  },
  APPROVED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Approved",
    bg: "rgba(34, 197, 94, 0.1)",
  },
  PROCESSING: {
    icon: FaSpinner,
    color: "#818cf8",
    label: "Processing",
    bg: "rgba(129, 140, 248, 0.1)",
  },
  COMPLETED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    bg: "rgba(34, 197, 94, 0.1)",
  },
  FAILED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  REJECTED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Rejected",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
    bg: "rgba(245, 158, 11, 0.1)",
  },
};

export default function RefundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRefundDetail();
  }, [id]);

  const fetchRefundDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/refunds/${id}`);
      setRefund(response.data.data.refund);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load refund details");
      if (err.response?.status === 404) {
        setTimeout(() => navigate("/refunds"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    return (
      STATUS_CONFIG[status] || {
        icon: FaClock,
        color: "#888",
        label: status || "Unknown",
        bg: "rgba(136, 136, 136, 0.1)",
      }
    );
  };

  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.loadingState}>
          <FaSpinner className={styles.spinner} />
          <p>Loading refund details...</p>
        </div>
      </HirerLayout>
    );
  }

  if (error || !refund) {
    return (
      <HirerLayout>
        <div className={styles.errorState}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <h3>{error || "Refund not found"}</h3>
          <p>Redirecting to refund history...</p>
          <Link to="/refunds" className={styles.backButton}>
            <FaArrowLeft /> Back to Refunds
          </Link>
        </div>
      </HirerLayout>
    );
  }

  const statusConfig = getStatusConfig(refund.status);
  const StatusIcon = statusConfig.icon;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link to="/refunds" className={styles.backLink}>
            <FaArrowLeft /> Back to Refunds
          </Link>
          <h1 className={styles.headerTitle}>Refund Details</h1>
        </div>

        <div className={styles.detailContainer}>
          {/* Status Banner */}
          <div
            className={styles.statusBanner}
            style={{
              background: statusConfig.bg,
              borderColor: statusConfig.color,
            }}
          >
            <StatusIcon size={24} style={{ color: statusConfig.color }} />
            <div>
              <div className={styles.statusBannerLabel}>Status</div>
              <div
                className={styles.statusBannerValue}
                style={{ color: statusConfig.color }}
              >
                {statusConfig.label}
              </div>
            </div>
            <span className={styles.referenceBadge}>
              Ref: {refund.reference}
            </span>
          </div>

          {/* Main Details */}
          <div className={styles.detailGrid}>
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaMoneyBillWave /> Refund Information
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount</span>
                <span className={styles.detailValueLarge}>
                  {refund.currency} {refund.amount.toLocaleString()}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>
                  {refund.refundType?.replace("_", " ") || "N/A"}
                </span>
              </div>
              {refund.percentage && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Percentage</span>
                  <span className={styles.detailValue}>
                    {refund.percentage}%
                  </span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  Platform Fee Refunded
                </span>
                <span className={styles.detailValue}>
                  {refund.currency}{" "}
                  {refund.platformFeeRefunded?.toLocaleString() || "0"}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Worker Deducted</span>
                <span className={styles.detailValue}>
                  {refund.currency}{" "}
                  {refund.workerAmountDeducted?.toLocaleString() || "0"}
                </span>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaFileInvoice /> Booking Information
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Booking</span>
                <Link
                  to={`/bookings/${refund.booking?.id}`}
                  className={styles.detailLink}
                >
                  {refund.booking?.title || "N/A"}
                </Link>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Hirer</span>
                <span className={styles.detailValue}>
                  {refund.hirer?.firstName} {refund.hirer?.lastName}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Worker</span>
                <span className={styles.detailValue}>
                  {refund.worker?.firstName} {refund.worker?.lastName}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Original Payment</span>
                <span className={styles.detailValue}>
                  {refund.payment?.provider || "N/A"} -{" "}
                  {refund.payment?.providerRef || "N/A"}
                </span>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaClock /> Timeline
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Requested</span>
                <span className={styles.detailValue}>
                  {new Date(refund.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {refund.autoApprovedAt && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Auto-Approved</span>
                  <span className={styles.detailValue}>
                    {new Date(refund.autoApprovedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {refund.processedAt && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Processed</span>
                  <span className={styles.detailValue}>
                    {new Date(refund.processedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {refund.status === "COMPLETED" && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Completed</span>
                  <span
                    className={styles.detailValue}
                    style={{ color: "#22c55e" }}
                  >
                    <FaCheckCircle /> Done
                  </span>
                </div>
              )}
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaInfoCircle /> Reason & Notes
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reason</span>
                <span className={styles.detailValueText}>
                  {refund.reason || "N/A"}
                </span>
              </div>
              {refund.adminNotes && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Admin Notes</span>
                  <span className={styles.detailValueText}>
                    {refund.adminNotes}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actionsContainer}>
            {refund.status === "COMPLETED" && (
              <button className={styles.downloadBtn}>
                <FaDownload /> Download Receipt
              </button>
            )}
            <Link to="/refunds" className={styles.backToHistory}>
              View All Refunds
            </Link>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
