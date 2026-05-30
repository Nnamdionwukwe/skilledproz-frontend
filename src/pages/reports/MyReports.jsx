// src/pages/reports/MyReports.jsx
// Shared by Hirer and Worker — "My Reports" dashboard
// Shows all reports the user has submitted with status tracking

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./MyReports.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "Pending Review", icon: "⏳", cls: "yellow" },
  REVIEWING: { label: "Under Review", icon: "🔍", cls: "blue" },
  RESOLVED: { label: "Resolved", icon: "✅", cls: "green" },
  DISMISSED: { label: "Dismissed", icon: "🚫", cls: "dim" },
};

const ACTION_META = {
  NO_ACTION: { label: "No action taken", icon: "—" },
  WARNING_ISSUED: { label: "Warning issued", icon: "⚠️" },
  CONTENT_REMOVED: { label: "Content removed", icon: "🗑️" },
  USER_SUSPENDED: { label: "User suspended", icon: "🔒" },
  USER_BANNED: { label: "User banned", icon: "🚫" },
};

const TYPE_LABEL = {
  USER: { label: "User", icon: "👤" },
  JOB_POST: { label: "Job Post", icon: "💼" },
  POST: { label: "Community Post", icon: "📝" },
  REVIEW: { label: "Review", icon: "⭐" },
  BOOKING: { label: "Booking", icon: "📅" },
  MESSAGE: { label: "Message", icon: "💬" },
};

const REASON_LABEL = {
  SPAM: "Spam",
  FAKE_PROFILE: "Fake profile",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  FRAUD: "Fraud / scam",
  HARASSMENT: "Harassment",
  SCAM: "Scam",
  MISLEADING_INFORMATION: "Misleading info",
  FAKE_REVIEWS: "Fake reviews",
  UNDERAGE_USER: "Underage user",
  HATE_SPEECH: "Hate speech",
  OTHER: "Other",
};

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "REVIEWING", label: "Under Review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, icon: "•", cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      <span className={styles.badgeIcon}>{m.icon}</span>
      {m.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return <div className={styles.skCard} />;
}

