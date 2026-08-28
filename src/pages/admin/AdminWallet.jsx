// src/pages/admin/AdminWallet.jsx
// Complete Admin Wallet Management with Platform UX

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminWallet.module.css";

import { FaWallet } from "react-icons/fa";
import {
  FiUsers,
  FiDollarSign,
  FiArrowDown,
  FiArrowUp,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiFilter,
  FiX,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiUser,
  FiMail,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiPieChart,
  FiBarChart2,
  FiExternalLink,
  FiTrash2,
  FiEdit,
  FiCheck,
  FiSend,
  FiCopy,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function formatCurrencyPlain(amount, currency = "NGN") {
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
  if (status === "COMPLETED" || status === "SUCCESS") return <FiCheckCircle />;
  if (status === "PENDING" || status === "INITIATED" || status === "PROCESSING")
    return <FiClock className={styles.spinning} />;
  if (status === "FAILED" || status === "REVERSED" || status === "CANCELLED")
    return <FiXCircle />;
  return <FiClock />;
}

function getStatusClass(status) {
  const map = {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    SUCCESS: "success",
    FAILED: "failed",
    REVERSED: "reversed",
    CANCELLED: "cancelled",
    INITIATED: "initiated",
  };
  return map[status] || "pending";
}

function getTransactionTypeLabel(type) {
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

// ─── Copy Button Component ──────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
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
    <button
      className={styles.copyBtn}
      onClick={handleCopy}
      title={`Copy ${label}`}
    >
      {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}

// ─── Modal Components ──────────────────────────────────────────────────────

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  withdrawalAmount,
  feeAmount,
  netAmount,
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>{title}</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmMessage}>{message}</p>

          {(withdrawalAmount || feeAmount || netAmount) && (
            <div className={styles.approvalBreakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Withdrawal Amount</span>
                <span className={styles.breakdownValue}>
                  {formatCurrency(withdrawalAmount || 0)}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>
                  Fee (1% platform fee)
                </span>
                <span
                  className={styles.breakdownValue}
                  style={{ color: "var(--orange)" }}
                >
                  -{formatCurrency(feeAmount || 0)}
                </span>
              </div>
              <div
                className={`${styles.breakdownRow} ${styles.breakdownTotal}`}
              >
                <span className={styles.breakdownLabel}>Final Payout</span>
                <span
                  className={styles.breakdownValue}
                  style={{
                    color: "var(--green)",
                    fontWeight: 900,
                    fontSize: "1.1rem",
                  }}
                >
                  {formatCurrency(netAmount || 0)}
                </span>
              </div>
              {netAmount > 0 && (
                <div className={styles.copyRow}>
                  <span className={styles.breakdownLabel}>
                    Copy Final Amount
                  </span>
                  <CopyButton
                    text={formatCurrencyPlain(netAmount || 0)}
                    label="Copy"
                  />
                </div>
              )}
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={onClose}>
              Cancel
            </button>
            <button
              className={`${styles.modalConfirm} ${styles[`modalConfirm_${variant}`]}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ isOpen, onClose, title, message, type = "success" }) {
  if (!isOpen) return null;

  const icons = {
    success: <FiCheckCircle className={styles.messageIconSuccess} />,
    error: <FiXCircle className={styles.messageIconError} />,
    warning: <FiAlertCircle className={styles.messageIconWarning} />,
    info: <FiClock className={styles.messageIconInfo} />,
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>{title}</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>
        <div className={styles.messageBody}>
          <div className={styles.messageIconWrapper}>
            {icons[type] || icons.info}
          </div>
          <p className={styles.messageText}>{message}</p>
          <button className={styles.messageBtn} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = "Enter reason...",
}) {
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(input);
    setInput("");
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>{title}</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmMessage}>{message}</p>
          <input
            type="text"
            className={styles.promptInput}
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={onClose}>
              Cancel
            </button>
            <button
              className={`${styles.modalConfirm} ${styles.modalConfirm_primary}`}
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Chip ─────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, accent, subtext }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>{Icon && <Icon size={16} />}</span>
      <div>
        <div className={styles.chipVal}>{value ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
        {subtext && <div className={styles.chipSubtext}>{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={`${styles.statusBadge} ${styles[`statusBadge_${getStatusClass(status)}`]}`}
    >
      {getStatusIcon(status)} {getStatusLabel(status)}
    </span>
  );
}

// ─── Transaction Row ─────────────────────────────────────────────────────────

function TransactionRow({ transaction, onView }) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? "#10B981" : "#EF4444";
  const amountPrefix = isCredit ? "+" : "-";

  return (
    <div className={styles.transactionRow}>
      <div className={styles.transactionUser}>
        <div className={styles.userAvatar}>
          {transaction.hirer?.firstName?.[0] || "?"}
          {transaction.hirer?.lastName?.[0] || ""}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {transaction.hirer?.firstName} {transaction.hirer?.lastName}
          </div>
          <div className={styles.userEmail}>{transaction.hirer?.email}</div>
        </div>
      </div>
      <div className={styles.transactionInfo}>
        <div className={styles.transactionType}>
          {getTransactionTypeLabel(transaction.type)}
        </div>
        <div className={styles.transactionRef}>{transaction.reference}</div>
      </div>
      <div className={styles.transactionAmount}>
        <div style={{ color: amountColor, fontWeight: 700 }}>
          {amountPrefix}
          {formatCurrency(transaction.netAmount || transaction.amount)}
        </div>
        <StatusBadge status={transaction.status} />
      </div>
      <div className={styles.transactionDate}>
        {formatDate(transaction.createdAt)}
      </div>
      <button
        className={styles.viewBtn}
        onClick={() => onView(transaction)}
        title="View details"
      >
        <FiEye size={14} />
      </button>
    </div>
  );
}

// ─── Withdrawal Row ─────────────────────────────────────────────────────────

function WithdrawalRow({ withdrawal, onApprove, onReject, onView }) {
  const fee = (withdrawal.amount || 0) * 0.01;
  const netAmount = (withdrawal.amount || 0) - fee;

  return (
    <div className={styles.withdrawalRow}>
      <div className={styles.withdrawalUser}>
        <div className={styles.userAvatar}>
          {withdrawal.hirer?.firstName?.[0] || "?"}
          {withdrawal.hirer?.lastName?.[0] || ""}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {withdrawal.hirer?.firstName} {withdrawal.hirer?.lastName}
          </div>
          <div className={styles.userEmail}>{withdrawal.hirer?.email}</div>
        </div>
      </div>
      <div className={styles.withdrawalInfo}>
        <div className={styles.withdrawalBank}>{withdrawal.bankName}</div>
        <div className={styles.withdrawalAccount}>
          {withdrawal.accountNumber} - {withdrawal.accountName}
        </div>
        <div className={styles.withdrawalRef}>{withdrawal.reference}</div>
      </div>
      <div className={styles.withdrawalAmount}>
        <div style={{ fontWeight: 700, color: "#EF4444" }}>
          {formatCurrency(withdrawal.amount)}
        </div>
        <div className={styles.withdrawalFee}>
          Fee (1%): {formatCurrency(fee)}
        </div>
        <div
          className={styles.withdrawalNet}
          style={{
            fontWeight: 600,
            color: "var(--green)",
            fontSize: "0.75rem",
          }}
        >
          Net: {formatCurrency(netAmount)}
        </div>
      </div>
      <div className={styles.withdrawalStatus}>
        <StatusBadge status={withdrawal.status} />
        <div className={styles.withdrawalDate}>
          {formatDate(withdrawal.createdAt)}
        </div>
      </div>
      {withdrawal.status === "PENDING" && (
        <div className={styles.withdrawalActions}>
          <button
            className={styles.approveBtn}
            onClick={() => onApprove(withdrawal)}
          >
            <FiCheck size={14} /> Approve
          </button>
          <button
            className={styles.rejectBtn}
            onClick={() => onReject(withdrawal)}
          >
            <FiX size={14} /> Reject
          </button>
        </div>
      )}
      {withdrawal.status !== "PENDING" && (
        <button
          className={styles.viewBtn}
          onClick={() => onView(withdrawal)}
          title="View details"
        >
          <FiEye size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({ data, onClose }) {
  if (!data) return null;

  const isTransaction = data.type !== undefined;
  const title = isTransaction ? "Transaction Details" : "Withdrawal Details";
  const fee = isTransaction ? data.fee || 0 : (data.amount || 0) * 0.01;
  const netAmount = isTransaction
    ? data.netAmount || data.amount
    : (data.amount || 0) - fee;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>{title}</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailUser}>
            <div className={styles.userAvatarLarge}>
              {data.hirer?.firstName?.[0] || "?"}
              {data.hirer?.lastName?.[0] || ""}
            </div>
            <div>
              <div className={styles.detailName}>
                {data.hirer?.firstName} {data.hirer?.lastName}
              </div>
              <div className={styles.detailEmail}>
                <FiMail size={12} /> {data.hirer?.email}
              </div>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Reference</span>
              <span className={styles.detailValue}>{data.reference}</span>
            </div>
            {isTransaction ? (
              <>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>
                    {getTransactionTypeLabel(data.type)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.amount)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fee</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.fee || 0)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Net Amount</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.netAmount || data.amount)}
                    {data.netAmount && (
                      <CopyButton
                        text={formatCurrencyPlain(data.netAmount)}
                        label="Copy"
                      />
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance Before</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.balanceBefore || 0)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance After</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.balanceAfter || 0)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Bank</span>
                  <span className={styles.detailValue}>{data.bankName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Account Number</span>
                  <span className={styles.detailValue}>
                    {data.accountNumber}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Account Name</span>
                  <span className={styles.detailValue}>{data.accountName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.amount)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fee (1%)</span>
                  <span
                    className={styles.detailValue}
                    style={{ color: "var(--orange)" }}
                  >
                    {formatCurrency(fee)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Net Amount</span>
                  <span
                    className={styles.detailValue}
                    style={{ color: "var(--green)", fontWeight: 700 }}
                  >
                    {formatCurrency(netAmount)}
                    <CopyButton
                      text={formatCurrencyPlain(netAmount)}
                      label="Copy"
                    />
                  </span>
                </div>
                {data.failureReason && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Failure Reason</span>
                    <span
                      className={styles.detailValue}
                      style={{ color: "#EF4444" }}
                    >
                      {data.failureReason}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <StatusBadge status={data.status} />
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created</span>
              <span className={styles.detailValue}>
                {formatDate(data.createdAt)}
              </span>
            </div>
            {data.completedAt && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Completed</span>
                <span className={styles.detailValue}>
                  {formatDate(data.completedAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminWallet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const page = parseInt(searchParams.get("page") || "1");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [detailModal, setDetailModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingApproval, setPendingApproval] = useState(null);

  // ─── Modal States ────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState(null);
  const [messageModal, setMessageModal] = useState(null);
  const [promptModal, setPromptModal] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function showMessage(title, message, type = "success") {
    setMessageModal({ title, message, type });
  }

  function showConfirm(
    title,
    message,
    onConfirm,
    confirmLabel = "Confirm",
    variant = "danger",
    withdrawalData = null,
  ) {
    setConfirmModal({
      title,
      message,
      onConfirm,
      confirmLabel,
      variant,
      withdrawalData,
    });
  }

  function showPrompt(
    title,
    message,
    onConfirm,
    placeholder = "Enter reason...",
  ) {
    setPromptModal({ title, message, onConfirm, placeholder });
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  // ─── API Calls ────────────────────────────────────────────────────────────

  const fetchStats = useCallback(() => {
    api
      .get("/wallet/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      limit: 20,
      status: filterStatus || undefined,
      type: filterType || undefined,
      search: searchQuery || undefined,
    };

    api
      .get("/wallet/transactions", { params })
      .then((r) => {
        setTransactions(r.data.data.transactions || []);
        setTotal(r.data.data.pagination?.total || 0);
        setPages(r.data.data.pagination?.pages || 1);
      })
      .catch(() => showToast("Failed to load transactions", "error"))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterType, searchQuery]);

  const fetchWithdrawals = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      limit: 20,
      status: filterStatus || undefined,
    };

    api
      .get("/wallet/admin/withdrawals", { params })
      .then((r) => {
        setWithdrawals(r.data.data.withdrawals || []);
        setTotal(r.data.data.pagination?.total || 0);
        setPages(r.data.data.pagination?.pages || 1);
      })
      .catch(() => showToast("Failed to load withdrawals", "error"))
      .finally(() => setLoading(false));
  }, [page, filterStatus]);

  useEffect(() => {
    if (tab === "transactions") {
      fetchTransactions();
    } else if (tab === "withdrawals") {
      fetchWithdrawals();
    }
  }, [tab, fetchTransactions, fetchWithdrawals]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleApproveWithdrawal = (withdrawal) => {
    const fee = (withdrawal.amount || 0) * 0.01;
    const netAmount = (withdrawal.amount || 0) - fee;

    showConfirm(
      "Approve Withdrawal",
      `Are you sure you want to approve this withdrawal?`,
      async () => {
        try {
          await api.patch(`/wallet/admin/withdrawals/${withdrawal.id}/approve`);
          showMessage(
            "Approved",
            `Withdrawal approved successfully!\nFinal payout: ${formatCurrency(netAmount)}`,
            "success",
          );
          fetchWithdrawals();
          fetchStats();
        } catch (error) {
          showMessage("Error", "Failed to approve withdrawal", "error");
        }
        setConfirmModal(null);
      },
      "Approve",
      "success",
      { withdrawalAmount: withdrawal.amount, feeAmount: fee, netAmount },
    );
  };

  const handleRejectWithdrawal = (withdrawal) => {
    showPrompt(
      "Reject Withdrawal",
      `Reject withdrawal of ${formatCurrency(withdrawal.amount)}? Please provide a reason.`,
      async (reason) => {
        if (!reason) {
          showMessage(
            "Error",
            "Please provide a reason for rejection",
            "error",
          );
          return;
        }
        try {
          await api.patch(`/wallet/admin/withdrawals/${withdrawal.id}/reject`, {
            failureReason: reason,
          });
          showMessage(
            "Rejected",
            "Withdrawal rejected successfully!",
            "success",
          );
          fetchWithdrawals();
          fetchStats();
        } catch (error) {
          showMessage("Error", "Failed to reject withdrawal", "error");
        }
        setPromptModal(null);
      },
      "Enter rejection reason...",
    );
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(
        `/wallet/admin/export/csv?${new URLSearchParams({
          status: filterStatus || "",
          type: filterType || "",
          search: searchQuery || "",
        })}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `wallet-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("CSV exported successfully");
    } catch (error) {
      showToast("Failed to export CSV", "error");
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <p>Loading wallet data...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ─── Modals ──────────────────────────────────────────────────────── */}
        {confirmModal && (
          <ConfirmModal
            isOpen={true}
            onClose={() => setConfirmModal(null)}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            variant={confirmModal.variant}
            withdrawalAmount={confirmModal.withdrawalData?.withdrawalAmount}
            feeAmount={confirmModal.withdrawalData?.feeAmount}
            netAmount={confirmModal.withdrawalData?.netAmount}
          />
        )}

        {messageModal && (
          <MessageModal
            isOpen={true}
            onClose={() => setMessageModal(null)}
            title={messageModal.title}
            message={messageModal.message}
            type={messageModal.type}
          />
        )}

        {promptModal && (
          <PromptModal
            isOpen={true}
            onClose={() => setPromptModal(null)}
            onConfirm={promptModal.onConfirm}
            title={promptModal.title}
            message={promptModal.message}
            placeholder={promptModal.placeholder}
          />
        )}

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Finance</p>
            <h1 className={styles.pageTitle}>
              <FaWallet size={24} /> Wallet Management
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.secondaryBtn} onClick={handleExportCSV}>
              <FiDownload size={16} /> Export
            </button>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                if (tab === "transactions") fetchTransactions();
                else if (tab === "withdrawals") fetchWithdrawals();
                fetchStats();
              }}
            >
              <FiRefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* ─── Stats ───────────────────────────────────────────────────────── */}
        {stats && (
          <div className={styles.statsBar}>
            <StatChip
              icon={FiUsers}
              label="Total Wallets"
              value={stats.totalWallets || 0}
            />
            <StatChip
              icon={FaWallet}
              label="Total Balance"
              value={formatCurrency(stats.totalBalance || 0)}
              accent="green"
            />
            <StatChip
              icon={FiArrowDown}
              label="Total Deposited"
              value={formatCurrency(stats.totalDeposited || 0)}
              accent="green"
            />
            <StatChip
              icon={FiArrowUp}
              label="Total Withdrawn"
              value={formatCurrency(stats.totalWithdrawn || 0)}
              accent="orange"
            />
            <StatChip
              icon={FiClock}
              label="Pending Withdrawals"
              value={stats.pendingWithdrawals || 0}
              accent="orange"
            />
          </div>
        )}

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "overview" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "overview")}
          >
            <FiPieChart size={14} /> Overview
          </button>
          <button
            className={`${styles.tab} ${tab === "transactions" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "transactions")}
          >
            <FiActivity size={14} /> Transactions
          </button>
          <button
            className={`${styles.tab} ${tab === "withdrawals" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "withdrawals")}
          >
            <FiArrowUp size={14} /> Withdrawals
          </button>
        </div>

        {/* ─── Overview Tab ────────────────────────────────────────────────── */}
        {tab === "overview" && stats && (
          <div className={styles.overviewContent}>
            <div className={styles.chartPlaceholder}>
              <FiBarChart2 size={48} />
              <p>Wallet statistics and charts will appear here</p>
            </div>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>
                  Average Wallet Balance
                </span>
                <span className={styles.quickStatValue}>
                  {formatCurrency(
                    stats.totalBalance / (stats.totalWallets || 1),
                  )}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>
                  Total Transactions
                </span>
                <span className={styles.quickStatValue}>
                  {stats.totalTransactions || 0}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>
                  Successful Deposits
                </span>
                <span className={styles.quickStatValue}>
                  {stats.successfulDeposits || 0}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>
                  Successful Withdrawals
                </span>
                <span className={styles.quickStatValue}>
                  {stats.successfulWithdrawals || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Transactions Tab ───────────────────────────────────────────── */}
        {tab === "transactions" && (
          <div className={styles.transactionsSection}>
            <div className={styles.controlBar}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>
                  <FiSearch size={14} />
                </span>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by reference or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                />
                {searchQuery && (
                  <button
                    className={styles.clearBtn}
                    onClick={() => {
                      setSearchQuery("");
                      fetchTransactions();
                    }}
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
              <div className={styles.filterGroup}>
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
              <span className={styles.totalPill}>{total} transactions</span>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <span className={styles.spinner} />
                <p>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.empty}>
                <FaWallet size={48} opacity={0.4} />
                <p>No transactions found</p>
              </div>
            ) : (
              <>
                <div className={styles.tableContainer}>
                  {transactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      onView={setDetailModal}
                    />
                  ))}
                </div>

                {pages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      disabled={page === 1}
                      onClick={() => setParam("page", String(page - 1))}
                    >
                      <FiArrowLeft size={14} /> Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={page === pages}
                      onClick={() => setParam("page", String(page + 1))}
                    >
                      Next <FiArrowRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Withdrawals Tab ───────────────────────────────────────────── */}
        {tab === "withdrawals" && (
          <div className={styles.withdrawalsSection}>
            <div className={styles.controlBar}>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <span className={styles.totalPill}>{total} withdrawals</span>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <span className={styles.spinner} />
                <p>Loading withdrawals...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className={styles.empty}>
                <FiArrowUp size={48} opacity={0.4} />
                <p>No withdrawals found</p>
              </div>
            ) : (
              <>
                <div className={styles.tableContainer}>
                  {withdrawals.map((wd) => (
                    <WithdrawalRow
                      key={wd.id}
                      withdrawal={wd}
                      onApprove={handleApproveWithdrawal}
                      onReject={handleRejectWithdrawal}
                      onView={setDetailModal}
                    />
                  ))}
                </div>

                {pages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      disabled={page === 1}
                      onClick={() => setParam("page", String(page - 1))}
                    >
                      <FiArrowLeft size={14} /> Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={page === pages}
                      onClick={() => setParam("page", String(page + 1))}
                    >
                      Next <FiArrowRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Detail Modal ────────────────────────────────────────────────── */}
        {detailModal && (
          <DetailModal
            data={detailModal}
            onClose={() => setDetailModal(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
