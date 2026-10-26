// src/pages/hirer/HirerWallet.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  FaChevronRight,
  FaGlobe,
  FaLock,
  FaChevronDown,
  FaChevronUp,
  FaInfo,
} from "react-icons/fa";

import { SiBitcoin } from "react-icons/si";
import { FiMail, FiSmartphone } from "react-icons/fi";

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

// ─── Wallet withdrawal fee (mirrors backend FEE_CONFIG.computeWalletWithdrawalFee) ──
const NGN_WALLET_WITHDRAWAL_FEE_RATE = 0.01;
const NGN_WALLET_WITHDRAWAL_FEE_CAP = 100;
const FOREIGN_WALLET_WITHDRAWAL_FEE_RATE = 0.02;

function getWalletWithdrawalFee(amount, currency = "NGN") {
  const cur = (currency || "NGN").toUpperCase();
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) {
    return { fee: 0, netAmount: 0, feeRate: 0, feePercent: 0 };
  }

  let feeRate;
  let fee;

  if (cur === "NGN") {
    feeRate = NGN_WALLET_WITHDRAWAL_FEE_RATE;
    fee = numAmount * feeRate;
    if (NGN_WALLET_WITHDRAWAL_FEE_CAP > 0) {
      fee = Math.min(fee, NGN_WALLET_WITHDRAWAL_FEE_CAP);
    }
  } else {
    feeRate = FOREIGN_WALLET_WITHDRAWAL_FEE_RATE;
    fee = numAmount * feeRate;
  }

  fee = parseFloat(fee.toFixed(2));
  const netAmount = parseFloat((numAmount - fee).toFixed(2));
  const feePercent = Math.round(feeRate * 100);

  return { fee, netAmount, feeRate, feePercent };
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

// ─── Transaction Row (Refund-style card) ─────────────────────────────────

