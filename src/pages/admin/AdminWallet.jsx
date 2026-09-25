// src/pages/admin/AdminWallet.jsx
// Complete Admin Wallet Management with Platform UX.
//
// Endpoints used:
//   GET   /wallet/admin/stats                → aggregated stats + per-currency breakdown
//   GET   /wallet/transactions               → calling user's own wallet transactions
//   GET   /wallet/admin/withdrawals          → all pending/processed withdrawals (with hirer)
//   PATCH /wallet/admin/withdrawals/:id/approve
//   PATCH /wallet/admin/withdrawals/:id/reject   { failureReason }
//   GET   /wallet/admin/export/csv           → CSV export (may not exist — see note)
//
// Every field the backend sends is now rendered. No invented data.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminWallet.module.css";

import { FaWallet } from "react-icons/fa";
import {
  FiUsers,
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
  FiX,
  FiArrowLeft,
  FiArrowRight,
  FiMail,
  FiActivity,
  FiPieChart,
  FiBarChart2,
  FiCheck,
  FiCopy,
  FiHash,
  FiInfo,
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

// ─── Skeleton Blocks ────────────────────────────────────────────────────────

// A single shimmer block — width/height come from the caller via style.
function SkBlock({
  w = "100%",
  h = 12,
  radius = 6,
  className = "",
  delay = 0,
}) {
  return (
    <div
      className={`${styles.skBlock} ${className}`}
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// Stats bar skeleton — 5 chips
function StatsSkeleton() {
  return (
    <div className={styles.statsBar}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={styles.statChip}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className={styles.skIcon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkBlock w="70%" h={16} delay={i * 60} />
            <div style={{ height: 6 }} />
            <SkBlock w="50%" h={9} delay={i * 60} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Overview skeleton — breakdown panel + chart placeholder + quick stats grid
function OverviewSkeleton() {
  return (
    <div className={styles.overviewContent}>
      {/* Breakdown panel skeleton */}
      <div className={styles.breakdownPanel}>
        <div className={styles.breakdownHeader}>
          <SkBlock w={140} h={14} />
          <SkBlock w={80} h={10} />
        </div>
        <div className={styles.breakdownGrid}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={styles.breakdownCard}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <SkBlock w={50} h={12} delay={i * 80} />
              <div style={{ height: 8 }} />
              <SkBlock w="70%" h={20} delay={i * 80} />
              <div style={{ height: 10 }} />
              <div className={styles.breakdownCardRow}>
                <SkBlock w={60} h={9} delay={i * 80} />
                <SkBlock w={70} h={9} delay={i * 80} />
              </div>
              <div className={styles.breakdownCardRow}>
                <SkBlock w={60} h={9} delay={i * 80} />
                <SkBlock w={70} h={9} delay={i * 80} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart placeholder skeleton */}
      <div className={styles.chartPlaceholder}>
        <div className={styles.skChartCircle} />
        <SkBlock w={220} h={12} />
      </div>

      {/* Quick stats skeleton */}
      <div className={styles.quickStats}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={styles.quickStat}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <SkBlock w="60%" h={9} delay={i * 60} className={styles.skCenter} />
            <div style={{ height: 10 }} />
            <SkBlock
              w="45%"
              h={20}
              delay={i * 60}
              className={styles.skCenter}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Transaction row skeleton
function TransactionRowSkeleton({ delay = 0 }) {
  return (
    <div
      className={styles.transactionRow}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.transactionUser}>
        <div className={styles.skAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkBlock w="70%" h={11} delay={delay} />
          <div style={{ height: 5 }} />
          <SkBlock w="55%" h={9} delay={delay} />
        </div>
      </div>
      <div className={styles.transactionInfo}>
        <SkBlock w="50%" h={11} delay={delay} />
        <div style={{ height: 6 }} />
        <SkBlock w="80%" h={9} delay={delay} />
      </div>
      <div className={styles.transactionAmount}>
        <SkBlock w="70%" h={14} delay={delay} className={styles.skRight} />
        <div style={{ height: 6 }} />
        <SkBlock
          w={70}
          h={18}
          radius={999}
          delay={delay}
          className={styles.skRight}
        />
      </div>
      <div className={styles.transactionDate}>
        <SkBlock w={80} h={10} delay={delay} />
        <div style={{ height: 5 }} />
        <SkBlock w={70} h={9} delay={delay} />
      </div>
      <div className={styles.skBtn} />
    </div>
  );
}

// Withdrawal row skeleton
function WithdrawalRowSkeleton({ delay = 0 }) {
  return (
    <div
      className={styles.withdrawalRow}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.withdrawalUser}>
        <div className={styles.skAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkBlock w="70%" h={11} delay={delay} />
          <div style={{ height: 5 }} />
          <SkBlock w="55%" h={9} delay={delay} />
        </div>
      </div>
      <div className={styles.withdrawalInfo}>
        <SkBlock w="45%" h={11} delay={delay} />
        <div style={{ height: 6 }} />
        <SkBlock w="75%" h={9} delay={delay} />
      </div>
      <div className={styles.withdrawalAmount}>
        <SkBlock w="60%" h={14} delay={delay} className={styles.skRight} />
        <div style={{ height: 6 }} />
        <SkBlock w={90} h={9} delay={delay} className={styles.skRight} />
        <div style={{ height: 4 }} />
        <SkBlock w={60} h={9} delay={delay} className={styles.skRight} />
      </div>
      <div className={styles.withdrawalStatus}>
        <SkBlock w={90} h={18} radius={999} delay={delay} />
        <div style={{ height: 6 }} />
        <SkBlock w={70} h={9} delay={delay} />
      </div>
      <div className={styles.withdrawalActions}>
        <SkBlock w={70} h={26} radius={6} delay={delay} />
        <SkBlock w={70} h={26} radius={6} delay={delay} />
      </div>
    </div>
  );
}

// List skeleton — n rows
function ListSkeleton({ variant = "transaction", rows = 6 }) {
  return (
    <div className={styles.tableContainer}>
      {Array.from({ length: rows }).map((_, i) =>
        variant === "withdrawal" ? (
          <WithdrawalRowSkeleton key={i} delay={i * 50} />
        ) : (
          <TransactionRowSkeleton key={i} delay={i * 50} />
        ),
      )}
    </div>
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
  currency = "NGN",
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
                  {formatCurrency(withdrawalAmount || 0, currency)}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>
                  Fee (1% capped at 100)
                </span>
                <span
                  className={styles.breakdownValue}
                  style={{ color: "var(--orange)" }}
                >
                  -{formatCurrency(feeAmount || 0, currency)}
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
                  {formatCurrency(netAmount || 0, currency)}
                </span>
              </div>
              {netAmount > 0 && (
                <div className={styles.copyRow}>
                  <span className={styles.breakdownLabel}>
                    Copy Final Amount
                  </span>
                  <CopyButton
                    text={formatCurrencyPlain(netAmount || 0, currency)}
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
      <div className={styles.chipBody}>
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

// ─── Per-currency Breakdown Panel ──────────────────────────────────────────

function CurrencyBreakdown({ balancesByCurrency }) {
  if (!Array.isArray(balancesByCurrency) || balancesByCurrency.length === 0) {
    return null;
  }

  return (
    <div className={styles.breakdownPanel}>
      <div className={styles.breakdownHeader}>
        <span className={styles.breakdownTitle}>Balance by Currency</span>
        <span className={styles.breakdownSub}>
          {balancesByCurrency.length} currenc
          {balancesByCurrency.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <div className={styles.breakdownGrid}>
        {balancesByCurrency.map((row) => {
          const cur = row.currency;
          const sum = row._sum || {};
          return (
            <div key={cur} className={styles.breakdownCard}>
              <div className={styles.breakdownCardTop}>
                <span className={styles.breakdownCardCur}>{cur}</span>
              </div>
              <div className={styles.breakdownCardBalance}>
                {formatCurrency(sum.balance || 0, cur)}
              </div>
              <div className={styles.breakdownCardMeta}>
                <div className={styles.breakdownCardRow}>
                  <span className={styles.breakdownCardLabel}>Deposited</span>
                  <span className={styles.breakdownCardVal}>
                    {formatCurrency(sum.totalDeposited || 0, cur)}
                  </span>
                </div>
                <div className={styles.breakdownCardRow}>
                  <span className={styles.breakdownCardLabel}>Withdrawn</span>
                  <span className={styles.breakdownCardVal}>
                    {formatCurrency(sum.totalWithdrawn || 0, cur)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const cur = transaction.currency || "NGN";
  const hasHirer = !!transaction.hirer;

  return (
    <div className={styles.transactionRow}>
      <div className={styles.transactionUser}>
        <div className={styles.userAvatar}>
          {hasHirer
            ? `${transaction.hirer?.firstName?.[0] || ""}${transaction.hirer?.lastName?.[0] || ""}`
            : "?"}
        </div>
        <div className={styles.userInfo}>
          {hasHirer ? (
            <>
              <div className={styles.userName}>
                {transaction.hirer?.firstName} {transaction.hirer?.lastName}
              </div>
              <div className={styles.userEmail}>{transaction.hirer?.email}</div>
            </>
          ) : (
            <>
              <div className={styles.userName}>Wallet transaction</div>
              <div className={styles.userEmail}>
                <CopyButton
                  text={transaction.hirerId}
                  label={transaction.hirerId?.slice(0, 12) + "…"}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.transactionInfo}>
        <div className={styles.transactionType}>
          {getTransactionTypeLabel(transaction.type)}
        </div>
        <div className={styles.transactionRef}>
          <CopyButton
            text={transaction.reference}
            label={transaction.reference}
          />
        </div>
        {transaction.description && (
          <div className={styles.transactionDesc}>
            {transaction.description}
          </div>
        )}
      </div>

      <div className={styles.transactionAmount}>
        <div style={{ color: amountColor, fontWeight: 700 }}>
          {amountPrefix}
          {formatCurrency(transaction.netAmount ?? transaction.amount, cur)}
        </div>
        {(transaction.fee || 0) > 0 && (
          <div className={styles.transactionFee}>
            fee {formatCurrency(transaction.fee, cur)}
          </div>
        )}
        <StatusBadge status={transaction.status} />
      </div>

      <div className={styles.transactionDate}>
        <div>{formatDate(transaction.createdAt)}</div>
        {transaction.balanceAfter != null && (
          <div className={styles.transactionBalanceAfter}>
            bal {formatCurrency(transaction.balanceAfter, cur)}
          </div>
        )}
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
  const cur = withdrawal.currency || "NGN";
  const fee = withdrawal.fee ?? 0;
  const netAmount = withdrawal.netAmount ?? (withdrawal.amount || 0) - fee;

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
          {withdrawal.hirer?.id && (
            <div className={styles.userEmail} style={{ opacity: 0.6 }}>
              <CopyButton
                text={withdrawal.hirer.id}
                label={withdrawal.hirer.id.slice(0, 10) + "…"}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.withdrawalInfo}>
        <div className={styles.withdrawalBank}>{withdrawal.bankName}</div>
        <div className={styles.withdrawalAccount}>
          {withdrawal.accountNumber} - {withdrawal.accountName}
        </div>
        {withdrawal.bankCode && (
          <div className={styles.withdrawalRef}>
            bank code {withdrawal.bankCode}
          </div>
        )}
        <div className={styles.withdrawalRef}>
          <CopyButton
            text={withdrawal.reference}
            label={withdrawal.reference}
          />
        </div>
      </div>

      <div className={styles.withdrawalAmount}>
        <div style={{ fontWeight: 700, color: "#EF4444" }}>
          {formatCurrency(withdrawal.amount, cur)}
        </div>
        <div className={styles.withdrawalFee}>
          Fee (1% capped at 100): {formatCurrency(fee, cur)}
        </div>
        <div
          className={styles.withdrawalNet}
          style={{
            fontWeight: 600,
            color: "var(--green)",
            fontSize: "0.75rem",
          }}
        >
          Net: {formatCurrency(netAmount, cur)}
        </div>
      </div>

      <div className={styles.withdrawalStatus}>
        <StatusBadge status={withdrawal.status} />
        <div className={styles.withdrawalDate}>
          {formatDate(withdrawal.createdAt)}
        </div>
        {withdrawal.processedAt && (
          <div className={styles.withdrawalDate} style={{ opacity: 0.6 }}>
            proc {formatDate(withdrawal.processedAt)}
          </div>
        )}
        {withdrawal.failureReason && (
          <div
            className={styles.withdrawalDate}
            style={{ color: "var(--red)" }}
          >
            {withdrawal.failureReason}
          </div>
        )}
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
  const cur = data.currency || "NGN";
  const fee = isTransaction ? data.fee || 0 : (data.fee ?? 0);
  const netAmount = isTransaction
    ? (data.netAmount ?? data.amount)
    : (data.netAmount ?? (data.amount || 0) - fee);

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
              {data.hirer?.email ? (
                <div className={styles.detailEmail}>
                  <FiMail size={12} /> {data.hirer?.email}
                </div>
              ) : (
                <div className={styles.detailEmail}>
                  <FiHash size={12} /> user {data.hirerId?.slice(0, 12)}…
                </div>
              )}
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
                    {formatCurrency(data.amount, cur)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fee</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.fee || 0, cur)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Net Amount</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(netAmount, cur)}
                    <CopyButton
                      text={formatCurrencyPlain(netAmount, cur)}
                      label="Copy"
                    />
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance Before</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.balanceBefore || 0, cur)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Balance After</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.balanceAfter || 0, cur)}
                  </span>
                </div>
                {data.description && (
                  <div
                    className={styles.detailItem}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue}>
                      {data.description}
                    </span>
                  </div>
                )}
                {data.meta && (
                  <div
                    className={styles.detailItem}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={styles.detailLabel}>Meta</span>
                    <pre className={styles.metaPre}>
                      {JSON.stringify(data.meta, null, 2)}
                    </pre>
                  </div>
                )}
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
                {data.bankCode && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Bank Code</span>
                    <span className={styles.detailValue}>{data.bankCode}</span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(data.amount, cur)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fee</span>
                  <span
                    className={styles.detailValue}
                    style={{ color: "var(--orange)" }}
                  >
                    {formatCurrency(fee, cur)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Net Amount</span>
                  <span
                    className={styles.detailValue}
                    style={{ color: "var(--green)", fontWeight: 700 }}
                  >
                    {formatCurrency(netAmount, cur)}
                    <CopyButton
                      text={formatCurrencyPlain(netAmount, cur)}
                      label="Copy"
                    />
                  </span>
                </div>
                {data.walletId && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Wallet ID</span>
                    <span className={styles.detailValue}>
                      <CopyButton
                        text={data.walletId}
                        label={data.walletId.slice(0, 12) + "…"}
                      />
                    </span>
                  </div>
                )}
                {data.hirerId && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Hirer ID</span>
                    <span className={styles.detailValue}>
                      <CopyButton
                        text={data.hirerId}
                        label={data.hirerId.slice(0, 12) + "…"}
                      />
                    </span>
                  </div>
                )}
                {data.failureReason && (
                  <div
                    className={styles.detailItem}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={styles.detailLabel}>Failure Reason</span>
                    <span
                      className={styles.detailValue}
                      style={{ color: "#EF4444" }}
                    >
                      {data.failureReason}
                    </span>
                  </div>
                )}
                {data.processedAt && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Processed</span>
                    <span className={styles.detailValue}>
                      {formatDate(data.processedAt)}
                    </span>
                  </div>
                )}
                {data.completedAt && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Completed</span>
                    <span className={styles.detailValue}>
                      {formatDate(data.completedAt)}
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
            {data.updatedAt && data.updatedAt !== data.createdAt && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Updated</span>
                <span className={styles.detailValue}>
                  {formatDate(data.updatedAt)}
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
  const [statsLoading, setStatsLoading] = useState(true);
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
    setStatsLoading(true);
    api
      .get("/wallet/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
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
    const fee = withdrawal.fee ?? 0;
    const netAmount = withdrawal.netAmount ?? (withdrawal.amount || 0) - fee;
    const cur = withdrawal.currency || "NGN";

    showConfirm(
      "Approve Withdrawal",
      `Are you sure you want to approve this withdrawal?`,
      async () => {
        try {
          await api.patch(`/wallet/admin/withdrawals/${withdrawal.id}/approve`);
          showMessage(
            "Approved",
            `Withdrawal approved successfully!\nFinal payout: ${formatCurrency(netAmount, cur)}`,
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
      {
        withdrawalAmount: withdrawal.amount,
        feeAmount: fee,
        netAmount,
        currency: cur,
      },
    );
  };

  const handleRejectWithdrawal = (withdrawal) => {
    const cur = withdrawal.currency || "NGN";
    showPrompt(
      "Reject Withdrawal",
      `Reject withdrawal of ${formatCurrency(withdrawal.amount, cur)}? Please provide a reason.`,
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
      showToast("CSV export endpoint not available yet", "error");
    }
  };

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
            currency={confirmModal.withdrawalData?.currency || "NGN"}
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
          <div className={styles.headerText}>
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
        {statsLoading ? (
          <StatsSkeleton />
        ) : stats ? (
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
        ) : null}

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "overview" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "overview")}
          >
            <FiPieChart size={14} /> <span>Overview</span>
          </button>
          <button
            className={`${styles.tab} ${tab === "transactions" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "transactions")}
          >
            <FiActivity size={14} /> <span>Transactions</span>
          </button>
          <button
            className={`${styles.tab} ${tab === "withdrawals" ? styles.tabActive : ""}`}
            onClick={() => setParam("tab", "withdrawals")}
          >
            <FiArrowUp size={14} /> <span>Withdrawals</span>
          </button>
        </div>

        {/* ─── Overview Tab ────────────────────────────────────────────────── */}
        {tab === "overview" &&
          (statsLoading ? (
            <OverviewSkeleton />
          ) : stats ? (
            <div className={styles.overviewContent}>
              <CurrencyBreakdown
                balancesByCurrency={stats.balancesByCurrency}
              />

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
                    Currencies in Use
                  </span>
                  <span className={styles.quickStatValue}>
                    {Array.isArray(stats.balancesByCurrency)
                      ? stats.balancesByCurrency.length
                      : 0}
                  </span>
                </div>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatLabel}>
                    Deposits-to-Withdrawals
                  </span>
                  <span className={styles.quickStatValue}>
                    {stats.totalWithdrawn > 0
                      ? (
                          (stats.totalDeposited || 0) / stats.totalWithdrawn
                        ).toFixed(2) + "×"
                      : "—"}
                  </span>
                </div>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatLabel}>Cash Retained</span>
                  <span className={styles.quickStatValue}>
                    {formatCurrency(
                      (stats.totalDeposited || 0) - (stats.totalWithdrawn || 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : null)}

        {/* ─── Transactions Tab ───────────────────────────────────────────── */}
        {tab === "transactions" && (
          <div className={styles.transactionsSection}>
            <div className={styles.scopeNotice}>
              <FiInfo size={14} />
              <span>
                Transaction history is scoped to your own wallet. There is no
                admin-wide transactions endpoint yet.
              </span>
            </div>

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
              <ListSkeleton variant="transaction" rows={6} />
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
              <ListSkeleton variant="withdrawal" rows={6} />
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
