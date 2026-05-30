// src/pages/admin/AdminReports.jsx
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminReports.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "Pending", cls: "yellow", icon: "⏳" },
  REVIEWING: { label: "Reviewing", cls: "blue", icon: "🔍" },
  RESOLVED: { label: "Resolved", cls: "green", icon: "✅" },
  DISMISSED: { label: "Dismissed", cls: "dim", icon: "🚫" },
};

const ACTION_META = {
  NO_ACTION: { label: "No Action", cls: "dim", icon: "—" },
  WARNING_ISSUED: { label: "Warning Issued", cls: "yellow", icon: "⚠️" },
  CONTENT_REMOVED: { label: "Content Removed", cls: "orange", icon: "🗑️" },
  USER_SUSPENDED: { label: "User Suspended", cls: "orange", icon: "⛔" },
  USER_BANNED: { label: "User Banned", cls: "red", icon: "🔨" },
};

const REASON_LABELS = {
  SPAM: "Spam",
  FAKE_PROFILE: "Fake Profile",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  FRAUD: "Fraud / Scam",
  HARASSMENT: "Harassment",
  SCAM: "Scam",
  MISLEADING_INFORMATION: "Misleading Information",
  FAKE_REVIEWS: "Fake Reviews",
  UNDERAGE_USER: "Underage User",
  HATE_SPEECH: "Hate Speech",
  OTHER: "Other",
};

const TYPE_ICONS = {
  USER: "👤",
  JOB_POST: "💼",
  POST: "📝",
  REVIEW: "⭐",
  BOOKING: "📋",
  MESSAGE: "💬",
};

const ACTIONS = [
  { value: "NO_ACTION", label: "No Action", icon: "—", cls: "dim" },
  {
    value: "WARNING_ISSUED",
    label: "Issue Warning",
    icon: "⚠️",
    cls: "yellow",
  },
  {
    value: "CONTENT_REMOVED",
    label: "Remove Content",
    icon: "🗑️",
    cls: "orange",
  },
  { value: "USER_SUSPENDED", label: "Suspend User", icon: "⛔", cls: "orange" },
  { value: "USER_BANNED", label: "Ban User", icon: "🔨", cls: "red" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>{toast.msg}</div>
  );
}

function Badge({ status, meta }) {
  const m = (meta || STATUS_META)[status] || {
    label: status,
    cls: "dim",
    icon: "?",
  };
  return (
    <span className={`${s.badge} ${s[`badge_${m.cls}`]}`}>
      {m.icon && <span>{m.icon}</span>} {m.label}
    </span>
  );
}

