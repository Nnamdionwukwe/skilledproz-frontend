// HirerPaymentHistory.jsx
import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import styles from "./HirerPaymentHistory.module.css";
import HirerLayout from "../layout/HirerLayout";
import { useCurrency, CURRENCY_META } from "../../context/CurrencyContext";
import DashboardCurrencySwitch from "../common/DashboardCurrencySwitch";
import { HIRER_FEE_RATE } from "../../utils/pricing";
import BookingReleaseDetails from "../booking/BookingDetail/BookingReleaseDetails";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  HELD: { label: "In Escrow", cls: "escrow" },
  RELEASED: { label: "Released", cls: "released" },
  PENDING: { label: "Pending", cls: "pending" },
  REFUNDED: { label: "Refunded", cls: "refunded" },
  FAILED: { label: "Failed", cls: "failed" },
};

const BOOKING_STATUS_META = {
  COMPLETED: { label: "Completed", cls: "released" },
  IN_PROGRESS: { label: "In Progress", cls: "escrow" },
  CANCELLED: { label: "Cancelled", cls: "failed" },
  DISPUTED: { label: "Disputed", cls: "pending" },
};

// ── Utility ───────────────────────────────────────────────────────────────────
function fmt(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ─── Unified Receipt Generator (For Printing) ─────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { label: "Pending Review" },
  PROCESSING: { label: "Processing" },
  COMPLETED: { label: "Completed" },
  SUCCESS: { label: "Success" },
  FAILED: { label: "Failed" },
  REVERSED: { label: "Reversed" },
  CANCELLED: { label: "Cancelled" },
  INITIATED: { label: "Initiated" },
  HELD: { label: "In Escrow" },
  RELEASED: { label: "Released" },
  REFUNDED: { label: "Refunded" },
};

