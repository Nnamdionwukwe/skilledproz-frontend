import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Disputes.module.css";

const STATUS_META = {
  OPEN: { label: "Open", cls: "statusOpen" },
  UNDER_REVIEW: { label: "Under Review", cls: "statusReview" },
  RESOLVED: { label: "Resolved", cls: "statusResolved" },
  CANCELLED: { label: "Cancelled", cls: "statusCancelled" },
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] || { label: status, cls: "statusOpen" };
  return (
    <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>
  );
}

export default function MyDisputes() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [success, setSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/disputes/my");
      const all = res.data.data.disputes || [];
      setDisputes(all);
      setTotal(all.length);
    } catch {
      setError("Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (bookingId) => {
    if (!confirm("Cancel this dispute? This action cannot be undone.")) return;
    setCancelling(bookingId);
    setError(""); setSuccess("");
    try {
      await api.patch(`/disputes/${bookingId}/cancel`);
      setSuccess("Dispute cancelled successfully.");
      setDisputes(prev =>
        prev.map(d =>
          d.bookingId === bookingId ? { ...d, status: "CANCELLED" } : d
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel dispute.");
    } finally {
      setCancelling(null);
    }
  };

  const filtered = filterStatus
    ? disputes.filter(d => d.status === filterStatus)
    : disputes;

  return (
    <Layout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.eyebrow}>Support</div>
            <h1 className={styles.title}>My Disputes</h1>
            <p className={styles.sub}>
              Track and manage disputes raised on your bookings
            </p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.headerStat}>
              <span className={styles.headerStatNum}>{total}</span>
              <span className={styles.headerStatLabel}>Total</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatNum} style={{ color: "var(--orange)" }}>
                {disputes.filter(d => d.status === "OPEN" || d.status === "UNDER_REVIEW").length}
              </span>
              <span className={styles.headerStatLabel}>Active</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatNum} style={{ color: "var(--green)" }}>
                {disputes.filter(d => d.status === "RESOLVED").length}
              </span>
              <span className={styles.headerStatLabel}>Resolved</span>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {["", "OPEN", "UNDER_REVIEW", "RESOLVED", "CANCELLED"].map(s => (
            <button
              key={s}
              className={`${styles.filterTab} ${filterStatus === s ? styles.filterTabActive : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "" ? "All" : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className={styles.errorBox}>
            <span>⚠️</span> {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className={styles.successBox}>
            <span>✅</span> {success}
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {/* List */}
        <div className={styles.disputeList}>
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className={styles.skeleton} />
            ))
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🛡️</span>
              <p className={styles.emptyTitle}>
                {filterStatus ? `No ${STATUS_META[filterStatus]?.label?.toLowerCase()} disputes` : "No disputes yet"}
              </p>
              <p className={styles.emptySub}>
                Disputes can be raised from any active booking that has an issue.
              </p>
            </div>
          ) : (
            filtered.map((dispute, i) => (
              <div
                key={dispute.id || dispute.bookingId}
                className={`${styles.disputeCard} ${expanded === dispute.bookingId ? styles.disputeCardExpanded : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card top */}
                <div className={styles.cardTop} onClick={() => setExpanded(prev => prev === dispute.bookingId ? null : dispute.bookingId)}>
                  <div className={styles.cardLeft}>
                    <div className={`${styles.disputeIcon} ${styles[`icon_${(dispute.status || "OPEN").toLowerCase()}`]}`}>
                      {dispute.status === "RESOLVED" ? "✓" : dispute.status === "CANCELLED" ? "✕" : "⚠"}
                    </div>
                    <div>
                      <p className={styles.disputeTitle}>
                        {dispute.booking?.title || `Booking dispute`}
                      </p>
                      <p className={styles.disputeMeta}>
                        {dispute.reason && (
                          <span className={styles.reasonTag}>{dispute.reason.replace(/_/g, " ")}</span>
                        )}
                        <span className={styles.metaDot}>·</span>
                        <span>
                          {new Date(dispute.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <StatusBadge status={dispute.status} />
                    <span className={styles.expandChevron}>
                      {expanded === dispute.bookingId ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === dispute.bookingId && (
                  <div className={styles.cardBody}>
                    {dispute.description && (
                      <div className={styles.descBlock}>
                        <p className={styles.descLabel}>Description</p>
                        <p className={styles.descText}>{dispute.description}</p>
                      </div>
                    )}

                    {dispute.resolution && (
                      <div className={styles.resolutionBlock}>
                        <p className={styles.resolutionLabel}>✅ Resolution</p>
                        <p className={styles.resolutionText}>{dispute.resolution}</p>
                        {dispute.resolvedAt && (
                          <p className={styles.resolvedDate}>
                            Resolved on {new Date(dispute.resolvedAt).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Booking parties */}
                    {(dispute.booking?.hirer || dispute.booking?.worker) && (
                      <div className={styles.partiesRow}>
                        {dispute.booking?.hirer && (
                          <div className={styles.partyChip}>
                            <div className={styles.partyAvatar}>
                              {dispute.booking.hirer.avatar ? (
                                <img src={dispute.booking.hirer.avatar} alt="" />
                              ) : (
                                <span>
                                  {dispute.booking.hirer.firstName?.[0]}
                                  {dispute.booking.hirer.lastName?.[0]}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className={styles.partyName}>
                                {dispute.booking.hirer.firstName} {dispute.booking.hirer.lastName}
                              </p>
                              <p className={styles.partyRole}>Hirer</p>
                            </div>
                          </div>
                        )}
                        {dispute.booking?.worker && (
                          <div className={styles.partyChip}>
                            <div className={styles.partyAvatar}>
                              {dispute.booking.worker.avatar ? (
                                <img src={dispute.booking.worker.avatar} alt="" />
                              ) : (
                                <span>
                                  {dispute.booking.worker.firstName?.[0]}
                                  {dispute.booking.worker.lastName?.[0]}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className={styles.partyName}>
                                {dispute.booking.worker.firstName} {dispute.booking.worker.lastName}
                              </p>
                              <p className={styles.partyRole}>Worker</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className={styles.cardActions}>
                      {dispute.status === "OPEN" && (
                        <button
                          className={styles.cancelDisputeBtn}
                          disabled={cancelling === dispute.bookingId}
                          onClick={() => handleCancel(dispute.bookingId)}
                        >
                          {cancelling === dispute.bookingId ? (
                            <><span className={styles.spinner} /> Cancelling...</>
                          ) : "Cancel Dispute"}
                        </button>
                      )}
                      
                        href={`/bookings/${dispute.bookingId}`}
                        className={styles.viewBookingBtn}
                      >
                        View Booking →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}