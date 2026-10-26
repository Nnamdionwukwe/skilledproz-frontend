// src/components/booking/BookingDetail/index.jsx
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
import { calcPricing } from "../../../utils/pricing";
import WorkerPaymentPreview from "./WorkerPaymentPreview";
import ConfirmationModal from "../../context/ConfirmationModal";
import { RefundStatus } from "../Refund";
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaExclamationCircle,
  FaMoneyBillWave,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
  FaCreditCard,
  FaUniversity,
  FaWallet,
  FaBitcoin,
  FaShieldAlt,
  FaPlus,
  FaMinus,
  FaArrowUp,
} from "react-icons/fa";
import tracker from "../../../lib/analytics/tracker";

// ─── Receipt Generator (Exact style, expanded data for Bookings) ──────────
const STATUS_CONFIG = {
  PENDING: { label: "Pending Review" },
  PROCESSING: { label: "Processing" },
  COMPLETED: { label: "Completed" },
  SUCCESS: { label: "Success" },
  FAILED: { label: "Failed" },
  REVERSED: { label: "Reversed" },
  CANCELLED: { label: "Cancelled" },
  INITIATED: { label: "Initiated" },
};

function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionLabel(type) {
  const labels = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    PAYMENT: "Payment",
    SUBSCRIPTION: "Subscription",
    REFUND: "Refund",
    BONUS: "Bonus",
    ADJUSTMENT: "Adjustment",
  };
  return labels[type] || type;
}

function getPaymentChannel(tx) {
  if (tx.type === "DEPOSIT") {
    const p = tx.meta?.paymentProvider;
    if (p === "FLUTTERWAVE")
      return { label: "Card / Mobile Money", icon: FaCreditCard };
    if (p === "PAYSTACK")
      return { label: "Card (Paystack)", icon: FaCreditCard };
    return { label: "Card / Bank", icon: FaCreditCard };
  }
  if (tx.type === "WITHDRAWAL")
    return { label: "Bank Transfer", icon: FaUniversity };
  if (tx.type === "PAYMENT") {
    const p = tx.meta?.paymentProvider || "WALLET";
    if (p === "WALLET") return { label: "Wallet", icon: FaWallet };
    if (p === "PAYSTACK")
      return { label: "Card (Paystack)", icon: FaCreditCard };
    if (p === "FLUTTERWAVE")
      return { label: "Card (Flutterwave)", icon: FaCreditCard };
    if (p === "BANK_TRANSFER")
      return { label: "Bank Transfer", icon: FaUniversity };
    if (p === "CRYPTO") return { label: "Crypto", icon: FaBitcoin };
    return { label: "Payment", icon: FaCreditCard };
  }
  if (tx.type === "SUBSCRIPTION")
    return { label: "Subscription", icon: FaShieldAlt };
  if (tx.type === "REFUND") return { label: "Refund", icon: FaArrowUp };
  if (tx.type === "BONUS") return { label: "Bonus", icon: FaPlus };
  return { label: "Adjustment", icon: FaMinus };
}

