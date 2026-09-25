// src/pages/admin/AdminLogs.jsx
// Full admin audit log viewer.
//
// Backend endpoints (mounted at /api/admin/logs/*):
//   GET /admin/logs                       list (paginated, filterable)
//   GET /admin/logs/:id                   single log
//   GET /admin/logs/stats/summary         stats summary
//   GET /admin/logs/admin/:adminId        logs by a specific admin
//   GET /admin/logs/target/:targetType/:targetId
//   GET /admin/logs/export                JSON export (we convert to CSV)
//
// Emojis removed. Every backend field is rendered. Fully responsive.
// Uses platform AlertModal for feedback.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ScrollText,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Info,
  Server,
  User,
  Hash,
  Copy,
  Check,
  Clock,
  RefreshCw,
  Inbox,
  Eye,
  EyeOff,
  Activity,
  Target,
  Layers,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import styles from "./AdminLogs.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
//
// The backend does NOT send a `level`, `type`, `timestamp`, `message`,
// `userId`, or `metadata` field. AuditLog rows have:
//   id, action, targetType, targetId, adminId, admin, description, result,
//   errorMessage, ipAddress, userAgent, meta, before, after, createdAt
//
// We *derive* a "level" from action + result to preserve the visual language
// the previous UI tried to establish (error / security / wallet / info).

