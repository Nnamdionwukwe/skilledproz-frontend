// src/pages/admin/AdminAuditLog.jsx
// Full admin audit log dashboard.
//
// Endpoints (mounted at /api/admin/logs/*):
//   GET /admin/logs                          list (paginated, filterable)
//   GET /admin/logs/:id                      single log
//   GET /admin/logs/stats/summary            stats summary
//   GET /admin/logs/admin/:adminId           logs by a specific admin
//   GET /admin/logs/target/:targetType/:targetId
//   GET /admin/logs/export                   JSON export (we convert to CSV)
//
// NOTE: The backend has NO purge endpoint. The purge modal is kept but
// disabled with a clear explanation — remove it entirely if you prefer.
//
// Emojis removed. Every field the backend sends is rendered. Fully responsive.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  X,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ListChecks,
  TrendingUp,
  Users,
  Copy,
  Check,
  Activity,
  Terminal,
  Clock,
  RefreshCw,
  Inbox,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import s from "./AdminAuditLog.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
//
// The backend does NOT send a `severity` field. We derive it from
// action + result:
//   - FAILED result → "critical"
//   - action contains "BAN" | "DELETE" | "PURGE" | "REFUND" | "REVERS" → "warning"
//   - RESULT === "SUCCESS" and admin-targeted write → "success"
//   - everything else → "info"
//
const SEVERITY_META = {
  critical: {
    label: "Critical",
    color: "red",
    dot: "#ef4444",
    Icon: ShieldAlert,
  },
  warning: {
    label: "Warning",
    color: "yellow",
    dot: "#eab308",
    Icon: AlertTriangle,
  },
  success: {
    label: "Success",
    color: "green",
    dot: "#22c55e",
    Icon: CheckCircle,
  },
  info: { label: "Info", color: "blue", dot: "#3b82f6", Icon: Info },
};

const RESULT_META = {
  SUCCESS: { label: "Success", cls: "green" },
  FAILED: { label: "Failed", cls: "red" },
  PARTIAL: { label: "Partial", cls: "yellow" },
};

const TARGET_TYPES = [
  "USER",
  "PAYMENT",
  "WITHDRAWAL",
  "REPORT",
  "BOOKING",
  "REVIEW",
  "POST",
  "JOB_POST",
  "CATEGORY",
  "SUBSCRIPTION",
  "DISPUTE",
  "SYSTEM",
];