function Avatar({ user, size = "sm" }) {
  const sz = { sm: s.avatar, md: s.avatarMd }[size] ?? s.avatar;
  return (
    <div className={`${sz} ${s.avatarOrange}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay || 0}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statVal}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

function Skeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={s.skRow}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </>
  );
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({ report, onClose, onDone, showToast }) {
  const [action, setAction] = useState("NO_ACTION");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/reports/admin/${report.id}/resolve`, {
        action,
        adminNote: note || undefined,
      });
      showToast(`Report resolved — ${ACTION_META[action]?.label}`);
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Resolution failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div>
            <p className={s.modalEyebrow}>Resolve Report</p>
            <p className={s.modalTitle}>{report.ref}</p>
            <p className={s.modalSub}>
              {report.reasonLabel} · {report.typeLabel}
            </p>
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={submit} className={s.modalForm}>
          <p className={s.formSectionLabel}>Choose action</p>
          <div className={s.actionGrid}>
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`${s.actionCard} ${action === a.value ? s[`actionCard_${a.cls}`] : ""}`}
                onClick={() => setAction(a.value)}
              >
                <span className={s.actionCardIcon}>{a.icon}</span>
                <span className={s.actionCardLabel}>{a.label}</span>
                {action === a.value && <span className={s.actionDot} />}
              </button>
            ))}
          </div>

          <div className={s.formField}>
            <label className={s.formLabel}>
              Admin note (optional — visible to reporter)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="Add context or reason for this decision…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <div className={s.formError}>⚠️ {error}</div>}

          <div className={s.modalActions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${s.submitBtn} ${s[`submitBtn_${ACTION_META[action]?.cls}`]}`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className={s.spinner} /> Resolving…
                </>
              ) : (
                `Resolve — ${ACTION_META[action]?.label}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dismiss Modal ────────────────────────────────────────────────────────────
function DismissModal({ report, onClose, onDone, showToast }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/reports/admin/${report.id}/dismiss`, {
        adminNote: note || undefined,
      });
      showToast("Report dismissed");
      onDone();
    } catch {
      showToast("Dismiss failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <p className={s.modalTitle}>Dismiss Report {report.ref}</p>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={submit} className={s.modalForm}>
          <div className={s.formField}>
            <label className={s.formLabel}>
              Reason for dismissal (optional)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="No violation found — not in breach of community guidelines…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className={s.modalActions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={s.dimBtn} disabled={saving}>
              {saving ? (
                <>
                  <span className={s.spinner} /> Dismissing…
                </>
              ) : (
                "Dismiss Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ reportId, onClose, onAction, showToast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    api
      .get(`/reports/admin/${reportId}`)
      .then((r) => setReport(r.data.data.report))
      .catch(() => showToast("Failed to load report", "error"))
      .finally(() => setLoading(false));
  }, [reportId]);

  async function startReview() {
    try {
      await api.patch(`/reports/admin/${reportId}/review`);
      setReport((r) => ({ ...r, status: "REVIEWING" }));
      showToast("Report moved to Reviewing");
    } catch {
      showToast("Failed", "error");
    }
  }

  const canAct = report && !["RESOLVED", "DISMISSED"].includes(report.status);

  return (
    <div className={s.drawerBackdrop} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHeader}>
          <div>
            <p className={s.drawerEyebrow}>Report Detail</p>
            <p className={s.drawerTitle}>{report?.ref || "Loading…"}</p>
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className={s.drawerBody}>
            <Skeleton count={4} />
          </div>
        ) : report ? (
          <div className={s.drawerBody}>
            {/* Status + reason */}
            <div className={s.drawerSection}>
              <div className={s.drawerRow}>
                <Badge status={report.status} />
                <span className={s.typeChip}>
                  {TYPE_ICONS[report.targetType]} {report.typeLabel}
                </span>
                <span className={s.reasonChip}>{report.reasonLabel}</span>
              </div>
            </div>

            {/* Reporter */}
            <div className={s.drawerSection}>
              <p className={s.drawerSectionTitle}>Reporter</p>
              <div className={s.personRow}>
                <Avatar user={report.reporter} />
                <div>
                  <p className={s.personName}>
                    {report.reporter?.firstName} {report.reporter?.lastName}
                  </p>
                  <p className={s.personMeta}>
                    {report.reporter?.email} · {report.reporter?.role}
                  </p>
                  <p className={s.personMeta}>
                    Total reports submitted:{" "}
                    <strong>{report.context?.reporterTotalReports}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Target */}
            {report.targetData && (
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>
                  Reported {report.typeLabel}
                </p>
                <div className={s.targetBox}>
                  {report.targetType === "USER" && (
                    <div className={s.personRow}>
                      <Avatar user={report.targetData} />
                      <div>
                        <p className={s.personName}>
                          {report.targetData.firstName}{" "}
                          {report.targetData.lastName}
                        </p>
                        <p className={s.personMeta}>
                          {report.targetData.email} · {report.targetData.role}
                        </p>
                        <div className={s.targetFlags}>
                          {report.targetData.isBanned && (
                            <span className={s.flagBanned}>BANNED</span>
                          )}
                          {!report.targetData.isActive &&
                            !report.targetData.isBanned && (
                              <span className={s.flagSuspended}>SUSPENDED</span>
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                  {report.targetType !== "USER" && (
                    <div className={s.targetContent}>
                      {report.targetData.title && (
                        <p className={s.targetTitle}>
                          {report.targetData.title}
                        </p>
                      )}
                      {report.targetData.content && (
                        <p className={s.targetText}>
                          {report.targetData.content.slice(0, 200)}
                          {report.targetData.content.length > 200 ? "…" : ""}
                        </p>
                      )}
                      {report.targetData.comment && (
                        <p className={s.targetText}>
                          "{report.targetData.comment}"
                        </p>
                      )}
                      {report.targetData.rating && (
                        <p className={s.targetMeta}>
                          Rating: {"⭐".repeat(report.targetData.rating)}
                        </p>
                      )}
                    </div>
                  )}
                  <p className={s.targetRepCount}>
                    Total reports on this {report.typeLabel}:{" "}
                    <strong>{report.context?.targetTotalReports}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {report.description && (
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>Reporter's description</p>
                <p className={s.descText}>{report.description}</p>
              </div>
            )}

            {/* Evidence */}
            {report.evidence?.length > 0 && (
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>Evidence links</p>
                <div className={s.evidenceList}>
                  {report.evidence.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={s.evidenceLink}
                    >
                      📎 Evidence {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution */}
            {(report.actionTaken || report.adminNote) && (
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>Resolution</p>
                {report.actionTaken && (
                  <Badge status={report.actionTaken} meta={ACTION_META} />
                )}
                {report.adminNote && (
                  <p className={s.adminNoteText}>📝 {report.adminNote}</p>
                )}
                {report.resolvedAt && (
                  <p className={s.personMeta}>
                    Resolved {fmtDate(report.resolvedAt)}
                  </p>
                )}
                {report.reviewedBy && (
                  <p className={s.personMeta}>
                    By {report.reviewedBy.firstName}{" "}
                    {report.reviewedBy.lastName}
                  </p>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className={s.drawerSection}>
              <p className={s.drawerSectionTitle}>Timeline</p>
              <p className={s.personMeta}>
                Submitted: {fmtDate(report.createdAt)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Footer actions */}
        <div className={s.drawerFooter}>
          {report?.status === "PENDING" && (
            <button className={s.reviewBtn} onClick={startReview}>
              🔍 Start Review
            </button>
          )}
          {canAct && (
            <>
              <button
                className={s.resolveBtn}
                onClick={() => {
                  onClose();
                  onAction("resolve", report);
                }}
              >
                ✅ Resolve
              </button>
              <button
                className={s.dismissBtn}
                onClick={() => {
                  onClose();
                  onAction("dismiss", report);
                }}
              >
                🚫 Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({
  report,
  selected,
  onSelect,
  onOpen,
  onResolve,
  onDismiss,
}) {
  return (
    <div className={`${s.reportRow} ${selected ? s.reportRowSelected : ""}`}>
      <input
        type="checkbox"
        className={s.checkbox}
        checked={selected}
        onChange={(e) => onSelect(report.id, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
      />
      <button className={s.reportRowMain} onClick={() => onOpen(report.id)}>
        <div className={s.reportRowLeft}>
          <span className={s.typeIcon}>{TYPE_ICONS[report.targetType]}</span>
          <div className={s.reportRowInfo}>
            <div className={s.reportRowTop}>
              <span className={s.reportRef}>{report.ref}</span>
              <span className={s.reportReason}>{report.reasonLabel}</span>
              <Badge status={report.status} />
            </div>
            <div className={s.reportRowBot}>
              <Avatar user={report.reporter} size="sm" />
              <span className={s.reporterName}>
                {report.reporter?.firstName} {report.reporter?.lastName}
              </span>
              <span className={s.reportMeta}>·</span>
              <span className={s.reportMeta}>{report.typeLabel}</span>
              <span className={s.reportMeta}>·</span>
              <span className={s.reportMeta}>{timeAgo(report.createdAt)}</span>
            </div>
          </div>
        </div>
        <div
          className={s.reportRowActions}
          onClick={(e) => e.stopPropagation()}
        >
          {!["RESOLVED", "DISMISSED"].includes(report.status) && (
            <>
              <button
                className={s.rowResolveBtn}
                onClick={() => onResolve(report)}
                title="Resolve"
              >
                ✅
              </button>
              <button
                className={s.rowDismissBtn}
                onClick={() => onDismiss(report)}
                title="Dismiss"
              >
                🚫
              </button>
            </>
          )}
          {report.actionTaken && (
            <Badge status={report.actionTaken} meta={ACTION_META} />
          )}
        </div>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [repLoading, setRepLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [detailId, setDetailId] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [dismissing, setDismissing] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get("/reports/admin/stats");
      setStats(r.data.data);
    } catch {
      showToast("Failed to load stats", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load reports
  const loadReports = useCallback(async () => {
    setRepLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (reason) params.set("reason", reason);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await api.get(`/reports/admin?${params}`);
      setReports(r.data.data.reports || []);
      setTotal(r.data.data.total || 0);
      setSummary(r.data.data.summary || {});
      setSelected(new Set());
    } catch {
      showToast("Failed to load reports", "error");
    } finally {
      setRepLoading(false);
    }
  }, [page, status, type, reason, search, from, to]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Selection
  function toggleSelect(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
  function toggleAll(checked) {
    setSelected(checked ? new Set(reports.map((r) => r.id)) : new Set());
  }

  // Bulk dismiss
  async function bulkDismiss() {
    if (!selected.size) return;
    try {
      const r = await api.patch("/reports/admin/bulk-dismiss", {
        reportIds: [...selected],
      });
      showToast(r.data.message || `${selected.size} report(s) dismissed`);
      loadReports();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || "Bulk dismiss failed", "error");
    }
  }

  function handleAction(type, report) {
    if (type === "resolve") setResolving(report);
    if (type === "dismiss") setDismissing(report);
  }

  const pages = Math.ceil(total / 20);
  const pendingCount = summary.PENDING || 0;

  return (
    <AdminLayout>
      <div className={s.page}>
        <Toast toast={toast} />

        {/* Header */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Moderation</p>
            <h1 className={s.pageTitle}>
              Reports
              {pendingCount > 0 && (
                <span className={s.pendingPill}>{pendingCount} pending</span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Review and act on user-submitted reports across the platform.
            </p>
          </div>
          {selected.size > 0 && (
            <button className={s.bulkDismissBtn} onClick={bulkDismiss}>
              🚫 Dismiss {selected.size} selected
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className={s.statsBar}>
          <StatCard
            icon="📋"
            label="Total Reports"
            value={stats?.total}
            delay={0}
          />
          <StatCard
            icon="⏳"
            label="Pending"
            value={stats?.pending}
            accent="yellow"
            delay={0.05}
          />
          <StatCard
            icon="🔍"
            label="Reviewing"
            value={stats?.reviewing}
            accent="blue"
            delay={0.1}
          />
          <StatCard
            icon="✅"
            label="Resolved"
            value={stats?.resolved}
            accent="green"
            delay={0.15}
          />
          <StatCard
            icon="🚫"
            label="Dismissed"
            value={stats?.dismissed}
            delay={0.2}
          />
        </div>

        {/* Status quick filters */}
        <div className={s.statusBar}>
          {[
            { key: "", label: "All" },
            {
              key: "PENDING",
              label: `⏳ Pending${summary.PENDING ? ` (${summary.PENDING})` : ""}`,
            },
            {
              key: "REVIEWING",
              label: `🔍 Reviewing${summary.REVIEWING ? ` (${summary.REVIEWING})` : ""}`,
            },
            { key: "RESOLVED", label: "✅ Resolved" },
            { key: "DISMISSED", label: "🚫 Dismissed" },
          ].map((f) => (
            <button
              key={f.key}
              className={`${s.statusBtn} ${status === f.key ? s.statusBtnActive : ""}`}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className={s.filterBar}>
          <input
            className={s.searchInput}
            placeholder="Search reporter or description…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className={s.select}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {["USER", "JOB_POST", "POST", "REVIEW", "BOOKING", "MESSAGE"].map(
              (t) => (
                <option key={t} value={t}>
                  {TYPE_ICONS[t]} {t.replace("_", " ")}
                </option>
              ),
            )}
          </select>

          <select
            className={s.select}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <input
            className={s.dateInput}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From date"
          />
          <input
            className={s.dateInput}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To date"
          />

          {(search || type || reason || from || to) && (
            <button
              className={s.clearBtn}
              onClick={() => {
                setSearch("");
                setType("");
                setReason("");
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Top Reported Users (from stats) */}
        {stats?.topReportedUsers?.length > 0 && !status && !type && !search && (
          <div className={s.topReportedSection}>
            <p className={s.sectionTitle}>🔥 Most Reported Users</p>
            <div className={s.topReportedList}>
              {stats.topReportedUsers.slice(0, 5).map((u, i) => (
                <div key={u.id} className={s.topReportedRow}>
                  <span className={s.topRank}>#{i + 1}</span>
                  <Avatar user={u} />
                  <div className={s.topInfo}>
                    <p className={s.topName}>
                      {u.firstName} {u.lastName}
                    </p>
                    <p className={s.topMeta}>{u.email}</p>
                  </div>
                  <div className={s.topFlags}>
                    {u.isBanned && <span className={s.flagBanned}>BANNED</span>}
                    {!u.isActive && !u.isBanned && (
                      <span className={s.flagSuspended}>SUSPENDED</span>
                    )}
                  </div>
                  <span className={s.topCount}>{u.reportCount} reports</span>
                  <button
                    className={s.viewTargetBtn}
                    onClick={() => {
                      setType("USER");
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports list */}
        <div className={s.reportsSection}>
          <div className={s.listHeader}>
            <div className={s.listHeaderLeft}>
              <input
                type="checkbox"
                className={s.checkbox}
                checked={selected.size === reports.length && reports.length > 0}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span className={s.listCount}>
                {total} report{total !== 1 ? "s" : ""}
              </span>
            </div>
            <span className={s.listPage}>
              Page {page} of {pages || 1}
            </span>
          </div>

          <div className={s.reportsList}>
            {repLoading ? (
              <Skeleton count={6} />
            ) : reports.length === 0 ? (
              <div className={s.emptyState}>
                <span>📭</span>
                <p>No reports found</p>
              </div>
            ) : (
              reports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  selected={selected.has(report.id)}
                  onSelect={toggleSelect}
                  onOpen={(id) => setDetailId(id)}
                  onResolve={(r) => setResolving(r)}
                  onDismiss={(r) => setDismissing(r)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className={s.pagination}>
              <button
                className={s.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className={s.pageInfo}>
                Page {page} of {pages}
              </span>
              <button
                className={s.pageBtn}
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {detailId && (
        <DetailDrawer
          reportId={detailId}
          onClose={() => setDetailId(null)}
          showToast={showToast}
          onAction={(type, report) => {
            setDetailId(null);
            handleAction(type, report);
          }}
        />
      )}

      {/* Resolve Modal */}
      {resolving && (
        <ResolveModal
          report={resolving}
          onClose={() => setResolving(null)}
          showToast={showToast}
          onDone={() => {
            setResolving(null);
            loadReports();
            loadStats();
          }}
        />
      )}

      {/* Dismiss Modal */}
      {dismissing && (
        <DismissModal
          report={dismissing}
          onClose={() => setDismissing(null)}
          showToast={showToast}
          onDone={() => {
            setDismissing(null);
            loadReports();
            loadStats();
          }}
        />
      )}
    </AdminLayout>
  );
}