function TransactionRow({ transaction }) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? "var(--green)" : "var(--red)";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const ChannelIcon = channel.icon;

  return (
    <Link
      to={`/dashboard/hirer/wallet/${transaction.id}`}
      className={styles.refundItem}
    >
      <div className={styles.refundItemMain}>
        <div className={styles.refundItemIcon}>
          <ChannelIcon />
        </div>
        <div className={styles.refundItemInfo}>
          <div className={styles.refundItemTop}>
            <span className={styles.refundItemTitle}>
              {getTransactionLabel(transaction.type)}
            </span>
            <span className={styles.refundItemReference}>
              {transaction.reference}
            </span>
          </div>
          <div className={styles.refundItemMeta}>
            <span
              className={styles.refundItemAmount}
              style={{ color: amountColor }}
            >
              {amountPrefix}
              {formatCurrency(
                transaction.netAmount || transaction.amount,
                transaction.currency || "NGN",
              )}
            </span>
            <span className={styles.refundItemType}>{channel.label}</span>
            <span className={styles.refundItemDate}>
              <FaClock size={12} />
              {new Date(transaction.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.refundItemRight}>
        <span
          className={styles.statusBadge}
          style={{ color: getStatusColor(transaction.status) }}
        >
          {getStatusIcon(transaction.status)}
          {getStatusLabel(transaction.status)}
        </span>
        <FaChevronRight className={styles.refundItemArrow} />
      </div>
    </Link>
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
  const symbol = getCurrencySymbol(currency);

  // ✅ Currency-aware withdrawal fee
  const { fee, netAmount, feePercent } = getWalletWithdrawalFee(
    amount,
    currency,
  );

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
              team. See our{" "}
              <Link
                to="/refund-policy"
                style={{
                  color: "var(--orange)",
                  textDecoration: "underline",
                  fontWeight: 600,
                }}
              >
                Refund Policy
              </Link>{" "}
              for details.
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
              <span className={styles.breakdownLabel}>
                Platform Fee ({feePercent}%)
              </span>
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

// ─── Worker-style Withdraw Modal ──────────────────────────────────────────

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", type: "commercial" },
  { name: "Ecobank Nigeria", code: "050", type: "commercial" },
  { name: "Fidelity Bank", code: "070", type: "commercial" },
  { name: "First Bank of Nigeria", code: "011", type: "commercial" },
  { name: "First City Monument Bank (FCMB)", code: "214", type: "commercial" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058", type: "commercial" },
  { name: "Stanbic IBTC Bank", code: "221", type: "commercial" },
  { name: "Sterling Bank", code: "232", type: "commercial" },
  { name: "United Bank for Africa (UBA)", code: "033", type: "commercial" },
  { name: "Union Bank of Nigeria", code: "032", type: "commercial" },
  { name: "Unity Bank", code: "215", type: "commercial" },
  { name: "Wema Bank / ALAT", code: "035", type: "commercial" },
  { name: "Zenith Bank", code: "057", type: "commercial" },
  { name: "Citibank Nigeria", code: "023", type: "commercial" },
  { name: "Kuda Bank", code: "090267", type: "digital" },
  { name: "Moniepoint MFB", code: "50515", type: "digital" },
  { name: "OPay Digital Services", code: "999992", type: "digital" },
  { name: "PalmPay", code: "100033", type: "digital" },
  { name: "Paga", code: "327", type: "digital" },
].sort((a, b) => a.name.localeCompare(b.name));

const CURRENCY_METHODS = {
  NGN: [
    {
      key: "ng_bank",
      method: "bank_transfer",
      label: "Nigerian Bank / Fintech",
      Icon: FaCreditCard,
      desc: "GTBank, Kuda, OPay, Access, Zenith, UBA, PalmPay +70 more",
      country: "NG",
      hasBankList: true,
    },
    {
      key: "ng_mtn",
      method: "mobile_money",
      label: "MTN MoMo Nigeria",
      Icon: FiSmartphone,
      desc: "MTN mobile money",
      country: "NG",
      provider: "MTN",
    },
    {
      key: "ng_airtel",
      method: "mobile_money",
      label: "Airtel Money Nigeria",
      Icon: FiSmartphone,
      desc: "Airtel mobile money",
      country: "NG",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      Icon: SiBitcoin,
      desc: "Stablecoin — any country",
    },
  ],
};

const INTL_METHODS = [
  {
    key: "intl_bank",
    method: "bank_transfer",
    label: "International Wire",
    Icon: FaGlobe,
    desc: "SWIFT / IBAN — 150+ countries",
    isInternational: true,
  },
  {
    key: "crypto",
    method: "crypto",
    label: "USDC / USDT",
    Icon: SiBitcoin,
    desc: "Stablecoin — any country",
  },
];

const CRYPTO_NETWORKS = [
  { value: "BSC", label: "BNB Smart Chain (BSC)" },
  { value: "ETH", label: "Ethereum (ERC-20)" },
  { value: "TRC20", label: "Tron (TRC-20)" },
  { value: "POLYGON", label: "Polygon (MATIC)" },
  { value: "SOLANA", label: "Solana (SOL)" },
];

const CRYPTO_TOKENS = ["USDC", "USDT", "BTC", "ETH"];

const BANK_TYPE_LABELS = {
  commercial: { label: "Commercial", color: "#818cf8" },
  digital: { label: "Digital/Fintech", color: "#f97316" },
  microfinance: { label: "Microfinance", color: "#22c55e" },
  merchant: { label: "Merchant", color: "#a78bfa" },
};

function BankDropdown({ banks, value, onChange, loading, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  const filtered = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.includes(search) ||
      (b.keywords && b.keywords.includes(search.toLowerCase())),
  );
  const selected = banks.find((b) => b.code === value);

  const grouped = search.trim()
    ? null
    : ["digital", "commercial", "microfinance", "merchant"].reduce(
        (acc, type) => {
          const items = filtered.filter(
            (b) => (b.type ?? "commercial") === type,
          );
          if (items.length) acc.push({ type, items });
          return acc;
        },
        [],
      );

  useEffect(() => {
    const fn = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className={styles.bankDropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.bankDropdownBtn} ${open ? styles.bankDropdownBtnOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <div className={styles.bankDropdownBtnInner}>
          {loading ? (
            <span className={styles.bankDropdownLoading}>Loading banks…</span>
          ) : selected ? (
            <>
              <span className={styles.bankDropdownSelected}>
                {selected.name}
              </span>
              {selected.type && BANK_TYPE_LABELS[selected.type] && (
                <span
                  className={styles.bankTypeChip}
                  style={{ color: BANK_TYPE_LABELS[selected.type].color }}
                >
                  {BANK_TYPE_LABELS[selected.type].label}
                </span>
              )}
            </>
          ) : (
            <span className={styles.bankDropdownPlaceholder}>
              {placeholder ?? "Select bank"}
            </span>
          )}
        </div>
        <span className={styles.bankDropdownChevron}>
          {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className={styles.bankDropdownMenu}>
          <div className={styles.bankSearchWrap}>
            <span className={styles.bankSearchIcon}>
              <FaSearch size={14} />
            </span>
            <input
              className={styles.bankSearchInput}
              placeholder={`Search ${banks.length} banks…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                className={styles.bankSearchClear}
                onClick={() => setSearch("")}
                type="button"
              >
                <FaTimes size={13} />
              </button>
            )}
          </div>
          {search && (
            <div className={styles.bankResultCount}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "
              {search}"
            </div>
          )}
          <div className={styles.bankList}>
            {filtered.length === 0 ? (
              <div className={styles.bankNoResults}>
                <span>
                  <FaSearch size={24} />
                </span>
                <p>No bank found for "{search}"</p>
                <p className={styles.bankNoResultsSub}>
                  Try a shorter name or bank code
                </p>
              </div>
            ) : search.trim() ? (
              filtered.map((b) => (
                <BankOption
                  key={b.code}
                  bank={b}
                  selected={value === b.code}
                  onSelect={(b) => {
                    onChange(b);
                    setOpen(false);
                    setSearch("");
                  }}
                />
              ))
            ) : (
              grouped?.map(({ type, items }) => (
                <div key={type} className={styles.bankGroup}>
                  <div
                    className={styles.bankGroupHeader}
                    style={{ color: BANK_TYPE_LABELS[type]?.color }}
                  >
                    {BANK_TYPE_LABELS[type]?.label ?? type} ({items.length})
                  </div>
                  {items.map((b) => (
                    <BankOption
                      key={b.code}
                      bank={b}
                      selected={value === b.code}
                      onSelect={(b) => {
                        onChange(b);
                        setOpen(false);
                        setSearch("");
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BankOption({ bank, selected, onSelect }) {
  const typeMeta = BANK_TYPE_LABELS[bank.type ?? "commercial"];
  return (
    <button
      type="button"
      className={`${styles.bankOption} ${selected ? styles.bankOptionSelected : ""}`}
      onClick={() => onSelect(bank)}
    >
      <span className={styles.bankOptionName}>{bank.name}</span>
      <div className={styles.bankOptionRight}>
        {typeMeta && (
          <span
            className={styles.bankOptionType}
            style={{ color: typeMeta.color }}
          >
            {typeMeta.label}
          </span>
        )}
        <span className={styles.bankOptionCode}>{bank.code}</span>
      </div>
    </button>
  );
}

function WorkerStyleWithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  loading,
  balance,
  currency,
  currencies,
}) {
  const [selMethod, setSelMethod] = useState(null);
  const [form, setForm] = useState({});
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState(null);
  const [error, setError] = useState("");

  const methods = CURRENCY_METHODS[currency?.toUpperCase()] ?? INTL_METHODS;

  useEffect(() => {
    setSelMethod(methods[0]);
    setForm({});
    setVerifiedName(null);
    setVerifyErr("");
  }, [currency]);

  useEffect(() => {
    if (!selMethod?.hasBankList) {
      setBanks([]);
      return;
    }
    const country = selMethod.country ?? "NG";
    setBanksLoading(true);

    api
      .get(`/payments/banks?country=${country}`)
      .then((r) => {
        let apiBanks = r.data.data?.banks ?? [];
        const uniqueBanks = Array.from(
          new Map(apiBanks.map((b) => [b.code, b])).values(),
        );
        const processedBanks = uniqueBanks.map((b) => {
          let keywords = "";
          const lowerName = b.name.toLowerCase();
          if (lowerName.includes("paycom") || lowerName.includes("opay")) {
            keywords = "opay paycom";
          }
          if (lowerName.includes("kuda")) keywords = "kuda";
          return { ...b, type: b.type || "commercial", keywords };
        });
        setBanks(processedBanks.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => {
        console.warn("Bank API failed. Using fallback.", err);
        if (country === "NG") {
          const uniqueFallback = Array.from(
            new Map(NIGERIAN_BANKS.map((b) => [b.code, b])).values(),
          );
          const fallbackBanks = uniqueFallback.map((b) => {
            let keywords = "";
            const lowerName = b.name.toLowerCase();
            if (lowerName.includes("opay")) keywords = "opay paycom";
            return { ...b, keywords };
          });
          setBanks(fallbackBanks);
        } else {
          setBanks([]);
          setError("Could not load bank list. Please try again later.");
        }
      })
      .finally(() => setBanksLoading(false));
  }, [selMethod]);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyErr("");
  }, [form.accountNumber, form.bankCode]);

  function setF(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function verifyAccount() {
    if (!form.accountNumber || !form.bankCode) {
      setVerifyErr("Enter account number and select a bank first.");
      return;
    }
    setVerifying(true);
    setVerifyErr("");
    setVerifiedName(null);
    try {
      const res = await api.post("/payments/verify-account", {
        accountNumber: form.accountNumber,
        bankCode: form.bankCode,
        country: selMethod?.country ?? "NG",
      });
      setVerifiedName(res.data.data.accountName);
    } catch (e) {
      setVerifyErr(
        e.response?.data?.message ?? "Account not found. Check details.",
      );
    } finally {
      setVerifying(false);
    }
  }

  function handleReview() {
    setError("");

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt < 1) return setError("Minimum withdrawal is 1 unit.");
    if (amt > balance)
      return setError(
        `Exceeds available balance (${formatCurrency(balance, currency)}).`,
      );
    if (!selMethod) return setError("Select a payout method.");

    const m = selMethod.method;
    if (m === "bank_transfer" && !selMethod.isInternational) {
      if (!form.bankCode) return setError("Select a bank.");
      if (!form.accountNumber) return setError("Enter account number.");
      if (!verifiedName)
        return setError("Verify your account name before proceeding.");
    }
    if (m === "bank_transfer" && selMethod.isInternational) {
      if (!form.accountNumber) return setError("Enter account / IBAN number.");
      if (!form.swiftBic) return setError("Enter SWIFT / BIC code.");
      if (!form.accountName) return setError("Enter account holder name.");
    }
    if (m === "mobile_money") {
      if (!form.mobileNumber) return setError("Enter mobile number.");
    }
    if (m === "crypto") {
      if (!form.cryptoAddress) return setError("Enter wallet address.");
      if (!form.cryptoToken) return setError("Select crypto token.");
      if (!form.cryptoNetwork) return setError("Select network.");
    }

    const payload = {
      amount: amt,
      currency: currency.toUpperCase(),
      method: m,
      country: selMethod.country ?? "INTL",
    };

    if (m === "bank_transfer" && !selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: verifiedName ?? form.accountName,
      });
    } else if (m === "bank_transfer" && selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.swiftBic,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        swiftBic: form.swiftBic,
        routingNumber: form.routingNumber ?? "",
      });
    } else if (m === "mobile_money") {
      Object.assign(payload, {
        mobileNumber: form.mobileNumber,
        mobileName: form.mobileName ?? "",
        mobileProvider: selMethod.provider ?? form.mobileProvider ?? "",
      });
    } else if (m === "crypto") {
      Object.assign(payload, {
        cryptoAddress: form.cryptoAddress,
        cryptoCurrency: form.cryptoToken ?? "USDT",
        cryptoNetwork: form.cryptoNetwork ?? "BSC",
      });
    }

    setWithdrawalData(payload);
    setShowConfirm(true);
  }

  const handleConfirmWithdrawal = (confirmedPin) => {
    if (!withdrawalData) return;
    onWithdraw({ ...withdrawalData, pin: confirmedPin });
    setShowConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={styles.formModal}>
          <div className={styles.formModalHeader}>
            <h2 className={styles.formModalTitle}>Request Payout</h2>
            <button
              className={styles.modalClose}
              onClick={onClose}
              type="button"
            >
              <FaTimes size={14} />
            </button>
          </div>

          <form
            className={styles.payoutForm}
            onSubmit={(e) => e.preventDefault()}
          >
            <div className={styles.formSection}>
              <p className={styles.formSectionLabel}>
                Withdraw from {currency} Wallet
              </p>
              <div className={styles.selectedCurrencyBar}>
                <div className={styles.selectedCurrencyLeft}>
                  <span className={styles.selectedCurrencyFlag}>{symbol}</span>
                  <div>
                    <span className={styles.selectedCurrencyName}>
                      {currency} Wallet
                    </span>
                    <span className={styles.selectedCurrencyCode}>
                      {currency}
                    </span>
                  </div>
                </div>
                <div className={styles.selectedCurrencyBalance}>
                  <span className={styles.selectedCurrencyBalLabel}>
                    Available
                  </span>
                  <span className={styles.selectedCurrencyBalAmt}>
                    {formatCurrency(balance, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <p className={styles.formSectionLabel}>Payout Method</p>
              <div className={styles.methodGrid}>
                {methods.map((m) => {
                  const IconComp = m.Icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      className={`${styles.methodCard} ${selMethod?.key === m.key ? styles.methodCardActive : ""}`}
                      onClick={() => {
                        setSelMethod(m);
                        setForm({});
                        setVerifiedName(null);
                      }}
                    >
                      <span className={styles.methodCardIcon}>
                        <IconComp size={22} />
                      </span>
                      <span className={styles.methodCardLabel}>{m.label}</span>
                      <span className={styles.methodCardDesc}>{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selMethod && (
              <div className={styles.formSection}>
                <p className={styles.formSectionLabel}>Payout Details</p>

                {selMethod.method === "bank_transfer" &&
                  !selMethod.isInternational && (
                    <div className={styles.fieldsStack}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>
                          Bank / Fintech *
                        </label>
                        <BankDropdown
                          banks={banks}
                          loading={banksLoading}
                          value={form.bankCode}
                          onChange={(b) => {
                            setF("bankCode", b.code);
                            setF("bankName", b.name);
                          }}
                          placeholder="Select bank, Kuda, OPay…"
                        />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>
                          Account Number *
                        </label>
                        <input
                          className={styles.formInput}
                          placeholder="0123456789"
                          value={form.accountNumber ?? ""}
                          onChange={(e) =>
                            setF("accountNumber", e.target.value)
                          }
                          maxLength={12}
                          required
                        />
                      </div>
                      <div className={styles.verifyRow}>
                        <div className={styles.verifyStatus}>
                          {verifiedName ? (
                            <div className={styles.verifiedTag}>
                              <FaCheckCircle size={13} />
                              <span>{verifiedName}</span>
                            </div>
                          ) : verifyErr ? (
                            <div className={styles.verifyErrTag}>
                              <FaExclamationTriangle size={13} />
                              <span>{verifyErr}</span>
                            </div>
                          ) : (
                            <span className={styles.verifyHint}>
                              Verify to confirm account holder name
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={styles.verifyBtn}
                          onClick={verifyAccount}
                          disabled={
                            verifying || !form.accountNumber || !form.bankCode
                          }
                        >
                          {verifying ? (
                            <span className={styles.spinnerSm} />
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                {selMethod.method === "bank_transfer" &&
                  selMethod.isInternational && (
                    <div className={styles.fieldsGrid}>
                      {[
                        {
                          key: "bankName",
                          label: "Bank Name *",
                          placeholder: "e.g. Bank of America",
                        },
                        {
                          key: "accountNumber",
                          label: "Account / IBAN *",
                          placeholder: "IBAN or account number",
                        },
                        {
                          key: "swiftBic",
                          label: "SWIFT / BIC *",
                          placeholder: "e.g. BOFAUS3N",
                        },
                        {
                          key: "routingNumber",
                          label: "Routing (US/CA)",
                          placeholder: "9-digit routing",
                        },
                        {
                          key: "accountName",
                          label: "Account Holder Name *",
                          placeholder: "Full name on account",
                        },
                        {
                          key: "bankCountry",
                          label: "Bank Country *",
                          placeholder: "e.g. United States",
                        },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key} className={styles.formField}>
                          <label className={styles.formLabel}>{label}</label>
                          <input
                            className={styles.formInput}
                            placeholder={placeholder}
                            value={form[key] ?? ""}
                            onChange={(e) => setF(key, e.target.value)}
                            required={label.includes("*")}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {selMethod.method === "mobile_money" && (
                  <div className={styles.fieldsStack}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>
                        Mobile Number *
                      </label>
                      <input
                        className={styles.formInput}
                        placeholder="+234 800 000 0000"
                        value={form.mobileNumber ?? ""}
                        onChange={(e) => setF("mobileNumber", e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>
                        Account Name (optional)
                      </label>
                      <input
                        className={styles.formInput}
                        placeholder="Name on mobile account"
                        value={form.mobileName ?? ""}
                        onChange={(e) => setF("mobileName", e.target.value)}
                      />
                    </div>
                    {selMethod.provider && (
                      <div className={styles.providerChip}>
                        <FiSmartphone size={13} />
                        <span>
                          Provider: <strong>{selMethod.provider}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selMethod.method === "crypto" && (
                  <div className={styles.fieldsStack}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Token *</label>
                      <div className={styles.tokenGrid}>
                        {CRYPTO_TOKENS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`${styles.tokenBtn} ${form.cryptoToken === t ? styles.tokenBtnActive : ""}`}
                            onClick={() => setF("cryptoToken", t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Network *</label>
                      <div className={styles.networkGrid}>
                        {CRYPTO_NETWORKS.map((n) => (
                          <button
                            key={n.value}
                            type="button"
                            className={`${styles.networkBtn} ${form.cryptoNetwork === n.value ? styles.networkBtnActive : ""}`}
                            onClick={() => setF("cryptoNetwork", n.value)}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>
                        Wallet Address *
                      </label>
                      <input
                        className={`${styles.formInput} ${styles.monoInput}`}
                        placeholder="0x… or TRC20 address"
                        value={form.cryptoAddress ?? ""}
                        onChange={(e) => setF("cryptoAddress", e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.cryptoWarning}>
                      <FaExclamationTriangle size={14} />
                      <p>
                        Double-check the network matches your wallet. Sending to
                        the wrong network will result in permanent loss of
                        funds.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.formSection}>
              <p className={styles.formSectionLabel}>Amount ({currency})</p>
              <div className={styles.amountWrap}>
                <span className={styles.amountCurrency}>{symbol}</span>
                <input
                  className={styles.amountInput}
                  type="number"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className={styles.quickAmounts}>
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => setAmount((balance * f).toFixed(2))}
                  >
                    {f === 1 ? "Max" : `${f * 100}%`}
                  </button>
                ))}
              </div>
              {amount &&
                parseFloat(amount) > 0 &&
                (() => {
                  const { fee, netAmount, feePercent } = getWalletWithdrawalFee(
                    amount,
                    currency,
                  );
                  return (
                    <div className={styles.amountPreview}>
                      You receive approx.{" "}
                      <strong>{formatCurrency(netAmount, currency)}</strong>{" "}
                      after {feePercent}% fee
                    </div>
                  );
                })()}
            </div>

            {error && (
              <div className={styles.errorBox}>
                <FaExclamationTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formInfo}>
              <FaInfo size={14} />
              <p>
                Payouts processed within 1–3 business days ·{" "}
                {getWalletWithdrawalFee(1, currency).feePercent}% withdrawal fee
                applies · Crypto is USDC/USDT equivalent · Minimum: 1 {currency}
              </p>
            </div>

            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleReview}
              disabled={loading || !amount || !selMethod}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} /> Processing…
                </>
              ) : (
                <>
                  <FaArrowUp size={15} />
                  <span>Review Withdrawal</span>
                </>
              )}
            </button>
          </form>
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
  const pendingVerifyRef = useRef(null);
  const isFirstRender = useRef(true);
  const hasMounted = useRef(false);

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
          const status = err.response?.status;

          if (status === 404 || status === 500) {
            console.log("Balances endpoint not available, using fallback");
            const walletRes = await api.get("/wallet/balance");
            walletData = walletRes.data.data;
            balances = { NGN: walletData.balance || 0 };
          } else {
            throw err;
          }
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

  // ─── On mount: verify pending deposit reference (single fetch, no double) ─

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");
    const storedRef = sessionStorage.getItem("pendingDepositReference");
    const pendingRef = urlRef || storedRef;

    if (urlRef) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("ref");
      window.history.replaceState({}, "", cleanUrl.toString());
    }

    (async () => {
      if (pendingRef && !pendingVerifyRef.current) {
        pendingVerifyRef.current = pendingRef;
        try {
          const res = await api.get(`/wallet/verify/${pendingRef}`);
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
          }
        } catch {
          /* swallow */
        }
      }
      await fetchWallet(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Pagination / filter changes (skip first render) ─────────────────────

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchWallet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filterType, filterStatus]);

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
      sessionStorage.setItem("pendingDepositReference", reference);

      window.open(paymentLink, "_blank");

      let attempts = 0;
      const maxAttempts = 60;
      let finished = false;

      api.get(`/wallet/verify/${reference}`).catch(() => {});

      const baseline =
        typeof currencyBalances[currency] === "number"
          ? currencyBalances[currency]
          : 0;

      const poll = setInterval(async () => {
        if (finished) return;
        attempts++;

        try {
          const balanceRes = await api.get("/wallet/balance", {
            params: { currency },
          });
          const ngnBalance = Number(balanceRes.data.data?.balance) || 0;

          if (ngnBalance >= baseline + amount - 0.01) {
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

      // ✅ Use the same currency-aware helper as the backend
      const { fee, netAmount } = getWalletWithdrawalFee(
        data.amount,
        data.currency,
      );

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
            <div className={styles.refundList}>
              {filteredTransactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
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

        <WorkerStyleWithdrawModal
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
      </div>
    </HirerLayout>
  );
}
