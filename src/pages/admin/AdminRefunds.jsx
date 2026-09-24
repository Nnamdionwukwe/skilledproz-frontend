import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import styles from "./AdminRefunds.module.css";

// ─── Icons (react-icons — Feather family, same as AdminLayout) ────────────────
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiAlertTriangle,
  FiSlash,
  FiFileText,
  FiUser,
  FiTool,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiInfo,
  FiLink,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META = {
  PENDING: { label: "Pending", cls: "pending", icon: FiClock },
  APPROVED: { label: "Approved", cls: "approved", icon: FiCheckCircle },
  PROCESSING: { label: "Processing", cls: "processing", icon: FiRefreshCw },
  COMPLETED: { label: "Completed", cls: "completed", icon: FiCheckCircle },
  REJECTED: { label: "Rejected", cls: "rejected", icon: FiXCircle },
  FAILED: { label: "Failed", cls: "failed", icon: FiSlash },
};

const SOURCE_META = {
  DISPUTE: { label: "Dispute", cls: "sourceDispute" },
  ADMIN: { label: "Admin", cls: "sourceAdmin" },
  USER: { label: "User", cls: "sourceUser" },
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }) {
  const Icon = icon;
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status,
    cls: "pending",
    icon: FiClock,
  };
  const Icon = meta.icon;
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${meta.cls}`]}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}

function SourceBadge({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.USER;
  return (
    <span className={`${styles.sourceBadge} ${styles[meta.cls]}`}>
      {meta.label}
    </span>
  );
}

// ─── Refund Card ──────────────────────────────────────────────────────────────

function RefundCard({
  refund: r,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onReverse,
  selected,
  onSelect,
  acting,
  i,
}) {
  const canApprove = r.status === "PENDING";
  const canReject = r.status === "PENDING";
  const canReverse = r.status === "COMPLETED";
  const isTerminal = ["REJECTED", "FAILED"].includes(r.status);

  return (
    <div
      className={`${styles.refundCard} ${expanded ? styles.refundCardOpen : ""}`}
      style={{ animationDelay: `${i * 35}ms` }}
    >
      {/* ── Row Header ── */}
      <div className={styles.cardHeader} onClick={() => onToggle(r.id)}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={!!selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(r.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        <div className={styles.refCode}>
          <span className={styles.refLabel}>Ref</span>
          <span className={styles.refValue}>{r.reference}</span>
        </div>

        <div className={styles.parties}>
          <span className={styles.partyHirer}>
            <FiUser size={10} /> {r.hirer?.firstName} {r.hirer?.lastName}
          </span>
          <span className={styles.partyArrow}>→</span>
          <span className={styles.partyWorker}>
            <FiTool size={10} /> {r.worker?.firstName} {r.worker?.lastName}
          </span>
        </div>

        <div className={styles.amount}>
          {r.currency || "₦"}
          {fmt(r.amount)}
        </div>

        <div className={styles.badges}>
          <SourceBadge source={r.source} />
          <StatusBadge status={r.status} />
        </div>

        <div className={styles.age}>{timeAgo(r.createdAt)}</div>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(r.id);
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className={styles.cardBody}>
          {/* Booking */}
          <div className={styles.block}>
            <p className={styles.blockTitle}>Booking</p>
            <div className={styles.grid}>
              <PayRow label="ID" value={r.booking?.id || "—"} />
              <PayRow label="Title" value={r.booking?.title || "—"} highlight />
              <PayRow label="Status" value={r.booking?.status || "—"} />
            </div>
          </div>

          {/* Refund details */}
          <div className={styles.block}>
            <p className={styles.blockTitle}>Refund</p>
            <div className={styles.grid}>
              <PayRow
                label="Amount"
                value={`${r.currency || "₦"}${fmt(r.amount)}`}
                highlight
              />
              <PayRow label="Type" value={r.refundType || "—"} />
              {r.percentage != null && (
                <PayRow label="Percentage" value={`${r.percentage}%`} />
              )}
              <PayRow
                label="Platform Fee Refunded"
                value={`${r.currency || "₦"}${fmt(r.platformFeeRefunded)}`}
              />
              <PayRow
                label="Worker Amount Deducted"
                value={`${r.currency || "₦"}${fmt(r.workerAmountDeducted)}`}
              />
              {r.reason && <PayRow label="Reason" value={r.reason} />}
              <PayRow label="Created" value={fmtDate(r.createdAt)} />
              {r.processedAt && (
                <PayRow label="Processed" value={fmtDate(r.processedAt)} />
              )}
              {r.completedAt && (
                <PayRow label="Completed" value={fmtDate(r.completedAt)} />
              )}
              {r.refundedAt && (
                <PayRow label="Refunded" value={fmtDate(r.refundedAt)} />
              )}
            </div>
          </div>

          {/* Meta (original snapshot) */}
          {r.meta && typeof r.meta === "object" && (
            <div className={styles.block}>
              <p className={styles.blockTitle}>Original Payment Snapshot</p>
              <div className={styles.grid}>
                {r.meta.originalAmount != null && (
                  <PayRow
                    label="Original Amount"
                    value={`${r.currency || "₦"}${fmt(r.meta.originalAmount)}`}
                  />
                )}
                {r.meta.platformFee != null && (
                  <PayRow
                    label="Platform Fee"
                    value={`${r.currency || "₦"}${fmt(r.meta.platformFee)}`}
                  />
                )}
                {r.meta.workerPayout != null && (
                  <PayRow
                    label="Worker Payout"
                    value={`${r.currency || "₦"}${fmt(r.meta.workerPayout)}`}
                  />
                )}
                {r.meta.requestedAt && (
                  <PayRow
                    label="Requested At"
                    value={fmtDate(r.meta.requestedAt)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Admin / Dispute context */}
          {r.source === "ADMIN" && r.admin && (
            <div className={styles.block}>
              <p className={styles.blockTitle}>Processed By Admin</p>
              <div className={styles.grid}>
                <PayRow
                  label="Admin"
                  value={`${r.admin.firstName} ${r.admin.lastName}`}
                />
                {r.adminNotes && (
                  <PayRow label="Admin Notes" value={r.adminNotes} />
                )}
              </div>
            </div>
          )}

          {r.source === "DISPUTE" && r.dispute && (
            <div className={styles.block}>
              <p className={styles.blockTitle}>
                Linked Dispute <FiLink size={11} />
              </p>
              <div className={styles.grid}>
                <PayRow label="Dispute ID" value={r.dispute.id} />
                {r.dispute.reason && (
                  <PayRow label="Reason" value={r.dispute.reason} />
                )}
                {r.dispute.raisedByRole && (
                  <PayRow
                    label="Raised By Role"
                    value={r.dispute.raisedByRole}
                  />
                )}
                {r.dispute.resolvedAt && (
                  <PayRow
                    label="Resolved At"
                    value={fmtDate(r.dispute.resolvedAt)}
                  />
                )}
                {r.dispute.adminNotes && (
                  <PayRow label="Dispute Notes" value={r.dispute.adminNotes} />
                )}
              </div>
            </div>
          )}

          {/* Hirer / Worker */}
          <div className={styles.twoParty}>
            <div className={styles.partyCard}>
              <span className={styles.partyLabel}>
                <FiUser size={10} /> Hirer
              </span>
              <span className={styles.partyName}>
                {r.hirer?.firstName} {r.hirer?.lastName}
              </span>
              <span className={styles.partyEmail}>{r.hirer?.email || "—"}</span>
            </div>
            <div className={styles.partyCard}>
              <span className={styles.partyLabel}>
                <FiTool size={10} /> Worker
              </span>
              <span className={styles.partyName}>
                {r.worker?.firstName} {r.worker?.lastName}
              </span>
              <span className={styles.partyEmail}>
                {r.worker?.email || "—"}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isTerminal && (
            <div className={styles.actions}>
              {canApprove && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionApprove}`}
                  onClick={() => onApprove(r)}
                  disabled={acting === r.id}
                >
                  <FiCheckCircle size={13} /> Approve & Process
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionReject}`}
                  onClick={() => onReject(r)}
                  disabled={acting === r.id}
                >
                  <FiXCircle size={13} /> Reject
                </button>
              )}
              {canReverse && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionReverse}`}
                  onClick={() => onReverse(r)}
                  disabled={acting === r.id}
                >
                  <FiRefreshCw size={13} /> Reverse Refund
                </button>
              )}
            </div>
          )}

          {isTerminal && (
            <div className={styles.terminalNotice}>
              <FiInfo size={12} />
              This refund is in a terminal state and cannot be changed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PayRow({ label, value, highlight }) {
  return (
    <div className={styles.payRow}>
      <span className={styles.payRowLabel}>{label}</span>
      <span
        className={`${styles.payRowValue} ${highlight ? styles.payRowHighlight : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  extraField,
  onConfirm,
  onClose,
  busy,
}) {
  const [fieldValue, setFieldValue] = useState("");

  useEffect(() => {
    if (!isOpen) setFieldValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p
          className={styles.modalTitle}
          style={variant === "danger" ? { color: "var(--red)" } : undefined}
        >
          <FiAlertTriangle
            size={16}
            style={{ marginRight: 6, verticalAlign: "-2px" }}
          />
          {title}
        </p>
        <p className={styles.modalSub}>{message}</p>

        {extraField && (
          <div className={styles.modalField}>
            <label className={styles.modalFieldLabel} htmlFor="confirm-extra">
              {extraField.label}
              {extraField.required && (
                <span className={styles.modalFieldRequired}> *</span>
              )}
            </label>
            <textarea
              id="confirm-extra"
              className={styles.modalFieldInput}
              rows={3}
              placeholder={extraField.placeholder}
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
            />
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            className={styles.modalCancel}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={styles.modalConfirm}
            onClick={() => {
              if (extraField) {
                onConfirm(fieldValue);
              } else {
                onConfirm();
              }
            }}
            disabled={busy || (extraField?.required && !fieldValue.trim())}
          >
            {busy ? (
              <>
                <FiRefreshCw size={12} /> Processing…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "", label: "All", icon: FiFileText },
  { key: "PENDING", label: "Pending", icon: FiClock },
  { key: "APPROVED", label: "Approved", icon: FiCheckCircle },
  { key: "PROCESSING", label: "Processing", icon: FiRefreshCw },
  { key: "COMPLETED", label: "Completed", icon: FiCheckCircle },
  { key: "REJECTED", label: "Rejected", icon: FiXCircle },
  { key: "FAILED", label: "Failed", icon: FiSlash },
];

const TYPE_TABS = [
  { key: "", label: "All types" },
  { key: "FULL", label: "Full" },
  { key: "PARTIAL", label: "Partial" },
  { key: "CUSTOM_AMOUNT", label: "Custom" },
  { key: "DISPUTE", label: "Dispute" },
];

export default function AdminRefunds() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refunds, setRefunds] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [autoApproval, setAutoApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);

  // modal state
  const [modal, setModal] = useState(null); // { type: "approve" | "reject" | "reverse" | "bulk-approve" | "bulk-reject", payload }

  // URL params
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch list + stats ────────────────────────────────────────────────────
  const fetchRefunds = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (status) params.status = status;
    if (type) params.type = type;

    Promise.all([
      api.get("/refunds/admin/all", { params }),
      api.get("/refunds/admin/stats/summary").catch(() => null),
    ])
      .then(([listRes, statsRes]) => {
        const d = listRes.data.data;
        setRefunds(d.refunds || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setStats(d.stats || statsRes?.data?.data?.stats || null);
        setSelectedIds(new Set());
      })
      .catch((e) => {
        showToast(
          e?.response?.data?.message || "Failed to load refunds",
          "error",
        );
      })
      .finally(() => setLoading(false));
  }, [page, status, type]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // ── Fetch auto-approval status ────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/refunds/admin/settings/auto-approve")
      .then((r) => setAutoApproval(r.data.data?.enabled ?? false))
      .catch(() => setAutoApproval(null));
  }, []);

  async function toggleAutoApproval() {
    const next = !autoApproval;
    try {
      await api.put("/refunds/admin/settings/auto-approve", { enabled: next });
      setAutoApproval(next);
      showToast(`Auto-approval ${next ? "enabled" : "disabled"}`, "success");
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to toggle auto-approval",
        "error",
      );
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleSelect(id, checked) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function selectAllOnPage() {
    if (selectedIds.size === refunds.length && refunds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(refunds.map((r) => r.id)));
    }
  }

  // ── Single actions ────────────────────────────────────────────────────────
  async function doApprove(refund, notes) {
    setActing(refund.id);
    try {
      await api.put(`/refunds/admin/${refund.id}/approve`, {
        notes: notes || undefined,
      });
      showToast("Refund approved and processed", "success");
      setModal(null);
      fetchRefunds();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to approve refund",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  async function doReject(refund, reason) {
    setActing(refund.id);
    try {
      await api.put(`/refunds/admin/${refund.id}/reject`, { reason });
      showToast("Refund rejected", "warn");
      setModal(null);
      fetchRefunds();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to reject refund",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  async function doReverse(refund, reason) {
    setActing(refund.id);
    try {
      await api.put(`/refunds/admin/${refund.id}/reverse`, { reason });
      showToast("Refund reversed — worker funds restored", "success");
      setModal(null);
      fetchRefunds();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to reverse refund",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  async function doBulkApprove(notes) {
    const ids = Array.from(selectedIds);
    setActing("bulk");
    try {
      await api.put("/refunds/admin/bulk-approve", {
        ids,
        notes: notes || undefined,
      });
      showToast(`Bulk approve sent for ${ids.length} refunds`, "success");
      setModal(null);
      setSelectedIds(new Set());
      fetchRefunds();
    } catch (e) {
      showToast(e?.response?.data?.message || "Bulk approve failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function doBulkReject(reason) {
    const ids = Array.from(selectedIds);
    setActing("bulk");
    try {
      await api.put("/refunds/admin/bulk-reject", { ids, reason });
      showToast(`Bulk reject sent for ${ids.length} refunds`, "warn");
      setModal(null);
      setSelectedIds(new Set());
      fetchRefunds();
    } catch (e) {
      showToast(e?.response?.data?.message || "Bulk reject failed", "error");
    } finally {
      setActing(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allSelected = refunds.length > 0 && selectedIds.size === refunds.length;
  const someSelected = selectedIds.size > 0;

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Toast */}
        <Toast toast={toast} />

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          <StatCard
            icon={FiClock}
            label="Pending"
            value={stats?.pending ?? 0}
            accent={stats?.pending > 0 ? "amber" : undefined}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Approved"
            value={stats?.approved ?? 0}
          />
          <StatCard
            icon={FiRefreshCw}
            label="Processing"
            value={stats?.processing ?? 0}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Completed"
            value={stats?.completed ?? 0}
            accent="green"
          />
          <StatCard
            icon={FiXCircle}
            label="Rejected"
            value={stats?.rejected ?? 0}
          />
          <StatCard
            icon={FiSlash}
            label="Failed"
            value={stats?.failed ?? 0}
            accent={stats?.failed > 0 ? "red" : undefined}
          />
          <StatCard
            icon={FiDollarSign}
            label="Total Refunded"
            value={fmt(stats?.totalRefunded, "₦")}
            accent="green"
          />
        </div>

        {/* ── Auto-approval + Filter Row ── */}
        <div className={styles.filterRow}>
          <div className={styles.autoToggle}>
            <span className={styles.autoLabel}>Auto-approve refunds</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoApproval === true}
              className={`${styles.switch} ${autoApproval ? styles.switchOn : ""}`}
              onClick={toggleAutoApproval}
              disabled={autoApproval === null}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>

          <div className={styles.tabGroup}>
            {STATUS_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  className={`${styles.tab} ${status === t.key ? styles.tabActive : ""}`}
                  onClick={() => setParam("status", t.key)}
                >
                  <Icon size={11} /> {t.label}
                </button>
              );
            })}
          </div>

          <div className={styles.typeRow}>
            {TYPE_TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.typePill} ${type === t.key ? styles.typePillActive : ""}`}
                onClick={() => setParam("type", t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bulk Action Bar ── */}
        {someSelected && (
          <div className={styles.bulkBar}>
            <label className={styles.bulkSelectAll}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAllOnPage}
              />
              <span>{selectedIds.size} selected</span>
            </label>
            <button
              type="button"
              className={`${styles.bulkBtn} ${styles.bulkApprove}`}
              onClick={() => setModal({ type: "bulk-approve" })}
              disabled={acting === "bulk"}
            >
              <FiCheckCircle size={12} /> Bulk Approve
            </button>
            <button
              type="button"
              className={`${styles.bulkBtn} ${styles.bulkReject}`}
              onClick={() => setModal({ type: "bulk-reject" })}
              disabled={acting === "bulk"}
            >
              <FiXCircle size={12} /> Bulk Reject
            </button>
            <button
              type="button"
              className={styles.bulkClear}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className={styles.skList}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeleton} style={{ height: 70 }} />
            ))}
          </div>
        ) : refunds.length === 0 ? (
          <div className={styles.empty}>
            <FiFileText size={32} />
            <p>No refunds found</p>
            <small>Nothing matches your current filters.</small>
          </div>
        ) : (
          <div className={styles.refundList}>
            {refunds.map((r, i) => (
              <RefundCard
                key={r.id}
                refund={r}
                i={i}
                expanded={expandedId === r.id}
                onToggle={(id) =>
                  setExpandedId((prev) => (prev === id ? null : id))
                }
                onApprove={(refund) => setModal({ type: "approve", refund })}
                onReject={(refund) => setModal({ type: "reject", refund })}
                onReverse={(refund) => setModal({ type: "reverse", refund })}
                acting={acting}
                selected={selectedIds.has(r.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              <FiChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {fmt(total)} total
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <FiChevronRight size={13} />
            </button>
          </div>
        )}

        {/* ── Confirm Modals ── */}
        <ConfirmModal
          isOpen={modal?.type === "approve"}
          title="Approve Refund"
          message={`This will move ${modal?.refund?.currency || "₦"}${fmt(modal?.refund?.amount)} back to the hirer and mark the booking as refunded. This cannot be undone.`}
          confirmLabel="Approve & Process"
          variant="warning"
          busy={acting === modal?.refund?.id}
          onConfirm={(notes) => doApprove(modal.refund, notes)}
          onClose={() => setModal(null)}
          extraField={{
            label: "Notes",
            placeholder:
              "Optional — visible to the hirer in their refund record",
            required: false,
          }}
        />

        <ConfirmModal
          isOpen={modal?.type === "reject"}
          title="Reject Refund"
          message={`Reject the refund for ${modal?.refund?.hirer?.firstName} ${modal?.refund?.hirer?.lastName}? A reason is required.`}
          confirmLabel="Reject Refund"
          variant="danger"
          busy={acting === modal?.refund?.id}
          onConfirm={(reason) => doReject(modal.refund, reason)}
          onClose={() => setModal(null)}
          extraField={{
            label: "Rejection reason",
            placeholder: "Explain why this refund is being rejected…",
            required: true,
          }}
        />

        <ConfirmModal
          isOpen={modal?.type === "reverse"}
          title="Reverse Refund"
          message={`This will reverse the completed refund of ${modal?.refund?.currency || "₦"}${fmt(modal?.refund?.amount)} and restore the deducted amount to the worker. This is not a normal operation.`}
          confirmLabel="Reverse Refund"
          variant="danger"
          busy={acting === modal?.refund?.id}
          onConfirm={(reason) => doReverse(modal.refund, reason)}
          onClose={() => setModal(null)}
          extraField={{
            label: "Reason",
            placeholder: "Why is this refund being reversed?",
            required: true,
          }}
        />

        <ConfirmModal
          isOpen={modal?.type === "bulk-approve"}
          title={`Bulk Approve ${selectedIds.size} Refund${selectedIds.size !== 1 ? "s" : ""}`}
          message="Each refund will be approved and processed individually. Any that are not in PENDING state will fail silently and be reported back."
          confirmLabel="Approve All"
          variant="warning"
          busy={acting === "bulk"}
          onConfirm={(notes) => doBulkApprove(notes)}
          onClose={() => setModal(null)}
          extraField={{
            label: "Shared notes",
            placeholder: "Optional — applied to every approved refund",
            required: false,
          }}
        />

        <ConfirmModal
          isOpen={modal?.type === "bulk-reject"}
          title={`Bulk Reject ${selectedIds.size} Refund${selectedIds.size !== 1 ? "s" : ""}`}
          message="All selected refunds will be rejected with the same reason. This cannot be undone."
          confirmLabel="Reject All"
          variant="danger"
          busy={acting === "bulk"}
          onConfirm={(reason) => doBulkReject(reason)}
          onClose={() => setModal(null)}
          extraField={{
            label: "Rejection reason",
            placeholder: "Applied to every rejected refund…",
            required: true,
          }}
        />
      </div>
    </AdminLayout>
  );
}
