import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Disputes.module.css";
import { Link } from "react-router-dom";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaUsers,
  FaImage,
  FaTrash,
  FaEye,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";

const STATUS_META = {
  DISPUTED: { label: "Open", cls: "statusOpen" },
  UNDER_REVIEW: { label: "Under Review", cls: "statusReview" },
  RESOLVED: { label: "Resolved", cls: "statusResolved" },
  CANCELLED: { label: "Cancelled", cls: "statusCancelled" },
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] || { label: status, cls: "statusOpen" };
  return <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>;
}

function formatCurrency(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Confirmation Modal ────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FaTimesCircle />
          </button>
        </div>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`${styles.confirmBtn} ${styles.confirmDanger}`}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Image Lightbox Modal ──────────────────────────────────────────────
function ImageLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.lightboxContent}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.lightboxClose} onClick={onClose}>
          <FaTimes size={24} />
        </button>
        <img src={imageUrl} alt="Evidence" className={styles.lightboxImage} />
      </div>
    </div>
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

  // ── Confirmation modal state ──
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);

  // ── Lightbox state ──
  const [lightboxImage, setLightboxImage] = useState(null);

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

  useEffect(() => {
    load();
  }, []);

  const openCancelModal = (bookingId) => {
    setCancelBookingId(bookingId);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelBookingId(null);
  };

  const confirmCancel = async () => {
    if (!cancelBookingId) return;
    setCancelling(cancelBookingId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/disputes/${cancelBookingId}/cancel`);
      setSuccess("Dispute cancelled successfully.");
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === cancelBookingId ? { ...d, status: "CANCELLED" } : d,
        ),
      );
      closeCancelModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel dispute.");
      closeCancelModal();
    } finally {
      setCancelling(null);
    }
  };

  const filtered = filterStatus
    ? disputes.filter((d) => d.status === filterStatus)
    : disputes;

  return (
    <Layout>
      <div className={styles.page}>
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
              <span
                className={styles.headerStatNum}
                style={{ color: "var(--orange)" }}
              >
                {
                  disputes.filter(
                    (d) =>
                      d.status === "DISPUTED" || d.status === "UNDER_REVIEW",
                  ).length
                }
              </span>
              <span className={styles.headerStatLabel}>Active</span>
            </div>
            <div className={styles.headerStat}>
              <span
                className={styles.headerStatNum}
                style={{ color: "var(--green)" }}
              >
                {disputes.filter((d) => d.status === "RESOLVED").length}
              </span>
              <span className={styles.headerStatLabel}>Resolved</span>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {["", "DISPUTED", "UNDER_REVIEW", "RESOLVED", "CANCELLED"].map(
            (s) => (
              <button
                key={s}
                className={`${styles.filterTab} ${filterStatus === s ? styles.filterTabActive : ""}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === "" ? "All" : STATUS_META[s]?.label || s}
              </button>
            ),
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className={styles.errorBox}>
            <FaExclamationTriangle /> {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className={styles.successBox}>
            <FaCheckCircle /> {success}
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {/* List */}
        <div className={styles.disputeList}>
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <FaShieldAlt size={40} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>
                {filterStatus
                  ? `No ${STATUS_META[filterStatus]?.label?.toLowerCase()} disputes`
                  : "No disputes yet"}
              </p>
              <p className={styles.emptySub}>
                Disputes can be raised from any active booking that has an
                issue.
              </p>
            </div>
          ) : (
            filtered.map((dispute, i) => (
              <div
                key={dispute.id}
                className={`${styles.disputeCard} ${expanded === dispute.id ? styles.disputeCardExpanded : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card top */}
                <div
                  className={styles.cardTop}
                  onClick={() =>
                    setExpanded((prev) =>
                      prev === dispute.id ? null : dispute.id,
                    )
                  }
                >
                  <div className={styles.cardLeft}>
                    <div
                      className={`${styles.disputeIcon} ${styles[`icon_${(dispute.status || "DISPUTED").toLowerCase()}`]}`}
                    >
                      {dispute.status === "RESOLVED" ? (
                        <FaCheckCircle />
                      ) : dispute.status === "CANCELLED" ? (
                        <FaTimesCircle />
                      ) : (
                        <FaExclamationTriangle />
                      )}
                    </div>
                    <div>
                      <p className={styles.disputeTitle}>
                        {dispute.title || `Booking dispute`}
                      </p>
                      <p className={styles.disputeMeta}>
                        {dispute.disputeReason && (
                          <span className={styles.reasonTag}>
                            {dispute.disputeReason.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className={styles.metaDot}>·</span>
                        <span>
                          {new Date(dispute.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                        {dispute.category && (
                          <>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.categoryTag}>
                              {dispute.category.icon} {dispute.category.name}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <StatusBadge status={dispute.status} />
                    <span className={styles.expandChevron}>
                      {expanded === dispute.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === dispute.id && (
                  <div className={styles.cardBody}>
                    {/* Dispute Details */}
                    <div className={styles.detailGrid}>
                      {dispute.disputeReason && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Reason</span>
                          <span className={styles.detailValue}>
                            {dispute.disputeReason.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                      {dispute.disputeDescription && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>
                            Description
                          </span>
                          <span className={styles.detailValue}>
                            {dispute.disputeDescription}
                          </span>
                        </div>
                      )}
                      {dispute.disputeEvidence &&
                        dispute.disputeEvidence.length > 0 && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Evidence</span>
                            <div className={styles.evidenceGallery}>
                              {dispute.disputeEvidence.map((url, idx) => (
                                <button
                                  key={idx}
                                  className={styles.evidenceThumb}
                                  onClick={() => setLightboxImage(url)}
                                >
                                  <FaImage />
                                  <span>View</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Booking Details */}
                    <div className={styles.bookingDetails}>
                      <p className={styles.sectionLabel}>Booking Details</p>
                      <div className={styles.detailGrid}>
                        {dispute.agreedRate != null && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>
                              Agreed Rate
                            </span>
                            <span className={styles.detailValue}>
                              {formatCurrency(
                                dispute.agreedRate,
                                dispute.currency,
                              )}
                            </span>
                          </div>
                        )}
                        {dispute.estimatedUnit && dispute.estimatedValue && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Duration</span>
                            <span className={styles.detailValue}>
                              {dispute.estimatedValue} {dispute.estimatedUnit}
                            </span>
                          </div>
                        )}
                        {dispute.address && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>
                              <FaMapMarkerAlt /> Address
                            </span>
                            <span className={styles.detailValue}>
                              {dispute.address}
                            </span>
                          </div>
                        )}
                        {dispute.scheduledAt && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>
                              <FaCalendarAlt /> Scheduled
                            </span>
                            <span className={styles.detailValue}>
                              {new Date(dispute.scheduledAt).toLocaleString(
                                "en-GB",
                                {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                },
                              )}
                            </span>
                          </div>
                        )}
                        {dispute.jobType && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Job Type</span>
                            <span className={styles.detailValue}>
                              {dispute.jobType.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                        {dispute.locationType && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Location</span>
                            <span className={styles.detailValue}>
                              {dispute.locationType.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parties */}
                    <div className={styles.partiesRow}>
                      {dispute.hirer && (
                        <div className={styles.partyChip}>
                          <div className={styles.partyAvatar}>
                            {dispute.hirer.avatar ? (
                              <img src={dispute.hirer.avatar} alt="" />
                            ) : (
                              <span>
                                {dispute.hirer.firstName?.[0]}
                                {dispute.hirer.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={styles.partyName}>
                              {dispute.hirer.firstName} {dispute.hirer.lastName}
                            </p>
                            <p className={styles.partyRole}>
                              <FaUser /> Hirer
                            </p>
                          </div>
                        </div>
                      )}
                      {dispute.worker && (
                        <div className={styles.partyChip}>
                          <div className={styles.partyAvatar}>
                            {dispute.worker.avatar ? (
                              <img src={dispute.worker.avatar} alt="" />
                            ) : (
                              <span>
                                {dispute.worker.firstName?.[0]}
                                {dispute.worker.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={styles.partyName}>
                              {dispute.worker.firstName}{" "}
                              {dispute.worker.lastName}
                            </p>
                            <p className={styles.partyRole}>
                              <FaUser /> Worker
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment info */}
                    {dispute.payments && dispute.payments.length > 0 && (
                      <div className={styles.paymentInfo}>
                        <p className={styles.sectionLabel}>
                          <FaMoneyBillWave /> Payment
                        </p>
                        <div className={styles.detailGrid}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Status</span>
                            <span className={styles.detailValue}>
                              {dispute.payments[0].status}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Amount</span>
                            <span className={styles.detailValue}>
                              {formatCurrency(
                                dispute.payments[0].amount,
                                dispute.payments[0].currency,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className={styles.cardActions}>
                      {dispute.status === "DISPUTED" && (
                        <button
                          className={styles.cancelDisputeBtn}
                          disabled={cancelling === dispute.id}
                          onClick={() => openCancelModal(dispute.id)}
                        >
                          {cancelling === dispute.id ? (
                            <>
                              <FaSpinner className={styles.spinner} />{" "}
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <FaTrash /> Cancel Dispute
                            </>
                          )}
                        </button>
                      )}
                      <Link
                        to={`/bookings/${dispute.id}`}
                        className={styles.viewBookingBtn}
                      >
                        <FaEye /> View Booking →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
        title="Cancel Dispute"
        message="Are you sure you want to cancel this dispute? This action cannot be undone."
      />

      {/* ── Image Lightbox Modal ── */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </Layout>
  );
}
