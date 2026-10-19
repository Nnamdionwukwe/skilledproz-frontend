// src/pages/hirer/retained-staff/HirerCycleDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import Skeleton from "../../../components/common/Skeleton";
import styles from "./HirerCycleDetail.module.css";
import PayCycleModal from "./PayCycleModal";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiSend,
  FiX,
  FiLoader,
  FiUser,
  FiCalendar,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_META = {
  AWAITING_PAYMENT: {
    label: "Awaiting Payment",
    color: "yellow",
    icon: FiClock,
  },
  HELD: { label: "In Escrow", color: "orange", icon: FiDollarSign },
  PARTIALLY_RELEASED: {
    label: "Partially Released",
    color: "orange",
    icon: FiSend,
  },
  RELEASED: { label: "Released", color: "green", icon: FiCheckCircle },
  CANCELLED: { label: "Cancelled", color: "red", icon: FiX },
  FAILED: { label: "Failed", color: "red", icon: FiAlertCircle },
};

export default function HirerCycleDetail() {
  const { id, cycleId } = useParams();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseNote, setReleaseNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const loadCycle = useCallback(() => {
    setLoading(true);
    retainedStaffApi
      .getCycle(id, cycleId)
      .then((res) => setCycle(res.data.data.cycle))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load cycle"),
      )
      .finally(() => setLoading(false));
  }, [id, cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  const payment = cycle?.booking?.payments?.[0];
  const releases = payment?.releases || [];
  const workerPayout = Number(payment?.workerPayout) || 0;
  const releasedAmount = Number(payment?.releasedAmount) || 0;
  const remaining = Math.max(0, workerPayout - releasedAmount);
  const fullyReleased = remaining === 0 && releasedAmount > 0;
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;

  const handleRelease = async () => {
    setError("");
    const amount = parseFloat(releaseAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (amount > remaining) {
      setError(
        `Amount exceeds remaining (${formatMoney(remaining, cycle.currency)}).`,
      );
      return;
    }
    setActionLoading(true);
    try {
      await retainedStaffApi.releaseCycle(cycleId, {
        amount,
        note: releaseNote.trim() || undefined,
      });
      setReleaseAmount("");
      setReleaseNote("");
      loadCycle();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to release funds.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setActionLoading(true);
    try {
      await retainedStaffApi.cancelCycle(cycleId, cancelReason.trim());
      setShowCancel(false);
      loadCycle();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel cycle.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Full Page Skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <Skeleton width={120} height={16} style={{ marginBottom: 16 }} />
          <Skeleton width="50%" height={28} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} style={{ marginBottom: 24 }} />

          <Skeleton.Card height={220} style={{ marginBottom: 16 }} />
          <Skeleton.Card height={160} />
        </div>
      </HirerLayout>
    );
  }

  if (!cycle) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.notFound}>
            <FiAlertCircle size={48} />
            <h2>Cycle not found</h2>
            <Link
              to={`/dashboard/hirer/retained-staff/${id}`}
              className={styles.backLink}
            >
              <FiArrowLeft /> Back to Staff
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  const meta = STATUS_META[cycle.status] || STATUS_META.AWAITING_PAYMENT;
  const StatusIcon = meta.icon;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <Link
          to={`/dashboard/hirer/retained-staff/${id}`}
          className={styles.backLink}
        >
          <FiArrowLeft /> Back to Staff
        </Link>

        {error && (
          <div className={styles.errorBanner}>
            <FiAlertCircle size={16} />
            {error}
            <button onClick={() => setError("")} className={styles.errorClose}>
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{cycle.label || "Payroll Cycle"}</h1>
            <p className={styles.subtitle}>
              {cycle.member?.jobTitle} · {cycle.member?.worker?.firstName}{" "}
              {cycle.member?.worker?.lastName}
            </p>
          </div>
          <span
            className={`${styles.statusBadge} ${styles[`status_${meta.color}`]}`}
          >
            <StatusIcon size={12} /> {meta.label}
          </span>
        </div>

        {/* Summary card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <p className={styles.summaryLabel}>Period</p>
              <p className={styles.summaryValue}>
                {formatDate(cycle.periodStart)} — {formatDate(cycle.periodEnd)}
              </p>
            </div>
            <div className={styles.summaryItem}>
              <p className={styles.summaryLabel}>Pay Date</p>
              <p className={styles.summaryValue}>{formatDate(cycle.payDate)}</p>
            </div>
            <div className={styles.summaryItem}>
              <p className={styles.summaryLabel}>Type</p>
              <p className={styles.summaryValue}>
                {cycle.type.replace("_", " ")}
              </p>
            </div>
            <div className={styles.summaryItem}>
              <p className={styles.summaryLabel}>Currency</p>
              <p className={styles.summaryValue}>{cycle.currency}</p>
            </div>
          </div>

          <div className={styles.breakdownSection}>
            <div className={styles.breakdownRow}>
              <span>Base Amount</span>
              <span>{formatMoney(cycle.baseAmount, cycle.currency)}</span>
            </div>
            {cycle.bonusAmount > 0 && (
              <div className={styles.breakdownRow}>
                <span>Bonus</span>
                <span>+ {formatMoney(cycle.bonusAmount, cycle.currency)}</span>
              </div>
            )}
            {cycle.deductionAmount > 0 && (
              <div className={styles.breakdownRow}>
                <span>Deductions</span>
                <span>
                  − {formatMoney(cycle.deductionAmount, cycle.currency)}
                </span>
              </div>
            )}
            <div className={styles.breakdownRow}>
              <span>Platform Fee</span>
              <span>− {formatMoney(cycle.platformFee, cycle.currency)}</span>
            </div>
            <div className={styles.breakdownTotal}>
              <span>Worker Receives</span>
              <span>{formatMoney(cycle.workerPayout, cycle.currency)}</span>
            </div>
          </div>
        </div>

        {/* ═══ ACTION: Pay Now ═══ */}
        {cycle.status === "AWAITING_PAYMENT" && (
          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIcon}>
                <FiDollarSign size={20} />
              </div>
              <div>
                <h3 className={styles.actionTitle}>Ready to Fund</h3>
                <p className={styles.actionDesc}>
                  Pay {formatMoney(cycle.netAmount, cycle.currency)} to place
                  this cycle in escrow. Funds stay held until you release them.
                </p>
              </div>
            </div>
            <div className={styles.actionButtons}>
              <button
                className={styles.btnPrimary}
                onClick={() => setShowPayModal(true)}
              >
                <FiDollarSign /> Pay Now
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setShowCancel(true)}
              >
                Cancel Cycle
              </button>
            </div>
          </div>
        )}

        {/* ═══ ACTION: Release Funds ═══ */}
        {["HELD", "PARTIALLY_RELEASED"].includes(cycle.status) &&
          !fullyReleased && (
            <div className={styles.actionCard}>
              <div className={styles.actionHeader}>
                <div className={styles.actionIcon}>
                  <FiSend size={20} />
                </div>
                <div>
                  <h3 className={styles.actionTitle}>Release Funds</h3>
                  <p className={styles.actionDesc}>
                    {formatMoney(releasedAmount, cycle.currency)} of{" "}
                    {formatMoney(workerPayout, cycle.currency)} released ·{" "}
                    {formatMoney(remaining, cycle.currency)} still in escrow.
                  </p>
                </div>
              </div>
              <div className={styles.releaseForm}>
                <div className={styles.field}>
                  <label>Amount to Release</label>
                  <div className={styles.amountInputWrap}>
                    <span className={styles.amountPrefix}>
                      {cycle.currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remaining}
                      value={releaseAmount}
                      onChange={(e) => setReleaseAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <p className={styles.fieldHint}>
                    Available: {formatMoney(remaining, cycle.currency)}
                  </p>
                </div>
                <div className={styles.field}>
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    value={releaseNote}
                    onChange={(e) => setReleaseNote(e.target.value)}
                    placeholder="e.g. Monthly salary March"
                  />
                </div>
                <button
                  className={styles.btnPrimary}
                  onClick={handleRelease}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <FiLoader className={styles.spin} />
                  ) : (
                    <FiSend />
                  )}
                  {actionLoading ? "Releasing…" : "Release Funds"}
                </button>
              </div>
            </div>
          )}

        {/* ═══ Fully Released state ═══ */}
        {fullyReleased && (
          <div className={`${styles.actionCard} ${styles.successCard}`}>
            <FiCheckCircle size={24} className={styles.successIcon} />
            <div>
              <h3 className={styles.actionTitle}>Fully Released</h3>
              <p className={styles.actionDesc}>
                All funds for this cycle have been released to the worker.
                Nothing left to do.
              </p>
            </div>
          </div>
        )}

        {/* ═══ Release history ═══ */}
        {releases.length > 0 && (
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>
              Release History ({releases.length})
            </h3>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${releasedPct}%` }}
              />
            </div>
            <p className={styles.progressLabel}>
              {releasedPct}% released ·{" "}
              {formatMoney(releasedAmount, cycle.currency)} of{" "}
              {formatMoney(workerPayout, cycle.currency)}
            </p>

            <div className={styles.releaseList}>
              {releases.map((r) => (
                <div key={r.id} className={styles.releaseItem}>
                  <div className={styles.releaseAvatar}>
                    {r.releasedBy?.firstName?.[0] || "H"}
                  </div>
                  <div className={styles.releaseInfo}>
                    <p className={styles.releaseAmount}>
                      {formatMoney(r.amount, r.currency || cycle.currency)}
                    </p>
                    <p className={styles.releaseMeta}>
                      <FiUser size={10} /> {r.releasedBy?.firstName || "Hirer"}{" "}
                      · <FiCalendar size={10} /> {formatDate(r.createdAt)}
                    </p>
                    {r.note && <p className={styles.releaseNote}>"{r.note}"</p>}
                  </div>
                  <div className={styles.releaseRemaining}>
                    <span>Remaining</span>
                    <span>{formatMoney(r.remainingAfter, cycle.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Cancellation box ═══ */}
        {showCancel && (
          <div className={styles.cancelBox}>
            <h3>Cancel this cycle?</h3>
            <p>
              Cancelling will close this cycle. Nothing will be paid. This
              cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation…"
              rows={2}
            />
            <div className={styles.cancelActions}>
              <button
                className={styles.btnDanger}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? "Cancelling…" : "Yes, Cancel Cycle"}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => {
                  setShowCancel(false);
                  setCancelReason("");
                }}
              >
                Keep Cycle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {cycle.member && (
        <PayCycleModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          cycle={cycle}
          member={cycle.member}
        />
      )}
    </HirerLayout>
  );
}
