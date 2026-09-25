// src/pages/admin/AdminAuditLog.jsx
// Full admin audit log dashboard.
//
// Endpoints (mounted at /api/audit/*):
//   GET    /audit                         list (paginated, filterable, incl. severity)
//   GET    /audit/stats?days=30           stats (bySeverity, byAction, dailyActivity, topAdmins, recentActivity)
//   GET    /audit/me                      current admin's own trail
//   GET    /audit/admins                  all admins with audit entries
//   GET    /audit/target/:type/:id        all logs affecting one record
//   GET    /audit/:id                     single log + live target state
//   GET    /audit/export                  CSV download (server-built)
//   DELETE /audit/purge                   purge old SUCCESS entries
//
// Every field the backend sends is rendered. Lucide icons throughout.
// Fully responsive. Uses platform AlertModal + ConfirmationModal.

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
  Clock,
  RefreshCw,
  Inbox,
  Calendar,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import api from "../../lib/api";
import s from "./AdminAuditLog.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
//
// The backend already sends `severity` (via enrichLog) and `actionLabel`
// on every log row. We only keep a metadata map so the UI has labels and
// colours for each severity value.
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
// The backend sends `log.ref` (e.g. "#ABC12345"); fall back to a local one.
function shortRef(log) {
  if (!log) return "—";
  if (log.ref) return log.ref;
  if (log.id) return `#${log.id.slice(-8).toUpperCase()}`;
  return "—";
}
// Prefer backend-computed label; fall back to humanising the action key.
function actionLabelOf(log) {
  if (!log) return "—";
  if (log.actionLabel) return log.actionLabel;
  if (!log.action) return "—";
  return log.action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
function severityOf(log) {
  if (!log) return "info";
  if (log.severity) return log.severity;
  if (log.result === "FAILED" || log.errorMessage) return "critical";
  return "info";
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
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

function SkeletonRows({ n = LIMIT }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

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

// Daily activity bar chart (30 days by default)
function DailyChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.total), 1);
  // Show the last 14 bars on mobile, all on desktop. Let CSS handle the rest
  // by just rendering all and letting the parent scroll horizontally.
  return (
    <div className={s.chartWrap}>
      <p className={s.chartTitle}>
        <Calendar size={12} /> Daily activity (last {data.length} days)
      </p>
      <div className={s.chartBars}>
        {data.map((d) => (
          <div
            key={d.date}
            className={s.chartBarCol}
            title={`${d.date}: ${d.total} (${d.success} success, ${d.failed} failed)`}
          >
            <div className={s.chartBarInner}>
              <div
                className={s.chartBarFill}
                style={{ height: `${Math.round((d.total / max) * 100)}%` }}
              />
            </div>
            <span className={s.chartBarDate}>{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ logId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!logId) return;
    setLoading(true);
    setError("");
    api
      .get(`/audit/${logId}`)
      .then((r) => setData(r.data.data))
      .catch(() => setError("Failed to load log detail."))
      .finally(() => setLoading(false));
  }, [logId]);

  const log = data?.log;
  const targetCurrent = data?.targetCurrent;
  const sev = log
    ? (SEVERITY_META[severityOf(log)] ?? SEVERITY_META.info)
    : null;
  const SeveIcon = sev?.Icon;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHandle} />
        <div className={s.drawerHeader}>
          <div>
            <p className={s.drawerEyebrow}>Audit Entry</p>
            <h3 className={s.drawerTitle}>
              {log ? shortRef(log) : loading ? "Loading…" : "—"}
            </h3>
            {log?.id && (
              <div className={s.drawerIds}>
                <CopyPill text={log.id} label={`id ${log.id.slice(0, 12)}…`} />
              </div>
            )}
          </div>
          <button
            className={s.drawerClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className={s.drawerBody}>
            <div className={s.skPanel} />
            <div className={s.skTier} />
            <div className={s.skTier} />
          </div>
        ) : error ? (
          <div className={s.drawerBody}>
            <div className={s.errorBox}>
              <p className={s.errorBoxLabel}>
                <AlertTriangle size={12} /> Error
              </p>
              <p className={s.errorBoxText}>{error}</p>
            </div>
          </div>
        ) : log ? (
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
                {SeveIcon ? <SeveIcon size={16} /> : null}
              </span>
              <div className={s.drawerHeroText}>
                <p className={s.drawerHeroAction}>{actionLabelOf(log)}</p>
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
              <Cell label="Action Label" value={actionLabelOf(log)} />
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
              <Cell
                label="Result"
                value={<ResultBadge result={log.result} />}
              />
              <Cell
                label="Severity"
                value={<SeverityBadge severity={severityOf(log)} />}
              />
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

            {/* Live target state (from /audit/:id — `targetCurrent`) */}
            {targetCurrent && (
              <div className={s.descBox}>
                <p className={s.descLabel}>Current state of target</p>
                <pre className={s.diffPre}>
                  {JSON.stringify(targetCurrent, null, 2)}
                </pre>
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
        ) : null}
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

// ─── Purge Modal (real — backend does support it) ───────────────────────────
function PurgeModal({ onClose, onDone, showToast }) {
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePurge() {
    setBusy(true);
    setError("");
    try {
      const res = await api.delete("/audit/purge", {
        data: { olderThanDays: days },
      });
      const count = res.data.data?.purgedCount ?? 0;
      showToast(
        "success",
        `Purged ${count} entries older than ${days} days. FAILED entries were preserved.`,
      );
      onDone();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Purge failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.confirmIcon}>
          <Trash2 size={26} />
        </div>
        <h3 className={s.confirmTitle}>Purge Old Entries</h3>
        <p className={s.confirmSub}>
          Permanently deletes <strong>SUCCESS</strong> entries older than the
          selected number of days. FAILED entries are always preserved.
        </p>

        <div className={s.purgeInput}>
          <label className={s.purgeLabel}>Delete entries older than</label>
          <div className={s.purgeRow}>
            <input
              type="number"
              min={30}
              max={365}
              value={days}
              onChange={(e) =>
                setDays(Math.max(30, parseInt(e.target.value) || 30))
              }
              className={s.purgeDaysInput}
            />
            <span className={s.purgeDaysUnit}>days</span>
          </div>
        </div>

        {error && <p className={s.inlineError}>{error}</p>}

        <div className={s.confirmActions}>
          <button className={s.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={s.btnRed} onClick={handlePurge} disabled={busy}>
            {busy ? (
              <span className={s.spinner} />
            ) : (
              <>
                <Trash2 size={13} /> Purge now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, index, onView }) {
  const severity = severityOf(log);
  return (
    <div
      className={s.tableRow}
      style={{ animationDelay: `${index * 0.022}s` }}
      onClick={() => onView(log.id)}
    >
      <div className={s.tdRef}>
        <SeverityDot severity={severity} />
        <span className={s.refCode}>{shortRef(log)}</span>
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
        <span className={s.actionLabel}>{actionLabelOf(log)}</span>
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
  const [detailId, setDetailId] = useState(null);
  const [showPurge, setShowPurge] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const searchTimer = useRef(null);

  function showToast(type, text) {
    setNotify({ type, text });
  }

  // ── Load stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api
      .get("/audit/stats", { params: { days: 30 } })
      .then((r) => setStats(r.data.data))
      .catch(() => showToast("error", "Failed to load audit stats."))
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
        if (filterSeverity) params.severity = filterSeverity;
        if (filterResult) params.result = filterResult;
        if (filterFrom) params.from = filterFrom;
        if (filterTo) params.to = filterTo;

        const res = await api.get("/audit", { params });
        const d = res.data.data;
        setLogs(d.logs || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        showToast("error", "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    },
    [search, filterTarget, filterSeverity, filterResult, filterFrom, filterTo],
  );

  useEffect(() => {
    loadLogs(1);
  }, [filterTarget, filterSeverity, filterResult, filterFrom, filterTo]);

  function handleSearchChange(e) {
    setSearch(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadLogs(1), 400);
  }

  function clearFilters() {
    setSearch("");
    setFilterTarget("");
    setFilterSeverity("");
    setFilterResult("");
    setFilterFrom("");
    setFilterTo("");
  }

  function handleExport() {
    // The backend streams a CSV file directly. Trigger a plain browser download
    // and include the same filters the user has applied.
    const params = new URLSearchParams();
    if (filterTarget) params.set("targetType", filterTarget);
    if (filterResult) params.set("result", filterResult);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    params.set("limit", "5000");

    const base = (api.defaults?.baseURL || "/api").replace(/\/$/, "");
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("token") ||
          window.localStorage.getItem("accessToken")
        : null;

    // We must use fetch to attach the bearer token — window.open can't.
    fetch(`${base}/audit/export?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Export failed");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("success", "Export downloaded.");
      })
      .catch((e) => showToast("error", e.message || "Export failed."));
  }

  const hasFilters =
    search ||
    filterTarget ||
    filterSeverity ||
    filterResult ||
    filterFrom ||
    filterTo;

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
            <button className={s.purgeBtn} onClick={() => setShowPurge(true)}>
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
            <div className={s.statsGrid}>
              <StatCard
                icon={ScrollText}
                label="Total Actions (30d)"
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

            {/* Daily chart */}
            {statsLoading ? (
              <div className={s.skPanel} />
            ) : (
              <DailyChart data={stats?.dailyActivity || []} />
            )}

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

              {/* By target type */}
              <div className={s.panel}>
                <p className={s.panelTitle}>
                  <Users size={13} /> By Target Type
                </p>
                {statsLoading ? (
                  <div className={s.skTier} />
                ) : (
                  <StatBars
                    items={Object.entries(stats?.byTargetType || {}).map(
                      ([label, count]) => ({
                        label,
                        count,
                        color: "var(--orange)",
                      }),
                    )}
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

            {/* Top admins */}
            {!statsLoading && stats?.topAdmins?.length > 0 && (
              <div className={s.panel}>
                <p className={s.panelTitle}>
                  <Users size={13} /> Most Active Admins
                </p>
                <div className={s.adminList}>
                  {stats.topAdmins.map((a, i) => (
                    <div key={a.id || i} className={s.adminRow}>
                      <span className={s.adminRank}>#{i + 1}</span>
                      <Avatar user={a} />
                      <div className={s.adminInfo}>
                        <p className={s.adminName}>
                          {a.firstName} {a.lastName}
                        </p>
                        <p className={s.adminEmail}>{a.email}</p>
                      </div>
                      <div className={s.adminCount}>
                        <span className={s.adminCountVal}>{a.actionCount}</span>
                        <span className={s.adminCountLabel}>actions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity feed */}
            {!statsLoading && stats?.recentActivity?.length > 0 && (
              <div className={s.activityFeed}>
                <p className={s.feedTitle}>
                  <Activity size={12} /> Recent Activity
                </p>
                {stats.recentActivity.map((log) => (
                  <div key={log.id} className={s.feedItem}>
                    <SeverityDot severity={severityOf(log)} />
                    <Avatar user={log.admin} />
                    <div className={s.feedBody}>
                      <span className={s.feedAction}>{actionLabelOf(log)}</span>
                      <span className={s.feedAdmin}>
                        {log.admin?.firstName} {log.admin?.lastName}
                      </span>
                    </div>
                    <span className={s.feedTime}>{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
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
              <div className={s.searchBar}>
                <span className={s.searchIcon}>
                  <Search size={13} />
                </span>
                <input
                  className={s.searchInput}
                  placeholder="Search description, admin name or email…"
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

              <div className={s.filterRow}>
                <select
                  className={s.select}
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  aria-label="Target type"
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
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  aria-label="Severity"
                >
                  <option value="">All Severities</option>
                  {Object.entries(SEVERITY_META).map(([k, m]) => (
                    <option key={k} value={k}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  className={s.select}
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  aria-label="Result"
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

            {!loading && (
              <p className={s.resultCount}>
                {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
                {hasFilters && " matching filters"}
              </p>
            )}

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
                      onView={setDetailId}
                    />
                  ))
                )}
              </div>
            </div>

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
      {detailId && (
        <DetailDrawer logId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Purge modal (real endpoint) */}
      {showPurge && (
        <PurgeModal
          onClose={() => setShowPurge(false)}
          onDone={() => {
            loadLogs(1);
            loadStats();
          }}
          showToast={showToast}
        />
      )}

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
