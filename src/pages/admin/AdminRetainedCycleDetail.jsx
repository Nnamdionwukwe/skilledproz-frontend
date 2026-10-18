import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Skeleton from "../../components/common/Skeleton";
import styles from "./AdminRetainedCycles.module.css";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiSend,
  FiX,
  FiUser,
  FiCalendar,
} from "react-icons/fi";
import { retainedStaffApi } from "../../lib/etainedStaffApi";

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

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const STATUS_META = {
  AWAITING_PAYMENT: { label: "Awaiting Payment", color: "yellow" },
  HELD: { label: "In Escrow", color: "orange" },
  PARTIALLY_RELEASED: { label: "Partially Released", color: "orange" },
  RELEASED: { label: "Released", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
  FAILED: { label: "Failed", color: "red" },
};

export default function AdminRetainedCycleDetail() {
  const { cycleId } = useParams();
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/retained-cycles/${cycleId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCycle(data.data.cycle);
        else setError(data.message || "Failed to load cycle");
      })
      .catch(() => setError("Could not connect to server"))
      .finally(() => setLoading(false));
  }, [cycleId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.page}>
          <Skeleton width={120} height={16} style={{ marginBottom: 16 }} />
          <Skeleton width="60%" height={28} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} style={{ marginBottom: 24 }} />
          <Skeleton.Card height={220} style={{ marginBottom: 16 }} />
          <Skeleton.Table rows={4} cols={4} />
        </div>
      </AdminLayout>
    );
  }

  if (error || !cycle) {
    return (
      <AdminLayout>
        <div className={styles.page}>
          <div className={styles.empty}>
            <FiAlertCircle size={48} />
            <h3>{error || "Cycle not found"}</h3>
            <Link to="/admin/retained-cycles" className={styles.backLink}>
              <FiArrowLeft /> Back to Cycles
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const meta = STATUS_META[cycle.status] || STATUS_META.AWAITING_PAYMENT;
  const payment = cycle.booking?.payments?.[0];
  const releases = payment?.releases || [];
  const workerPayout = Number(payment?.workerPayout) || 0;
  const releasedAmount = Number(payment?.releasedAmount) || 0;
  const remaining = Math.max(0, workerPayout - releasedAmount);
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Link to="/admin/retained-cycles" className={styles.backLink}>
          <FiArrowLeft /> Back to Cycles
        </Link>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{cycle.label || "Payroll Cycle"}</h1>
            <p className={styles.subtitle}>
              {cycle.member?.jobTitle} · {cycle.member?.worker?.firstName}{" "}
              {cycle.member?.worker?.lastName} →{" "}
              {cycle.member?.hirer?.firstName} {cycle.member?.hirer?.lastName}
            </p>
          </div>
          <span className={`${styles.badge} ${styles[meta.color]}`}>
            {meta.label}
          </span>
        </div>

        {/* Summary Card */}
        <div className={styles.detailCard}>
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
            {payment && (
              <div className={styles.summaryItem}>
                <p className={styles.summaryLabel}>Payment Provider</p>
                <p className={styles.summaryValue}>{payment.provider}</p>
              </div>
            )}
            {payment && (
              <div className={styles.summaryItem}>
                <p className={styles.summaryLabel}>Payment Status</p>
                <p className={styles.summaryValue}>{payment.status}</p>
              </div>
            )}
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

        {/* Release Progress */}
        {payment && (
          <div className={styles.detailCard}>
            <h3 className={styles.panelTitle}>
              <FiSend style={{ marginRight: 8 }} /> Release Progress
            </h3>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${releasedPct}%` }}
              />
            </div>
            <p className={styles.progressLabel}>
              {formatMoney(releasedAmount, cycle.currency)} of{" "}
              {formatMoney(workerPayout, cycle.currency)} released ·{" "}
              {releasedPct}%
            </p>

            {releases.length > 0 ? (
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
                        <FiUser size={10} />{" "}
                        {r.releasedBy?.firstName || "Hirer"} ·{" "}
                        <FiCalendar size={10} /> {formatDateTime(r.createdAt)}
                      </p>
                      {r.note && (
                        <p className={styles.releaseNote}>"{r.note}"</p>
                      )}
                    </div>
                    <div className={styles.releaseRemaining}>
                      <span>Remaining</span>
                      <span>
                        {formatMoney(r.remainingAfter, cycle.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptySmall}>No releases yet.</p>
            )}
          </div>
        )}

        {/* Refunds & Disputes */}
        {(cycle.refunds?.length > 0 || cycle.disputes?.length > 0) && (
          <div className={styles.detailCard}>
            {cycle.refunds?.length > 0 && (
              <>
                <h3 className={styles.panelTitle}>Refunds</h3>
                <div className={styles.list}>
                  {cycle.refunds.map((refund) => (
                    <div key={refund.id} className={styles.listItem}>
                      <p className={styles.listName}>
                        {formatMoney(refund.amount, refund.currency)}
                      </p>
                      <p className={styles.listSub}>
                        Status: {refund.status} · Reason: {refund.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {cycle.disputes?.length > 0 && (
              <>
                <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
                  Disputes
                </h3>
                <div className={styles.list}>
                  {cycle.disputes.map((dispute) => (
                    <div key={dispute.id} className={styles.listItem}>
                      <p className={styles.listName}>{dispute.reason}</p>
                      <p className={styles.listSub}>
                        Status: {dispute.status} · Raised by{" "}
                        {dispute.raisedByRole}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
