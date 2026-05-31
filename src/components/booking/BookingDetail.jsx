import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import RaiseDisputeModal from "../disputes/RaiseDisputeModal";
import BookingInvoice from "./BookingInvoice";
import GpsCheckIn from "./GpsCheckIn";
import Translator from "../common/Translator";
import InsuranceAddon from "../hirer/InsuranceAddon";
import SOSButton from "./SOSButton";
import EmergencyContact from "./EmergencyContact";
import PaymentOptions from "../payment/PaymentOptions";
import VideoCallButton from "./VideoCallButton";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};
const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatDuration(booking) {
  if (!booking) return null;
  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue || null;
  const hours = booking.estimatedHours || null;
  if (!value && !hours) return null;
  if (value) {
    if (unit === "custom") return { main: value, sub: null };
    const unitLabel = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
    }[unit];
    const num = parseFloat(value);
    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }
  return hours ? { main: `${hours} hours`, sub: null } : null;
}

function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Core state
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Review state
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);

  // UI toggles
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showPayOptions, setShowPayOptions] = useState(false); // ← new: inline payment options
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Emergency contact
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  // Referral perk
  const [referralDiscount, setReferralDiscount] = useState(null);
  const [referralApplied, setReferralApplied] = useState(false);

  // Action loading flags
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  // ── refetch ─────────────────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {});
  }, [id]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);

        // Parse stored emergency contact JSON
        if (b.emergencyContact) {
          try {
            const ec =
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact;
            setEmergencyContact(ec);
          } catch {}
        }

        // Load payment record
        api
          .get(`/payments/${b.id}`)
          .then((pr) => setPayment(pr.data.data))
          .catch(() => {});

        // Check review status on completed bookings
        if (b.status === "COMPLETED") {
          api
            .get(`/reviews/check/${id}`)
            .then((r) => setHasReviewed(r.data.data.hasReviewed))
            .catch(() => setHasReviewed(false))
            .finally(() => setReviewCheckDone(true));
        } else {
          setReviewCheckDone(true);
        }

        // Referral perk for hirers who haven't paid yet
        if (user?.role === "HIRER" && !b.payment) {
          api
            .get("/referral/dashboard")
            .then((rd) => {
              const data = rd.data.data;
              // Only show if the hirer was referred (has a code from someone else)
              // Backend applies 5% up to ₦2,500 on first booking for referred hirers
              if (data?.code) {
                const raw = (b.agreedRate || 0) * 0.05;
                const discount = Math.min(raw, 2500);
                if (discount > 0) {
                  setReferralDiscount({
                    discount,
                    finalAmount: (b.agreedRate || 0) - discount,
                  });
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // ── Silent refresh every 10 min ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(refetch, 600_000);
    return () => clearInterval(timer);
  }, [id, refetch]);

  // ── Status update ────────────────────────────────────────────────────────────
  async function updateStatus(status, extra = {}) {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/bookings/${id}/status`, {
        status,
        ...extra,
      });
      setBooking(res.data.data.booking);
      setSuccess(
        `Booking ${status.toLowerCase().replace("_", " ")} successfully.`,
      );
      setShowCancel(false);
      setCancelReason("");
      setCancelError("");
    } catch (e) {
      setError(e.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setActing(false);
    }
  }

  function handleCancelSubmit() {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason.");
      return;
    }
    updateStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  }

  // ── SOS resolve ──────────────────────────────────────────────────────────────
  const handleResolveSOS = async () => {
    if (!confirm("Mark this SOS as resolved?")) return;
    setResolvingSOS(true);
    try {
      await api.patch(`/bookings/${booking.id}/sos/resolve`);
      setSuccess("SOS marked as resolved.");
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resolve SOS");
    } finally {
      setResolvingSOS(false);
    }
  };

  // ── Refund ───────────────────────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!confirm("Issue a full refund? This cannot be undone.")) return;
    setRefundLoading(true);
    try {
      await api.post(`/payments/refund/${booking.id}`);
      setSuccess("Refund processed successfully.");
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || "Refund failed");
    } finally {
      setRefundLoading(false);
    }
  };

  // ── Invoice download ─────────────────────────────────────────────────────────
  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const res = await api.get(`/payments/invoice/${booking.id}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${booking.id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton Layout={Layout} />;
  if (!booking) return <NotFound />;

  // ── Derived values (safe — booking is non-null below here) ───────────────────
  const meta = STATUS_META[booking.status] || {};
  const step = meta.step ?? 0;
  const isHirer = userId === booking.hirerId;
  const isWorker = userId === booking.workerId;
  const other = isHirer ? booking.worker : booking.hirer;
  const dur = formatDuration(booking);

  // Is SOS active right now?
  const sosActive = !!booking.sosActivatedAt && !booking.sosResolvedAt;

  // GPS presence
  const hasCheckInGps =
    booking.checkInLat != null && booking.checkInLng != null;
  const hasCheckOutGps =
    booking.checkOutLat != null && booking.checkOutLng != null;

  const checkInDistKm =
    hasCheckInGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkInLat,
          booking.checkInLng,
          booking.latitude,
          booking.longitude,
        )
      : null;
  const checkOutDistKm =
    hasCheckOutGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkOutLat,
          booking.checkOutLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  // ── Estimated total (what the hirer will pay) ─────────────────────────────────
  // If payment exists, show the actual charged amount.
  // If not, estimate from rate × duration. Include platform fee when available.
  const feeBreakdown = (() => {
    // ── Actual payment exists — show real figures ──────────────────────────
    if (payment?.amount) {
      return {
        label: "Payment breakdown",
        subtotal: payment.amount - (payment.platformFee || 0),
        total: payment.amount,
        platformFee: payment.platformFee ?? null,
        workerPayout: payment.workerPayout ?? null,
        currency: payment.currency || booking.currency,
        isActual: true,
      };
    }

    // ── No payment yet — need at least an agreed rate ──────────────────────
    const rate = booking.agreedRate;
    if (!rate) return null;

    const unit = booking.estimatedUnit;
    const value = booking.estimatedValue;

    if (value && unit && unit !== "custom") {
      // Has duration → show full estimate
      const num = parseFloat(value);
      const subtotal = num * rate;
      const suffix =
        { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[unit] || "";
      return {
        label: `Est. total (${num} ${unit} × ${booking.currency} ${rate.toLocaleString()}${suffix})`,
        subtotal,
        total: subtotal,
        platformFee: null,
        workerPayout: null,
        currency: booking.currency,
        isActual: false,
      };
    }

    // ── No duration set — show agreed rate + fee estimate ──────────────────
    // This covers ACCEPTED bookings where only agreedRate is known
    return {
      label: "Based on agreed rate",
      subtotal: rate,
      total: rate,
      platformFee: null,
      workerPayout: null,
      currency: booking.currency,
      isActual: false,
      noDuration: true, // flag to adjust label in the card
    };
  })();

  // Payment needs action (no payment yet or payment stuck on PENDING)
  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking.status) &&
    (!payment || payment.status === "PENDING");

  return (
    <Layout>
      <div className={styles.page}>
        <Link to="/bookings" className={styles.back}>
          ← Back to Bookings
        </Link>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        {/* ── SOS banner — full width, always at top when active ── */}
        {sosActive && (
          <div className={styles.sosBanner}>
            <span className={styles.sosBannerIcon}>🆘</span>
            <div className={styles.sosBannerBody}>
              <p className={styles.sosBannerTitle}>SOS Alert Active</p>
              <p className={styles.sosBannerDesc}>
                The worker has triggered an emergency alert.
                {booking.sosActivatedAt && (
                  <>
                    {" "}
                    Activated{" "}
                    {new Date(booking.sosActivatedAt).toLocaleTimeString()}
                  </>
                )}
              </p>
            </div>
            {(isHirer || user?.role === "ADMIN") && (
              <button
                className={styles.sosResolveBtn}
                onClick={handleResolveSOS}
                disabled={resolvingSOS}
              >
                {resolvingSOS ? "Resolving…" : "Mark Resolved"}
              </button>
            )}
          </div>
        )}

        <div className={styles.layout}>
          {/* ════════════════════════════════════════
              MAIN COLUMN
          ════════════════════════════════════════ */}
          <div className={styles.main}>
            {/* ── Title + badge ── */}
            <div className={styles.titleBlock}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{booking.title}</h1>
                <span
                  className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}
                >
                  {meta.label}
                </span>
              </div>
              {booking.category && (
                <span className={styles.categoryPill}>
                  {booking.category.name}
                </span>
              )}
              {booking.isNegotiated && (
                <span className={styles.negotiatedPill}>
                  💬 Negotiated rate
                </span>
              )}
            </div>

            {/* ── Timeline ── */}
            {step >= 0 && (
              <div className={styles.timelineWrap}>
                <div className={styles.timeline}>
                  {TIMELINE_STEPS.map((s, i) => (
                    <div key={s} className={styles.timelineItem}>
                      <div
                        className={`${styles.timelineDot} ${i <= step ? styles.timelineDotActive : ""} ${i === step ? styles.timelineDotCurrent : ""}`}
                      >
                        {i < step ? "✓" : i + 1}
                      </div>
                      <span
                        className={`${styles.timelineLabel} ${i <= step ? styles.timelineLabelActive : ""}`}
                      >
                        {s}
                      </span>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`${styles.timelineLine} ${i < step ? styles.timelineLineActive : ""}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {booking.status === "PENDING" && isHirer && (
              <div className={styles.pendingBanner}>
                <div className={styles.pendingBannerPulse}>
                  <span className={styles.pendingBannerDot} />
                </div>
                <div className={styles.pendingBannerBody}>
                  <p className={styles.pendingBannerTitle}>
                    ⏳ Waiting for {booking.worker?.firstName} to respond
                  </p>
                  <p className={styles.pendingBannerDesc}>
                    Your booking request has been sent.{" "}
                    {booking.worker?.firstName} hasn't accepted yet — you'll be
                    notified the moment they do. You can cancel for free until
                    they accept.
                  </p>
                </div>
              </div>
            )}

            {/* ── Description ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <Translator text={booking.description} />
              {booking.notes && (
                <div className={styles.notes}>
                  <span className={styles.notesIcon}>📝</span>
                  <p>{booking.notes}</p>
                </div>
              )}
            </section>

            {/* ── Job details ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Job Details</h2>
              <div className={styles.detailGrid}>
                {/* Scheduled date */}
                <DetailItem
                  icon="📅"
                  label="Scheduled"
                  value={
                    new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) +
                    " at " +
                    new Date(booking.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                />

                {/* Address */}
                {booking.address && (
                  <DetailItem
                    icon="📍"
                    label="Job Site Address"
                    value={
                      <>
                        {booking.address}
                        {booking.latitude && booking.longitude && (
                          <a
                            href={mapsUrl(booking.latitude, booking.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.mapLink}
                          >
                            {" "}
                            View map ↗
                          </a>
                        )}
                      </>
                    }
                  />
                )}

                {/* Agreed rate */}
                <DetailItem
                  icon="💰"
                  label="Agreed Rate"
                  value={`${booking.currency} ${booking.agreedRate?.toLocaleString()}`}
                  accent
                />

                {/* Negotiation note */}
                {booking.isNegotiated && booking.negotiationNote && (
                  <DetailItem
                    icon="💬"
                    label="Negotiation Note"
                    value={booking.negotiationNote}
                  />
                )}

                {/* Estimated duration */}
                {dur && (
                  <DetailItem
                    icon="⏱️"
                    label="Est. Duration"
                    value={
                      <>
                        {dur.main}
                        {dur.sub && (
                          <span className={styles.durationSub}> {dur.sub}</span>
                        )}
                      </>
                    }
                  />
                )}

                {/* Check-in time */}
                {booking.checkInAt && (
                  <DetailItem
                    icon="✅"
                    label="Checked In"
                    value={
                      <span className={styles.greenText}>
                        {new Date(booking.checkInAt).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    }
                  />
                )}

                {/* Check-out time */}
                {booking.checkOutAt && (
                  <DetailItem
                    icon="🏁"
                    label="Checked Out"
                    value={new Date(booking.checkOutAt).toLocaleString(
                      "en-NG",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      },
                    )}
                  />
                )}

                {/* Actual duration */}
                {booking.checkInAt && booking.checkOutAt && (
                  <DetailItem
                    icon="🕐"
                    label="Actual Duration"
                    value={calcDuration(booking.checkInAt, booking.checkOutAt)}
                  />
                )}

                {/* Insurance */}
                {booking.insurancePolicyNumber && (
                  <DetailItem
                    icon="🛡️"
                    label="Insurance"
                    value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insurancePolicyNumber}`}
                  />
                )}

                {/* Job Type */}
                {booking.jobType && (
                  <DetailItem
                    icon={
                      booking.jobType === "FULL_TIME"
                        ? "💼"
                        : booking.jobType === "PART_TIME"
                          ? "⏰"
                          : booking.jobType === "CONTRACT"
                            ? "📄"
                            : "⏳"
                    }
                    label="Job Type"
                    value={
                      booking.jobType === "FULL_TIME"
                        ? "Full-time"
                        : booking.jobType === "PART_TIME"
                          ? "Part-time"
                          : booking.jobType === "CONTRACT"
                            ? "Contract"
                            : "Temporary"
                    }
                  />
                )}

                {/* Location Type */}
                {booking.locationType && (
                  <DetailItem
                    icon={
                      booking.locationType === "REMOTE"
                        ? "🌐"
                        : booking.locationType === "ON_SITE"
                          ? "📍"
                          : "🔀"
                    }
                    label="Location Type"
                    value={
                      booking.locationType === "REMOTE"
                        ? "Remote"
                        : booking.locationType === "ON_SITE"
                          ? "On-site"
                          : "Hybrid"
                    }
                  />
                )}
              </div>

              {(booking.jobType || booking.locationType) && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    Job Type &amp; Location
                  </h2>

                  {/* Job Type */}
                  {booking.jobType &&
                    (() => {
                      const JOB_TYPES = {
                        FULL_TIME: {
                          icon: "💼",
                          label: "Full-time",
                          desc: "Regular full-time engagement",
                        },
                        PART_TIME: {
                          icon: "⏰",
                          label: "Part-time",
                          desc: "Part-time hours, flexible schedule",
                        },
                        CONTRACT: {
                          icon: "📄",
                          label: "Contract",
                          desc: "Fixed-term contract engagement",
                        },
                        TEMPORARY: {
                          icon: "⏳",
                          label: "Temporary",
                          desc: "Short-term / one-off engagement",
                        },
                      };
                      const jt = JOB_TYPES[booking.jobType] || {
                        icon: "💼",
                        label: booking.jobType,
                        desc: "",
                      };
                      return (
                        <div className={styles.typeCardGroup}>
                          <p className={styles.typeCardGroupLabel}>Job Type</p>
                          <div className={styles.typeCards}>
                            {Object.entries(JOB_TYPES).map(([key, cfg]) => (
                              <div
                                key={key}
                                className={`${styles.typeCard} ${booking.jobType === key ? styles.typeCardActive : styles.typeCardInactive}`}
                              >
                                {booking.jobType === key && (
                                  <span
                                    className={styles.typeCardSelectedDot}
                                  />
                                )}
                                <span className={styles.typeCardIcon}>
                                  {cfg.icon}
                                </span>
                                <span className={styles.typeCardLabel}>
                                  {cfg.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Location Type */}
                  {booking.locationType &&
                    (() => {
                      const LOC_TYPES = {
                        REMOTE: {
                          icon: "🌐",
                          label: "Remote",
                          desc: "Worker operates from their own location",
                        },
                        ON_SITE: {
                          icon: "📍",
                          label: "On-site",
                          desc: "Worker must be present at the job site",
                        },
                        HYBRID: {
                          icon: "🔀",
                          label: "Hybrid",
                          desc: "Mix of on-site and remote work",
                        },
                      };
                      const lt = LOC_TYPES[booking.locationType] || {
                        icon: "📍",
                        label: booking.locationType,
                        desc: "",
                      };
                      return (
                        <div
                          className={styles.typeCardGroup}
                          style={{ marginTop: "1.25rem" }}
                        >
                          <p className={styles.typeCardGroupLabel}>
                            Location Type
                          </p>
                          <div className={styles.typeCards}>
                            {Object.entries(LOC_TYPES).map(([key, cfg]) => (
                              <div
                                key={key}
                                className={`${styles.typeCard} ${styles.typeCardLoc} ${booking.locationType === key ? styles.typeCardActive : styles.typeCardInactive}`}
                              >
                                {booking.locationType === key && (
                                  <span
                                    className={styles.typeCardSelectedDot}
                                  />
                                )}
                                <span className={styles.typeCardIcon}>
                                  {cfg.icon}
                                </span>
                                <span className={styles.typeCardLabel}>
                                  {cfg.label}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Remote note */}
                          {booking.locationType === "REMOTE" && (
                            <div className={styles.locationRemoteNote}>
                              🌐 This is a remote engagement — no physical job
                              site attendance required.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </section>
              )}

              {/* ── Fee breakdown / estimated total ── */}
              {feeBreakdown && (
                <div className={styles.feeBreakdown}>
                  <p className={styles.feeBreakdownLabel}>
                    {feeBreakdown.isActual
                      ? "Payment breakdown"
                      : feeBreakdown.noDuration
                        ? "Est. Total (agreed rate × 5% platform fee)"
                        : feeBreakdown.label}
                  </p>

                  {feeBreakdown.platformFee != null ? (
                    <>
                      <div className={styles.feeRow}>
                        <span>Subtotal</span>
                        <span>
                          {feeBreakdown.currency}{" "}
                          {(
                            feeBreakdown.total - feeBreakdown.platformFee
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.feeRow}>
                        <span>Platform fee (5%)</span>
                        <span>
                          {feeBreakdown.currency}{" "}
                          {feeBreakdown.platformFee.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : !feeBreakdown.isActual ? (
                    <>
                      {/* Estimated — compute 5% fee inline */}
                      <div className={styles.feeRow}>
                        <span>
                          Agreed rate
                          {feeBreakdown.noDuration ? "" : " (job value)"}
                        </span>
                        <span>
                          {feeBreakdown.currency}{" "}
                          {feeBreakdown.subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.feeRow}>
                        <span>Platform fee (5%)</span>
                        <span>
                          {feeBreakdown.currency}{" "}
                          {(feeBreakdown.total * 0.05).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 2 },
                          )}
                        </span>
                      </div>
                    </>
                  ) : null}

                  {feeBreakdown.workerPayout != null && (
                    <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
                      <span>Worker payout</span>
                      <span>
                        {feeBreakdown.currency}{" "}
                        {feeBreakdown.workerPayout.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Referral discount row — only when applied */}
                  {referralDiscount &&
                    referralApplied &&
                    booking.currency === "NGN" && (
                      <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
                        <span>🎁 Referral bonus</span>
                        <span>
                          − ₦{referralDiscount.discount.toLocaleString()}
                        </span>
                      </div>
                    )}

                  <div className={styles.feeTotal}>
                    <span>
                      {feeBreakdown.isActual ? "Total Paid" : "Est. Total"}
                    </span>
                    <span className={styles.feeTotalAmount}>
                      {feeBreakdown.currency}{" "}
                      {feeBreakdown.isActual
                        ? feeBreakdown.total.toLocaleString()
                        : (() => {
                            const withFee =
                              feeBreakdown.total + feeBreakdown.total * 0.05;
                            const discount =
                              referralApplied &&
                              referralDiscount &&
                              booking.currency === "NGN"
                                ? referralDiscount.discount
                                : 0;
                            return Math.max(
                              0,
                              withFee - discount,
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            });
                          })()}
                    </span>
                  </div>

                  {/* Referral bonus apply section */}
                  {referralDiscount && !feeBreakdown.isActual && (
                    <div className={styles.referralPerk}>
                      {booking.currency !== "NGN" ? (
                        <p>
                          🎁 You have a referral bonus — only applicable to ₦
                          NGN payments.
                        </p>
                      ) : referralApplied ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span>
                            ✅ Referral bonus applied — saving ₦
                            {referralDiscount.discount.toLocaleString()}
                          </span>
                          <button
                            onClick={() => setReferralApplied(false)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--green)",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span>
                            🎁 You have a ₦
                            {referralDiscount.discount.toLocaleString()}{" "}
                            referral bonus available
                          </span>
                          <button
                            onClick={() => setReferralApplied(true)}
                            style={{
                              flexShrink: 0,
                              background: "var(--green)",
                              color: "#000",
                              border: "none",
                              borderRadius: 8,
                              padding: "5px 14px",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── GPS cards ── */}
            {(hasCheckInGps || hasCheckOutGps) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Worker Location</h2>
                <p className={styles.gpsNote}>
                  GPS recorded at check-in and check-out. Visible to both
                  parties.
                </p>
                <div className={styles.gpsCards}>
                  {hasCheckInGps && (
                    <GpsCard
                      title="Check-in Location"
                      dotColor="#16a34a"
                      timestamp={booking.checkInAt}
                      lat={booking.checkInLat}
                      lng={booking.checkInLng}
                      distKm={checkInDistKm}
                      cardClass={styles.gpsCardIn}
                    />
                  )}
                  {hasCheckOutGps && (
                    <GpsCard
                      title="Check-out Location"
                      dotColor="#dc2626"
                      timestamp={booking.checkOutAt}
                      lat={booking.checkOutLat}
                      lng={booking.checkOutLng}
                      distKm={checkOutDistKm}
                      cardClass={styles.gpsCardOut}
                    />
                  )}
                </div>
              </section>
            )}

            {/* ── Payment section ── */}
            {booking.payment && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Payment</h2>
                <div className={styles.paymentCard}>
                  <PayRow
                    label="Total"
                    value={`${booking.payment.currency} ${booking.payment.amount?.toLocaleString()}`}
                  />
                  <PayRow
                    label="Platform Fee"
                    value={`${booking.payment.currency} ${booking.payment.platformFee?.toLocaleString()}`}
                    muted
                  />
                  <PayRow
                    label="Worker Payout"
                    value={`${booking.payment.currency} ${booking.payment.workerPayout?.toLocaleString()}`}
                    green
                  />
                  <div className={styles.paymentDivider} />
                  <PayRow
                    label="Provider"
                    value={booking.payment.provider}
                    capitalize
                  />
                  <PayRow
                    label="Status"
                    extra={
                      <span
                        className={`${styles.payStatus} ${styles[`payStatus_${booking.payment.status?.toLowerCase()}`]}`}
                      >
                        {booking.payment.status}
                      </span>
                    }
                  />
                  {booking.payment.providerRef && (
                    <PayRow
                      label="Ref"
                      value={booking.payment.providerRef}
                      mono
                    />
                  )}
                </div>
              </section>
            )}

            {/* ── Reviews ── */}
            {booking.status === "COMPLETED" && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Reviews</h2>
                {booking.reviews?.length > 0 && (
                  <div className={styles.reviewsList}>
                    {booking.reviews.map((review) => (
                      <div key={review.id} className={styles.reviewCard}>
                        <div className={styles.reviewCardTop}>
                          <div className={styles.reviewerAvatar}>
                            {review.giver?.avatar ? (
                              <img src={review.giver.avatar} alt="" />
                            ) : (
                              <span>
                                {review.giver?.firstName?.[0]}
                                {review.giver?.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <div className={styles.reviewerInfo}>
                            <p className={styles.reviewerName}>
                              {review.giver?.firstName} {review.giver?.lastName}
                              <span className={styles.reviewerRole}>
                                {" "}
                                ·{" "}
                                {review.giver?.role === "HIRER"
                                  ? "Hirer"
                                  : "Worker"}
                              </span>
                            </p>
                            <p className={styles.reviewDate}>
                              {new Date(review.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <div className={styles.stars}>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < review.rating
                                    ? styles.starFilled
                                    : styles.starEmpty
                                }
                              >
                                ★
                              </span>
                            ))}
                            <span className={styles.ratingNum}>
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className={styles.reviewComment}>
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {reviewCheckDone && !hasReviewed && (
                  <Link
                    to={`/bookings/${booking.id}/review`}
                    className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
                    style={{ display: "inline-flex", marginTop: "1rem" }}
                  >
                    ⭐ Leave a Review
                  </Link>
                )}
                {reviewCheckDone && hasReviewed && (
                  <div className={styles.reviewedNote}>
                    ✅ Your review has been submitted.
                    {(booking.reviews?.length ?? 0) < 2 &&
                      " Waiting for the other party."}
                  </div>
                )}
              </section>
            )}

            {/* ── Cancellation reason ── */}
            {booking.cancelReason && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Cancellation Reason</h2>
                <div className={styles.cancelReasonCard}>
                  <span className={styles.cancelReasonIcon}>⚠️</span>
                  <p className={styles.cancelReasonText}>
                    {booking.cancelReason}
                  </p>
                </div>
              </section>
            )}

            {/* ── Bottom action row: invoice + refund ── */}
            {booking.status === "COMPLETED" && (
              <div className={styles.bottomActions}>
                <button
                  className={styles.invoiceBtn}
                  onClick={handleDownloadInvoice}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? "⏳" : "📄"} Download Invoice
                </button>
                {isHirer && payment?.status === "RELEASED" && (
                  <button
                    className={styles.refundBtn}
                    onClick={handleRefund}
                    disabled={refundLoading}
                  >
                    {refundLoading ? "Processing…" : "↩ Request Refund"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              SIDEBAR
          ════════════════════════════════════════ */}
          <div className={styles.sidebar}>
            {/* ── Payment required banner ── */}
            {paymentRequired && (
              <div className={styles.paymentBanner}>
                <div className={styles.paymentBannerHeader}>
                  <span className={styles.paymentBannerIcon}>💳</span>
                  <div>
                    <p className={styles.paymentBannerTitle}>
                      {payment?.status === "PENDING"
                        ? "Payment Pending"
                        : "Payment Required"}
                    </p>
                    <p className={styles.paymentBannerDesc}>
                      {payment?.status === "PENDING"
                        ? "Your previous payment is still processing. Try a different method below."
                        : "Secure the worker's slot — pay now to confirm."}
                    </p>
                  </div>
                </div>

                {referralDiscount && (
                  <div className={styles.paymentBannerPerk}>
                    🎁 <strong>Referral perk:</strong> ₦
                    {referralDiscount.discount.toLocaleString()} off your first
                    booking
                  </div>
                )}

                {referralDiscount && booking.currency === "NGN" && (
                  <div className={styles.paymentBannerPerk}>
                    {referralApplied ? (
                      <>
                        ✅ Referral bonus of ₦
                        {referralDiscount.discount.toLocaleString()} will be
                        deducted at checkout
                      </>
                    ) : (
                      <>
                        🎁 Apply your ₦
                        {referralDiscount.discount.toLocaleString()} referral
                        bonus in the fee breakdown above
                      </>
                    )}
                  </div>
                )}
                {referralDiscount && booking.currency !== "NGN" && (
                  <div
                    className={styles.paymentBannerPerk}
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ℹ️ Referral bonus only applies to ₦ NGN payments
                  </div>
                )}

                <button
                  className={`${styles.payNowBtn} ${showPayOptions ? styles.payNowBtnActive : ""}`}
                  onClick={() => setShowPayOptions((v) => !v)}
                >
                  {showPayOptions
                    ? "▲ Hide Payment Options"
                    : payment?.status === "PENDING"
                      ? "⚡ Choose a Different Method"
                      : "💳 Pay Now"}
                </button>

                {showPayOptions && (
                  <div className={styles.paymentOptionsWrap}>
                    <Link
                      to={`/bookings/${booking.id}/pay`}
                      className={`${styles.actionBtn} ${styles.actionBtn_orange}`}
                    >
                      💳 Pay by Card
                    </Link>
                    <PaymentOptions
                      booking={booking}
                      referralDiscount={referralDiscount}
                      referralApplied={referralApplied}
                      onReferralToggle={() => setReferralApplied((v) => !v)}
                      onSuccess={() => {
                        setSuccess("Payment submitted successfully.");
                        setShowPayOptions(false);
                        refetch();
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Other party card ── */}
            <div className={styles.partyCard}>
              <p className={styles.partyLabel}>
                {isHirer ? "Worker" : "Hirer"}
              </p>
              <div className={styles.partyAvatar}>
                {other?.avatar ? (
                  <img src={other.avatar} alt="" />
                ) : (
                  <span>
                    {other?.firstName?.[0]}
                    {other?.lastName?.[0]}
                  </span>
                )}
              </div>
              <p className={styles.partyName}>
                {other?.firstName} {other?.lastName}
              </p>
              {other?.phone && (
                <a href={`tel:${other.phone}`} className={styles.partyPhone}>
                  📱 {other.phone}
                </a>
              )}
              <a
                href={`/messages?with=${other?.id}&booking=${booking.id}`}
                className={styles.messageBtn}
              >
                💬 Send Message
              </a>
            </div>

            {/* ── Actions card ── */}
            <div className={styles.actionsCard}>
              <p className={styles.actionsTitle}>Actions</p>

              {/* WORKER ACTIONS */}
              {isWorker && (
                <>
                  <EmergencyContact
                    bookingId={booking.id}
                    bookingStatus={booking.status}
                    isWorker={isWorker}
                    existing={emergencyContact}
                    onSaved={(contact) => setEmergencyContact(contact)}
                  />
                  <SOSButton
                    bookingId={booking.id}
                    bookingStatus={booking.status}
                    isWorker={isWorker}
                    sosActivatedAt={booking.sosActivatedAt}
                    sosResolvedAt={booking.sosResolvedAt}
                    onUpdate={(updated) =>
                      setBooking((prev) => ({ ...prev, ...updated }))
                    }
                  />
                  {booking.status === "PENDING" && (
                    <ActionBtn
                      label="Accept Booking"
                      color="green"
                      loading={acting}
                      onClick={() => updateStatus("ACCEPTED")}
                    />
                  )}
                  {/* Check-in: only when ACCEPTED + payment HELD */}
                  {booking.status === "ACCEPTED" &&
                    booking.payment?.status === "HELD" && (
                      <GpsCheckIn
                        bookingId={booking.id}
                        status={booking.status}
                        isWorker={isWorker}
                        jobLatitude={booking.latitude}
                        jobLongitude={booking.longitude}
                        onSuccess={(updated) => {
                          setBooking((prev) => ({ ...prev, ...updated }));
                          setSuccess(
                            updated.status === "IN_PROGRESS"
                              ? "✅ Checked in — job is now in progress."
                              : "✅ Checked out — job marked as completed.",
                          );
                        }}
                      />
                    )}
                  {/* Waiting message when payment not yet received */}
                  {booking.status === "ACCEPTED" &&
                    (!booking.payment ||
                      booking.payment.status === "PENDING") && (
                      <div className={styles.waitingPayment}>
                        ⏳ Waiting for hirer to complete payment before you can
                        check in.
                      </div>
                    )}
                  {/* Check-out */}
                  {booking.status === "IN_PROGRESS" && (
                    <GpsCheckIn
                      bookingId={booking.id}
                      status={booking.status}
                      isWorker={isWorker}
                      jobLatitude={booking.latitude}
                      jobLongitude={booking.longitude}
                      onSuccess={(updated) => {
                        setBooking((prev) => ({ ...prev, ...updated }));
                        setSuccess("✅ Checked out — job marked as completed.");
                      }}
                    />
                  )}
                  {["PENDING", "ACCEPTED"].includes(booking.status) && (
                    <CancelBox
                      label="Cancel Booking"
                      show={showCancel}
                      reason={cancelReason}
                      reasonError={cancelError}
                      acting={acting}
                      onOpen={() => {
                        setShowCancel(true);
                        setCancelError("");
                      }}
                      onClose={() => {
                        setShowCancel(false);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      onChangeReason={(v) => {
                        setCancelReason(v);
                        setCancelError("");
                      }}
                      onConfirm={handleCancelSubmit}
                    />
                  )}
                </>
              )}

              {/* HIRER ACTIONS */}
              {isHirer && (
                <>
                  {/* Show emergency contact if worker has set one */}
                  {emergencyContact?.name && (
                    <div className={styles.emergencyCard}>
                      <p className={styles.emergencyTitle}>
                        🚨 Worker's Emergency Contact
                      </p>
                      <div className={styles.emergencyRow}>
                        <span className={styles.emergencyLabel}>Name</span>
                        <span className={styles.emergencyValue}>
                          {emergencyContact.name}
                        </span>
                      </div>
                      <div className={styles.emergencyRow}>
                        <span className={styles.emergencyLabel}>Phone</span>
                        <a
                          href={`tel:${emergencyContact.phone}`}
                          className={styles.emergencyPhone}
                        >
                          📱 {emergencyContact.phone}
                        </a>
                      </div>
                      {emergencyContact.relationship && (
                        <div className={styles.emergencyRow}>
                          <span className={styles.emergencyLabel}>
                            Relation
                          </span>
                          <span className={styles.emergencyValue}>
                            {emergencyContact.relationship}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Insurance add-on */}
                  {booking.status === "ACCEPTED" && (
                    <InsuranceAddon
                      bookingId={booking.id}
                      booking={booking}
                      onPurchased={() => setSuccess("Insurance activated.")}
                    />
                  )}
                  {/* Release payment */}
                  {booking.payment?.status === "HELD" && (
                    <Link
                      to={`/bookings/${booking.id}/release`}
                      className={`${styles.actionBtn} ${styles.actionBtn_green}`}
                    >
                      💸 Release Payment
                    </Link>
                  )}
                  {["PENDING", "ACCEPTED"].includes(booking.status) && (
                    <CancelBox
                      label="Cancel Booking"
                      show={showCancel}
                      reason={cancelReason}
                      reasonError={cancelError}
                      acting={acting}
                      onOpen={() => {
                        setShowCancel(true);
                        setCancelError("");
                      }}
                      onClose={() => {
                        setShowCancel(false);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      onChangeReason={(v) => {
                        setCancelReason(v);
                        setCancelError("");
                      }}
                      onConfirm={handleCancelSubmit}
                    />
                  )}
                </>
              )}

              {/* VIDEO CALL — both roles */}
              {(isHirer || isWorker) && (
                <VideoCallButton
                  bookingId={booking.id}
                  bookingStatus={booking.status}
                  userId={userId}
                  hirerId={booking.hirerId}
                  workerId={booking.workerId}
                />
              )}

              {/* DISPUTE — both roles */}
              {(isHirer || isWorker) &&
                ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(
                  booking.status,
                ) && (
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtn_red}`}
                    onClick={() => setShowDispute(true)}
                  >
                    ⚠️ Raise a Dispute
                  </button>
                )}

              {!isHirer && !isWorker && (
                <p className={styles.noActions}>No actions available.</p>
              )}
            </div>

            {/* ── Invoice block ── */}
            {booking.status === "COMPLETED" && booking.payment && (
              <BookingInvoice booking={booking} />
            )}
          </div>
        </div>
      </div>

      {showDispute && (
        <RaiseDisputeModal
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() =>
            setSuccess(
              "Dispute raised. Our team will review within 24–48 hours.",
            )
          }
        />
      )}
    </Layout>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function GpsCard({ title, dotColor, timestamp, lat, lng, distKm, cardClass }) {
  return (
    <div className={`${styles.gpsCard} ${cardClass}`}>
      <div className={styles.gpsCardHeader}>
        <span className={styles.gpsCardDot} style={{ background: dotColor }} />
        <span className={styles.gpsCardTitle}>{title}</span>
        {timestamp && (
          <span className={styles.gpsCardTime}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            {new Date(timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div className={styles.gpsCoordRow}>
        <span className={styles.gpsCoordLabel}>Coordinates</span>
        <span className={styles.gpsCoordValue}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
      {distKm !== null && (
        <div
          className={`${styles.gpsDistRow} ${distKm > 1 ? styles.gpsDistFar : styles.gpsDistNear}`}
        >
          <span>{distKm < 0.1 ? "✅" : distKm > 1 ? "⚠️" : "📏"}</span>
          <span>
            {distKm < 0.1
              ? "Worker was at the job site"
              : `${distKm.toFixed(2)} km from job site`}
          </span>
        </div>
      )}
      <a
        href={mapsUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className={styles.gpsMapLink}
      >
        🗺️ View on Google Maps
      </a>
    </div>
  );
}

function DetailItem({ icon, label, value, accent }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <p className={styles.detailLabel}>{label}</p>
        <p
          className={`${styles.detailValue} ${accent ? styles.detailAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PayRow({ label, value, muted, green, capitalize, mono, extra }) {
  return (
    <div className={styles.paymentRow}>
      <span className={styles.payLabel}>{label}</span>
      {extra || (
        <span
          className={[
            styles.payValue,
            muted ? styles.payMuted : "",
            green ? styles.payGreen : "",
            capitalize ? styles.payCapitalize : "",
            mono ? styles.payRef : "",
          ].join(" ")}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function CancelBox({
  label,
  show,
  reason,
  reasonError,
  acting,
  onOpen,
  onClose,
  onChangeReason,
  onConfirm,
}) {
  if (!show) {
    return (
      <button
        className={`${styles.actionBtn} ${styles.actionBtn_redOutline}`}
        onClick={onOpen}
      >
        {label}
      </button>
    );
  }
  return (
    <div className={styles.cancelBox}>
      <p className={styles.cancelBoxTitle}>
        Reason <span className={styles.cancelRequired}>*</span>
      </p>
      <textarea
        className={`${styles.cancelInput} ${reasonError ? styles.cancelInputError : ""}`}
        placeholder="Please explain why you are cancelling…"
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        rows={3}
      />
      {reasonError && <p className={styles.cancelFieldError}>{reasonError}</p>}
      <div className={styles.cancelRow}>
        <button
          className={styles.cancelConfirm}
          disabled={acting}
          onClick={onConfirm}
        >
          {acting ? <Spinner /> : "Confirm Cancellation"}
        </button>
        <button className={styles.cancelAbort} onClick={onClose}>
          Keep Booking
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${styles[`actionBtn_${color}`]}`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : label}
    </button>
  );
}

function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}

function DetailSkeleton({ Layout }) {
  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.skBack} />
        <div className={styles.layout}>
          <div className={styles.skMain} />
          <div className={styles.skSide} />
        </div>
      </div>
    </Layout>
  );
}

function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>🔍</span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link to="/bookings" className={styles.back}>
          ← Back to Bookings
        </Link>
      </div>
    </div>
  );
}
