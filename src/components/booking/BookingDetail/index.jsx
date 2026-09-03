import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
import ConfirmationModal from "../../context/ConfirmationModal";
import { RefundRequest, RefundStatus, RefundHistory } from "../Refund";
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";

// ── Helpers ──────────────────────────────────────────────────────────────
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
  const value = booking.estimatedValue;
  const hours = booking.estimatedHours;
  const quantity = booking.quantity || 1;

  if (!value && !hours) return null;

  if (unit === "custom") {
    const quantityNum = booking.quantity || 1;
    const customLabel = booking.customLabel || "Custom";
    return {
      main: `${quantityNum} ${customLabel}`,
      sub: null,
      unit: "custom",
      label: `${quantityNum} ${customLabel}`,
    };
  }

  if (value) {
    const unitMap = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
    };

    const unitLabel = unitMap[unit] || unit;
    const num = parseFloat(value);

    if (isNaN(num) || num <= 0) {
      return {
        main: value,
        sub: null,
        unit: unit,
        label: `${value} ${unit}`,
      };
    }

    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;

    return {
      main: `${num} ${label}`,
      sub: eqv,
      unit: unit,
      label: `${num} ${label}`,
    };
  }

  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) {
      return {
        main: `${hours} hours`,
        sub: null,
        unit: "hours",
        label: `${hours} hours`,
      };
    }
    return {
      main: `${num} hours`,
      sub: null,
      unit: "hours",
      label: `${num} hours`,
    };
  }

  return null;
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
        <span className={styles.notFoundIcon}>
          <FaExclamationCircle size={48} />
        </span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link to={backTo} className={styles.back}>
          <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Bookings
        </Link>
      </div>
    </div>
  );
}

