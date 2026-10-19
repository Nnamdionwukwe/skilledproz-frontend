// src/pages/hirer/WalletTransactionDetail.jsx
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./HirerWallet.module.css";
import api from "../../lib/api";
import {
  FaArrowLeft,
  FaArrowDown,
  FaArrowUp,
  FaCreditCard,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaCopy,
  FaCheck,
  FaDownload,
  FaShareAlt,
  FaFileInvoice,
  FaPrint,
  FaUniversity,
  FaWallet,
  FaBitcoin,
  FaShieldAlt,
  FaExclamationTriangle,
  FaTimes,
  FaMoneyBillWave,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
} from "react-icons/fa";

// ─── Helpers (mirror RefundDetail's STATUS_CONFIG shape) ─────────────────
const STATUS_CONFIG = {
  PENDING: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    bg: "rgba(251, 191, 36, 0.1)",
  },
  PROCESSING: {
    icon: FaSpinner,
    color: "#818cf8",
    label: "Processing",
    bg: "rgba(129, 140, 248, 0.1)",
  },
  COMPLETED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    bg: "rgba(34, 197, 94, 0.1)",
  },
  SUCCESS: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Success",
    bg: "rgba(34, 197, 94, 0.1)",
  },
  FAILED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  REVERSED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Reversed",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  CANCELLED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Cancelled",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  INITIATED: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Initiated",
    bg: "rgba(251, 191, 36, 0.1)",
  },
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

