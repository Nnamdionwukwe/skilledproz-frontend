import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminPayments.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAY_STATUSES = [
  "ALL",
  "PENDING",
  "HELD",
  "RELEASED",
  "REFUNDED",
  "FAILED",
];
const WD_STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];
const PROVIDERS = ["ALL", "stripe", "paystack", "bank_transfer", "crypto"];

const PAY_STATUS_META = {
  PENDING: { cls: "yellow", label: "Pending" },
  HELD: { cls: "indigo", label: "Held" },
  RELEASED: { cls: "green", label: "Released" },
  REFUNDED: { cls: "blue", label: "Refunded" },
  FAILED: { cls: "red", label: "Failed" },
};
const WD_STATUS_META = {
  PENDING: { cls: "yellow", label: "Pending" },
  PROCESSING: { cls: "orange", label: "Processing" },
  COMPLETED: { cls: "green", label: "Completed" },
  FAILED: { cls: "red", label: "Failed" },
  CANCELLED: { cls: "dim", label: "Cancelled" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(amount, currency) {
  const sym = !currency || currency === "NGN" ? "₦" : currency;
  if (!amount && amount !== 0) return "—";
  return `${sym} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

function Badge({ status, meta }) {
  const m = meta[status] || { cls: "dim", label: status };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function ProviderTag({ provider }) {
  if (!provider) return <span className={styles.providerTag}>—</span>;
  const icons = {
    stripe: "💳",
    paystack: "🟢",
    bank_transfer: "🏦",
    crypto: "₿",
  };
  return (
    <span className={styles.providerTag}>
      {icons[provider] || "💰"} {provider.replace("_", " ")}
    </span>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statVal}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Payment Detail Panel ─────────────────────────────────────────────────────

function PaymentDetailPanel({ paymentId, onRelease, onRefund }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // GET /admin/payments/:paymentId — getPaymentDetail
    api
      .get(`/admin/payments/${paymentId}`)
      .then((r) => setDetail(r.data.data?.payment))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) {
    return (
      <div className={styles.detailPanel}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.detailSk} />
        ))}
      </div>
    );
  }
  if (!detail) {
    return (
      <div className={styles.detailPanel}>
        <p className={styles.detailErr}>Failed to load payment.</p>
      </div>
    );
  }

  const bk = detail.booking;

  return (
    <div className={styles.detailPanel}>
      {/* Parties */}
      {bk && (
        <div className={styles.detailRow}>
          <div className={styles.partyCard}>
            <p className={styles.partyRole}>🧑 Hirer</p>
            <p className={styles.partyName}>
              {bk.hirer?.firstName} {bk.hirer?.lastName}
            </p>
            <p className={styles.partyEmail}>{bk.hirer?.email}</p>
          </div>
          <div className={styles.vsChip}>→</div>
          <div className={styles.partyCard}>
            <p className={styles.partyRole}>🔨 Worker</p>
            <p className={styles.partyName}>
              {bk.worker?.firstName} {bk.worker?.lastName}
            </p>
            <p className={styles.partyEmail}>{bk.worker?.email}</p>
          </div>
        </div>
      )}

      {/* Booking info */}
      {bk && (
        <div className={styles.metaGrid}>
          <MetaField label="Booking" value={bk.title || "—"} />
          <MetaField label="Category" value={bk.category?.name || "—"} />
          <MetaField label="Status" value={bk.status} />
          <MetaField label="Booked" value={fmtDate(bk.createdAt)} />
        </div>
      )}

      {/* Full payment breakdown */}
      <div className={styles.payBreakdown}>
        <div className={styles.breakdownRow}>
          <span>Total Amount</span>
          <span className={styles.breakdownVal}>
            {fmtAmt(detail.amount, detail.currency)}
          </span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Worker Payout</span>
          <span className={styles.breakdownVal}>
            {fmtAmt(detail.workerPayout, detail.currency)}
          </span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Platform Fee</span>
          <span className={`${styles.breakdownVal} ${styles.breakdownFee}`}>
            {fmtAmt(detail.platformFee, detail.currency)}
          </span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Provider</span>
          <ProviderTag provider={detail.provider} />
        </div>
        <div className={styles.breakdownRow}>
          <span>Payment Ref</span>
          <span className={styles.breakdownMono}>
            {detail.transactionRef || "—"}
          </span>
        </div>
        {detail.escrowReleasedAt && (
          <div className={styles.breakdownRow}>
            <span>Released At</span>
            <span>{fmtDate(detail.escrowReleasedAt)}</span>
          </div>
        )}
        {detail.refundedAt && (
          <div className={styles.breakdownRow}>
            <span>Refunded At</span>
            <span>{fmtDate(detail.refundedAt)}</span>
          </div>
        )}
      </div>

      {/* Admin actions */}
      {detail.status === "HELD" && (
        <div className={styles.detailActions}>
          <button
            className={styles.actionRelease}
            onClick={() =>
              onRelease(detail.booking?.id || detail.bookingId, detail.id)
            }
          >
            ✅ Release to Worker
          </button>
          <button
            className={styles.actionRefund}
            onClick={() =>
              onRefund(detail.booking?.id || detail.bookingId, detail.id)
            }
          >
            💸 Refund Hirer
          </button>
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value }) {
  return (
    <div className={styles.metaField}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

// ─── Payment Action Modal ─────────────────────────────────────────────────────

function PayActionModal({ action, onConfirm, onClose, loading }) {
  const [notes, setNotes] = useState("");
  const isRelease = action === "release";
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p
            className={styles.modalTitle}
            style={{ color: isRelease ? "var(--green)" : "#60a5fa" }}
          >
            {isRelease ? "✅ Release Payment" : "💸 Refund Hirer"}
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            {isRelease
              ? "Releases escrow to the worker. Booking will be marked Completed."
              : "Refunds the hirer. Booking will be marked Cancelled."}
          </p>
          <textarea
            className={styles.textarea}
            placeholder="Audit note (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={isRelease ? styles.modalRelease : styles.modalRefund}
              onClick={() => onConfirm(notes)}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : isRelease ? (
                "Confirm Release"
              ) : (
                "Confirm Refund"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Withdrawal Reject Modal ──────────────────────────────────────────────────

function RejectModal({ worker, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
            Reject Withdrawal
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            Rejection reason sent to <strong>{worker}</strong> in their
            notification.
          </p>
          <textarea
            className={styles.textarea}
            placeholder="Reason for rejection (e.g. invalid bank details)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.modalDelete}
              onClick={() => onConfirm(reason)}
              disabled={loading}
            >
              {loading ? <span className={styles.spinner} /> : "✕ Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ searchParams, setSearchParams }) {
  const status = searchParams.get("pstatus") || "ALL";
  const provider = searchParams.get("provider") || "ALL";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [payModal, setPayModal] = useState(null); // { action, bookingId, paymentId }
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (status !== "ALL") params.status = status;
    if (provider !== "ALL") params.provider = provider;
    if (from) params.from = from;
    if (to) params.to = to;

    // GET /admin/payments — getAllPayments
    api
      .get("/admin/payments", { params })
      .then((r) => {
        const d = r.data.data;
        setPayments(d.payments || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setSummary(d.summary || null);
      })
      .catch(() => showToast("Failed to load payments", "error"))
      .finally(() => setLoading(false));
  }, [status, provider, from, to, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handlePayAction(notes) {
    if (!payModal) return;
    const { action, bookingId } = payModal;
    setActing(true);
    try {
      // POST /admin/payments/:bookingId/release  OR  /refund
      await api.post(`/admin/payments/${bookingId}/${action}`, { notes });
      showToast(
        action === "release" ? "Payment released ✅" : "Refund issued 💸",
      );
      setPayModal(null);
      setExpanded(null);
      fetchPayments();
    } catch (e) {
      showToast(e?.response?.data?.message || "Action failed", "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className={styles.tabContent}>
      <Toast toast={toast} />

      {/* Summary stats from server aggregate */}
      {summary && (
        <div className={styles.statsBar}>
          <StatCard
            icon="📈"
            label="Gross Volume"
            value={fmtAmt(summary.totalGMV)}
            accent="orange"
          />
          <StatCard
            icon="💰"
            label="Platform Fees"
            value={fmtAmt(summary.totalFees)}
            accent="green"
          />
          <StatCard
            icon="💸"
            label="Worker Payouts"
            value={fmtAmt(summary.totalPayouts)}
          />
          <StatCard
            icon="📄"
            label="Transactions"
            value={total?.toLocaleString()}
          />
        </div>
      )}

      {/* Filters: status tabs + provider + date range */}
      <div className={styles.filterRow}>
        <div className={styles.filterBar}>
          {PAY_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
              onClick={() => setParam("pstatus", s === "ALL" ? "" : s)}
            >
              {s === "ALL" ? "All" : PAY_STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <select
          className={styles.providerSelect}
          value={provider}
          onChange={(e) => setParam("provider", e.target.value)}
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? "All Providers" : p.replace("_", " ")}
            </option>
          ))}
        </select>
        <div className={styles.dateGroup}>
          <input
            type="date"
            className={styles.dateInput}
            value={from}
            onChange={(e) => setParam("from", e.target.value)}
            title="From"
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={styles.dateInput}
            value={to}
            onChange={(e) => setParam("to", e.target.value)}
            title="To"
          />
          {(from || to) && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setParam("from", "");
                setParam("to", "");
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>Booking</span>
          <span>Hirer</span>
          <span>Worker</span>
          <span>Amount</span>
          <span>Fee</span>
          <span>Worker Pay</span>
          <span>Provider</span>
          <span>Status</span>
        </div>
        <div className={styles.tableBody}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={styles.skRow}
                style={{ animationDelay: `${i * 35}ms` }}
              />
            ))
          ) : payments.length === 0 ? (
            <div className={styles.empty}>
              <span>💳</span>
              <p>No payments found</p>
            </div>
          ) : (
            payments.map((p, i) => (
              <div
                key={p.id}
                className={styles.rowWrap}
                style={{ animationDelay: `${i * 28}ms` }}
              >
                <div
                  className={`${styles.tableRow} ${expanded === p.id ? styles.tableRowOpen : ""}`}
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className={styles.tdTitle}>
                    {p.booking?.title || p.bookingId?.slice(0, 8) || "—"}
                  </div>
                  <div className={styles.tdMeta}>
                    {p.booking?.hirer?.firstName} {p.booking?.hirer?.lastName}
                  </div>
                  <div className={styles.tdMeta}>
                    {p.booking?.worker?.firstName} {p.booking?.worker?.lastName}
                  </div>
                  {/* Amount uses p.currency, defaulting to ₦ */}
                  <div className={styles.tdBold}>
                    {fmtAmt(p.amount, p.currency)}
                  </div>
                  <div className={styles.tdMeta}>
                    {fmtAmt(p.platformFee, p.currency)}
                  </div>
                  <div className={styles.tdMeta}>
                    {fmtAmt(p.workerPayout, p.currency)}
                  </div>
                  <ProviderTag provider={p.provider} />
                  <Badge status={p.status} meta={PAY_STATUS_META} />
                </div>

                {expanded === p.id && (
                  <PaymentDetailPanel
                    paymentId={p.id}
                    onRelease={(bookingId, paymentId) =>
                      setPayModal({ action: "release", bookingId, paymentId })
                    }
                    onRefund={(bookingId, paymentId) =>
                      setPayModal({ action: "refund", bookingId, paymentId })
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pager}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setParam("page", String(page - 1))}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages} · {total.toLocaleString()} total
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === pages}
            onClick={() => setParam("page", String(page + 1))}
          >
            Next →
          </button>
        </div>
      )}

      {/* Payment action modal */}
      {payModal && (
        <PayActionModal
          action={payModal.action}
          loading={acting}
          onConfirm={handlePayAction}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────────────────────

function WithdrawalsTab({ searchParams, setSearchParams }) {
  const status = searchParams.get("wstatus") || "ALL";
  const page = parseInt(searchParams.get("wpage") || "1");

  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null); // withdrawalId
  const [rejectTarget, setRejectTarget] = useState(null); // withdrawal object
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "wpage") p.set("wpage", "1");
    setSearchParams(p);
  }

  const fetchWithdrawals = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (status !== "ALL") params.status = status;

    // GET /admin/withdrawals — getAllWithdrawals
    api
      .get("/admin/withdrawals", { params })
      .then((r) => {
        const d = r.data.data;
        setWithdrawals(d.withdrawals || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPendingTotal(d.pendingTotal || 0);
        setPendingCount(d.pendingCount || 0);
      })
      .catch(() => showToast("Failed to load withdrawals", "error"))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // PATCH /admin/withdrawals/:id/approve — PENDING → PROCESSING
  async function handleApprove(withdrawalId) {
    setActing(withdrawalId);
    try {
      await api.patch(`/admin/withdrawals/${withdrawalId}/approve`);
      showToast("Withdrawal approved — processing 🚀");
      fetchWithdrawals();
    } catch (e) {
      showToast(e?.response?.data?.message || "Approval failed", "error");
    } finally {
      setActing(null);
    }
  }

  // PATCH /admin/withdrawals/:id/reject — PENDING → FAILED + notify
  async function handleReject(reason) {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    setRejectTarget(null);
    try {
      await api.patch(`/admin/withdrawals/${rejectTarget.id}/reject`, {
        reason,
      });
      showToast("Withdrawal rejected");
      fetchWithdrawals();
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className={styles.tabContent}>
      <Toast toast={toast} />

      {/* Pending queue stats */}
      <div className={styles.statsBar}>
        <StatCard
          icon="⏳"
          label="Pending Queue"
          value={pendingCount.toLocaleString()}
          accent={pendingCount > 0 ? "amber" : undefined}
        />
        <StatCard
          icon="💸"
          label="Pending Amount"
          value={fmtAmt(pendingTotal)}
          accent={pendingCount > 0 ? "amber" : undefined}
        />
        <StatCard
          icon="📋"
          label="Total Records"
          value={total.toLocaleString()}
        />
      </div>

      {/* Status filter */}
      <div className={styles.filterBar}>
        {WD_STATUSES.map((s) => (
          <button
            key={s}
            className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
            onClick={() => setParam("wstatus", s === "ALL" ? "" : s)}
          >
            {s === "ALL" ? "All" : WD_STATUS_META[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={`${styles.tableHead} ${styles.tableHeadWd}`}>
          <span>Worker</span>
          <span>Amount</span>
          <span>Method</span>
          <span>Destination</span>
          <span>Requested</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className={styles.tableBody}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={styles.skRow}
                style={{ animationDelay: `${i * 35}ms` }}
              />
            ))
          ) : withdrawals.length === 0 ? (
            <div className={styles.empty}>
              <span>💸</span>
              <p>No withdrawal requests</p>
            </div>
          ) : (
            withdrawals.map((w, i) => (
              <div
                key={w.id}
                className={`${styles.tableRow} ${styles.tableRowWd}`}
                style={{ animationDelay: `${i * 28}ms` }}
              >
                <div className={styles.workerCell}>
                  <div className={styles.wdAvatar}>
                    {w.worker?.avatar ? (
                      <img src={w.worker.avatar} alt="" />
                    ) : (
                      `${w.worker?.firstName?.[0] ?? ""}${w.worker?.lastName?.[0] ?? ""}`
                    )}
                  </div>
                  <div>
                    <p className={styles.wdName}>
                      {w.worker?.firstName} {w.worker?.lastName}
                    </p>
                    <p className={styles.wdEmail}>{w.worker?.email}</p>
                  </div>
                </div>
                <div className={styles.tdBold}>
                  {fmtAmt(w.amount, w.currency)}
                </div>
                <div className={styles.tdMeta}>
                  {w.method?.replace("_", " ") || "—"}
                </div>
                <div className={`${styles.tdMeta} ${styles.mono}`}>
                  {w.destination?.slice(0, 18) || "—"}
                </div>
                <div className={styles.tdMeta}>{timeAgo(w.createdAt)}</div>
                <Badge status={w.status} meta={WD_STATUS_META} />
                <div className={styles.wdActions}>
                  {w.status === "PENDING" && (
                    <>
                      <button
                        className={styles.approveBtn}
                        disabled={acting === w.id}
                        onClick={() => handleApprove(w.id)}
                        title="Approve — move to Processing"
                      >
                        {acting === w.id ? (
                          <span className={styles.spinner} />
                        ) : (
                          "✅ Approve"
                        )}
                      </button>
                      <button
                        className={styles.rejectBtn}
                        disabled={acting === w.id}
                        onClick={() => setRejectTarget(w)}
                        title="Reject with reason"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pager}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setParam("wpage", String(page - 1))}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === pages}
            onClick={() => setParam("wpage", String(page + 1))}
          >
            Next →
          </button>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          worker={`${rejectTarget.worker?.firstName ?? ""} ${rejectTarget.worker?.lastName ?? ""}`.trim()}
          loading={acting === rejectTarget.id}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "payments";

  function setTab(t) {
    const p = new URLSearchParams(searchParams);
    p.set("tab", t);
    // Reset tab-specific params
    ["pstatus", "provider", "from", "to", "page", "wstatus", "wpage"].forEach(
      (k) => p.delete(k),
    );
    setSearchParams(p);
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Finance</p>
            <h1 className={styles.pageTitle}>Payments &amp; Payouts</h1>
          </div>
        </div>

        {/* ── Main Tabs ── */}
        <div className={styles.mainTabs}>
          <button
            className={`${styles.mainTab} ${tab === "payments" ? styles.mainTabActive : ""}`}
            onClick={() => setTab("payments")}
          >
            💳 Transactions
          </button>
          <button
            className={`${styles.mainTab} ${tab === "withdrawals" ? styles.mainTabActive : ""}`}
            onClick={() => setTab("withdrawals")}
          >
            💸 Withdrawals
          </button>
        </div>

        {/* ── Tab Content ── */}
        {tab === "payments" ? (
          <PaymentsTab
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        ) : (
          <WithdrawalsTab
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        )}
      </div>
    </AdminLayout>
  );
}
