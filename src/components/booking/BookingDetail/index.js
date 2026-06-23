import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import HirerLayout from "../../layout/HirerLayout";
import WorkerLayout from "../../layout/WorkerLayout";
import RaiseDisputeModal from "../../disputes/RaiseDisputeModal";
import BookingInvoice from "../BookingInvoice";
import InsuranceAddon from "../../hirer/InsuranceAddon";
import PaymentOptions from "../../payment/PaymentOptions";
import VideoCallButton from "./VideoCallButton"; // keep as is
import EmergencyContact from "./EmergencyContact"; // keep as is
import SOSButton from "./SOSButton"; // keep as is
import Translator from "../../common/Translator";
import GpsCheckIn from "./GpsCheckIn";

// ── New sub‑components ──────────────────────────────────────
import SosBanner from "./SosBanner";
import TitleBlock from "./TitleBlock";
import Timeline from "./Timeline";
import PendingBanner from "./PendingBanner";
import DescriptionSection from "./DescriptionSection";
import DetailGrid from "./DetailGrid";
import FeeBreakdown from "./FeeBreakdown";
import GpsSection from "./GpsSection";
import PaymentSection from "./PaymentSection";
import ReviewsSection from "./ReviewsSection";
import CancelReasonSection from "./CancelReasonSection";
import BottomActions from "./BottomActions";
import Sidebar from "./Sidebar";
import {
  Alert,
  Spinner,
  DetailItem,
  GpsCard,
  ActionBtn,
  CancelBox,
  PayRow,
  Skeleton,
  NotFound,
} from "./Sidebar";

// ── Helpers (moved to utils or kept here) ──────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  /* same as before */
}
function mapsUrl(lat, lng) {
  /* same as before */
}
function formatDuration(booking) {
  /* same as before */
}
function calcDuration(start, end) {
  /* same as before */
}

const STATUS_META = {
  /* same as before */
};
const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────
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
  const [referralDiscount, setReferralDiscount] = useState(null);
  const [referralApplied, setReferralApplied] = useState(false);
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  // ── refetch ─────────────────────────────────────────────────
  const refetch = useCallback(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {});
  }, [id]);

  // ── Initial load ──────────────────────────────────────────
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
        if (user?.role === "HIRER" && !b.payment) {
          api
            .get("/referral/dashboard")
            .then((rd) => {
              const data = rd.data.data;
              if (data?.code) {
                const raw = (b.agreedRate || 0) * 0.05;
                const discount = Math.min(raw, 2500);
                if (discount > 0)
                  setReferralDiscount({
                    discount,
                    finalAmount: (b.agreedRate || 0) - discount,
                  });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  // ── Silent refresh every 10 min ──────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(refetch, 600_000);
    return () => clearInterval(timer);
  }, [id, refetch]);

  // ── Status update ──────────────────────────────────────────
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

  // ── SOS ────────────────────────────────────────────────────
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

  // ── Refund ──────────────────────────────────────────────────
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

  // ── Invoice ──────────────────────────────────────────────────
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

  // ── Guards ──────────────────────────────────────────────────
  if (loading)
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  if (!booking) return <NotFound backTo="/bookings" />;

  // ── Derived data ──────────────────────────────────────────
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

  const feeBreakdown = (() => {
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
    const rate = booking.agreedRate;
    if (!rate) return null;
    const unit = booking.estimatedUnit;
    const value = booking.estimatedValue;
    if (value && unit && unit !== "custom") {
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
    return {
      label: "Based on agreed rate",
      subtotal: rate,
      total: rate,
      platformFee: null,
      workerPayout: null,
      currency: booking.currency,
      isActual: false,
      noDuration: true,
    };
  })();

  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking.status) &&
    (!payment || payment.status === "PENDING");

  // ── Render ──────────────────────────────────────────────────
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
          <SosBanner
            booking={booking}
            isHirer={isHirer}
            resolvingSOS={resolvingSOS}
            onResolve={handleResolveSOS}
          />
        )}

        <div className={styles.layout}>
          {/* ── MAIN COLUMN ── */}
          <div className={styles.main}>
            <TitleBlock booking={booking} />
            {step >= 0 && <Timeline step={step} />}
            {booking.status === "PENDING" && isHirer && (
              <PendingBanner workerName={booking.worker?.firstName} />
            )}

            <DescriptionSection
              description={booking.description}
              notes={booking.notes}
            />

            <DetailGrid
              booking={booking}
              dur={dur}
              mapsUrl={mapsUrl}
              calcDuration={calcDuration}
              feeBreakdown={feeBreakdown}
              referralDiscount={referralDiscount}
              referralApplied={referralApplied}
              onReferralToggle={() => setReferralApplied((v) => !v)}
            />

            {(hasCheckInGps || hasCheckOutGps) && (
              <GpsSection
                booking={booking}
                hasCheckInGps={hasCheckInGps}
                hasCheckOutGps={hasCheckOutGps}
                checkInDistKm={checkInDistKm}
                checkOutDistKm={checkOutDistKm}
                mapsUrl={mapsUrl}
              />
            )}

            {booking.payment && <PaymentSection payment={booking.payment} />}

            {booking.status === "COMPLETED" && (
              <ReviewsSection
                reviews={booking.reviews}
                reviewCheckDone={reviewCheckDone}
                hasReviewed={hasReviewed}
                bookingId={booking.id}
              />
            )}

            {booking.cancelReason && (
              <CancelReasonSection reason={booking.cancelReason} />
            )}

            {booking.status === "COMPLETED" && (
              <BottomActions
                invoiceLoading={invoiceLoading}
                onDownloadInvoice={handleDownloadInvoice}
                onRefund={handleRefund}
                refundLoading={refundLoading}
                isHirer={isHirer}
                paymentStatus={payment?.status}
              />
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <Sidebar
            booking={booking}
            payment={payment}
            isHirer={isHirer}
            isWorker={isWorker}
            other={other}
            userId={userId}
            acting={acting}
            emergencyContact={emergencyContact}
            referralDiscount={referralDiscount}
            referralApplied={referralApplied}
            onReferralToggle={() => setReferralApplied((v) => !v)}
            paymentRequired={paymentRequired}
            showPayOptions={showPayOptions}
            onTogglePayOptions={() => setShowPayOptions((v) => !v)}
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
