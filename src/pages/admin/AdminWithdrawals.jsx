// src/pages/withdrawals/AdminWithdrawals.jsx
// Full withdrawal / payout queue management.
// Endpoints used:
//   GET    /admin/withdrawals?status=&page=&limit=
//   PATCH  /admin/withdrawals/:id/approve
//   PATCH  /admin/withdrawals/:id/reject   { reason }

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminWithdrawals.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow" },
  PROCESSING: { label: "Processing", color: "indigo" },
  COMPLETED: { label: "Completed", color: "green" },
  FAILED: { label: "Failed", color: "red" },
  CANCELLED: { label: "Cancelled", color: "dim" },
};

const METHOD_ICONS = {
  bank_transfer: "🏦",
  crypto: "₿",
  paypal: "🅿️",
  stripe: "💳",
  mobile_money: "📱",
  wire_transfer: "🔁",
};

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount, currency = "USD") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function methodLabel(method) {
  return (method ?? "unknown").replace(/_/g, " ");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  return (
    <div className={s.avatar}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, color: "dim" };
  return (
    <span className={`${s.badge} ${s[`badge_${meta.color}`]}`}>
      {meta.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Approve modal ────────────────────────────────────────────────────────────
function ApproveModal({ withdrawal, onClose, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/withdrawals/${withdrawal.id}/approve`, { notes });
      onSuccess("Withdrawal approved — now processing.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>✅ Approve Withdrawal</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Summary card */}
          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Worker</span>
              <span className={s.summaryVal}>
                {withdrawal.worker?.firstName} {withdrawal.worker?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Amount</span>
              <span className={`${s.summaryVal} ${s.amountHighlight}`}>
                {fmt(withdrawal.amount, withdrawal.currency)}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Method</span>
              <span className={s.summaryVal}>
                {METHOD_ICONS[withdrawal.method] || "💸"}{" "}
                {methodLabel(withdrawal.method)}
              </span>
            </div>
            {withdrawal.destination && (
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Destination</span>
                <span className={`${s.summaryVal} ${s.mono}`}>
                  {withdrawal.destination}
                </span>
              </div>
            )}
          </div>

          <div className={s.approveNote}>
            <span>⚠️</span>
            <p>
              Approving will move this withdrawal to <strong>PROCESSING</strong>{" "}
              and notify the worker. Ensure the payout has been initiated
              externally before marking complete.
            </p>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Internal Notes (optional)</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Sent via bank on 25 May…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnApprove}
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                "✅ Approve & Process"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ withdrawal, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReject() {
    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/withdrawals/${withdrawal.id}/reject`, { reason });
      onSuccess("Withdrawal rejected and worker notified.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>❌ Reject Withdrawal</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Worker</span>
              <span className={s.summaryVal}>
                {withdrawal.worker?.firstName} {withdrawal.worker?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Amount</span>
              <span className={`${s.summaryVal} ${s.amountHighlight}`}>
                {fmt(withdrawal.amount, withdrawal.currency)}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Method</span>
              <span className={s.summaryVal}>
                {METHOD_ICONS[withdrawal.method] || "💸"}{" "}
                {methodLabel(withdrawal.method)}
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Rejection Reason *</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Incorrect bank details provided. Please re-submit with valid IBAN."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnReject}
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                "❌ Reject Withdrawal"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function DetailModal({ withdrawal: w, onClose, onApprove, onReject }) {
  const isPending = w.status === "PENDING";

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>Withdrawal Detail</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Worker card */}
          <div className={s.workerCard}>
            <Avatar user={w.worker} />
            <div className={s.workerInfo}>
              <p className={s.workerName}>
                {w.worker?.firstName} {w.worker?.lastName}
              </p>
              <p className={s.workerEmail}>{w.worker?.email}</p>
            </div>
            <StatusBadge status={w.status} />
          </div>

          {/* Amount hero */}
          <div className={s.amountHero}>
            <span className={s.amountHeroLabel}>Requested Amount</span>
            <span className={s.amountHeroVal}>{fmt(w.amount, w.currency)}</span>
          </div>

          {/* Detail grid */}
          <div className={s.detailGrid}>
            {[
              {
                label: "Method",
                value: `${METHOD_ICONS[w.method] || "💸"} ${methodLabel(w.method)}`,
              },
              { label: "Destination", value: w.destination || "—", mono: true },
              { label: "Reference", value: w.reference || "—", mono: true },
              { label: "Requested", value: fmtDate(w.createdAt) },
              {
                label: "Processed",
                value: w.processedAt ? fmtDate(w.processedAt) : "—",
              },
              {
                label: "Completed",
                value: w.completedAt ? fmtDate(w.completedAt) : "—",
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className={s.detailCell}>
                <span className={s.detailLabel}>{label}</span>
                <span className={`${s.detailVal} ${mono ? s.mono : ""}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {w.notes && (
            <div className={s.notesBox}>
              <span className={s.notesIcon}>📝</span>
              <p className={s.notesText}>{w.notes}</p>
            </div>
          )}

          {isPending && (
            <div className={s.modalActions}>
              <button
                className={s.btnReject}
                onClick={() => {
                  onClose();
                  onReject(w);
                }}
              >
                ❌ Reject
              </button>
              <button
                className={s.btnApprove}
                onClick={() => {
                  onClose();
                  onApprove(w);
                }}
              >
                ✅ Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function WithdrawalRow({ w, index, onDetail, onApprove, onReject }) {
  const isPending = w.status === "PENDING";

  return (
    <div className={s.tableRow} style={{ animationDelay: `${index * 0.025}s` }}>
      {/* Worker */}
      <div className={s.tdWorker}>
        <Avatar user={w.worker} />
        <div className={s.tdWorkerInfo}>
          <span className={s.tdName}>
            {w.worker?.firstName} {w.worker?.lastName}
          </span>
          <span className={s.tdEmail}>{w.worker?.email}</span>
        </div>
      </div>

      {/* Amount */}
      <div className={s.tdAmount}>
        <span className={s.tdAmountVal}>{fmt(w.amount, w.currency)}</span>
      </div>

      {/* Method */}
      <div className={s.tdMethod}>
        <span className={s.methodIcon}>{METHOD_ICONS[w.method] || "💸"}</span>
        <div className={s.methodInfo}>
          <span className={s.methodName}>{methodLabel(w.method)}</span>
          {w.destination && (
            <span className={s.methodDest}>{w.destination}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={s.tdStatus}>
        <StatusBadge status={w.status} />
        <span className={s.tdRelative}>{fmtRelative(w.createdAt)}</span>
      </div>

      {/* Date */}
      <div className={s.tdDate}>{fmtDate(w.createdAt)}</div>

      {/* Actions */}
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(w)}
          title="View details"
        >
          👁
        </button>
        {isPending && (
          <>
            <button
              className={s.approveBtn}
              onClick={() => onApprove(w)}
              title="Approve"
            >
              ✅
            </button>
            <button
              className={s.rejectBtn}
              onClick={() => onReject(w)}
              title="Reject"
            >
              ❌
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);

  // Modals
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const searchTimer = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, tab = filter, q = search) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab !== "ALL") params.status = tab;
        if (q.trim()) params.search = q.trim();

        const res = await api.get("/admin/withdrawals", { params });
        const d = res.data.data;

        setWithdrawals(d.withdrawals);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);

        // Build stats from first ALL load
        if (tab === "ALL" && pg === 1) {
          setStats({
            pendingCount: d.pendingCount,
            pendingTotal: d.pendingTotal,
            total: d.total,
          });
        }
      } catch {
        showToast("error", "Failed to load withdrawals.");
      } finally {
        setLoading(false);
      }
    },
    [filter, search],
  );

  useEffect(() => {
    load(1, filter, search);
  }, [filter]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, filter, val), 380);
  }

  function handleTabChange(key) {
    setFilter(key);
    setSearch("");
    setPage(1);
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActionSuccess(msg) {
    setApproveTarget(null);
    setRejectTarget(null);
    showToast("success", msg);
    load(page, filter, search);
  }

  // ── Stat aggregates from withdrawals in view ────────────────────────────────
  const pendingInView = withdrawals.filter(
    (w) => w.status === "PENDING",
  ).length;
  const processingCount = withdrawals.filter(
    (w) => w.status === "PROCESSING",
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Finance</p>
            <h1 className={s.pageTitle}>
              Withdrawals
              {total > 0 && <span className={s.countPill}>{total}</span>}
              {stats?.pendingCount > 0 && (
                <span className={s.urgentPill}>
                  {stats.pendingCount} need action
                </span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Review and process worker payout requests
            </p>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon="⏳"
            accent="yellow"
            label="Pending Payouts"
            value={stats?.pendingCount ?? "—"}
            sub={
              stats?.pendingTotal
                ? fmt(stats.pendingTotal, "USD") + " queued"
                : "Loading…"
            }
            delay={0}
          />
          <StatCard
            icon="⚡"
            accent="indigo"
            label="Processing"
            value={processingCount}
            sub="Currently being sent"
            delay={0.05}
          />
          <StatCard
            icon="📋"
            accent="orange"
            label="Total Requests"
            value={total}
            sub="All time"
            delay={0.1}
          />
          <StatCard
            icon="✅"
            accent="green"
            label="Completed"
            value={withdrawals.filter((w) => w.status === "COMPLETED").length}
            sub="This page"
            delay={0.15}
          />
        </div>

        {/* ── Filter tabs + Search ── */}
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
                {tab.key === "PENDING" && stats?.pendingCount > 0 && (
                  <span className={s.tabDot} />
                )}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Search worker name or email…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                className={s.searchClear}
                onClick={() => {
                  setSearch("");
                  load(1, filter, "");
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Pending alert banner ── */}
        {filter === "ALL" && stats?.pendingCount > 0 && (
          <div className={s.pendingBanner}>
            <span className={s.pendingBannerDot} />
            <p className={s.pendingBannerText}>
              <strong>
                {stats.pendingCount} withdrawal
                {stats.pendingCount > 1 ? "s" : ""}
              </strong>{" "}
              awaiting approval — total{" "}
              <strong>{fmt(stats.pendingTotal, "USD")}</strong>
            </p>
            <button
              className={s.pendingBannerBtn}
              onClick={() => handleTabChange("PENDING")}
            >
              Review →
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className={s.tableWrap}>
          {/* Head */}
          <div className={s.tableHead}>
            <span>Worker</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Requested</span>
            <span>Actions</span>
          </div>

          {/* Body */}
          <div className={s.tableBody}>
            {loading ? (
              <SkeletonRows />
            ) : withdrawals.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>💸</span>
                <p className={s.emptyTitle}>
                  {filter === "ALL"
                    ? "No withdrawals yet"
                    : `No ${filter.toLowerCase()} withdrawals`}
                </p>
                <p className={s.emptySub}>
                  {filter !== "ALL"
                    ? "Try a different status filter."
                    : "Worker payout requests will appear here."}
                </p>
                {filter !== "ALL" && (
                  <button
                    className={s.emptyReset}
                    onClick={() => handleTabChange("ALL")}
                  >
                    Show all
                  </button>
                )}
              </div>
            ) : (
              withdrawals.map((w, i) => (
                <WithdrawalRow
                  key={w.id}
                  w={w}
                  index={i}
                  onDetail={setDetailTarget}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {detailTarget && (
        <DetailModal
          withdrawal={detailTarget}
          onClose={() => setDetailTarget(null)}
          onApprove={(w) => {
            setDetailTarget(null);
            setApproveTarget(w);
          }}
          onReject={(w) => {
            setDetailTarget(null);
            setRejectTarget(w);
          }}
        />
      )}

      {approveTarget && (
        <ApproveModal
          withdrawal={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {rejectTarget && (
        <RejectModal
          withdrawal={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </AdminLayout>
  );
}