function formatDateShort(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

// ─── Copy Button ──────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button className={styles.copyBtn} onClick={handleCopy} type="button">
      {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}

// ─── Receipt Generator (unchanged) ───────────────────────────────────────
function generateReceiptHTML(transaction) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const isPaid =
    transaction.status === "COMPLETED" || transaction.status === "SUCCESS";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .receipt { max-width: 520px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .receipt-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 32px 32px 24px; text-align: center; }
    .receipt-header .logo { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 14px; margin-bottom: 12px; }
    .receipt-header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .receipt-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .receipt-status.paid { background: rgba(255,255,255,0.28); }
    .receipt-amount { text-align: center; padding: 28px 32px 24px; border-bottom: 2px dashed #e5e7eb; }
    .receipt-amount .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .receipt-amount .value { font-size: 36px; font-weight: 800; margin-top: 8px; letter-spacing: -0.02em; }
    .receipt-amount .value.credit { color: #22c55e; }
    .receipt-amount .value.debit { color: #ef4444; }
    .receipt-amount .channel { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: #6b7280; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: #1a1a2e; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid #e5e7eb; border-bottom: none; }
    .net-row .label { font-weight: 700; color: #1a1a2e; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; }
    .receipt-footer strong { color: #6b7280; }
    .tear-line { height: 16px; background-image: radial-gradient(circle, #ffffff 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: #f9fafb; }
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

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Gross Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span></div>
      <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span></div>

      ${
        transaction.balanceBefore != null || transaction.balanceAfter != null
          ? `
      <div class="row section-title"><span class="label">Wallet Impact</span></div>
      <div class="row"><span class="label">Balance Before</span><span class="value">${formatCurrency(transaction.balanceBefore || 0, transaction.currency)}</span></div>
      <div class="row"><span class="label">Balance After</span><span class="value">${formatCurrency(transaction.balanceAfter || 0, transaction.currency)}</span></div>`
          : ""
      }

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
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function WalletTransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get("/wallet/transactions", { params: { limit: 100 } })
      .then((res) => {
        const list = res.data.data?.transactions || [];
        const match = list.find((t) => t.id === id);
        if (!match) {
          setError("Transaction not found.");
        } else {
          setTransaction(match);
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load transaction details.",
        );
        if (err.response?.status === 404) {
          setTimeout(() => navigate("/dashboard/hirer/wallet"), 3000);
        }
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownloadReceipt = () => {
    if (!transaction) return;
    setDownloading(true);
    try {
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
      alert("Failed to download receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!transaction) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }
    printWindow.document.write(generateReceiptHTML(transaction));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleShare = async () => {
    if (!transaction) return;
    const channel = getPaymentChannel(transaction);
    const text = `Transaction ${transaction.reference}\nType: ${getTransactionLabel(transaction.type)}\nChannel: ${channel.label}\nAmount: ${formatCurrency(transaction.amount, transaction.currency)}\nStatus: ${STATUS_CONFIG[transaction.status]?.label || transaction.status}\nDate: ${formatDateLong(transaction.createdAt)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Transaction Details", text });
      } catch (err) {
        if (err.name !== "AbortError") {
          await navigator.clipboard.writeText(text);
          alert("Transaction details copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Transaction details copied to clipboard!");
    }
  };

  const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || {
      icon: FaClock,
      color: "#888",
      label: status || "Unknown",
      bg: "rgba(136, 136, 136, 0.1)",
    };

  // ── Loading ──
  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <Link to="/dashboard/hirer/wallet" className={styles.backLink}>
              <FaArrowLeft /> Back to Wallet
            </Link>
            <h1 className={styles.headerTitle}>Transaction Details</h1>
          </div>
          <div className={styles.skeletonPanel} style={{ height: 400 }} />
        </div>
      </HirerLayout>
    );
  }

  // ── Error ──
  if (error || !transaction) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.errorState}>
            <FaExclamationTriangle className={styles.errorIcon} />
            <h3>{error || "Transaction not found"}</h3>
            <p>Redirecting to wallet...</p>
            <Link to="/dashboard/hirer/wallet" className={styles.backButton}>
              <FaArrowLeft /> Back to Wallet
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link to="/dashboard/hirer/wallet" className={styles.backLink}>
            <FaArrowLeft /> Back to Wallet
          </Link>
          <h1 className={styles.headerTitle}>Transaction Details</h1>
        </div>

        <div className={styles.detailContainer}>
          {/* Status Banner */}
          <div
            className={styles.statusBanner}
            style={{
              background: statusConfig.bg,
              borderColor: statusConfig.color,
            }}
          >
            <StatusIcon size={24} style={{ color: statusConfig.color }} />
            <div>
              <div className={styles.statusBannerLabel}>Status</div>
              <div
                className={styles.statusBannerValue}
                style={{ color: statusConfig.color }}
              >
                {statusConfig.label}
              </div>
            </div>
            <span className={styles.referenceBadge}>
              Ref: {transaction.reference}
            </span>
          </div>

          {/* Main Details */}
          <div className={styles.detailGrid}>
            {/* Amount */}
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaMoneyBillWave /> Transaction Information
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount</span>
                <span
                  className={styles.detailValueLarge}
                  style={{
                    color: isCredit ? "var(--green)" : "var(--orange)",
                  }}
                >
                  {amountPrefix}{" "}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>
                  {getTransactionLabel(transaction.type)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Channel</span>
                <span className={styles.detailValue}>{channel.label}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fee</span>
                <span className={styles.detailValue}>
                  {formatCurrency(transaction.fee || 0, transaction.currency)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Net Amount</span>
                <span className={styles.detailValue}>
                  {amountPrefix}{" "}
                  {formatCurrency(
                    transaction.netAmount || transaction.amount,
                    transaction.currency,
                  )}
                </span>
              </div>
            </div>

            {/* Reference & dates */}
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                <FaCalendarAlt /> Reference & Dates
              </h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reference</span>
                <span className={styles.detailValue}>
                  {transaction.reference}
                  <CopyButton text={transaction.reference} label="Copy" />
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>
                  {formatDateShort(transaction.createdAt)}
                </span>
              </div>
              {transaction.completedAt && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Completed</span>
                  <span className={styles.detailValue}>
                    {formatDateShort(transaction.completedAt)}
                  </span>
                </div>
              )}
              {transaction.balanceBefore != null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Balance Before</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(
                      transaction.balanceBefore,
                      transaction.currency,
                    )}
                  </span>
                </div>
              )}
              {transaction.balanceAfter != null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Balance After</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(
                      transaction.balanceAfter,
                      transaction.currency,
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Provider or bank details */}
            {(transaction.meta?.paymentProvider ||
              transaction.meta?.bankName) && (
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>
                  <FaUser /> Payment Details
                </h3>
                {transaction.meta?.paymentProvider && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Provider</span>
                    <span className={styles.detailValue}>
                      {transaction.meta.paymentProvider}
                    </span>
                  </div>
                )}
                {transaction.meta?.transactionId && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      Provider Reference
                    </span>
                    <span className={styles.detailValue}>
                      {transaction.meta.transactionId}
                      <CopyButton
                        text={String(transaction.meta.transactionId)}
                        label="Copy"
                      />
                    </span>
                  </div>
                )}
                {transaction.meta?.bankName && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Bank</span>
                    <span className={styles.detailValue}>
                      {transaction.meta.bankName}
                    </span>
                  </div>
                )}
                {transaction.meta?.accountNumber && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Account Number</span>
                    <span className={styles.detailValue}>
                      {transaction.meta.accountNumber}
                    </span>
                  </div>
                )}
                {transaction.meta?.accountName && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Account Name</span>
                    <span className={styles.detailValue}>
                      {transaction.meta.accountName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {transaction.description && (
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>
                  <FaInfoCircle /> Description
                </h3>
                <div className={styles.detailRow}>
                  <span className={styles.detailValueText}>
                    {transaction.description}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actionsContainer}>
            <button
              type="button"
              onClick={handlePrint}
              className={styles.downloadBtn}
            >
              <FaPrint /> Print
            </button>
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={downloading}
              className={styles.downloadBtn}
            >
              <FaDownload />{" "}
              {downloading ? "Downloading..." : "Download Receipt"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className={styles.downloadBtn}
            >
              <FaShareAlt /> Share
            </button>
            <Link to="/dashboard/hirer/wallet" className={styles.backToHistory}>
              View All Transactions
            </Link>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