function getPaymentChannel(tx) {
  if (tx.provider === "PAYSTACK" || tx.provider?.includes("PAYSTACK")) {
    return { label: "Card (Paystack)" };
  }
  if (tx.provider === "FLUTTERWAVE" || tx.provider?.includes("FLUTTERWAVE")) {
    return { label: "Card / Mobile Money" };
  }
  return { label: tx.provider || "Payment" };
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

function generateReceiptHTML(payment) {
  const isCredit = false;
  const amountPrefix = "-";
  const channel = getPaymentChannel(payment);
  const isPaid =
    payment.status === "RELEASED" || payment.status === "COMPLETED";

  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

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
  <title>Receipt - ${payment.id}</title>
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
      <div class="receipt-status ${isPaid ? "paid" : ""}">${STATUS_CONFIG[payment.status]?.label || payment.status}</div>
    </div>

    <div class="receipt-amount">
      <div class="label">Amount Charged</div>
      <div class="value debit">${amountPrefix} ${fmt(payment.amount, payment.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>

    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Receipt ID</span><span class="value mono">#${payment.id.slice(0, 12).toUpperCase()}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">Payment</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(payment.createdAt)}</span></div>

      <div class="row section-title"><span class="label">Booking Details</span></div>
      <div class="row"><span class="label">Service</span><span class="value">${payment.booking?.title || "—"}</span></div>
      <div class="row"><span class="label">Worker</span><span class="value">${payment.booking?.worker?.firstName || ""} ${payment.booking?.worker?.lastName || ""}</span></div>
      <div class="row"><span class="label">Hirer</span><span class="value">${payment.booking?.hirer?.firstName || ""} ${payment.booking?.hirer?.lastName || ""}</span></div>

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Worker's Earnings</span><span class="value">${fmt(payment.workerPayout || payment.amount * 0.95, payment.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">+ ${fmt(payment.platformFee || payment.amount * HIRER_FEE_RATE, payment.currency)}</span></div>
      <div class="row net-row"><span class="label">Total Paid</span><span class="value">${fmt(payment.amount, payment.currency)}</span></div>

      ${
        payment.provider || payment.providerRef
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row"><span class="label">Provider</span><span class="value">${payment.provider || "—"}</span></div>
      ${payment.providerRef ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${payment.providerRef}</span></div>` : ""}
      `
          : ""
      }
    </div>

    <div class="tear-line"></div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Receipt Modal Preview ─────────────────────────────────────────────────────
function ReceiptModal({ payment, onClose }) {
  const ref = useRef();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (ref.current && !ref.current.contains(e.target)) onClose();
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow)
      return alert("Please allow pop-ups to print the receipt.");
    printWindow.document.write(generateReceiptHTML(payment));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!payment) return null;

  const { booking } = payment;
  const hirer = booking?.hirer ?? {};
  const worker = booking?.worker ?? {};
  const statusMeta = STATUS_META[payment.status] ?? {
    label: payment.status,
    cls: "pending",
  };

  const workerPayout = payment.workerPayout ?? payment.amount * 0.95;
  const platformFee = payment.platformFee ?? payment.amount * HIRER_FEE_RATE;

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdrop}>
      <div className={styles.modal} ref={ref}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalLogo}>
            <span className={styles.logoMark}>SP</span>
            <span className={styles.logoText}>SkilledProz</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Receipt title */}
        <div className={styles.receiptTitle}>
          <h2 className={styles.receiptHeading}>Payment Receipt</h2>
          <span className={`${styles.statusPill} ${styles[statusMeta.cls]}`}>
            {statusMeta.label}
          </span>
        </div>

        {/* Receipt ID + date */}
        <div className={styles.receiptMeta}>
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Receipt ID</span>
            <span className={styles.receiptMetaValue}>
              #{payment.id.slice(0, 12).toUpperCase()}
            </span>
          </div>
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Date</span>
            <span className={styles.receiptMetaValue}>
              {fmtDateTime(payment.createdAt)}
            </span>
          </div>
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Provider</span>
            <span className={styles.receiptMetaValue}>
              {payment.provider ?? "—"}
            </span>
          </div>
          {payment.providerRef && (
            <div className={styles.receiptMetaItem}>
              <span className={styles.receiptMetaLabel}>Ref</span>
              <span className={styles.receiptMetaValue}>
                {payment.providerRef}
              </span>
            </div>
          )}
        </div>

        <div className={styles.receiptDivider} />

        {/* Parties */}
        <div className={styles.receiptParties}>
          <div className={styles.receiptParty}>
            <span className={styles.partyLabel}>From (Hirer)</span>
            <div className={styles.partyName}>
              {hirer.firstName} {hirer.lastName}
            </div>
            {hirer.email && (
              <div className={styles.partyEmail}>{hirer.email}</div>
            )}
          </div>
          <div className={styles.receiptArrow}>→</div>
          <div className={styles.receiptParty}>
            <span className={styles.partyLabel}>To (Worker)</span>
            <div className={styles.partyName}>
              {worker.firstName} {worker.lastName}
            </div>
            {worker.email && (
              <div className={styles.partyEmail}>{worker.email}</div>
            )}
          </div>
        </div>

        <div className={styles.receiptDivider} />

        {/* Job details */}
        {booking && (
          <div className={styles.receiptJob}>
            <span className={styles.receiptMetaLabel}>Job</span>
            <span className={styles.receiptJobTitle}>{booking.title}</span>
            {booking.category?.name && (
              <span className={styles.receiptCategory}>
                {booking.category.name}
              </span>
            )}
          </div>
        )}

        <div className={styles.receiptDivider} />

        {/* Breakdown */}
        <div className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <span>Worker's earnings</span>
            <span className={styles.workerEarnings}>
              {fmt(workerPayout, payment.currency)}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span>Platform fee ({HIRER_FEE_RATE * 100}%)</span>
            <span className={styles.feeAmount}>
              + {fmt(platformFee, payment.currency)}
            </span>
          </div>
          <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
            <span>Total you paid</span>
            <span className={styles.totalAmount}>
              {fmt(payment.amount, payment.currency)}
            </span>
          </div>
        </div>

        {/* Worker gets 100% note */}
        <div className={styles.workerNote}>
          <span className={styles.workerNoteIcon}>✅</span>
          <span className={styles.workerNoteText}>
            Worker receives <strong>100%</strong> of the job amount (
            {fmt(workerPayout, payment.currency)})
          </span>
        </div>

        {payment.escrowReleasedAt && (
          <div className={styles.escrowNote}>
            Funds released to worker on {fmtDateTime(payment.escrowReleasedAt)}
          </div>
        )}
        {payment.refundedAt && (
          <div className={`${styles.escrowNote} ${styles.refundNote}`}>
            Refunded on {fmtDateTime(payment.refundedAt)}
          </div>
        )}

        {/* Footer */}
        <div className={styles.receiptFooter}>
          <span>SkilledPro · Global Skills Marketplace</span>
          <button className={styles.printBtn} onClick={handlePrint}>
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Release Modal ─────────────────────────────────────────────────────────────
function ReleaseModal({ payment, onClose, onSuccess, loading }) {
  const ref = useRef();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (ref.current && !ref.current.contains(e.target)) onClose();
  }

  if (!payment) return null;

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdrop}>
      <div className={styles.modal} ref={ref} style={{ padding: 0 }}>
        {/* Fixed Header */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className={styles.modalHeader}>
            <div className={styles.modalLogo}>
              <span className={styles.logoMark}>SP</span>
              <span className={styles.logoText}>Release Payment</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "1.75rem", overflowY: "auto", flex: 1 }}>
          <BookingReleaseDetails
            payment={payment}
            currency={payment.currency}
            defaultOpen={true}
          />
        </div>

        {/* Fixed Footer with Action */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card)",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            borderRadius: "0 0 16px 16px",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.65rem 1.25rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-dim)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSuccess}
            disabled={loading}
            style={{
              padding: "0.65rem 1.25rem",
              background: "var(--orange)",
              border: "none",
              borderRadius: "8px",
              color: "#000",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? "Releasing..." : "Release Funds"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent }) {
  return (
    <div
      className={`${styles.summaryCard} ${accent ? styles.summaryAccent : ""}`}
    >
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
      {sub && <span className={styles.summarySub}>{sub}</span>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect
            x="4"
            y="8"
            width="32"
            height="24"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="4"
            y1="15"
            x2="36"
            y2="15"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="8"
            y="20"
            width="8"
            height="4"
            rx="1"
            fill="currentColor"
            opacity=".3"
          />
          <rect
            x="20"
            y="20"
            width="12"
            height="4"
            rx="1"
            fill="currentColor"
            opacity=".3"
          />
        </svg>
      </div>
      <p className={styles.emptyTitle}>No transactions yet</p>
      <p className={styles.emptyText}>
        Your payment history will appear here once you book a worker.
      </p>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div
      key={i}
      className={styles.skRow}
      style={{ animationDelay: `${i * 80}ms` }}
    />
  ));
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HirerPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [releaseModalPayment, setReleaseModalPayment] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [releasing, setReleasing] = useState(null);
  const [currencyFilter, setCurrency] = useState("ALL");
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const { dashboardCurrency, fmt: ctxFmt } = useCurrency();

  const LIMIT = 10;

  // ── Fetch payments ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { page, limit: LIMIT };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (currencyFilter !== "ALL") params.currency = currencyFilter;

    api
      .get("/payments/hirer", { params })
      .then((res) => {
        const d = res.data.data ?? res.data;
        setPayments(d.payments ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.pages ?? 1);
        setSummary(d.summary ?? null);
        setAvailableCurrencies(d.availableCurrencies ?? []);
      })
      .catch(() => setError("Failed to load payment history."))
      .finally(() => setLoading(false));
  }, [page, statusFilter, currencyFilter]);

  // ── Release escrow ──────────────────────────────────────────────────────────
  async function handleRelease(bookingId) {
    setReleasing(bookingId);
    try {
      await api.post(`/payments/release/${bookingId}`);
      setPayments((prev) =>
        prev.map((p) =>
          p.bookingId === bookingId
            ? {
                ...p,
                status: "RELEASED",
                escrowReleasedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      setReleaseModalPayment(null);
      alert("Payment released successfully!");
    } catch {
      alert("Release failed. Please try again.");
    } finally {
      setReleasing(null);
    }
  }

  function fmt(amount, currency) {
    return ctxFmt(amount, currency || dashboardCurrency);
  }

  // ── Filtered payments (client-side search on top of server filter) ──────────
  const visible = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.booking?.title?.toLowerCase().includes(q) ||
      p.booking?.worker?.firstName?.toLowerCase().includes(q) ||
      p.booking?.worker?.lastName?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    );
  });

  // ── Derived summary (fallback to client-side calc) ──────────────────────────
  const totalSpent =
    summary?.totalSpent ??
    payments
      .filter((p) => p.status === "RELEASED")
      .reduce((s, p) => s + (p.amount ?? 0), 0);
  const inEscrow =
    summary?.inEscrow ??
    payments
      .filter((p) => p.status === "HELD")
      .reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalRefunds =
    summary?.totalRefunds ??
    payments
      .filter((p) => p.status === "REFUNDED")
      .reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Payment History</h1>
            <p className={styles.pageSubtitle}>All transactions and receipts</p>
          </div>
          <DashboardCurrencySwitch />
        </div>

        {/* ── Summary row ── */}
        <div className={styles.summaryRow}>
          <SummaryCard
            label="Total Spent"
            value={fmt(totalSpent)}
            sub={`${total} transaction${total !== 1 ? "s" : ""}`}
            accent
          />
          <SummaryCard
            label="In Escrow"
            value={fmt(inEscrow)}
            sub="Awaiting release"
          />
          <SummaryCard
            label="Refunded"
            value={fmt(totalRefunds)}
            sub="Returned to you"
          />
        </div>

        {/* ── Filters ── */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="11"
                y1="11"
                x2="14"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by job, worker, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status tabs */}
          <div className={styles.statusTabs}>
            {["ALL", "HELD", "RELEASED", "REFUNDED", "FAILED"].map((s) => (
              <button
                key={s}
                className={`${styles.statusTab} ${statusFilter === s ? styles.statusTabActive : ""}`}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s === "ALL" ? "All" : (STATUS_META[s]?.label ?? s)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.statusTabs} style={{ marginTop: "0.5rem" }}>
          {availableCurrencies.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Currency:
              </span>
              <button
                className={`${styles.statusTab} ${currencyFilter === "ALL" ? styles.statusTabActive : ""}`}
                onClick={() => {
                  setCurrency("ALL");
                  setPage(1);
                }}
              >
                All
              </button>
              {availableCurrencies.map((c) => (
                <button
                  key={c}
                  className={`${styles.statusTab} ${currencyFilter === c ? styles.statusTabActive : ""}`}
                  onClick={() => {
                    setCurrency(c);
                    setPage(1);
                  }}
                >
                  {CURRENCY_META[c]?.symbol || ""} {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className={styles.tableWrap}>
          {error ? (
            <div className={styles.errorState}>{error}</div>
          ) : (
            <>
              {/* Table header */}
              <div className={styles.tableHead}>
                <span>Job</span>
                <span>Worker</span>
                <span>Date</span>
                <span>Amount</span>
                <span>Status</span>
                <span></span>
              </div>

              {/* Rows */}
              <div className={styles.tableBody}>
                {loading ? (
                  <SkeletonRows />
                ) : visible.length === 0 ? (
                  <Empty />
                ) : (
                  visible.map((payment, idx) => {
                    const statusMeta = STATUS_META[payment.status] ?? {
                      label: payment.status,
                      cls: "pending",
                    };
                    const worker = payment.booking?.worker ?? {};
                    const bookingStatus =
                      BOOKING_STATUS_META[payment.booking?.status];

                    return (
                      <div
                        key={payment.id}
                        className={styles.tableRow}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        {/* Job */}
                        <div className={styles.jobCell}>
                          <span className={styles.jobTitle}>
                            {payment.booking?.title ?? "—"}
                          </span>
                          {payment.booking?.category?.name && (
                            <span className={styles.jobCat}>
                              {payment.booking.category.name}
                            </span>
                          )}
                          {bookingStatus && (
                            <span
                              className={`${styles.bookingBadge} ${styles[bookingStatus.cls]}`}
                            >
                              {bookingStatus.label}
                            </span>
                          )}
                        </div>

                        {/* Worker */}
                        <div className={styles.workerCell}>
                          <div className={styles.workerAvatar}>
                            {worker.avatar ? (
                              <img src={worker.avatar} alt="" />
                            ) : (
                              <span>
                                {initials(worker.firstName, worker.lastName)}
                              </span>
                            )}
                          </div>
                          <span className={styles.workerName}>
                            {worker.firstName} {worker.lastName}
                          </span>
                        </div>

                        {/* Date */}
                        <div className={styles.dateCell}>
                          {fmtDate(payment.createdAt)}
                        </div>

                        {/* Amount */}
                        <div className={styles.amountCell}>
                          <span className={styles.amount}>
                            {fmt(payment.amount, payment.currency)}
                          </span>
                          <span className={styles.amountSub}>
                            Worker gets <strong>100%</strong> (
                            {fmt(payment.workerPayout, payment.currency)})
                          </span>
                          <span
                            className={styles.amountSub}
                            style={{
                              color: "var(--orange)",
                              fontSize: "0.6rem",
                            }}
                          >
                            Platform fee: {HIRER_FEE_RATE * 100}%
                          </span>
                        </div>

                        {/* Status */}
                        <div className={styles.statusCell}>
                          <span
                            className={`${styles.statusPill} ${styles[statusMeta.cls]}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className={styles.actionsCell}>
                          <button
                            className={styles.receiptBtn}
                            onClick={() => setReceipt(payment)}
                            title="View Receipt"
                          >
                            Receipt
                          </button>
                          {/* {payment.status === "HELD" && (
                            <button
                              className={styles.releaseBtn}
                              onClick={() => setReleaseModalPayment(payment)}
                              title="Release payment to worker"
                            >
                              Release
                            </button>
                          )} */}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Modals ── */}
        {receipt && (
          <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
        )}

        {releaseModalPayment && (
          <ReleaseModal
            payment={releaseModalPayment}
            onClose={() => setReleaseModalPayment(null)}
            onSuccess={() => {
              handleRelease(releaseModalPayment.bookingId);
            }}
            loading={releasing === releaseModalPayment.bookingId}
          />
        )}
      </div>
    </HirerLayout>
  );
}
