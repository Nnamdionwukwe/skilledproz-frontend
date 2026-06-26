import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import HirerLayout from "../../layout/HirerLayout";
import WorkerLayout from "../../layout/WorkerLayout";
import RaiseDisputeModal from "../../disputes/RaiseDisputeModal";
import BookingDetailPayment from "./BookingDetailPayment";
import BookingDetailMain from "./BookingDetailMain";
import BookingDetailSidebar from "./BookingDetailSidebar";
import { calcPricing } from "../../utils/pricing";
import WorkerPaymentPreview from "./WorkerPaymentPreview";

// ── Helpers (unchanged) ──────────────────────────────────────────────
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
      years: "year",
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

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};

// ── Inlined components ──────────────────────────────────────────────
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

function Skeleton() {
  return (
    <>
      <div className={styles.skBack} />
      <div className={styles.layout}>
        <div className={styles.skMain} />
        <div className={styles.skSide} />
      </div>
    </>
  );
}

function NotFound({ backTo = "/bookings" }) {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>🔍</span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link to={backTo} className={styles.back}>
          ← Back to Bookings
        </Link>
      </div>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showPayOptions, setShowPayOptions] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // ── Referral wallet state ──
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  const refetch = useCallback(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {});
  }, [id]);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);
        if (b.emergencyContact) {
          try {
            const ec =
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact;
            setEmergencyContact(ec);
          } catch {}
        }
        api
          .get(`/payments/${b.id}`)
          .then((pr) => setPayment(pr.data.data))
          .catch(() => {});
        if (b.status === "COMPLETED") {
          api
            .get(`/reviews/check/${id}`)
            .then((r) => setHasReviewed(r.data.data.hasReviewed))
            .catch(() => setHasReviewed(false))
            .finally(() => setReviewCheckDone(true));
        } else {
          setReviewCheckDone(true);
        }

        // ── Fetch referral wallet balance ──
        if (user?.role === "HIRER") {
          api
            .get("/referral/wallet")
            .then((res) => {
              const bal = res.data.data?.balance || 0;
              setWalletBalance(bal);
              // Reset slider when balance loads
              setReferralPercent(0);
              setReferralAmount(0);
              setReferralApplied(false);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  // ── Silent refresh ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(refetch, 600_000);
    return () => clearInterval(timer);
  }, [id, refetch]);

  // ── RECALCULATE REFERRAL AMOUNT WHEN PERCENT, BALANCE, OR BOOKING CHANGES ──
  // Moved to the top level (before any early returns) to keep hook order stable.
  useEffect(() => {
    // Only run if we have a booking
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    // Update the amount, but do NOT auto‑apply here – that's handled in the slider change
    setReferralAmount(final);
    // Optionally, auto‑apply can be set here if you want, but we'll keep it separate
    // to respect manual toggle.
  }, [referralPercent, walletBalance, booking]);

  // ── Status update ────────────────────────────────────────────────────
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

  // ── SOS resolve ──────────────────────────────────────────────────────
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

  // ── Refund ───────────────────────────────────────────────────────────
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

  // ── Invoice ──────────────────────────────────────────────────────────
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

  // ── Guards ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  if (!booking) return <NotFound backTo="/bookings" />;

  // ── Derived data ─────────────────────────────────────────────────────
  const meta = STATUS_META[booking.status] || {};
  const step = meta.step ?? 0;
  const isHirer = userId === booking.hirerId;
  const isWorker = userId === booking.workerId;
  const other = isHirer ? booking.worker : booking.hirer;
  const dur = formatDuration(booking);
  const sosActive = !!booking.sosActivatedAt && !booking.sosResolvedAt;

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

  // ── Use calcPricing for consistent breakdown ──────────────────────
  const p = calcPricing(booking);
  const feeBreakdown = {
    label: "Payment Breakdown",
    subtotal: p.subtotal,
    total: p.grossTotal,
    platformFee: p.hirerFee,
    workerPayout: p.workerPayout,
    currency: p.currency,
    isActual: false,
    agreedRate: p.agreedRate,
    estimatedUnit: p.unit,
    hasQty: p.hasQty,
    qty: p.qty,
    unitLabel: p.unitLabel,
    suffix: p.unitSuffix,
    noDuration: !p.hasQty,
  };

  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking.status) &&
    (!payment || payment.status === "PENDING");

  // ── Handlers for referral slider ──────────────────────────────────
  const handlePercentChange = (pct) => {
    // Immediately compute the discount for responsiveness
    const subtotal = feeBreakdown.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (pct / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    setReferralPercent(pct);
    setReferralAmount(final);
    // Auto‑apply if final > 0, otherwise remove discount
    setReferralApplied(final > 0);
  };

  const handleReferralToggle = () => {
    setReferralApplied((prev) => !prev);
  };

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
          <div className={styles.main}>
            <BookingDetailMain
              booking={booking}
              step={step}
              dur={dur}
              mapsUrl={mapsUrl}
              calcDuration={calcDuration}
              hasCheckInGps={hasCheckInGps}
              hasCheckOutGps={hasCheckOutGps}
              checkInDistKm={checkInDistKm}
              checkOutDistKm={checkOutDistKm}
              reviewCheckDone={reviewCheckDone}
              hasReviewed={hasReviewed}
              bookingId={booking.id}
              invoiceLoading={invoiceLoading}
              onDownloadInvoice={handleDownloadInvoice}
              onRefund={handleRefund}
              refundLoading={refundLoading}
              isHirer={isHirer}
              paymentStatus={payment?.status}
              isWorker={isWorker}
              workerName={booking.worker?.firstName}
            />

            {isWorker && booking.status === "PENDING" && (
              <WorkerPaymentPreview booking={booking} />
            )}

            {booking.payment && (
              <BookingDetailPayment
                booking={booking}
                payment={booking.payment}
                feeBreakdown={feeBreakdown}
                walletBalance={walletBalance}
                referralAmount={referralAmount}
                referralApplied={referralApplied}
                referralPercent={referralPercent}
                onPercentChange={handlePercentChange}
                onReferralToggle={handleReferralToggle}
                showPayOptions={showPayOptions}
                onTogglePayOptions={() => setShowPayOptions((v) => !v)}
                paymentRequired={paymentRequired}
                refetch={refetch}
                onSuccess={setSuccess}
              />
            )}
          </div>

          <div className={styles.sidebar}>
            {paymentRequired && (
              <BookingDetailPayment
                booking={booking}
                payment={payment}
                feeBreakdown={feeBreakdown}
                walletBalance={walletBalance}
                referralAmount={referralAmount}
                referralApplied={referralApplied}
                referralPercent={referralPercent}
                onPercentChange={handlePercentChange}
                onReferralToggle={handleReferralToggle}
                showPayOptions={showPayOptions}
                onTogglePayOptions={() => setShowPayOptions((v) => !v)}
                paymentRequired={paymentRequired}
                refetch={refetch}
                onSuccess={setSuccess}
              />
            )}

            <BookingDetailSidebar
              booking={booking}
              payment={payment}
              isHirer={isHirer}
              isWorker={isWorker}
              other={other}
              userId={userId}
              acting={acting}
              emergencyContact={emergencyContact}
              showCancel={showCancel}
              cancelReason={cancelReason}
              cancelError={cancelError}
              onCancelOpen={() => {
                setShowCancel(true);
                setCancelError("");
              }}
              onCancelClose={() => {
                setShowCancel(false);
                setCancelReason("");
                setCancelError("");
              }}
              onCancelReasonChange={(v) => {
                setCancelReason(v);
                setCancelError("");
              }}
              onCancelSubmit={handleCancelSubmit}
              onShowDispute={() => setShowDispute(true)}
              onSuccess={setSuccess}
              refetch={refetch}
              updateStatus={updateStatus}
            />
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
