// src/pages/hirer/HirerWallet.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./HirerWallet.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

import {
  FaWallet,
  FaArrowDown,
  FaArrowUp,
  FaCreditCard,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaSearch,
  FaArrowRight,
  FaArrowLeft,
  FaTimes,
  FaCopy,
  FaExclamationTriangle,
  FaCheck,
  FaMoneyBillWave,
  FaDollarSign,
  FaEuroSign,
  FaPoundSign,
  FaBitcoin,
  FaYenSign,
  FaDownload,
  FaShareAlt,
  FaFileInvoice,
  FaPrint,
  FaUniversity,
  FaWallet as FaWalletIcon,
  FaShieldAlt,
  FaQrcode,
  FaMobileAlt,
} from "react-icons/fa";

import { FiMail } from "react-icons/fi";

// ─── Helper Functions ──────────────────────────────────────────────────────
function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function getStatusColor(status) {
  const colors = {
    PENDING: "var(--orange)",
    PROCESSING: "#3B82F6",
    COMPLETED: "var(--green)",
    SUCCESS: "var(--green)",
    FAILED: "var(--red)",
    REVERSED: "var(--text-muted)",
    CANCELLED: "var(--text-muted)",
    INITIATED: "var(--orange)",
  };
  return colors[status] || "var(--text-muted)";
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    SUCCESS: "Success",
    FAILED: "Failed",
    REVERSED: "Reversed",
    CANCELLED: "Cancelled",
    INITIATED: "Initiated",
  };
  return labels[status] || status;
}

function getStatusIcon(status) {
  if (status === "COMPLETED" || status === "SUCCESS") return <FaCheckCircle />;
  if (status === "PENDING" || status === "INITIATED" || status === "PROCESSING")
    return <FaSpinner className={styles.spinning} />;
  if (status === "FAILED" || status === "REVERSED" || status === "CANCELLED")
    return <FaTimesCircle />;
  return <FaClock />;
}

function getTransactionIcon(type) {
  const icons = {
    DEPOSIT: <FaArrowDown className={styles.depositIcon} />,
    WITHDRAWAL: <FaArrowUp className={styles.withdrawIcon} />,
    PAYMENT: <FaCreditCard className={styles.paymentIcon} />,
    SUBSCRIPTION: <FaWallet className={styles.subscriptionIcon} />,
    REFUND: <FaArrowUp className={styles.refundIcon} />,
    BONUS: <FaPlus className={styles.bonusIcon} />,
    ADJUSTMENT: <FaMinus className={styles.adjustmentIcon} />,
  };
  return icons[type] || <FaWallet />;
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

function getCurrencyIcon(currency) {
  const icons = {
    NGN: <FaMoneyBillWave />,
    USD: <FaDollarSign />,
    EUR: <FaEuroSign />,
    GBP: <FaPoundSign />,
    JPY: <FaYenSign />,
    CNY: <FaYenSign />,
    BTC: <FaBitcoin />,
  };
  return icons[currency] || <FaMoneyBillWave />;
}

function getCurrencySymbol(currency) {
  const symbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
    GHS: "GH₵",
    KES: "KSh",
    ZAR: "R",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
    AED: "د.إ",
    SAR: "ر.س",
    QAR: "ر.ق",
    EGP: "E£",
    TZS: "TSh",
    UGX: "USh",
    RWF: "FRw",
    XOF: "CFA",
    MAD: "DH",
    PHP: "₱",
    IDR: "Rp",
    VND: "₫",
    THB: "฿",
    BDT: "৳",
    PKR: "₨",
    MYR: "RM",
    SGD: "S$",
    HKD: "HK$",
    BTC: "₿",
  };
  return symbols[currency] || currency;
}

// ─── Payment Method Helpers ────────────────────────────────────────────────
// The backend stores `meta.paymentProvider` on transaction creation and
// falls back to `provider` on the payment row. But hirerTransactions don't
// carry the provider column — only deposits carry `meta.paymentProvider`.
// We use type + meta to distinguish the channel and label it.

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
    if (p === "WALLET") return { label: "Wallet", icon: FaWalletIcon };
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
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
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

