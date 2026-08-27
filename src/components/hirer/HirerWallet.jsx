// src/pages/hirer/HirerWallet.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./HirerWallet.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import ConfirmationModal from "../../components/ui/ConfirmationModal";

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
} from "react-icons/fa";

// ─── Helper Functions ──────────────────────────────────────────────────────

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
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

function getStatusColor(status) {
  const colors = {
    PENDING: "#F59E0B",
    PROCESSING: "#3B82F6",
    COMPLETED: "#10B981",
    SUCCESS: "#10B981",
    FAILED: "#EF4444",
    REVERSED: "#6B7280",
    CANCELLED: "#6B7280",
    INITIATED: "#F59E0B",
  };
  return colors[status] || "#6B7280";
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
        <div className={styles.skeletonTx} />
        <div className={styles.skeletonTx} />
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>{Icon && <Icon size={16} />}</span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  );
}

// ─── Transaction Row ───────────────────────────────────────────────────────

function TransactionRow({ transaction }) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? "#10B981" : "#EF4444";
  const amountPrefix = isCredit ? "+" : "-";

  return (
    <div className={styles.transactionRow}>
      <div className={styles.transactionIcon}>
        {getTransactionIcon(transaction.type)}
      </div>
      <div className={styles.transactionInfo}>
        <div className={styles.transactionTitle}>
          {getTransactionLabel(transaction.type)}
        </div>
        <div className={styles.transactionDesc}>
          {transaction.description || transaction.reference}
        </div>
        <div className={styles.transactionMeta}>
          <span className={styles.transactionDate}>
            <FaClock size={10} /> {formatDate(transaction.createdAt)}
          </span>
          {transaction.bookingId && (
            <span className={styles.transactionBooking}>
              Booking #{transaction.bookingId.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
      <div className={styles.transactionAmount}>
        <div style={{ color: amountColor, fontWeight: 700 }}>
          {amountPrefix}
          {formatCurrency(
            transaction.netAmount || transaction.amount,
            transaction.currency,
          )}
        </div>
        <div
          className={styles.transactionStatus}
          style={{
            backgroundColor: getStatusColor(transaction.status) + "15",
            color: getStatusColor(transaction.status),
          }}
        >
          {getStatusIcon(transaction.status)}{" "}
          {getStatusLabel(transaction.status)}
        </div>
      </div>
    </div>
  );
}

// ─── Deposit Modal ─────────────────────────────────────────────────────────

function DepositModal({ isOpen, onClose, onDeposit, loading, currencies }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      // Use modal instead of alert
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
          <button className={styles.modalClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSubtext}>
            Enter the amount you want to add to your wallet
          </p>
          <form onSubmit={handleSubmit}>
            <div className={styles.amountInputGroup}>
              <span className={styles.currencySymbol}>₦</span>
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
                    {cur}
                  </option>
                ))}
              </select>
            </div>
            <p className={styles.minAmount}>Minimum: ₦100</p>
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

// ─── Withdraw Modal ─────────────────────────────────────────────────────────

function WithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  loading,
  balance,
  currencies,
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      alert("Minimum withdrawal amount is ₦100");
      return;
    }
    if (numAmount > balance) {
      alert("Insufficient balance");
      return;
    }
    setIsSubmitting(true);
    try {
      await onWithdraw({
        amount: numAmount,
        currency,
        bankName,
        accountNumber,
        accountName,
        bankCode,
      });
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
            <FaMinus /> Withdraw Funds
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSubtext}>
            Withdraw funds to your bank account
          </p>
          <div className={styles.balanceDisplay}>
            Available Balance: {formatCurrency(balance)}
          </div>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount</label>
              <input
                type="number"
                className={styles.formInput}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="100"
                step="100"
                required
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
                    {cur}
                  </option>
                ))}
              </select>
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
            <p className={styles.feeNote}>Fee: 1% (max ₦100)</p>
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
                  "Request Withdrawal"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Message Modal ─────────────────────────────────────────────────────────

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
          <button className={styles.messageBtn} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function HirerWallet() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currencies, setCurrencies] = useState(["NGN", "USD", "EUR", "GBP"]);
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
        const walletRes = await api.get("/wallet/balance");
        const walletData = walletRes.data.data;
        setWallet(walletData);

        const txRes = await api.get("/wallet/transactions", {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            type: filterType || undefined,
            status: filterStatus || undefined,
          },
        });
        setTransactions(txRes.data.data.transactions || []);
        setPagination(
          txRes.data.data.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 1,
          },
        );

        try {
          const currenciesRes = await api.get("/wallet/currencies");
          if (currenciesRes.data?.data?.currencies) {
            setCurrencies(currenciesRes.data.data.currencies);
          }
        } catch (err) {
          console.log("Using default currencies");
        }
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
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.page, filterType, filterStatus],
  );

  useEffect(() => {
    fetchWallet(true);
  }, [pagination.page, filterType, filterStatus, fetchWallet]);

  const refreshWallet = () => {
    fetchWallet(false);
  };

  // ─── Deposit ──────────────────────────────────────────────────────────────

  const handleDeposit = async (amount, currency) => {
    setSubmitting(true);
    try {
      const res = await api.post("/wallet/fund", { amount, currency });
      const { paymentLink, reference } = res.data.data;

      if (paymentLink) {
        // Store pending deposit info
        localStorage.setItem("pendingDepositAmount", amount.toString());
        localStorage.setItem("pendingDepositCurrency", currency);
        localStorage.setItem("pendingDepositReference", reference);

        setShowDepositModal(false);

        showMessage(
          "Payment Initiated",
          "Your payment page is opening. Please complete your payment.",
          "info",
        );

        // Open Flutterwave payment page
        window.open(paymentLink, "_blank");

        // Start polling for transaction status
        let attempts = 0;
        const maxAttempts = 30;

        const checkTransaction = async () => {
          try {
            const verifyRes = await api.get(`/wallet/verify/${reference}`);
            const status = verifyRes.data.data?.status;

            if (status === "SUCCESS") {
              showMessage(
                "Payment Successful! 🎉",
                `Your wallet has been funded with ${formatCurrency(amount, currency)}.`,
                "success",
              );
              await fetchWallet(false);
              return true;
            } else if (status === "FAILED") {
              showMessage(
                "Payment Failed",
                "Your payment was not successful. Please try again.",
                "error",
              );
              return true;
            }
            return false;
          } catch (err) {
            return false;
          }
        };

        const interval = setInterval(async () => {
          attempts++;
          const done = await checkTransaction();
          if (done || attempts >= maxAttempts) {
            clearInterval(interval);
            if (attempts >= maxAttempts && !done) {
              showMessage(
                "Verification Timeout",
                "Please check your wallet balance manually to confirm the payment.",
                "info",
              );
            }
            await fetchWallet(false);
          }
        }, 5000);

        const handleVisibilityChange = async () => {
          if (document.visibilityState === "visible") {
            const done = await checkTransaction();
            if (done) {
              clearInterval(interval);
              await fetchWallet(false);
            }
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        setTimeout(() => {
          clearInterval(interval);
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
        }, 180000);
      } else {
        showMessage(
          "Payment Initiated",
          "Please check your email for payment instructions.",
          "info",
        );
        setShowDepositModal(false);
        setTimeout(() => fetchWallet(false), 5000);
      }
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
      showMessage(
        "Withdrawal Request Submitted ✅",
        `Your withdrawal of ${formatCurrency(data.amount, data.currency)} has been submitted for admin approval.\n\nReference: ${res.data.data.reference}`,
        "success",
      );
      setShowWithdrawModal(false);
      await fetchWallet(false);
    } catch (err) {
      showMessage(
        "Withdrawal Failed",
        err.response?.data?.message || "Failed to process withdrawal",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Filter transactions ─────────────────────────────────────────────────

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.reference?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query) ||
      getTransactionLabel(tx.type).toLowerCase().includes(query)
    );
  });

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <HirerLayout>
        <WalletSkeleton />
      </HirerLayout>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* ─── Header ────────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              <FaWallet /> Wallet
            </h1>
            <p className={styles.subtitle}>Manage your funds and payments</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={refreshWallet}
              disabled={refreshing}
            >
              {refreshing ? <FaSpinner className={styles.spinning} /> : "⟳"}
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => setShowDepositModal(true)}
            >
              <FaPlus /> Fund Wallet
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => setShowWithdrawModal(true)}
            >
              <FaMinus /> Withdraw
            </button>
          </div>
        </div>

        {/* ─── Balance Card ──────────────────────────────────────────────────── */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceInfo}>
            <div className={styles.balanceLabel}>Available Balance</div>
            <div className={styles.balanceAmount}>
              {formatCurrency(balance, wallet?.currency || "NGN")}
            </div>
            <div className={styles.balanceMeta}>
              <span>
                Total Deposited: {formatCurrency(wallet?.totalDeposited || 0)}
              </span>
              <span>
                Total Spent: {formatCurrency(wallet?.totalSpent || 0)}
              </span>
              <span>
                Total Withdrawn: {formatCurrency(wallet?.totalWithdrawn || 0)}
              </span>
            </div>
          </div>
          <div className={styles.balanceQuickActions}>
            <button
              className={styles.quickAction}
              onClick={() => setShowDepositModal(true)}
            >
              <FaPlus /> Add Money
            </button>
            <button
              className={styles.quickAction}
              onClick={() => setShowWithdrawModal(true)}
            >
              <FaMinus /> Withdraw
            </button>
          </div>
        </div>

        {/* ─── Stats ────────────────────────────────────────────────────────── */}
        <div className={styles.statsGrid}>
          <StatCard
            icon={FaArrowDown}
            label="Total Deposits"
            value={formatCurrency(wallet?.totalDeposited || 0)}
            accent="green"
          />
          <StatCard
            icon={FaCreditCard}
            label="Total Spent"
            value={formatCurrency(wallet?.totalSpent || 0)}
            accent="orange"
          />
          <StatCard
            icon={FaArrowUp}
            label="Total Withdrawn"
            value={formatCurrency(wallet?.totalWithdrawn || 0)}
          />
          <StatCard
            icon={FaClock}
            label="Transactions"
            value={pagination.total || 0}
          />
        </div>

        {/* ─── Transactions ──────────────────────────────────────────────────── */}
        <div className={styles.transactionsSection}>
          <div className={styles.transactionsHeader}>
            <h2 className={styles.sectionTitle}>Transaction History</h2>
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
              <p>Your transaction history will appear here</p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {filteredTransactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
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

        {/* ─── Deposit Modal ────────────────────────────────────────────────── */}
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onDeposit={handleDeposit}
          loading={submitting}
          currencies={currencies}
        />

        {/* ─── Withdraw Modal ───────────────────────────────────────────────── */}
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onWithdraw={handleWithdraw}
          loading={submitting}
          balance={balance}
          currencies={currencies}
        />

        {/* ─── Message Modal ────────────────────────────────────────────────── */}
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
