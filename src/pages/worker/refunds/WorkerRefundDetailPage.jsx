// src/pages/worker/refunds/WorkerRefundDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiDownload,
  FiAlertTriangle,
  FiUser,
  FiCalendar,
  FiTag,
  FiInfo,
  FiFileText,
} from "react-icons/fi";
import styles from "./WorkerRefunds.module.css";
import { formatCurrency } from "./components/RefundSummaryCard";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import RefundStatusPill from "./components/RefundStatusPill";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkerRefundDetailPage() {
  const { refundId } = useParams();
  const navigate = useNavigate();

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    if (!refundId) return;
    setLoading(true);
    setError("");
    api
      .get(`/worker/refunds/${refundId}`)
      .then((res) => setRefund(res.data.data.refund))
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            "Could not load this refund. It may no longer exist.",
        );
      })
      .finally(() => setLoading(false));
  }, [refundId]);

  // ── Open the printable HTML receipt in a new tab ─────────────────────────
  // We fetch as text through axios (so the Bearer token is attached), then
  // create a Blob URL and open it. Native browser print / Save as PDF works
  // directly on that page.
  const openReceipt = async () => {
    if (!refund) return;
    setReceiptLoading(true);
    try {
      const res = await api.get(`/worker/refunds/${refund.id}/receipt.html`, {
        responseType: "text",
        transformResponse: [(d) => d],
      });
      const blob = new Blob([res.data], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Revoke after a delay so the new tab can render fully
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      // Fallback: download as a file
      alert("Could not open receipt in a new tab. It will download instead.");
    } finally {
      setReceiptLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <WorkerLayout>
        <div className={styles.detailPage}>
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p className={styles.errorText}>Loading refund details…</p>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !refund) {
    return (
      <WorkerLayout>
        <div className={styles.detailPage}>
          <div className={styles.detailTopBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate("/dashboard/worker/refunds")}
            >
              <FiArrowLeft size={14} /> Back to refunds
            </button>
          </div>
          <div className={styles.center}>
            <div className={styles.errorIcon}>
              <FiAlertTriangle size={24} />
            </div>
            <p className={styles.errorTitle}>Refund not found</p>
            <p className={styles.errorText}>{error}</p>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  const deducted = refund.workerAmountDeducted ?? 0;
  const currency = refund.currency || "NGN";
  const wd = refund.workerDebts?.[0] || null;

  return (
    <WorkerLayout>
      <div className={styles.detailPage}>
        {/* Top bar */}
        <div className={styles.detailTopBar}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/dashboard/worker/refunds")}
          >
            <FiArrowLeft size={14} /> Back
          </button>
          <button
            type="button"
            className={styles.receiptBtn}
            onClick={openReceipt}
            disabled={receiptLoading}
          >
            <FiDownload size={14} />
            {receiptLoading ? "Preparing…" : "Print / Download Receipt"}
          </button>
        </div>

        {/* Hero */}
        <div className={styles.detailHero}>
          <div className={styles.detailHeroLabel}>
            Deducted From Your Earnings
          </div>
          <div
            className={`${styles.detailHeroAmount} ${
              deducted === 0 ? styles.zero : ""
            }`}
          >
            {deducted === 0
              ? "No deduction"
              : formatCurrency(deducted, currency)}
          </div>
          <div className={styles.detailHeroSub}>
            {deducted === 0
              ? "This refund did not affect your earnings."
              : `This refund resulted in ${formatCurrency(
                  deducted,
                  currency,
                )} being deducted from your account for booking "${
                  refund.booking?.title || "the booking"
                }".`}
          </div>
          <div className={styles.detailHeroPills}>
            <RefundStatusPill status={refund.status} />
            <span className={styles.detailHeroRef}>{refund.reference}</span>
          </div>
        </div>

        {/* Debt notice (only if a WorkerDebt exists) */}
        {wd && (
          <div className={styles.debtNotice}>
            <div className={styles.debtNoticeTitle}>
              <FiAlertTriangle size={16} />
              Outstanding balance recorded
            </div>
            <div className={styles.debtNoticeBody}>
              Because you had already withdrawn this booking's earnings, this
              refund created a debt of{" "}
              <strong>
                {formatCurrency(wd.amount, wd.currency || currency)}
              </strong>
              .
              {wd.status === "CLEARED" &&
                " It has since been fully recovered from your withdrawals."}
              {wd.status === "FORGIVEN" &&
                " This debt has since been forgiven by the platform."}
              {wd.status === "OUTSTANDING" &&
                " It will be deducted from your next withdrawal."}
              {wd.status === "COLLECTION" &&
                " It is currently being followed up by our team."}
            </div>
          </div>
        )}

        {/* Refund details */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>
            <FiInfo size={14} /> Refund details
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Reference</span>
            <span className={`${styles.detailValue} ${styles.mono}`}>
              {refund.reference}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Status</span>
            <span className={styles.detailValue}>
              <RefundStatusPill status={refund.status} />
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Type</span>
            <span className={styles.detailValue}>
              {refund.refundType?.replace(/_/g, " ") || "—"}
            </span>
          </div>
          {refund.percentage != null && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Percentage</span>
              <span className={styles.detailValue}>
                {Number(refund.percentage).toFixed(0)}%
              </span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Total refunded to hirer</span>
            <span className={styles.detailValue}>
              {formatCurrency(refund.amount, currency)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Platform fee refunded</span>
            <span className={styles.detailValue}>
              {formatCurrency(refund.platformFeeRefunded || 0, currency)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Deducted from you</span>
            <span
              className={styles.detailValue}
              style={{
                color: deducted > 0 ? "var(--red)" : "var(--text-muted)",
              }}
            >
              {formatCurrency(deducted, currency)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Reason</span>
            <span className={`${styles.detailValue} ${styles.dim}`}>
              {refund.reason || "—"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Initiated</span>
            <span className={styles.detailValue}>
              {formatDateTime(refund.createdAt)}
            </span>
          </div>
          {refund.processedAt && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Processed</span>
              <span className={styles.detailValue}>
                {formatDateTime(refund.processedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Booking */}
        {refund.booking && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <FiCalendar size={14} /> Booking
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Title</span>
              <span className={styles.detailValue}>{refund.booking.title}</span>
            </div>
            {refund.booking.category && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Category</span>
                <span className={styles.detailValue}>
                  {refund.booking.category.icon || ""}{" "}
                  {refund.booking.category.name}
                </span>
              </div>
            )}
            {refund.booking.address && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Location</span>
                <span className={styles.detailValue}>
                  {refund.booking.address}
                </span>
              </div>
            )}
            {refund.booking.scheduledAt && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Scheduled</span>
                <span className={styles.detailValue}>
                  {formatDate(refund.booking.scheduledAt)}
                </span>
              </div>
            )}
            {refund.booking.completedAt && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Completed</span>
                <span className={styles.detailValue}>
                  {formatDate(refund.booking.completedAt)}
                </span>
              </div>
            )}
            {refund.booking.agreedRate != null && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Agreed rate</span>
                <span className={styles.detailValue}>
                  {formatCurrency(
                    refund.booking.agreedRate,
                    refund.booking.currency || currency,
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dispute context */}
        {refund.dispute && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <FiTag size={14} /> Dispute context
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Raised by</span>
              <span className={styles.detailValue}>
                {refund.dispute.raisedBy
                  ? `${refund.dispute.raisedBy.firstName} ${refund.dispute.raisedBy.lastName} (${refund.dispute.raisedBy.role})`
                  : "—"}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Reason</span>
              <span className={styles.detailValue}>
                {refund.dispute.reason}
              </span>
            </div>
            {refund.dispute.description && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Description</span>
                <span className={`${styles.detailValue} ${styles.dim}`}>
                  {refund.dispute.description}
                </span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Resolution</span>
              <span className={styles.detailValue}>
                {refund.dispute.resolution || "—"}
              </span>
            </div>
            {refund.dispute.resolvedBy && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Resolved by</span>
                <span className={styles.detailValue}>
                  {refund.dispute.resolvedBy.firstName}{" "}
                  {refund.dispute.resolvedBy.lastName}
                </span>
              </div>
            )}
            {refund.dispute.resolvedAt && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Resolved at</span>
                <span className={styles.detailValue}>
                  {formatDateTime(refund.dispute.resolvedAt)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Hirer (parties) */}
        {refund.hirer && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <FiUser size={14} /> Hirer
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Name</span>
              <span className={styles.detailValue}>
                {refund.hirer.firstName} {refund.hirer.lastName}
              </span>
            </div>
            {refund.hirer.email && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Email</span>
                <span className={styles.detailValue}>{refund.hirer.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Worker debt (if any) */}
        {wd && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <FiFileText size={14} /> Outstanding balance
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Status</span>
              <span className={styles.detailValue}>{wd.status}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Original amount</span>
              <span className={styles.detailValue}>
                {formatCurrency(wd.amount, wd.currency || currency)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Recovered</span>
              <span className={styles.detailValue}>
                {formatCurrency(wd.amountPaid || 0, wd.currency || currency)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Forgiven</span>
              <span className={styles.detailValue}>
                {formatCurrency(
                  wd.amountForgiven || 0,
                  wd.currency || currency,
                )}
              </span>
            </div>
            {wd.clearedAt && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Cleared at</span>
                <span className={styles.detailValue}>
                  {formatDateTime(wd.clearedAt)}
                </span>
              </div>
            )}
            {wd.forgivenAt && (
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Forgiven at</span>
                <span className={styles.detailValue}>
                  {formatDateTime(wd.forgivenAt)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