// ─── Receipt Generator ─────────────────────────────────────────────────────

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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .receipt {
      max-width: 520px;
      width: 100%;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
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
    .receipt-header h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .receipt-header .subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;
    }
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
    }
    .receipt-status.paid { background: rgba(255,255,255,0.28); }
    .receipt-amount {
      text-align: center;
      padding: 28px 32px 24px;
      border-bottom: 2px dashed #e5e7eb;
    }
    .receipt-amount .label {
      font-size: 12px;
      color: #6b7280;
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
      background: #fef3c7;
      color: #92400e;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .receipt-body { padding: 24px 32px; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      gap: 16px;
    }
    .row:last-child { border-bottom: none; }
    .row .label {
      color: #6b7280;
      font-size: 13px;
      font-weight: 500;
      flex-shrink: 0;
    }
    .row .value {
      color: #1a1a2e;
      font-size: 13px;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title {
      padding-top: 18px;
      padding-bottom: 6px;
      border-bottom: none;
    }
    .row.section-title .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #9ca3af;
      font-weight: 800;
    }
    .fee-row { color: #f97316; }
    .net-row {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 2px solid #e5e7eb;
      border-bottom: none;
    }
    .net-row .label { font-weight: 700; color: #1a1a2e; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer {
      padding: 24px 32px;
      background: #f9fafb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .receipt-footer strong { color: #6b7280; }
    .tear-line {
      height: 16px;
      background-image: radial-gradient(circle, #ffffff 4px, transparent 4px);
      background-size: 16px 16px;
      background-position: -8px 50%;
      background-color: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M8 12h8" />
          <path d="M8 8h4" />
          <path d="M8 16h6" />
        </svg>
      </div>
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status ${isPaid ? "paid" : ""}">
        ${getStatusLabel(transaction.status)}
      </div>
    </div>

    <div class="receipt-amount">
      <div class="label">${isCredit ? "Amount Received" : "Amount Charged"}</div>
      <div class="value ${isCredit ? "credit" : "debit"}">
        ${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}
      </div>
      <div class="channel">
        ${channel.label}
      </div>
    </div>

    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row">
        <span class="label">Reference</span>
        <span class="value mono">${transaction.reference}</span>
      </div>
      <div class="row">
        <span class="label">Type</span>
        <span class="value">${getTransactionLabel(transaction.type)}</span>
      </div>
      <div class="row">
        <span class="label">Date</span>
        <span class="value">${formatDateLong(transaction.createdAt)}</span>
      </div>
      ${
        transaction.completedAt
          ? `
      <div class="row">
        <span class="label">Completed</span>
        <span class="value">${formatDateLong(transaction.completedAt)}</span>
      </div>`
          : ""
      }
      ${
        transaction.description
          ? `
      <div class="row">
        <span class="label">Description</span>
        <span class="value">${transaction.description}</span>
      </div>`
          : ""
      }

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row">
        <span class="label">Gross Amount</span>
        <span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span>
      </div>
      <div class="row fee-row">
        <span class="label">Platform Fee</span>
        <span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span>
      </div>
      <div class="row net-row">
        <span class="label">Net Amount</span>
        <span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span>
      </div>

      ${
        transaction.balanceBefore != null || transaction.balanceAfter != null
          ? `
      <div class="row section-title"><span class="label">Wallet Impact</span></div>
      <div class="row">
        <span class="label">Balance Before</span>
        <span class="value">${formatCurrency(transaction.balanceBefore || 0, transaction.currency)}</span>
      </div>
      <div class="row">
        <span class="label">Balance After</span>
        <span class="value">${formatCurrency(transaction.balanceAfter || 0, transaction.currency)}</span>
      </div>`
          : ""
      }

      ${
        transaction.meta?.paymentProvider
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row">
        <span class="label">Provider</span>
        <span class="value">${transaction.meta.paymentProvider}</span>
      </div>
      ${
        transaction.meta?.transactionId
          ? `
      <div class="row">
        <span class="label">Provider Ref</span>
        <span class="value mono">${transaction.meta.transactionId}</span>
      </div>`
          : ""
      }
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

// ─── Transaction Detail Modal ──────────────────────────────────────────────

function TransactionDetailModal({ transaction, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!transaction) return null;

  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? "var(--green)" : "var(--red)";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const ChannelIcon = channel.icon;

  const handleDownloadReceipt = () => {
    setDownloading(true);
    try {
      const receiptHTML = generateReceiptHTML(transaction);
      const blob = new Blob([receiptHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${transaction.reference}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download receipt:", err);
      alert("Failed to download receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Transaction ${transaction.reference}\nType: ${getTransactionLabel(transaction.type)}\nChannel: ${channel.label}\nAmount: ${formatCurrency(transaction.amount, transaction.currency)}\nStatus: ${getStatusLabel(transaction.status)}\nDate: ${formatDateLong(transaction.createdAt)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Transaction Details",
          text: shareText,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          await navigator.clipboard.writeText(shareText);
          alert("Transaction details copied to clipboard!");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Transaction details copied to clipboard!");
      } catch {
        alert("Failed to share. Please copy the details manually.");
      }
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-print");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const providerLabel =
    transaction.meta?.paymentProvider ||
    (transaction.provider && transaction.provider.toUpperCase()) ||
    "—";
  const providerRef =
    transaction.meta?.transactionId ||
    transaction.providerRef ||
    transaction.reference;

  return (
    <div className={styles.modalFullScreenOverlay} onClick={onClose}>
      <div
        className={styles.modalFullScreenBox}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalFullScreenHeader}>
          <div>
            <h3 className={styles.modalTitle}>
              <FaFileInvoice /> Transaction Details
            </h3>
            <p className={styles.modalSubtitle}>
              {getTransactionLabel(transaction.type)} ·{" "}
              {formatDateLong(transaction.createdAt)}
            </p>
          </div>
          <button
            className={styles.modalFullScreenClose}
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalFullScreenBody}>
          {/* Header with channel */}
          <div className={styles.detailHeader}>
            <div className={styles.detailChannelIcon}>
              <ChannelIcon size={20} />
            </div>
            <div>
              <div className={styles.detailChannelLabel}>{channel.label}</div>
              <div className={styles.detailChannelSub}>
                {getTransactionLabel(transaction.type)}
              </div>
            </div>
            <div className={styles.detailAmount} style={{ color: amountColor }}>
              {amountPrefix}
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
          </div>

          {/* Status pill */}
          <div className={styles.detailStatusRow}>
            <span
              className={styles.statusBadge}
              style={{
                backgroundColor: "rgba(249, 115, 22, 0.15)",
                color: getStatusColor(transaction.status),
              }}
            >
              {getStatusIcon(transaction.status)}{" "}
              {getStatusLabel(transaction.status)}
            </span>
            {transaction.completedAt && (
              <span className={styles.detailCompletedAt}>
                Completed {formatDateLong(transaction.completedAt)}
              </span>
            )}
          </div>

          {/* User block */}
          <div className={styles.detailUser}>
            <div className={styles.userAvatarLarge}>
              {transaction.hirer?.firstName?.[0] || "?"}
              {transaction.hirer?.lastName?.[0] || ""}
            </div>
            <div>
              <div className={styles.detailName}>
                {transaction.hirer?.firstName} {transaction.hirer?.lastName}
              </div>
              <div className={styles.detailEmail}>
                <FiMail size={12} /> {transaction.hirer?.email}
              </div>
            </div>
          </div>

          {/* Reference block */}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Transaction Reference</span>
              <span className={styles.detailValue}>
                {transaction.reference}
                <CopyButton text={transaction.reference} label="Copy" />
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>
                {getTransactionLabel(transaction.type)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Channel</span>
              <span className={styles.detailValue}>{channel.label}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <span className={styles.detailValue}>
                {getStatusLabel(transaction.status)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Amount</span>
              <span
                className={styles.detailValue}
                style={{ color: amountColor }}
              >
                {amountPrefix}
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Fee</span>
              <span className={styles.detailValue}>
                {formatCurrency(transaction.fee || 0, transaction.currency)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Net Amount</span>
              <span className={styles.detailValue} style={{ fontWeight: 700 }}>
                {formatCurrency(
                  transaction.netAmount || transaction.amount,
                  transaction.currency,
                )}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}>
                {formatDateLong(transaction.createdAt)}
              </span>
            </div>
          </div>

          {/* Provider block */}
          {providerLabel !== "—" && (
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Payment Provider</h4>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Provider</span>
                  <span className={styles.detailValue}>{providerLabel}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Provider Reference</span>
                  <span className={styles.detailValue}>
                    {providerRef}
                    <CopyButton text={providerRef} label="Copy" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bank transfer metadata */}
          {transaction.meta?.bankName && (
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Bank Details</h4>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Bank</span>
                  <span className={styles.detailValue}>
                    {transaction.meta.bankName}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Account Number</span>
                  <span className={styles.detailValue}>
                    {transaction.meta.accountNumber}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Account Name</span>
                  <span className={styles.detailValue}>
                    {transaction.meta.accountName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wallet balance block */}
          {(transaction.balanceBefore != null ||
            transaction.balanceAfter != null) && (
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Wallet Impact</h4>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance Before</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(
                      transaction.balanceBefore || 0,
                      transaction.currency,
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance After</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(
                      transaction.balanceAfter || 0,
                      transaction.currency,
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {transaction.description && (
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Description</h4>
              <p className={styles.detailDescription}>
                {transaction.description}
              </p>
            </div>
          )}

          {/* Hidden printable receipt for Print button */}
          <div id="receipt-print" style={{ display: "none" }}>
            <div
              dangerouslySetInnerHTML={{
                __html: generateReceiptHTML(transaction).replace(
                  /<html[^>]*>|<\/html>|<body[^>]*>|<\/body>|<head[^>]*>|<\/head>|<style[^>]*>[\s\S]*?<\/style>/gi,
                  "",
                ),
              }}
            />
          </div>
        </div>

        <div className={styles.modalFullScreenFooter}>
          <button
            className={styles.modalCancel}
            onClick={onClose}
            type="button"
          >
            <FaTimes size={14} /> Close
          </button>
          <div className={styles.modalFullScreenActions}>
            <button
              className={`${styles.detailActionBtn} ${styles.detailActionPrimary}`}
              onClick={handlePrint}
              type="button"
            >
              <FaPrint size={14} /> Print
            </button>
            <button
              className={`${styles.detailActionBtn} ${styles.detailActionPrimary}`}
              onClick={handleDownloadReceipt}
              disabled={downloading}
              type="button"
            >
              <FaDownload size={14} />
              {downloading ? "Downloading..." : "Receipt"}
            </button>
            <button
              className={`${styles.detailActionBtn} ${styles.detailActionSuccess}`}
              onClick={handleShare}
              type="button"
            >
              <FaShareAlt size={14} /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────

function WalletSkeleton() {
  return (
    <div className={styles.skeletonPage}>
      <div className={styles.skeletonHeader}>
        <div>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonSubtitle} />
        </div>
        <div className={styles.skeletonActions}>
          <div className={styles.skeletonBtn} />
          <div className={styles.skeletonBtn} />
        </div>
      </div>
      <div className={styles.skeletonBalance} />
      <div className={styles.skeletonStats}>
        <div className={styles.skeletonStat} />
        <div className={styles.skeletonStat} />
        <div className={styles.skeletonStat} />
        <div className={styles.skeletonStat} />
      </div>
      <div className={styles.skeletonPanel}>
        <div className={styles.skeletonPanelHeader} />
        <div className={styles.skeletonTx} />
        <div className={styles.skeletonTx} />
        <div className={styles.skeletonTx} />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>{Icon && <Icon size={16} />}</span>
      <div className={styles.statInfo}>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

// ─── Currency Tab ─────────────────────────────────────────────────────────

function CurrencyTab({ currency, balance, isActive, onClick }) {
  const symbol = getCurrencySymbol(currency);
  const safeBalance =
    typeof balance === "number" ? balance : parseFloat(balance) || 0;
  const isZero = safeBalance === 0;

  return (
    <button
      type="button"
      className={`${styles.currencyTab} ${isActive ? styles.currencyTabActive : ""} ${isZero ? styles.currencyTabZero : ""}`}
      onClick={onClick}
      disabled={isZero}
    >
      <span className={styles.currencyTabIcon}>
        {getCurrencyIcon(currency)}
      </span>
      <span className={styles.currencyTabCode}>{currency}</span>
      <span className={styles.currencyTabBalance}>
        {symbol}
        {safeBalance.toFixed(2)}
      </span>
      {isZero && <span className={styles.currencyTabZeroBadge}>Empty</span>}
    </button>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────

function TransactionRow({ transaction }) {
  const navigate = useNavigate();

  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? "var(--green)" : "var(--red)";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const ChannelIcon = channel.icon;

  const handleClick = () => {
    navigate(`/dashboard/hirer/wallet/${transaction.id}`);
  };

  return (
    <button
      type="button"
      className={styles.transactionRow}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
        fontFamily: "var(--font-body)",
        appearance: "none",
      }}
    >
      <div className={styles.transactionIcon}>
        {getTransactionIcon(transaction.type)}
      </div>
      <div className={styles.transactionInfo}>
        <div className={styles.transactionTitle}>
          {getTransactionLabel(transaction.type)}
          <span className={styles.transactionChannelBadge}>
            <ChannelIcon size={10} /> {channel.label}
          </span>
        </div>
        <div className={styles.transactionDesc}>
          {transaction.description || transaction.reference}
        </div>
        <div className={styles.transactionMeta}>
          <span className={styles.transactionDate}>
            <FaClock size={10} /> {formatDate(transaction.createdAt)}
          </span>
          <span className={styles.transactionCurrency}>
            {transaction.currency || "NGN"}
          </span>
        </div>
      </div>
      <div className={styles.transactionAmount}>
        <div style={{ color: amountColor, fontWeight: 700 }}>
          {amountPrefix}
          {formatCurrency(
            transaction.netAmount || transaction.amount,
            transaction.currency || "NGN",
          )}
        </div>
        <div
          className={styles.transactionStatus}
          style={{
            color: getStatusColor(transaction.status),
            borderColor: getStatusColor(transaction.status),
          }}
        >
          {getStatusIcon(transaction.status)}{" "}
          {getStatusLabel(transaction.status)}
        </div>
      </div>
    </button>
  );
}

// ─── Deposit Modal ────────────────────────────────────────────────────────

function DepositModal({ isOpen, onClose, onDeposit, loading, currencies }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      alert("Minimum deposit amount is ₦100");
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeposit(numAmount, currency);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <FaPlus /> Fund Wallet
          </h3>
          <button className={styles.modalClose} onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSubtext}>
            Enter the amount you want to add to your wallet
          </p>
          <form onSubmit={handleSubmit}>
            <div className={styles.amountInputGroup}>
              <span className={styles.currencySymbol}>
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="number"
                className={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="100"
                step="100"
                required
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Currency</label>
              <select
                className={styles.formInput}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {currencies.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur} ({getCurrencySymbol(cur)})
                  </option>
                ))}
              </select>
            </div>
            <p className={styles.minAmount}>
              Minimum: {getCurrencySymbol(currency)}100
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalConfirm}
                disabled={loading || isSubmitting}
              >
                {loading || isSubmitting ? (
                  <FaSpinner className={styles.spinning} />
                ) : (
                  "Proceed to Pay"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Withdrawal Confirmation Modal ─────────────────────────────────────────

function WithdrawalConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  withdrawalData,
}) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPinError("");
    }
  }, [isOpen]);

  if (!isOpen || !withdrawalData) return null;

  const { amount, currency, bankName, accountNumber, accountName } =
    withdrawalData;
  const fee = Math.min(amount * 0.01, 100);
  const netAmount = amount - fee;
  const symbol = getCurrencySymbol(currency);

  function handleConfirmClick() {
    if (!pin || pin.length !== 4) {
      setPinError("Please enter your 4-digit withdrawal PIN");
      return;
    }
    setPinError("");
    onConfirm(pin);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalBox} ${styles.modalLarge}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <FaExclamationTriangle /> Confirm Withdrawal
          </h3>
          <button className={styles.modalClose} onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.confirmDisclaimer}>
            <FaExclamationTriangle className={styles.disclaimerIcon} />
            <p className={styles.disclaimerText}>
              Please <strong>verify your bank details carefully</strong> before
              confirming. Withdrawals cannot be reversed once approved by our
              team.
            </p>
          </div>

          <div className={styles.confirmBankDetails}>
            <h4 className={styles.confirmSectionTitle}>Bank Details</h4>
            <div className={styles.confirmDetailsGrid}>
              <div className={styles.confirmDetail}>
                <span className={styles.confirmLabel}>Bank</span>
                <span className={styles.confirmValue}>{bankName}</span>
              </div>
              <div className={styles.confirmDetail}>
                <span className={styles.confirmLabel}>Account Number</span>
                <span className={styles.confirmValue}>
                  {accountNumber}
                  <CopyButton text={accountNumber} label="Copy" />
                </span>
              </div>
              <div className={styles.confirmDetail}>
                <span className={styles.confirmLabel}>Account Name</span>
                <span className={styles.confirmValue}>{accountName}</span>
              </div>
            </div>
          </div>

          <div className={styles.confirmBreakdown}>
            <h4 className={styles.confirmSectionTitle}>Withdrawal Breakdown</h4>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Amount</span>
              <span className={styles.breakdownValue}>
                {symbol}
                {amount.toFixed(2)}
              </span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Platform Fee (1%)</span>
              <span
                className={styles.breakdownValue}
                style={{ color: "var(--orange)" }}
              >
                -{symbol}
                {fee.toFixed(2)}
              </span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
              <span className={styles.breakdownLabel}>You'll Receive</span>
              <span
                className={styles.breakdownValue}
                style={{
                  color: "var(--green)",
                  fontWeight: 900,
                  fontSize: "1.2rem",
                }}
              >
                {symbol}
                {netAmount.toFixed(2)}
                <CopyButton
                  text={`${symbol}${netAmount.toFixed(2)}`}
                  label="Copy"
                />
              </span>
            </div>
          </div>

          <div className={styles.confirmPinBlock}>
            <label className={styles.confirmSectionTitle}>Withdrawal PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              placeholder="••••"
              className={styles.pinInput}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
            />
            <p className={styles.pinHint}>
              Enter the same 4-digit PIN you use for worker, referral, and
              campaign withdrawals.
            </p>
            {pinError && (
              <p className={styles.pinError}>
                <FaExclamationTriangle size={12} /> {pinError}
              </p>
            )}
          </div>

          <div className={styles.confirmWarning}>
            <FaExclamationTriangle size={16} />
            <span>
              This request will be reviewed by our admin team. Processing may
              take 24-48 hours.
            </span>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.modalConfirm} ${styles.confirmWithdrawBtn}`}
              onClick={handleConfirmClick}
              disabled={loading}
            >
              {loading ? (
                <FaSpinner className={styles.spinning} />
              ) : (
                <>
                  <FaCheck /> Confirm Withdrawal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────

function WithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  loading,
  balance,
  currency,
  currencies,
}) {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState(null);

  const handleWithdraw = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      alert(`Minimum withdrawal amount is ${getCurrencySymbol(currency)}100`);
      return;
    }
    if (numAmount > balance) {
      alert(
        `Insufficient balance. You have ${getCurrencySymbol(currency)}${balance.toFixed(2)}`,
      );
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      alert("Please fill in all bank details");
      return;
    }

    setWithdrawalData({
      amount: numAmount,
      currency,
      bankName,
      accountNumber,
      accountName,
      bankCode,
    });
    setShowConfirm(true);
  };

  const handleConfirmWithdrawal = (pin) => {
    if (!withdrawalData) return;
    onWithdraw({ ...withdrawalData, pin });
    setShowConfirm(false);
    onClose();
  };

  const handleClose = () => {
    setShowConfirm(false);
    setWithdrawalData(null);
    onClose();
  };

  if (!isOpen) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              <FaMinus /> Withdraw Funds
            </h3>
            <button
              className={styles.modalClose}
              onClick={handleClose}
              type="button"
            >
              <FaTimes />
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.modalSubtext}>
              Withdraw funds from your {currency} wallet
            </p>
            <div className={styles.balanceDisplay}>
              Available Balance: {formatCurrency(balance, currency)}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleWithdraw();
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount ({currency})</label>
                <div className={styles.amountInputGroup}>
                  <span className={styles.currencySymbol}>{symbol}</span>
                  <input
                    type="number"
                    className={styles.amountInput}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="100"
                    step="100"
                    required
                  />
                </div>
                <p className={styles.feeNote}>Fee: 1% (max {symbol}100)</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bank Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. GTBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Account Number</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Enter 10-digit account number"
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  maxLength="10"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Account Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Enter account holder name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bank Code (Optional)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Enter bank code"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancel}
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.modalConfirm} ${styles.withdrawBtn}`}
                  disabled={loading}
                >
                  {loading ? (
                    <FaSpinner className={styles.spinning} />
                  ) : (
                    "Review Withdrawal"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <WithdrawalConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setWithdrawalData(null);
        }}
        onConfirm={handleConfirmWithdrawal}
        loading={loading}
        withdrawalData={withdrawalData}
      />
    </>
  );
}

// ─── Message Modal ────────────────────────────────────────────────────────

function MessageModal({ isOpen, onClose, title, message, type = "success" }) {
  if (!isOpen) return null;

  const icons = {
    success: <FaCheckCircle className={styles.messageIconSuccess} />,
    error: <FaTimesCircle className={styles.messageIconError} />,
    info: <FaClock className={styles.messageIconInfo} />,
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.messageHeader}>
          {icons[type] || icons.success}
          <h3 className={styles.messageTitle}>{title}</h3>
        </div>
        <div className={styles.messageBody}>
          <p className={styles.messageText}>{message}</p>
        </div>
        <div className={styles.messageActions}>
          <button className={styles.messageBtn} onClick={onClose} type="button">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function HirerWallet() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currencies, setCurrencies] = useState(["NGN"]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageConfig, setMessageConfig] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("NGN");
  const [currencyBalances, setCurrencyBalances] = useState({ NGN: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const pendingVerifyRef = useRef(null);

  // ─── Show message modal ──────────────────────────────────────────────────

  const showMessage = (title, message, type = "success") => {
    setMessageConfig({ title, message, type });
    setShowMessageModal(true);
  };

  // ─── Fetch wallet data ────────────────────────────────────────────────────

  const fetchWallet = useCallback(
    async (showLoadingState = true) => {
      if (showLoadingState) setLoading(true);
      setRefreshing(true);
      try {
        let balances = { NGN: 0 };
        let supportedCurrencies = ["NGN"];
        let walletData = {
          balance: 0,
          currency: "NGN",
          totalDeposited: 0,
          totalSpent: 0,
          totalWithdrawn: 0,
        };

        try {
          const balanceRes = await api.get("/wallet/balances");
          if (balanceRes.data?.data?.balances) {
            const rawBalances = balanceRes.data.data.balances;

            if (rawBalances.NGN) {
              const ngnData = rawBalances.NGN;
              walletData = {
                balance:
                  typeof ngnData.balance === "number"
                    ? ngnData.balance
                    : parseFloat(ngnData.balance) || 0,
                currency: "NGN",
                totalDeposited:
                  typeof ngnData.totalDeposited === "number"
                    ? ngnData.totalDeposited
                    : parseFloat(ngnData.totalDeposited) || 0,
                totalSpent:
                  typeof ngnData.totalSpent === "number"
                    ? ngnData.totalSpent
                    : parseFloat(ngnData.totalSpent) || 0,
                totalWithdrawn:
                  typeof ngnData.totalWithdrawn === "number"
                    ? ngnData.totalWithdrawn
                    : parseFloat(ngnData.totalWithdrawn) || 0,
              };
            }

            Object.keys(rawBalances).forEach((key) => {
              const val = rawBalances[key];
              if (typeof val === "object" && val !== null) {
                balances[key] =
                  typeof val.balance === "number"
                    ? val.balance
                    : parseFloat(val.balance) || 0;
              } else {
                balances[key] =
                  typeof val === "number" ? val : parseFloat(val) || 0;
              }
            });
          }

          if (balanceRes.data?.data?.currencies) {
            supportedCurrencies = balanceRes.data.data.currencies;
          }
        } catch (err) {
          console.log("Balances endpoint not available, using fallback");
          const walletRes = await api.get("/wallet/balance");
          walletData = walletRes.data.data;
          balances = { NGN: walletData.balance || 0 };
        }

        try {
          const currenciesRes = await api.get("/wallet/currencies");
          if (currenciesRes.data?.data?.currencies) {
            supportedCurrencies = currenciesRes.data.data.currencies;
          }
        } catch (err) {
          console.log("Using default currencies");
        }

        supportedCurrencies.forEach((cur) => {
          if (balances[cur] === undefined) {
            balances[cur] = 0;
          }
        });

        setWallet(walletData);
        setCurrencyBalances(balances);
        setCurrencies(supportedCurrencies);

        const txRes = await api.get("/wallet/transactions", {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            type: filterType || undefined,
            status: filterStatus || undefined,
          },
        });

        const txData = txRes.data.data;
        setTransactions(txData.transactions || []);
        setPagination(
          txData.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 1,
          },
        );

        const activeCur =
          Object.keys(balances).find((cur) => balances[cur] > 0) || "NGN";
        setActiveCurrency(activeCur);
      } catch (err) {
        console.error("Failed to fetch wallet:", err);
        if (err.response?.status === 404) {
          setWallet({
            balance: 0,
            currency: "NGN",
            totalDeposited: 0,
            totalSpent: 0,
            totalWithdrawn: 0,
          });
          setCurrencyBalances({ NGN: 0 });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.page, filterType, filterStatus],
  );

  // ─── On mount: verify any pending deposit reference ──────────────────────

  useEffect(() => {
    // ✅ Priority 1: check ?ref= in the URL (after Flutterwave redirect)
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");

    // ✅ Priority 2: check sessionStorage (fallback if redirect back didn't carry ref)
    const storedRef = sessionStorage.getItem("pendingDepositReference");
    const pendingRef = urlRef || storedRef;

    if (pendingRef && !pendingVerifyRef.current) {
      pendingVerifyRef.current = pendingRef;

      // Clean the URL so a refresh doesn't re-verify
      if (urlRef) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("ref");
        window.history.replaceState({}, "", cleanUrl.toString());
      }

      api
        .get(`/wallet/verify/${pendingRef}`)
        .then((res) => {
          const status = res.data.data?.status;
          if (status === "SUCCESS") {
            showMessage(
              "Deposit Confirmed 🎉",
              `Your wallet has been funded with ${formatCurrency(res.data.data.amount, res.data.data.currency)}.`,
              "success",
            );
            sessionStorage.removeItem("pendingDepositReference");
          } else if (status === "FAILED") {
            showMessage(
              "Deposit Failed",
              "Your deposit attempt did not complete. Please try again.",
              "error",
            );
            sessionStorage.removeItem("pendingDepositReference");
          } else if (status === "PENDING") {
            // Still verifying — retry once after a short delay
            setTimeout(async () => {
              try {
                const retry = await api.get(`/wallet/verify/${pendingRef}`);
                if (retry.data.data?.status === "SUCCESS") {
                  showMessage(
                    "Deposit Confirmed 🎉",
                    `Your wallet has been funded with ${formatCurrency(retry.data.data.amount, retry.data.data.currency)}.`,
                    "success",
                  );
                  sessionStorage.removeItem("pendingDepositReference");
                  await fetchWallet(false);
                } else {
                  showMessage(
                    "Verification Pending",
                    "We are still verifying your payment. Refresh the page or check your balance shortly.",
                    "info",
                  );
                }
              } catch {}
            }, 4000);
          }
        })
        .catch(() => {})
        .finally(() => {
          fetchWallet(true);
        });
    } else {
      fetchWallet(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingVerifyRef.current) {
      fetchWallet(false);
    }
  }, [pagination.page, filterType, filterStatus, fetchWallet]);

  const refreshWallet = () => {
    fetchWallet(false);
  };

  // ─── Get current currency balance ────────────────────────────────────────

  const getCurrentBalance = () => {
    const bal = currencyBalances[activeCurrency];
    return typeof bal === "number" ? bal : parseFloat(bal) || 0;
  };

  // ─── Deposit ──────────────────────────────────────────────────────────────

  const handleDeposit = async (amount, currency) => {
    setSubmitting(true);
    try {
      const res = await api.post("/wallet/fund", { amount, currency });
      const { paymentLink, reference } = res.data.data;

      if (!paymentLink) {
        showMessage(
          "Payment Initiated",
          "Please check your email for payment instructions.",
          "info",
        );
        setShowDepositModal(false);
        return;
      }

      setShowDepositModal(false);

      // Store for the redirect-back verify flow, but we won't count on it
      sessionStorage.setItem("pendingDepositReference", reference);

      // Open Flutterwave in a new tab so this tab keeps polling
      window.open(paymentLink, "_blank");

      // ✅ Poll the wallet balance directly — do NOT depend on verifyTransaction
      // succeeding via Flutterwave's verify API (which may 404 for old refs or
      // test-mode transactions). Instead, hit the manual credit path if the
      // webhook never fires. On the first pass, we also call verifyTransaction
      // as a best-effort trigger for the credit.
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes
      let finished = false;

      // Best-effort: trigger verify immediately (backend may auto-credit
      // in test mode, or verify with FLW in production).
      api.get(`/wallet/verify/${reference}`).catch(() => {});

      const poll = setInterval(async () => {
        if (finished) return;
        attempts++;

        try {
          const balanceRes = await api.get("/wallet/balances");
          const raw = balanceRes.data.data?.balances || {};
          const ngnBalance =
            typeof raw[currency] === "object" && raw[currency] !== null
              ? Number(raw[currency].balance) || 0
              : Number(raw[currency]) || 0;

          const existingBalance =
            typeof currencyBalances[currency] === "number"
              ? currencyBalances[currency]
              : 0;

          // If the balance has grown by at least ~amount, it's credited
          if (ngnBalance >= existingBalance + amount - 0.01) {
            finished = true;
            clearInterval(poll);
            sessionStorage.removeItem("pendingDepositReference");
            showMessage(
              "Deposit Confirmed 🎉",
              `Your wallet has been funded with ${formatCurrency(amount, currency)}.`,
              "success",
            );
            await fetchWallet(false);
            return;
          }

          // Every 10th attempt, re-trigger verify in case the first call
          // failed silently or Flutterwave was slow to settle the tx
          if (attempts % 10 === 0) {
            try {
              const verifyRes = await api.get(`/wallet/verify/${reference}`);
              if (verifyRes.data.data?.status === "SUCCESS") {
                finished = true;
                clearInterval(poll);
                sessionStorage.removeItem("pendingDepositReference");
                showMessage(
                  "Deposit Confirmed 🎉",
                  `Your wallet has been funded with ${formatCurrency(amount, currency)}.`,
                  "success",
                );
                await fetchWallet(false);
                return;
              }
            } catch {
              /* swallow */
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(poll);
            showMessage(
              "Verification Pending",
              "We're still waiting for Flutterwave to confirm. Your wallet will update automatically once the payment is verified by them. If you don't see it within 10 minutes, contact support with your reference: " +
                reference,
              "info",
            );
          }
        } catch {
          /* swallow and retry */
        }
      }, 5000);
    } catch (err) {
      showMessage(
        "Deposit Failed",
        err.response?.data?.message || "Failed to initiate deposit",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Withdraw ─────────────────────────────────────────────────────────────

  const handleWithdraw = async (data) => {
    setSubmitting(true);
    try {
      const res = await api.post("/wallet/withdraw", data);
      const fee = Math.min(data.amount * 0.01, 100);
      const netAmount = data.amount - fee;

      showMessage(
        "Withdrawal Request Submitted ✅",
        `Your withdrawal of ${formatCurrency(data.amount, data.currency)} has been submitted for admin approval.\n\n` +
          `Fee: ${formatCurrency(fee, data.currency)}\n` +
          `Net Amount: ${formatCurrency(netAmount, data.currency)}\n` +
          `Reference: ${res.data.data.reference}`,
        "success",
      );
      await fetchWallet(false);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Failed to process withdrawal";
      if (status === 401 || status === 403 || status === 429) {
        showMessage("PIN Verification Failed", msg, "error");
      } else {
        showMessage("Withdrawal Failed", msg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Filter transactions ─────────────────────────────────────────────────

  const filteredTransactions = transactions.filter((tx) => {
    if (activeCurrency && tx.currency && tx.currency !== activeCurrency) {
      return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.reference?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query) ||
      getTransactionLabel(tx.type).toLowerCase().includes(query)
    );
  });

  const availableCurrencies = Object.keys(currencyBalances).filter(
    (cur) =>
      (typeof currencyBalances[cur] === "number"
        ? currencyBalances[cur]
        : parseFloat(currencyBalances[cur]) || 0) > 0,
  );

  if (loading) {
    return (
      <HirerLayout>
        <WalletSkeleton />
      </HirerLayout>
    );
  }

  const currentBalance = getCurrentBalance();
  const hasBalance = currentBalance > 0;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              <FaWallet /> Wallet
            </h1>
            <p className={styles.subtitle}>
              Manage your funds across multiple currencies
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={refreshWallet}
              disabled={refreshing}
              aria-label="Refresh wallet"
            >
              {refreshing ? <FaSpinner className={styles.spinning} /> : "⟳"}
            </button>
          </div>
        </div>

        <div className={styles.currencyTabsContainer}>
          <div className={styles.currencyTabs}>
            {currencies.map((cur) => {
              const balance =
                typeof currencyBalances[cur] === "number"
                  ? currencyBalances[cur]
                  : parseFloat(currencyBalances[cur]) || 0;
              const isActive = cur === activeCurrency;
              return (
                <CurrencyTab
                  key={cur}
                  currency={cur}
                  balance={balance}
                  isActive={isActive}
                  onClick={() => setActiveCurrency(cur)}
                />
              );
            })}
          </div>
          <div className={styles.currencyTabHint}>
            {availableCurrencies.length === 0 ? (
              <span className={styles.hintText}>
                💡 Fund your wallet to see currency balances
              </span>
            ) : (
              <span className={styles.hintText}>
                {availableCurrencies.length} currency
                {availableCurrencies.length > 1 ? "ies" : ""} available
              </span>
            )}
          </div>
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceInfo}>
            <div className={styles.balanceLabel}>
              Available Balance ({activeCurrency})
              {!hasBalance && (
                <span className={styles.balanceZeroBadge}>Empty</span>
              )}
            </div>
            <div className={styles.balanceAmount}>
              {formatCurrency(currentBalance, activeCurrency)}
              {currentBalance > 0 && (
                <CopyButton
                  text={`${getCurrencySymbol(activeCurrency)}${currentBalance.toFixed(2)}`}
                  label="Copy"
                />
              )}
            </div>
            <div className={styles.balanceMeta}>
              {currencies.map((cur) => {
                const bal =
                  typeof currencyBalances[cur] === "number"
                    ? currencyBalances[cur]
                    : parseFloat(currencyBalances[cur]) || 0;
                if (bal === 0) return null;
                return (
                  <span key={cur}>
                    {cur}: {formatCurrency(bal, cur)}
                  </span>
                );
              })}
            </div>
          </div>
          <div className={styles.balanceQuickActions}>
            <button
              type="button"
              className={styles.quickAction}
              onClick={() => setShowDepositModal(true)}
            >
              <FaPlus /> Add Money
            </button>
            <button
              type="button"
              className={`${styles.quickAction} ${!hasBalance ? styles.quickActionDisabled : ""}`}
              onClick={() => hasBalance && setShowWithdrawModal(true)}
              disabled={!hasBalance}
            >
              <FaMinus /> Withdraw
            </button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard
            icon={FaArrowDown}
            label="Total Deposits"
            value={formatCurrency(wallet?.totalDeposited || 0, "NGN")}
            accent="green"
          />
          <StatCard
            icon={FaCreditCard}
            label="Total Spent"
            value={formatCurrency(wallet?.totalSpent || 0, "NGN")}
            accent="orange"
          />
          <StatCard
            icon={FaArrowUp}
            label="Total Withdrawn"
            value={formatCurrency(wallet?.totalWithdrawn || 0, "NGN")}
          />
          <StatCard
            icon={FaClock}
            label="Transactions"
            value={pagination.total || 0}
          />
        </div>

        <div className={styles.transactionsSection}>
          <div className={styles.transactionsHeader}>
            <h2 className={styles.sectionTitle}>
              Transaction History {activeCurrency && `(${activeCurrency})`}
            </h2>
            <div className={styles.transactionControls}>
              <div className={styles.searchWrapper}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className={styles.filterSelect}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAWAL">Withdrawals</option>
                <option value="PAYMENT">Payments</option>
                <option value="SUBSCRIPTION">Subscriptions</option>
                <option value="REFUND">Refunds</option>
              </select>
              <select
                className={styles.filterSelect}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className={styles.emptyState}>
              <FaWallet size={48} />
              <h3>No transactions found</h3>
              <p>
                Your transaction history for {activeCurrency} will appear here
              </p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {filteredTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onView={setSelectedTransaction}
                />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
              >
                <FaArrowLeft /> Prev
              </button>
              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
              >
                Next <FaArrowRight />
              </button>
            </div>
          )}
        </div>

        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onDeposit={handleDeposit}
          loading={submitting}
          currencies={currencies}
        />

        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onWithdraw={handleWithdraw}
          loading={submitting}
          balance={currentBalance}
          currency={activeCurrency}
          currencies={currencies}
        />

        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          title={messageConfig.title}
          message={messageConfig.message}
          type={messageConfig.type}
        />

        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      </div>
    </HirerLayout>
  );
}