const LEVEL_META = {
  error: { label: "Error", color: "red", Icon: ShieldAlert },
  warn: { label: "Warn", color: "yellow", Icon: AlertTriangle },
  security: { label: "Security", color: "blue", Icon: ShieldAlert },
  wallet: { label: "Wallet", color: "green", Icon: Activity },
  info: { label: "Info", color: "dim", Icon: Info },
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
function humanizeAction(action) {
  if (!action) return "—";
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
function shortRef(id) {
  if (!id) return "—";
  return `AL-${id.slice(-8).toUpperCase()}`;
}
// Derive a "level" from the action + result so we keep the icon/tint language.
function deriveLevel(log) {
  if (!log) return "info";
  if (log.result === "FAILED" || log.errorMessage) return "error";
  const a = (log.action || "").toUpperCase();
  if (
    a.includes("BAN") ||
    a.includes("DELETE") ||
    a.includes("PURGE") ||
    a.includes("SUSPEND") ||
    a.includes("REJECT")
  )
    return "warn";
  if (
    a.includes("VERIF") ||
    a.includes("LOGIN") ||
    a.includes("PASSWORD") ||
    a.includes("2FA") ||
    a.includes("SECURITY")
  )
    return "security";
  if (
    a.includes("PAYMENT") ||
    a.includes("WITHDRAWAL") ||
    a.includes("REFUND") ||
    a.includes("ESCROW") ||
    a.includes("PAYOUT")
  )
    return "wallet";
  return "info";
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}
// Client-side CSV download from a list of audit logs.
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

// ─── Atoms ────────────────────────────────────────────────────────────────────
function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={styles.dimText}>—</span>;
  return (
    <span className={styles.copyPill} title={String(text)}>
      <span className={styles.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={styles.copyPillBtn}
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

function Avatar({ user }) {
  return (
    <div className={styles.avatar}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

function LevelBadge({ level }) {
  const m = LEVEL_META[level] ?? LEVEL_META.info;
  const Icon = m.Icon;
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.color}`]}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

function ResultBadge({ result }) {
  const m = RESULT_META[result] ?? { label: result ?? "—", cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ log, onClose }) {
  const level = deriveLevel(log);
  const levelMeta = LEVEL_META[level] ?? LEVEL_META.info;
  const Icon = levelMeta.Icon;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Audit Entry</p>
            <p className={styles.drawerTitle}>{shortRef(log.id)}</p>
            <div className={styles.drawerIds}>
              <CopyPill text={log.id} label={`id ${log.id.slice(0, 12)}…`} />
            </div>
          </div>
          <button
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div
            className={`${styles.drawerHero} ${styles[`hero_${levelMeta.color}`]}`}
          >
            <span className={styles.drawerHeroIcon}>
              <Icon size={16} />
            </span>
            <div className={styles.drawerHeroText}>
              <p className={styles.drawerHeroAction}>
                {humanizeAction(log.action)}
              </p>
              <p className={styles.drawerHeroSev}>{levelMeta.label}</p>
            </div>
            <ResultBadge result={log.result} />
          </div>

          <div className={styles.drawerSection}>
            <p className={styles.drawerSectionTitle}>
              <User size={10} /> Performed by
            </p>
            <div className={styles.drawerAdminCard}>
              <Avatar user={log.admin} />
              <div className={styles.drawerAdminInfo}>
                <p className={styles.drawerAdminName}>
                  {log.admin?.firstName || "—"} {log.admin?.lastName || ""}
                </p>
                {log.admin?.email && (
                  <p className={styles.drawerAdminEmail}>{log.admin.email}</p>
                )}
                <div className={styles.drawerIds}>
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

          <div className={styles.detailGrid}>
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

          {log.description && (
            <div className={styles.descBox}>
              <p className={styles.descLabel}>Description</p>
              <p className={styles.descText}>{log.description}</p>
            </div>
          )}

          {(log.before || log.after) && (
            <div className={styles.diffWrap}>
              {log.before && (
                <div className={styles.diffPane}>
                  <p className={styles.diffPaneLabel}>Before</p>
                  <pre className={`${styles.diffPre} ${styles.diffBefore}`}>
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div className={styles.diffPane}>
                  <p className={styles.diffPaneLabel}>After</p>
                  <pre className={`${styles.diffPre} ${styles.diffAfter}`}>
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {log.errorMessage && (
            <div className={styles.errorBox}>
              <p className={styles.errorBoxLabel}>
                <AlertTriangle size={12} /> Error
              </p>
              <p className={styles.errorBoxText}>{log.errorMessage}</p>
            </div>
          )}

          {log.meta && Object.keys(log.meta).length > 0 && (
            <div className={styles.descBox}>
              <p className={styles.descLabel}>Metadata</p>
              <pre className={styles.diffPre}>
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
    <div className={styles.detailCell}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailVal} ${mono ? styles.mono : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, index, onView }) {
  const level = deriveLevel(log);
  return (
    <div
      className={styles.tableRow}
      style={{ animationDelay: `${index * 0.02}s` }}
      onClick={() => onView(log)}
    >
      <div className={styles.tdRef}>
        <LevelBadge level={level} />
        <span className={styles.refCode}>{shortRef(log.id)}</span>
      </div>
      <div className={styles.tdAdmin}>
        <Avatar user={log.admin} />
        <div className={styles.tdAdminInfo}>
          <span className={styles.tdAdminName}>
            {log.admin?.firstName || "—"} {log.admin?.lastName || ""}
          </span>
          <span className={styles.tdAdminEmail}>{log.admin?.email || "—"}</span>
        </div>
      </div>
      <div className={styles.tdAction}>
        <span className={styles.actionLabel}>{humanizeAction(log.action)}</span>
        <span className={styles.actionRaw}>{log.action}</span>
      </div>
      <div className={styles.tdTarget}>
        <span className={styles.targetType}>{log.targetType}</span>
        {log.targetId && (
          <span className={styles.targetId}>
            {log.targetId.slice(-8).toUpperCase()}
          </span>
        )}
      </div>
      <div className={styles.tdResult}>
        <ResultBadge result={log.result} />
      </div>
      <div className={styles.tdTime}>
        <span className={styles.timeMain}>{timeAgo(log.createdAt)}</span>
        <span className={styles.timeSub}>{fmtDate(log.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [notify, setNotify] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Hold the latest filter values in a ref so the auto-refresh interval
  // always reads the freshest state (avoids a stale-closure bug).
  const filtersRef = useRef({
    search,
    filterTarget,
    filterResult,
    filterFrom,
    filterTo,
    page,
  });
  const searchTimer = useRef(null);

  useEffect(() => {
    filtersRef.current = {
      search,
      filterTarget,
      filterResult,
      filterFrom,
      filterTo,
      page,
    };
  }, [search, filterTarget, filterResult, filterFrom, filterTo, page]);

  function showToast(type, text) {
    setNotify({ type, text });
  }

  // ── Load logs ──────────────────────────────────────────────────────────────
  const loadLogs = useCallback(
    async (pg = 1, silent = false) => {
      if (!silent) setLoading(true);
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
        // Backend key is `pages`, not `totalPages`.
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        if (!silent) showToast("error", "Failed to load audit logs.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [search, filterTarget, filterResult, filterFrom, filterTo],
  );

  // Reload whenever filters change (page 1)
  useEffect(() => {
    loadLogs(1);
  }, [filterTarget, filterResult, filterFrom, filterTo]);

  // Auto-refresh every 30s — uses the ref so filters stay current.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      const f = filtersRef.current;
      const params = { page: f.page, limit: LIMIT };
      if (f.search.trim()) params.search = f.search.trim();
      if (f.filterTarget) params.targetType = f.filterTarget;
      if (f.filterResult) params.result = f.filterResult;
      if (f.filterFrom) params.fromDate = f.filterFrom;
      if (f.filterTo) params.toDate = f.filterTo;
      api
        .get("/admin/logs", { params })
        .then((res) => {
          const d = res.data.data;
          setLogs(d.logs || []);
          setTotal(d.total || 0);
          setPages(d.pages || 1);
        })
        .catch(() => {
          /* silent — background refresh */
        });
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

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
        showToast("error", "Nothing to export with the current filters.");
        return;
      }
      downloadCsv(list);
      showToast(
        "success",
        `Exported ${list.length} entr${list.length === 1 ? "y" : "ies"}.`,
      );
    } catch (e) {
      showToast("error", e.response?.data?.message || "Export failed.");
    }
  }

  const hasFilters =
    search || filterTarget || filterResult || filterFrom || filterTo;

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Monitoring</p>
            <h1 className={styles.title}>
              <ScrollText size={20} /> System Logs
            </h1>
            <p className={styles.subtitle}>
              Monitor platform activity and security events
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.exportBtn} onClick={handleExport}>
              <Download size={13} /> Export CSV
            </button>
            <button
              className={`${styles.autoRefreshBtn} ${autoRefresh ? styles.active : ""}`}
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Auto-refresh is ON" : "Auto-refresh is OFF"}
            >
              {autoRefresh ? <Eye size={13} /> : <EyeOff size={13} />}
              {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            </button>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <Search size={13} />
            </span>
            <input
              type="text"
              placeholder="Search description or error message…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                className={styles.searchClear}
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

          <div className={styles.filterRow}>
            <select
              className={styles.select}
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value)}
              aria-label="Filter by target type"
            >
              <option value="">All targets</option>
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              aria-label="Filter by result"
            >
              <option value="">All results</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PARTIAL">Partial</option>
            </select>

            <input
              type="date"
              className={styles.select}
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              title="From date"
            />
            <input
              type="date"
              className={styles.select}
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              title="To date"
            />

            <button
              className={styles.refreshBtn}
              onClick={() => loadLogs(page)}
              title="Refresh"
            >
              <RefreshCw size={12} /> Refresh
            </button>

            {hasFilters && (
              <button className={styles.clearBtn} onClick={clearFilters}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {!loading && (
          <p className={styles.resultCount}>
            {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
            {hasFilters && " matching filters"}
          </p>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className={styles.loading}>
            <Spinner />
            <p>Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Inbox size={40} />
            </span>
            <h3 className={styles.emptyTitle}>No logs found</h3>
            <p className={styles.emptySub}>
              {hasFilters
                ? "Try adjusting your filters or search terms."
                : "Audit entries will appear here as admins take action."}
            </p>
            {hasFilters && (
              <button className={styles.emptyReset} onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <span>Ref</span>
              <span>Admin</span>
              <span>Action</span>
              <span>Target</span>
              <span>Result</span>
              <span>Time</span>
            </div>
            <div className={styles.tableBody}>
              {logs.map((log, i) => (
                <LogRow key={log.id} log={log} index={i} onView={setDetail} />
              ))}
            </div>
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => loadLogs(page - 1)}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages || loading}
              onClick={() => loadLogs(page + 1)}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {detail && <DetailDrawer log={detail} onClose={() => setDetail(null)} />}

      {/* ── Platform AlertModal ── */}
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