function generateReceiptHTML(transaction) {
  const isCredit = false; // Bookings are always debits
  const amountPrefix = "-";
  const channel = getPaymentChannel(transaction);
  const isPaid =
    transaction.status === "COMPLETED" || transaction.status === "SUCCESS";

  // Get the current platform theme
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Theme Colors
  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const textDim = isDark ? "#a1a1aa" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const borderDash = isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";
  const footerBg = isDark ? "#0c0c18" : "#f9fafb";
  const tearColor = isDark ? "#080810" : "#f9fafb";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: ${bg}; 
      color: ${text};
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      padding: 20px; 
    }
    .receipt { 
      max-width: 520px; 
      width: 100%; 
      background: ${panel}; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 24px rgba(0,0,0,${isDark ? "0.4" : "0.1"}); 
      border: 1px solid ${border};
    }
    .receipt-header { 
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
      color: #ffffff; 
      padding: 32px 32px 24px; 
      text-align: center; 
    }
    .receipt-header .logo { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      width: 56px; 
      height: 56px; 
      background: rgba(255,255,255,0.2); 
      border-radius: 14px; 
      margin-bottom: 12px; 
    }
    .receipt-header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; color: #fff; }
    .receipt-status { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      margin-top: 16px; 
      padding: 6px 16px; 
      background: rgba(255,255,255,0.2); 
      border-radius: 999px; 
      font-size: 12px; 
      font-weight: 700; 
      letter-spacing: 0.05em; 
      text-transform: uppercase; 
      color: #fff;
    }
    .receipt-amount { 
      text-align: center; 
      padding: 28px 32px 24px; 
      border-bottom: 2px dashed ${borderDash}; 
    }
    .receipt-amount .label { 
      font-size: 12px; 
      color: ${textDim}; 
      text-transform: uppercase; 
      letter-spacing: 0.08em; 
      font-weight: 700; 
    }
    .receipt-amount .value { 
      font-size: 36px; 
      font-weight: 800; 
      margin-top: 8px; 
      letter-spacing: -0.02em; 
    }
    .receipt-amount .value.credit { color: #22c55e; }
    .receipt-amount .value.debit { color: #ef4444; }
    .receipt-amount .channel { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      margin-top: 12px; 
      padding: 4px 12px; 
      background: rgba(249, 115, 22, 0.15); 
      color: #f97316; 
      border-radius: 999px; 
      font-size: 11px; 
      font-weight: 700; 
    }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${border}; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: ${textDim}; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: ${text}; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${textDim}; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid ${border}; border-bottom: none; }
    .net-row .label { font-weight: 700; color: ${text}; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: ${footerBg}; text-align: center; font-size: 12px; color: ${textDim}; }
    .receipt-footer strong { color: ${text}; }
    .tear-line { height: 16px; background-image: radial-gradient(circle, ${tearColor} 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: ${footerBg}; }

    /* --- PRINT SPECIFIC STYLES --- */
    @media print {
      @page { size: auto; margin: 0; }
      body { background: #fff; color: #000; display: block; padding: 0; }
      .receipt { 
        max-width: 100%; 
        box-shadow: none; 
        border-radius: 0; 
        border: none;
        page-break-inside: avoid;
        transform: scale(0.85); 
        transform-origin: top center;
        margin: 0 auto;
      }
      /* Force white background and dark text for printing */
      .receipt { background: #fff !important; }
      .receipt-body { background: #fff !important; padding: 16px 32px; }
      .receipt-footer { background: #fff !important; border-top: 1px solid #eee; }
      .row .value, .net-row .label { color: #000 !important; }
      .row .label, .receipt-amount .label, .receipt-footer { color: #555 !important; }
      .tear-line { display: none; }
      .row { padding: 8px 0; border-bottom: 1px solid #eee; }
      .receipt-header { padding: 24px 32px 16px; }
      .receipt-amount { padding: 20px 32px; border-bottom: 2px dashed #eee; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 12h8" /><path d="M8 8h4" /><path d="M8 16h6" />
        </svg>
      </div>
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status ${isPaid ? "paid" : ""}">${STATUS_CONFIG[transaction.status]?.label || transaction.status}</div>
    </div>

    <div class="receipt-amount">
      <div class="label">${isCredit ? "Amount Received" : "Amount Charged"}</div>
      <div class="value ${isCredit ? "credit" : "debit"}">${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>

    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${getTransactionLabel(transaction.type)}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${formatDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>` : ""}

      <div class="row section-title"><span class="label">Booking Details</span></div>
      <div class="row"><span class="label">Booking ID</span><span class="value mono">${transaction.bookingId || "—"}</span></div>
      <div class="row"><span class="label">Service</span><span class="value">${transaction.bookingTitle || "—"}</span></div>
      <div class="row"><span class="label">Worker</span><span class="value">${transaction.workerName || "—"}</span></div>
      <div class="row"><span class="label">Hirer</span><span class="value">${transaction.hirerName || "—"}</span></div>
      ${transaction.bookingDuration ? `<div class="row"><span class="label">Duration</span><span class="value">${transaction.bookingDuration}</span></div>` : ""}
      ${transaction.bookingLocation ? `<div class="row"><span class="label">Location</span><span class="value">${transaction.bookingLocation}</span></div>` : ""}

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Gross Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span></div>
      <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span></div>

      ${
        transaction.meta?.paymentProvider
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row"><span class="label">Provider</span><span class="value">${transaction.meta.paymentProvider}</span></div>
      ${transaction.meta?.transactionId ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${transaction.meta.transactionId}</span></div>` : ""}
      `
          : ""
      }
    </div>

    <div class="tear-line"></div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 8px; font-size: 11px;">Refund policy: <strong>skilledproz.com/refund-policy</strong></p>
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

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

  if (!value && !hours && booking.notes) {
    const recurring = booking.notes.match(/Recurring:\s*([^.]*?)(?:\.|$)/i);
    if (recurring && recurring[1] && recurring[1].trim()) {
      const label = recurring[1].trim();
      return { main: label, sub: null, unit: "custom", label };
    }
    const custom = booking.notes.match(/Duration:\s*([^.]*?)(?:\.|$)/i);
    if (custom && custom[1] && custom[1].trim()) {
      const label = custom[1].trim();
      return { main: label, sub: null, unit: "custom", label };
    }
  }

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
      return { main: value, sub: null, unit: unit, label: `${value} ${unit}` };
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
        <Link
          to={backTo}
          className={styles.back}
          data-track-id="bookingDetail.notFound.back"
        >
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
      <button
        className={styles.toastClose}
        onClick={onClose}
        data-track-id="bookingDetail.toast.close"
      >
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

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.bookingDetail.view", {
      bookingId: id || null,
      viewerRole: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .catch((e) => {
        tracker.track("bookingDetail.load.failed", {
          bookingId: id,
          viewerRole: user?.role || "GUEST",
          reason: e.response?.data?.message || "unknown",
        });
      })
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

  // ── Invoice (Now using the unified HTML receipt with booking data) ─────
  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);

    try {
      const p = calcPricing(booking);
      const dur = formatDuration(booking);

      // Construct the transaction object for the receipt
      const transaction = {
        reference: payment?.providerRef || booking.id,
        type: "PAYMENT",
        amount: p.grossTotal || booking.amount || 0,
        currency: booking.currency || "NGN",
        status: "COMPLETED",
        createdAt: booking.createdAt || new Date().toISOString(),
        completedAt: booking.completedAt || new Date().toISOString(),
        description: `Payment for booking: ${booking.title}`,
        fee: p.hirerFee || 0,
        netAmount: p.subtotal || booking.amount || 0,
        // Extra booking details
        bookingId: booking.id,
        bookingTitle: booking.title,
        workerName: booking.worker
          ? `${booking.worker.firstName} ${booking.worker.lastName}`
          : "—",
        hirerName: booking.hirer
          ? `${booking.hirer.firstName} ${booking.hirer.lastName}`
          : "—",
        bookingDuration: dur ? dur.main : null,
        bookingLocation: booking.address || null,
        meta: {
          paymentProvider: payment?.provider || "Paystack",
          transactionId: payment?.providerRef,
        },
      };

      const html = generateReceiptHTML(transaction);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${transaction.reference}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    const next = !referralApplied;
    setReferralApplied(next);
  };

  // ── Get refunds for this specific booking ──────────────────────────────
  const bookingRefunds = refunds.filter(
    (r) => r.bookingId === id || r.booking?.id === id,
  );

  const activeRefund = bookingRefunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  const showRefundStatus = !!activeRefund;

  return (
    <Layout>
      <div className={styles.page}>
        <Link
          to="/bookings"
          className={styles.back}
          data-track-id="bookingDetail.back"
        >
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
                data-track-id="bookingDetail.sos.resolve.open"
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
              isHirer={isHirer}
              payment={payment}
              paymentStatus={payment?.status}
              isWorker={isWorker}
              workerName={booking.worker?.firstName}
              refundLoading={refundLoading}
              hasActiveRefund={!!activeRefund}
            />

            {isWorker && booking.status === "PENDING" && (
              <WorkerPaymentPreview booking={booking} isWorker={isWorker} />
            )}
          </div>

          <div className={styles.sidebar}>
            {(isHirer || isWorker) && (
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

        {/* Refund Section */}
        {showRefundStatus && (
          <div className={styles.refundSection}>
            <div className={styles.section}>
              <RefundStatus
                refund={activeRefund}
                onViewDetails={() => navigate(`/refunds/${activeRefund.id}`)}
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
