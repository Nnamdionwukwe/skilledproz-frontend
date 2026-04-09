import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import styles from "./HirerPaymentHistory.module.css";
import HirerLayout from "../layout/HirerLayout";
import { useCurrency, CURRENCY_META } from "../../context/CurrencyContext";
import DashboardCurrencySwitch from "../common/DashboardCurrencySwitch";

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

// ── Receipt modal ─────────────────────────────────────────────────────────────
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

  if (!payment) return null;

  const { booking } = payment;
  const hirer = booking?.hirer ?? {};
  const worker = booking?.worker ?? {};
  const statusMeta = STATUS_META[payment.status] ?? {
    label: payment.status,
    cls: "pending",
  };

  const platformFeePercent =
    payment.amount > 0
      ? ((payment.platformFee / payment.amount) * 100).toFixed(1)
      : "0.0";

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdrop}>
      <div className={styles.modal} ref={ref}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalLogo}>
            <span className={styles.logoMark}>SP</span>
            <span className={styles.logoText}>SkilledPro</span>
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
            {booking.scheduledAt && (
              <span className={styles.receiptDate}>
                Scheduled: {fmtDate(booking.scheduledAt)}
              </span>
            )}
            {booking.completedAt && (
              <span className={styles.receiptDate}>
                Completed: {fmtDate(booking.completedAt)}
              </span>
            )}
          </div>
        )}

        <div className={styles.receiptDivider} />

        {/* Breakdown */}
        <div className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <span>Job total</span>
            <span>{fmt(payment.amount, payment.currency)}</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>Platform fee ({platformFeePercent}%)</span>
            <span className={styles.feeAmount}>
              − {fmt(payment.platformFee, payment.currency)}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span>Worker payout</span>
            <span>{fmt(payment.workerPayout, payment.currency)}</span>
          </div>
          <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
            <span>You paid</span>
            <span className={styles.totalAmount}>
              {fmt(payment.amount, payment.currency)}
            </span>
          </div>
        </div>

        {/* Escrow release timestamp */}
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

        {payment.currency && (
          <span
            style={{
              background: ["USDC", "USDT"].includes(payment.currency)
                ? "rgba(139,92,246,0.12)"
                : "var(--orange-dim)",
              color: ["USDC", "USDT"].includes(payment.currency)
                ? "#a78bfa"
                : "var(--orange)",
              border: "1px solid var(--orange-glow)",
              borderRadius: 999,
              padding: "1px 6px",
              fontSize: "0.65rem",
              fontWeight: 700,
            }}
          >
            {payment.currency}
          </span>
        )}

        {/* Footer */}
        <div className={styles.receiptFooter}>
          <span>SkilledPro · Global Skills Marketplace</span>
          <button className={styles.printBtn} onClick={() => window.print()}>
            Print / Save PDF
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
  const [receipt, setReceipt] = useState(null); // selected payment for modal
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [releasing, setReleasing] = useState(null); // bookingId being released
  const [currencyFilter, setCurrency] = useState("ALL");
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const { dashboardCurrency, fmt: fmtCurrency } = useCurrency();

  const LIMIT = 10;

  // ── Fetch payments ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = { page, limit: LIMIT };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (currencyFilter !== "ALL") params.currency = currencyFilter; // ← ADD

    api
      .get("/payments/hirer", { params })
      .then((res) => {
        const d = res.data.data ?? res.data;
        setPayments(d.payments ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.pages ?? 1);
        setSummary(d.summary ?? null);
        setAvailableCurrencies(d.availableCurrencies ?? []); // ← ADD
      })
      .catch(() => setError("Failed to load payment history."))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  // ── Release escrow ──────────────────────────────────────────────────────────
  async function handleRelease(bookingId) {
    if (
      !window.confirm(
        "Release payment to worker? This confirms the job is complete.",
      )
    )
      return;
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
    } catch {
      alert("Release failed. Please try again.");
    } finally {
      setReleasing(null);
    }
  }

  function fmt(amount, currency) {
    return fmtCurrency(amount, currency || dashboardCurrency);
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
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              fontWeight: 600,
              alignSelf: "center",
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
                            Worker gets{" "}
                            {fmt(payment.workerPayout, payment.currency)}
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
                          {payment.status === "HELD" && (
                            <button
                              className={styles.releaseBtn}
                              onClick={() => handleRelease(payment.bookingId)}
                              disabled={releasing === payment.bookingId}
                              title="Release payment to worker"
                            >
                              {releasing === payment.bookingId
                                ? "…"
                                : "Release"}
                            </button>
                          )}
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
        {/* ── Receipt modal ── */}
        {receipt && (
          <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
        )}
      </div>
    </HirerLayout>
  );
}