function Toast({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`}>
      <span className={styles.toastIcon}>
        {isError ? (
          <FaExclamationTriangle size={18} />
        ) : (
          <FaCheckCircle size={18} />
        )}
      </span>
      <span className={styles.toastMessage}>{message}</span>
      <button className={styles.toastClose} onClick={onClose}>
        <FaTimes size={16} />
      </button>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showToast, setShowToast] = useState(false);
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
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);

  // ── Refund state ──
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  // ── Referral wallet state ──
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  const showToastMessage = (type, message) => {
    setToast({ type, message });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

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

        if (user?.role === "HIRER") {
          api
            .get("/referral/wallet")
            .then((res) => {
              const bal = res.data.data?.balance || 0;
              setWalletBalance(bal);
              setReferralPercent(0);
              setReferralAmount(0);
              setReferralApplied(false);
            })
            .catch(() => {});
        }

        // ── Fetch refunds for this booking ──
        setRefundsLoading(true);
        api
          .get(`/refunds/my?bookingId=${id}`)
          .then((res) => {
            setRefunds(res.data.data?.refunds || []);
          })
          .catch(() => {
            setRefunds([]);
          })
          .finally(() => {
            setRefundsLoading(false);
          });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  // ── Silent refresh ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(refetch, 600000);
    return () => clearInterval(timer);
  }, [id, refetch]);

  // ── Recalculate referral amount ──────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    setReferralAmount(final);
  }, [referralPercent, walletBalance, booking]);

  // ── Status update ────────────────────────────────────────────────────
  async function updateStatus(status, extra = {}) {
    setActing(true);
    try {
      const res = await api.patch(`/bookings/${id}/status`, {
        status,
        ...extra,
      });
      setBooking(res.data.data.booking);
      showToastMessage(
        "success",
        `Booking ${status.toLowerCase().replace("_", " ")} successfully.`,
      );
      setShowCancel(false);
      setCancelReason("");
      setCancelError("");
    } catch (e) {
      showToastMessage(
        "error",
        e.response?.data?.message || "Action failed. Please try again.",
      );
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
    setResolvingSOS(true);
    try {
      await api.patch(`/bookings/${booking.id}/sos/resolve`);
      showToastMessage("success", "SOS marked as resolved.");
      refetch();
    } catch (err) {
      showToastMessage(
        "error",
        err.response?.data?.message || "Failed to resolve SOS",
      );
    } finally {
      setResolvingSOS(false);
      setShowSOSConfirm(false);
    }
  };

  // ── Refund handlers ───────────────────────────────────────────────────
  const handleRefundRequest = async (refundData) => {
    setRefundLoading(true);
    try {
      const response = await api.post("/refunds/request", refundData);
      showToastMessage("success", "Refund request submitted successfully!");
      refetch();
      // Refresh refunds
      const res = await api.get(`/refunds/my?bookingId=${id}`);
      setRefunds(res.data.data?.refunds || []);
    } catch (error) {
      showToastMessage(
        "error",
        error.response?.data?.message || "Failed to submit refund request",
      );
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
      showToastMessage("error", "Failed to download invoice");
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
    const subtotal = feeBreakdown.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (pct / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    setReferralPercent(pct);
    setReferralAmount(final);
    setReferralApplied(final > 0);
  };

  const handleReferralToggle = () => {
    setReferralApplied((prev) => !prev);
  };

  // ── Get refunds for this specific booking ──────────────────────────────
  // Filter refunds by the current booking ID
  const bookingRefunds = refunds.filter(
    (r) => r.bookingId === id || r.booking?.id === id,
  );

  // Get the most recent active refund for THIS booking
  const activeRefund = bookingRefunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  // ── Check if refund should be shown ──────────────────────────────────────
  // Refund should only show when:
  // 1. Booking is COMPLETED
  // 2. Payment status is RELEASED
  // 3. No active refund exists (the refund request form)
  // But always show refund status if there's an active refund for THIS booking
  const showRefundForm =
    booking.status === "COMPLETED" &&
    payment?.status === "RELEASED" &&
    !activeRefund;

  const showRefundStatus = !!activeRefund;

  return (
    <Layout>
      <div className={styles.page}>
        <Link to="/bookings" className={styles.back}>
          <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Bookings
        </Link>

        {showToast && toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setShowToast(false)}
          />
        )}

        {sosActive && (
          <div className={styles.sosBanner}>
            <span className={styles.sosBannerIcon}>
              <FaExclamationTriangle />
            </span>
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
                onClick={() => setShowSOSConfirm(true)}
                disabled={resolvingSOS}
              >
                {resolvingSOS ? "Resolving..." : "Mark Resolved"}
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
              refundLoading={refundLoading}
              isHirer={isHirer}
              paymentStatus={payment?.status}
              isWorker={isWorker}
              workerName={booking.worker?.firstName}
            />

            {isWorker && booking.status === "PENDING" && (
              <WorkerPaymentPreview booking={booking} isWorker={isWorker} />
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
                onSuccess={(msg) => showToastMessage("success", msg)}
                isHirer={isHirer}
                isWorker={isWorker}
              />
            )}
          </div>

          <div className={styles.sidebar}>
            {isHirer && paymentRequired && (
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
                onSuccess={(msg) => showToastMessage("success", msg)}
                isHirer={isHirer}
                isWorker={isWorker}
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
              onSuccess={(msg) => showToastMessage("success", msg)}
              refetch={refetch}
              updateStatus={updateStatus}
            />
          </div>
        </div>

        {/* ── Refund Section ────────────────────────────────────────────── */}
        {(showRefundForm || showRefundStatus) && (
          <div className={styles.refundSection}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Refund</h2>

              <RefundStatus
                refund={activeRefund}
                onViewDetails={() => {
                  navigate(`/refunds/${activeRefund.id}`);
                }}
                isHirer={isHirer}
              />
            </div>
          </div>
        )}
      </div>

      {showDispute && (
        <RaiseDisputeModal
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() =>
            showToastMessage(
              "success",
              "Dispute raised. Our team will review within 24–48 hours.",
            )
          }
        />
      )}

      {/* SOS Confirmation Modal */}
      {showSOSConfirm && (
        <ConfirmationModal
          isOpen={showSOSConfirm}
          onClose={() => setShowSOSConfirm(false)}
          onConfirm={handleResolveSOS}
          title="Resolve SOS Alert"
          message="Are you sure you want to mark this SOS alert as resolved?"
          confirmLabel="Yes, Resolve"
          cancelLabel="Cancel"
          confirmVariant="warning"
        />
      )}
    </Layout>
  );
}