const LIMIT = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}
// Humanise an ACTION enum: USER_BANNED → "User Banned"
function humanizeAction(action) {
  if (!action) return "—";
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
// Derive a severity from the raw action + result. See note above.
function deriveSeverity(log) {
  if (log.result === "FAILED" || log.errorMessage) return "critical";
  const a = (log.action || "").toUpperCase();
  if (
    a.includes("BAN") ||
    a.includes("DELETE") ||
    a.includes("PURGE") ||
    a.includes("REFUND") ||
    a.includes("REVERS") ||
    a.includes("RESOLVE") ||
    a.includes("REJECT")
  )
    return "warning";
  if (log.result === "SUCCESS") return "success";
  return "info";
}
// Build a short, display-friendly reference from the UUID
function shortRef(id) {
  if (!id) return "—";
  return `AL-${id.slice(-8).toUpperCase()}`;
}
// Convert an array of logs to CSV and trigger a browser download
function downloadCsv(logs) {
  const cols = [
    "id",
    "createdAt",
    "adminId",
    "adminEmail",
    "action",
    "targetType",
    "targetId",
    "result",
    "description",
    "errorMessage",
    "ipAddress",
    "userAgent",
  ];
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = [cols.join(",")];
  for (const l of logs) {
    rows.push(
      [
        l.id,
        l.createdAt,
        l.adminId,
        l.admin?.email,
        l.action,
        l.targetType,
        l.targetId,
        l.result,
        l.description,
        l.errorMessage,
        l.ipAddress,
        l.userAgent,
      ]
        .map(esc)
        .join(","),
    );
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm" }) {
  return (
    <div className={`${s.avatar} ${size === "lg" ? s.avatarLg : ""}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Copy Pill ────────────────────────────────────────────────────────────────
function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={s.dimText}>—</span>;
  return (
    <span className={s.copyPill} title={String(text)}>
      <span className={s.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={s.copyPillBtn}
        onClick={async (e) => {
          e.stopPropagation();
          if (await copyText(text)) {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }
        }}
        aria-label="Copy"
      >
        {ok ? <Check size={10} /> : <Copy size={10} />}
      </button>
    </span>
  );
}

// ─── Severity Dot / Badge ─────────────────────────────────────────────────────
function SeverityDot({ severity }) {
  const m = SEVERITY_META[severity] ?? SEVERITY_META.info;
  return (
    <span
      className={s.severityDot}
      style={{ background: m.dot }}
      title={m.label}
    />
  );
}

function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] ?? SEVERITY_META.info;
  const Icon = m.Icon;
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function ResultBadge({ result }) {
  const m = RESULT_META[result] ?? { label: result ?? "—", cls: "blue" };
  return <span className={`${s.badge} ${s[`badge_${m.cls}`]}`}>{m.label}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{Icon ? <Icon size={16} /> : null}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ n = LIMIT }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Stat sub-components ──────────────────────────────────────────────────────
function StatBars({ items, max }) {
  if (!items?.length) return null;
  const top = max ?? items[0].count ?? 1;
  return (
    <div className={s.statBars}>
      {items.map((it, i) => (
        <div key={i} className={s.statBarRow}>
          <span className={s.statBarLabel} title={it.label}>
            {it.label}
          </span>
          <div className={s.statBarTrack}>
            <div
              className={s.statBarFill}
              style={{
                width: `${Math.round((it.count / top) * 100)}%`,
                background: it.color || "var(--orange)",
              }}
            />
          </div>
          <span className={s.statBarCount}>{it.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ log, onClose }) {
  const sev = SEVERITY_META[deriveSeverity(log)] ?? SEVERITY_META.info;
  const SeveIcon = sev.Icon;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHandle} />
        <div className={s.drawerHeader}>
          <div>
            <p className={s.drawerEyebrow}>Audit Entry</p>
            <h3 className={s.drawerTitle}>{shortRef(log.id)}</h3>
            <div className={s.drawerIds}>
              <CopyPill text={log.id} label={`id ${log.id.slice(0, 12)}…`} />
            </div>
          </div>
          <button
            className={s.drawerClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className={s.drawerBody}>
          {/* Severity hero */}
          <div
            className={s.drawerHero}
            style={{
              borderColor: sev.dot + "44",
              background: sev.dot + "0d",
            }}
          >
            <span
              className={s.drawerHeroIcon}
              style={{ background: sev.dot + "22", color: sev.dot }}
            >
              <SeveIcon size={16} />
            </span>
            <div className={s.drawerHeroText}>
              <p className={s.drawerHeroAction}>{humanizeAction(log.action)}</p>
              <p className={s.drawerHeroSev} style={{ color: sev.dot }}>
                {sev.label}
              </p>
            </div>
            <ResultBadge result={log.result} />
          </div>

          {/* Admin */}
          <div className={s.drawerSection}>
            <p className={s.drawerSectionTitle}>Performed by</p>
            <div className={s.drawerAdminCard}>
              <Avatar user={log.admin} size="lg" />
              <div className={s.drawerAdminInfo}>
                <p className={s.drawerAdminName}>
                  {log.admin?.firstName || "—"} {log.admin?.lastName || ""}
                </p>
                {log.admin?.email && (
                  <p className={s.drawerAdminEmail}>{log.admin.email}</p>
                )}
                <div className={s.drawerIds}>
                  {log.adminId && (
                    <CopyPill
                      text={log.adminId}
                      label={`admin ${log.adminId.slice(0, 10)}…`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detail grid */}
          <div className={s.detailGrid}>
            <Cell label="Action" value={log.action} mono />
            <Cell label="Target Type" value={log.targetType} />
            <Cell
              label="Target ID"
              value={
                log.targetId ? (
                  <CopyPill
                    text={log.targetId}
                    label={log.targetId.slice(-12).toUpperCase()}
                  />
                ) : (
                  "—"
                )
              }
            />
            <Cell label="Result" value={<ResultBadge result={log.result} />} />
            <Cell label="Date" value={fmtDate(log.createdAt)} />
            <Cell label="Time" value={fmtTime(log.createdAt)} />
            <Cell label="IP Address" value={log.ipAddress || "—"} mono />
            <Cell
              label="User Agent"
              value={log.userAgent ? log.userAgent.slice(0, 60) + "…" : "—"}
              mono
            />
          </div>

          {/* Description */}
          {log.description && (
            <div className={s.descBox}>
              <p className={s.descLabel}>Description</p>
              <p className={s.descText}>{log.description}</p>
            </div>
          )}

          {/* Before / After diff */}
          {(log.before || log.after) && (
            <div className={s.diffWrap}>
              {log.before && (
                <div className={s.diffPane}>
                  <p className={s.diffPaneLabel}>Before</p>
                  <pre className={`${s.diffPre} ${s.diffBefore}`}>
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div className={s.diffPane}>
                  <p className={s.diffPaneLabel}>After</p>
                  <pre className={`${s.diffPre} ${s.diffAfter}`}>
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {log.errorMessage && (
            <div className={s.errorBox}>
              <p className={s.errorBoxLabel}>
                <AlertTriangle size={12} /> Error
              </p>
              <p className={s.errorBoxText}>{log.errorMessage}</p>
            </div>
          )}

          {/* Meta */}
          {log.meta && Object.keys(log.meta).length > 0 && (
            <div className={s.descBox}>
              <p className={s.descLabel}>Metadata</p>
              <pre className={s.diffPre}>
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, mono }) {
  return (
    <div className={s.detailCell}>
      <span className={s.detailLabel}>{label}</span>
      <span className={`${s.detailVal} ${mono ? s.mono : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

// ─── Purge Modal (disabled — backend has no purge endpoint) ──────────────────
function PurgeModal({ onClose }) {
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.confirmIcon}>
          <AlertTriangle size={26} />
        </div>
        <h3 className={s.confirmTitle}>Purge Unavailable</h3>
        <p className={s.confirmSub}>
          The backend does not currently expose a purge endpoint. Audit entries
          are retained indefinitely for compliance.
        </p>
        <div className={s.confirmActions}>
          <button className={s.btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, index, onView }) {
  const severity = deriveSeverity(log);
  return (
    <div
      className={s.tableRow}
      style={{ animationDelay: `${index * 0.022}s` }}
      onClick={() => onView(log)}
    >
      <div className={s.tdRef}>
        <SeverityDot severity={severity} />
        <span className={s.refCode}>{shortRef(log.id)}</span>
      </div>
      <div className={s.tdAdmin}>
        <Avatar user={log.admin} />
        <div className={s.tdAdminInfo}>
          <span className={s.tdAdminName}>
            {log.admin?.firstName} {log.admin?.lastName}
          </span>
          <span className={s.tdAdminEmail}>{log.admin?.email || "—"}</span>
        </div>
      </div>
      <div className={s.tdAction}>
        <span className={s.actionLabel}>{humanizeAction(log.action)}</span>
        <span className={s.actionRaw}>{log.action}</span>
      </div>
      <div className={s.tdTarget}>
        <span className={s.targetType}>{log.targetType}</span>
        {log.targetId && (
          <span className={s.targetId}>
            {log.targetId.slice(-8).toUpperCase()}
          </span>
        )}
      </div>
      <div className={s.tdSeverity}>
        <SeverityBadge severity={severity} />
      </div>
      <div className={s.tdResult}>
        <ResultBadge result={log.result} />
      </div>
      <div className={s.tdTime}>
        <span className={s.timeMain}>{timeAgo(log.createdAt)}</span>
        <span className={s.timeSub}>{fmtDate(log.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [notify, setNotify] = useState(null);
  const [view, setView] = useState("logs"); // "logs" | "stats"
  const [detailTarget, setDetailTarget] = useState(null);
  const [showPurge, setShowPurge] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const searchTimer = useRef(null);

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  // ── Load stats once ────────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api
      .get("/admin/logs/stats/summary")
      .then((r) => {
        const d = r.data.data || {};
        // Backend shape: { total, success, failed, byAction: [{action,count}], byTarget: [...] }
        // We normalise into the shape the UI needs.
        const successRate =
          d.total > 0 ? Math.round((d.success / d.total) * 100) : 0;
        const bySeverity = {
          critical: d.failed || 0,
          warning: 0,
          success: d.success || 0,
          info: Math.max(
            0,
            (d.total || 0) - (d.success || 0) - (d.failed || 0),
          ),
        };
        // Top actions with derived severity + friendly label
        const byAction = (d.byAction || []).map((a) => {
          const severity = deriveSeverity({
            action: a.action,
            result: "SUCCESS",
          });
          return {
            action: a.action,
            label: humanizeAction(a.action),
            severity,
            count: a.count,
            color: (SEVERITY_META[severity] || SEVERITY_META.info).dot,
          };
        });
        const byTarget = (d.byTarget || []).map((t) => ({
          targetType: t.targetType,
          count: t.count,
        }));
        setStats({
          total: d.total || 0,
          success: d.success || 0,
          failed: d.failed || 0,
          successRate,
          bySeverity,
          byAction,
          byTarget,
        });
      })
      .catch(() => showToast("Failed to load audit stats.", "error"))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Load logs ──────────────────────────────────────────────────────────────
  const loadLogs = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (search.trim()) params.search = search.trim();
        if (filterTarget) params.targetType = filterTarget;
        if (filterResult) params.result = filterResult;
        if (filterFrom) params.fromDate = filterFrom;
        if (filterTo) params.toDate = filterTo;

        const res = await api.get("/admin/logs", { params });
        const d = res.data.data;
        setLogs(d.logs || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        showToast("Failed to load audit logs.", "error");
      } finally {
        setLoading(false);
      }
    },
    [search, filterTarget, filterResult, filterFrom, filterTo],
  );

  useEffect(() => {
    loadLogs(1);
  }, [filterTarget, filterResult, filterFrom, filterTo]);

  function handleSearchChange(e) {
    setSearch(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadLogs(1), 400);
  }

  function clearFilters() {
    setSearch("");
    setFilterTarget("");
    setFilterResult("");
    setFilterFrom("");
    setFilterTo("");
  }

  async function handleExport() {
    try {
      const params = {};
      if (filterTarget) params.targetType = filterTarget;
      if (filterResult) params.result = filterResult;
      if (filterFrom) params.fromDate = filterFrom;
      if (filterTo) params.toDate = filterTo;
      const res = await api.get("/admin/logs/export", { params });
      const list = res.data.data?.logs || [];
      if (list.length === 0) {
        showToast("Nothing to export with the current filters.", "error");
        return;
      }
      downloadCsv(list);
      showToast(
        `Exported ${list.length} entr${list.length === 1 ? "y" : "ies"}.`,
      );
    } catch (e) {
      showToast(e.response?.data?.message || "Export failed.", "error");
    }
  }

  const hasFilters =
    search || filterTarget || filterResult || filterFrom || filterTo;

  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Page header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>System</p>
            <h1 className={s.pageTitle}>
              <ScrollText size={20} />
              Audit Log
              {total > 0 && (
                <span className={s.countPill}>{total.toLocaleString()}</span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Immutable record of all administrative actions across the
              platform.
            </p>
          </div>
          <div className={s.headerActions}>
            <button className={s.exportBtn} onClick={handleExport}>
              <Download size={13} /> Export CSV
            </button>
            <button
              className={s.purgeBtn}
              onClick={() => setShowPurge(true)}
              title="Purge endpoint unavailable"
            >
              <Trash2 size={13} /> Purge Old
            </button>
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className={s.viewToggle}>
          <button
            className={`${s.viewTab} ${view === "logs" ? s.viewTabActive : ""}`}
            onClick={() => setView("logs")}
          >
            <ListChecks size={13} /> Log Entries
          </button>
          <button
            className={`${s.viewTab} ${view === "stats" ? s.viewTabActive : ""}`}
            onClick={() => setView("stats")}
          >
            <BarChart3 size={13} /> Analytics
          </button>
        </div>

        {/* ══════════════════════════════════════════
            STATS VIEW
        ══════════════════════════════════════════ */}
        {view === "stats" && (
          <div className={s.statsView}>
            {/* Overview cards */}
            <div className={s.statsGrid}>
              <StatCard
                icon={ScrollText}
                label="Total Actions"
                value={stats?.total?.toLocaleString()}
                accent="orange"
                delay={0}
              />
              <StatCard
                icon={CheckCircle}
                label="Success Rate"
                value={stats ? `${stats.successRate}%` : "—"}
                accent="green"
                delay={0.05}
              />
              <StatCard
                icon={ShieldAlert}
                label="Critical Actions"
                value={stats?.bySeverity?.critical ?? "—"}
                accent="red"
                delay={0.1}
              />
              <StatCard
                icon={AlertTriangle}
                label="Warnings"
                value={stats?.bySeverity?.warning ?? "—"}
                accent="yellow"
                delay={0.15}
              />
            </div>

            <div className={s.statsTwoCol}>
              {/* Severity breakdown */}
              <div className={s.panel}>
                <p className={s.panelTitle}>
                  <AlertTriangle size={13} /> Severity Breakdown
                </p>
                {statsLoading ? (
                  <div className={s.skTier} />
                ) : (
                  <div className={s.severityBars}>
                    {Object.entries(SEVERITY_META).map(([key, m]) => {
                      const count = stats?.bySeverity?.[key] ?? 0;
                      const total_ = stats?.total || 1;
                      const pct = Math.round((count / total_) * 100);
                      const Icon = m.Icon;
                      return (
                        <div key={key} className={s.severityBar}>
                          <div className={s.severityBarTop}>
                            <span className={s.severityBarLabel}>
                              <Icon size={11} /> {m.label}
                            </span>
                            <span className={s.severityBarCount}>{count}</span>
                          </div>
                          <div className={s.severityBarTrack}>
                            <div
                              className={s.severityBarFill}
                              style={{
                                width: `${pct}%`,
                                background: m.dot,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top targets */}
              <div className={s.panel}>
                <p className={s.panelTitle}>
                  <Users size={13} /> By Target Type
                </p>
                {statsLoading ? (
                  <div className={s.skTier} />
                ) : (
                  <StatBars
                    items={(stats?.byTarget || []).map((t) => ({
                      label: t.targetType,
                      count: t.count,
                      color: "var(--orange)",
                    }))}
                  />
                )}
              </div>
            </div>

            {/* Top actions */}
            {!statsLoading && stats?.byAction?.length > 0 && (
              <div className={s.panel}>
                <p className={s.panelTitle}>
                  <TrendingUp size={13} /> Top Actions
                </p>
                <div className={s.topActions}>
                  {stats.byAction.slice(0, 10).map((a, i) => {
                    const m = SEVERITY_META[a.severity] ?? SEVERITY_META.info;
                    const max = stats.byAction[0]?.count || 1;
                    return (
                      <div key={i} className={s.topActionRow}>
                        <SeverityDot severity={a.severity} />
                        <span className={s.topActionLabel} title={a.action}>
                          {a.label}
                        </span>
                        <div className={s.topActionBar}>
                          <div
                            className={s.topActionFill}
                            style={{
                              width: `${Math.round((a.count / max) * 100)}%`,
                              background: m.dot,
                            }}
                          />
                        </div>
                        <span className={s.topActionCount}>{a.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            LOG VIEW
        ══════════════════════════════════════════ */}
        {view === "logs" && (
          <>
            {/* Filters */}
            <div className={s.filtersWrap}>
              {/* Search */}
              <div className={s.searchBar}>
                <span className={s.searchIcon}>
                  <Search size={13} />
                </span>
                <input
                  className={s.searchInput}
                  placeholder="Search description or error message…"
                  value={search}
                  onChange={handleSearchChange}
                />
                {search && (
                  <button
                    className={s.searchClear}
                    onClick={() => {
                      setSearch("");
                      loadLogs(1);
                    }}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter row */}
              <div className={s.filterRow}>
                <select
                  className={s.select}
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                >
                  <option value="">All Targets</option>
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  className={s.select}
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                >
                  <option value="">All Results</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                  <option value="PARTIAL">Partial</option>
                </select>

                <input
                  type="date"
                  className={s.select}
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  title="From date"
                />
                <input
                  type="date"
                  className={s.select}
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  title="To date"
                />

                <button
                  className={s.btnOutline}
                  onClick={() => loadLogs(page)}
                  title="Refresh"
                >
                  <RefreshCw size={12} /> Refresh
                </button>

                {hasFilters && (
                  <button className={s.clearBtn} onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Result count */}
            {!loading && (
              <p className={s.resultCount}>
                {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
                {hasFilters && " matching filters"}
              </p>
            )}

            {/* Table */}
            <div className={s.tableWrap}>
              <div className={s.tableHead}>
                <span>Ref</span>
                <span>Admin</span>
                <span>Action</span>
                <span>Target</span>
                <span>Severity</span>
                <span>Result</span>
                <span>Time</span>
              </div>

              <div className={s.tableBody}>
                {loading ? (
                  <SkeletonRows />
                ) : logs.length === 0 ? (
                  <div className={s.empty}>
                    <span className={s.emptyIcon}>
                      <Inbox size={36} />
                    </span>
                    <p className={s.emptyTitle}>No audit entries found</p>
                    <p className={s.emptySub}>
                      {hasFilters
                        ? "Try adjusting your filters."
                        : "Admin actions will appear here as they happen."}
                    </p>
                    {hasFilters && (
                      <button className={s.emptyReset} onClick={clearFilters}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      index={i}
                      onView={setDetailTarget}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className={s.pager}>
                <button
                  className={s.pageBtn}
                  disabled={page === 1 || loading}
                  onClick={() => loadLogs(page - 1)}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span className={s.pageInfo}>
                  Page {page} of {pages}
                </span>
                <button
                  className={s.pageBtn}
                  disabled={page === pages || loading}
                  onClick={() => loadLogs(page + 1)}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail drawer */}
      {detailTarget && (
        <DetailDrawer
          log={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* Purge modal — backend has no purge endpoint */}
      {showPurge && <PurgeModal onClose={() => setShowPurge(false)} />}

      {/* Platform AlertModal */}
      <AlertModal
        isOpen={!!notify}
        onClose={() => setNotify(null)}
        title={notify?.type === "error" ? "Something went wrong" : "Done"}
        subtitle={
          notify?.type === "error"
            ? "The action could not be completed."
            : "The action was completed successfully."
        }
        alerts={
          notify
            ? [
                {
                  icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                  label: notify.type === "error" ? "Error" : "Success",
                  description: notify.text,
                  variant: notify.type === "error" ? "red" : "green",
                },
              ]
            : []
        }
      />
    </AdminLayout>
  );
}