// ── Cancel Confirm ────────────────────────────────────────────────────────────
function CancelConfirm({ report, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setLoading(true);
    try {
      await api.delete(`/reports/${report.id}`);
      onSuccess("Report cancelled and removed.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to cancel report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmIcon}>🗑️</div>
        <h3 className={styles.confirmTitle}>Cancel this report?</h3>
        <p className={styles.confirmSub}>
          Ref <strong>{report.ref}</strong> — {REASON_LABEL[report.reason]}
          <br />
          This action cannot be undone.
        </p>
        {error && <p className={styles.inlineError}>{error}</p>}
        <div className={styles.confirmActions}>
          <button
            className={styles.btnGhost}
            onClick={onClose}
            disabled={loading}
          >
            Keep it
          </button>
          <button
            className={styles.btnDanger}
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ report, onClose, onCancel }) {
  const typeMeta = TYPE_LABEL[report.targetType] ?? {
    label: report.targetType,
    icon: "📄",
  };
  const statusMeta = STATUS_META[report.status] ?? {
    label: report.status,
    icon: "•",
    cls: "dim",
  };
  const actionMeta = ACTION_META[report.actionTaken] ?? {
    label: report.actionTaken,
    icon: "—",
  };
  const canCancel = report.status === "PENDING";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className={styles.drawerHandle} />

        {/* Header */}
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Report detail</p>
            <h3 className={styles.drawerTitle}>{report.ref}</h3>
          </div>
          <button className={styles.drawerClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* Status hero */}
          <div
            className={`${styles.statusHero} ${styles[`statusHero_${statusMeta.cls}`]}`}
          >
            <span className={styles.statusHeroIcon}>{statusMeta.icon}</span>
            <div>
              <p className={styles.statusHeroLabel}>{statusMeta.label}</p>
              <p className={styles.statusHeroDate}>
                {report.status === "RESOLVED" || report.status === "DISMISSED"
                  ? `Resolved ${fmtDate(report.resolvedAt)}`
                  : `Submitted ${timeAgo(report.createdAt)}`}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Reported</span>
              <span className={styles.detailVal}>
                {typeMeta.icon} {typeMeta.label}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Reason</span>
              <span className={styles.detailVal}>
                {REASON_LABEL[report.reason]}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Submitted</span>
              <span className={styles.detailVal}>
                {fmtDate(report.createdAt)}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Target ID</span>
              <span className={`${styles.detailVal} ${styles.mono}`}>
                {report.targetId?.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className={styles.descriptionBox}>
              <p className={styles.descriptionLabel}>Your description</p>
              <p className={styles.descriptionText}>{report.description}</p>
            </div>
          )}

          {/* Outcome */}
          {(report.status === "RESOLVED" || report.status === "DISMISSED") && (
            <div className={styles.outcomeBox}>
              <p className={styles.outcomeLabel}>Outcome</p>
              <p className={styles.outcomeAction}>
                {actionMeta.icon} {actionMeta.label}
              </p>
              {report.adminNote && (
                <p className={styles.outcomeNote}>"{report.adminNote}"</p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className={styles.timeline}>
            <p className={styles.timelineTitle}>Timeline</p>
            <div className={styles.timelineItem}>
              <span className={styles.timelineDot} />
              <span className={styles.timelineLabel}>Report submitted</span>
              <span className={styles.timelineDate}>
                {fmtDate(report.createdAt)}
              </span>
            </div>
            {report.status !== "PENDING" && (
              <div className={styles.timelineItem}>
                <span
                  className={`${styles.timelineDot} ${styles.timelineDotActive}`}
                />
                <span className={styles.timelineLabel}>Review started</span>
                <span className={styles.timelineDate}>—</span>
              </div>
            )}
            {(report.status === "RESOLVED" ||
              report.status === "DISMISSED") && (
              <div className={styles.timelineItem}>
                <span
                  className={`${styles.timelineDot} ${styles.timelineDotDone}`}
                />
                <span className={styles.timelineLabel}>
                  {report.status === "RESOLVED" ? "Resolved" : "Dismissed"}
                </span>
                <span className={styles.timelineDate}>
                  {fmtDate(report.resolvedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {canCancel && (
            <button
              className={styles.cancelReportBtn}
              onClick={() => {
                onClose();
                onCancel(report);
              }}
            >
              🗑️ Cancel this report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ report, index, onView, onCancel }) {
  const typeMeta = TYPE_LABEL[report.targetType] ?? {
    label: report.targetType,
    icon: "📄",
  };
  const canCancel = report.status === "PENDING";

  return (
    <div className={styles.card} style={{ animationDelay: `${index * 0.04}s` }}>
      {/* Top row */}
      <div className={styles.cardTop}>
        <div className={styles.cardTopLeft}>
          <span className={styles.cardTypeIcon}>{typeMeta.icon}</span>
          <div>
            <p className={styles.cardRef}>{report.ref}</p>
            <p className={styles.cardType}>{typeMeta.label}</p>
          </div>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Reason + description */}
      <div className={styles.cardBody}>
        <p className={styles.cardReason}>{REASON_LABEL[report.reason]}</p>
        {report.description && (
          <p className={styles.cardDescription}>{report.description}</p>
        )}
      </div>

      {/* Outcome if resolved */}
      {report.actionTaken && report.actionTaken !== "NO_ACTION" && (
        <div className={styles.cardOutcome}>
          {ACTION_META[report.actionTaken]?.icon}{" "}
          {ACTION_META[report.actionTaken]?.label}
        </div>
      )}
      {report.actionTaken === "NO_ACTION" && report.status === "RESOLVED" && (
        <div className={`${styles.cardOutcome} ${styles.cardOutcomeDim}`}>
          — No action taken
        </div>
      )}

      {/* Footer */}
      <div className={styles.cardFooter}>
        <span className={styles.cardDate}>{timeAgo(report.createdAt)}</span>
        <div className={styles.cardActions}>
          {canCancel && (
            <button
              className={styles.cardCancelBtn}
              onClick={() => onCancel(report)}
              title="Cancel report"
            >
              🗑️
            </button>
          )}
          <button className={styles.cardViewBtn} onClick={() => onView(report)}>
            View details →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyReports() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const LIMIT = 10;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(
    async (pg = 1, status = tab) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (status !== "ALL") params.status = status;
        const res = await api.get("/reports/my", { params });
        const d = res.data.data;
        setReports(d.reports);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);
      } catch {
        showToast("Failed to load reports.", "error");
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    load(1, tab);
  }, [tab]);

  function handleTabChange(key) {
    setTab(key);
    setPage(1);
  }

  function handleCancelSuccess(msg) {
    setCancelTarget(null);
    showToast(msg);
    load(page, tab);
  }

  // Summary counts from current loaded data (approximate)
  const pending = reports.filter((r) => r.status === "PENDING").length;
  const reviewing = reports.filter((r) => r.status === "REVIEWING").length;
  const resolved = reports.filter((r) => r.status === "RESOLVED").length;

  return (
    <Layout>
      <div className={styles.page}>
        {/* Toast */}
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.type === "success" ? "✅" : "❌"} {toast.msg}
          </div>
        )}

        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Safety &amp; Trust</p>
            <h1 className={styles.pageTitle}>
              My Reports
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
            <p className={styles.pageSubtitle}>
              Track reports you've submitted. Our moderation team reviews every
              report within 24–48 hours.
            </p>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && reports.length > 0 && (
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryIcon}>⏳</span>
              <span className={styles.summaryVal}>{pending}</span>
              <span className={styles.summaryLabel}>Pending</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryIcon}>🔍</span>
              <span className={styles.summaryVal}>{reviewing}</span>
              <span className={styles.summaryLabel}>Under review</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryIcon}>✅</span>
              <span className={styles.summaryVal}>{resolved}</span>
              <span className={styles.summaryLabel}>Resolved</span>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className={styles.infoBanner}>
          <span className={styles.infoBannerIcon}>🔒</span>
          <p className={styles.infoBannerText}>
            All reports are confidential. The reported party is never told who
            filed the report. If you need urgent help, please contact{" "}
            <a href="/contact" className={styles.infoBannerLink}>
              support
            </a>
            .
          </p>
        </div>

        {/* Status tabs */}
        <div className={styles.tabBar}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className={styles.cardGrid}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : reports.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🚩</span>
              <p className={styles.emptyTitle}>
                {tab === "ALL"
                  ? "No reports submitted yet"
                  : `No ${tab.toLowerCase()} reports`}
              </p>
              <p className={styles.emptySub}>
                {tab === "ALL"
                  ? "Use the Report button on any user, job post, or content to flag it."
                  : "Try a different filter above."}
              </p>
              {tab !== "ALL" && (
                <button
                  className={styles.emptyReset}
                  onClick={() => handleTabChange("ALL")}
                >
                  View all reports
                </button>
              )}
            </div>
          ) : (
            reports.map((r, i) => (
              <ReportCard
                key={r.id}
                report={r}
                index={i}
                onView={setViewTarget}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {viewTarget && (
        <DetailDrawer
          report={viewTarget}
          onClose={() => setViewTarget(null)}
          onCancel={(r) => {
            setViewTarget(null);
            setCancelTarget(r);
          }}
        />
      )}

      {/* Cancel confirm */}
      {cancelTarget && (
        <CancelConfirm
          report={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </Layout>
  );
}
