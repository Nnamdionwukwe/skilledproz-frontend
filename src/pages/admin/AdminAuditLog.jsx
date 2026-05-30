// src/pages/admin/AdminAuditLog.jsx
// Full admin audit log dashboard — stats, filterable log, detail drawer,
// export and purge. Covers all endpoints from audit.controller.js.

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminAuditLog.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const SEVERITY_META = {
  critical: { label: "Critical", color: "red", dot: "#ef4444" },
  warning: { label: "Warning", color: "yellow", dot: "#eab308" },
  success: { label: "Success", color: "green", dot: "#22c55e" },
  info: { label: "Info", color: "blue", dot: "#3b82f6" },
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
  "JOB",
  "CATEGORY",
  "SUBSCRIPTION",
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

// ─── Severity Dot ─────────────────────────────────────────────────────────────
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

// ─── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] ?? SEVERITY_META.info;
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>
      <span className={s.severityDot} style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

// ─── Result Badge ─────────────────────────────────────────────────────────────
function ResultBadge({ result }) {
  const m = RESULT_META[result] ?? { label: result, cls: "blue" };
  return <span className={`${s.badge} ${s[`badge_${m.cls}`]}`}>{m.label}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
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

// ─── Activity Feed (mini) ─────────────────────────────────────────────────────
function ActivityFeed({ logs }) {
  if (!logs?.length) return null;
  return (
    <div className={s.activityFeed}>
      <p className={s.feedTitle}>Recent Activity</p>
      {logs.map((log, i) => (
        <div
          key={log.id}
          className={s.feedItem}
          style={{ animationDelay: `${i * 0.03}s` }}
        >
          <SeverityDot severity={log.severity} />
          <Avatar user={log.admin} />
          <div className={s.feedBody}>
            <span className={s.feedAction}>{log.actionLabel}</span>
            <span className={s.feedAdmin}>
              {log.admin?.firstName} {log.admin?.lastName}
            </span>
          </div>
          <span className={s.feedTime}>{timeAgo(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Severity Bar Chart (inline) ──────────────────────────────────────────────
function SeverityBars({ data }) {
  if (!data) return null;
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={s.severityBars}>
      {Object.entries(SEVERITY_META).map(([key, m]) => {
        const count = data[key] ?? 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={key} className={s.severityBar}>
            <div className={s.severityBarTop}>
              <span className={s.severityBarLabel}>{m.label}</span>
              <span className={s.severityBarCount}>{count}</span>
            </div>
            <div className={s.severityBarTrack}>
              <div
                className={s.severityBarFill}
                style={{ width: `${pct}%`, background: m.dot }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Daily Chart (simple bar) ─────────────────────────────────────────────────
function DailyChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.total), 1);
  const last14 = data.slice(-14);
  return (
    <div className={s.chartWrap}>
      <p className={s.chartTitle}>Daily Actions (last {last14.length} days)</p>
      <div className={s.chartBars}>
        {last14.map((d) => (
          <div
            key={d.date}
            className={s.chartBarCol}
            title={`${d.date}: ${d.total} actions`}
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
function DetailDrawer({ log, onClose }) {
  const sev = SEVERITY_META[log.severity] ?? SEVERITY_META.info;
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHandle} />
        <div className={s.drawerHeader}>
          <div>
            <p className={s.drawerEyebrow}>Audit Entry</p>
            <h3 className={s.drawerTitle}>{log.ref}</h3>
          </div>
          <button className={s.drawerClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.drawerBody}>
          {/* Severity hero */}
          <div
            className={s.drawerHero}
            style={{ borderColor: sev.dot + "44", background: sev.dot + "0d" }}
          >
            <span className={s.drawerHeroDot} style={{ background: sev.dot }} />
            <div className={s.drawerHeroText}>
              <p className={s.drawerHeroAction}>{log.actionLabel}</p>
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
              <div>
                <p className={s.drawerAdminName}>
                  {log.admin?.firstName} {log.admin?.lastName}
                </p>
                <p className={s.drawerAdminEmail}>{log.admin?.email}</p>
              </div>
            </div>
          </div>

          {/* Detail grid */}
          <div className={s.detailGrid}>
            {[
              { label: "Action", value: log.action, mono: true },
              { label: "Target Type", value: log.targetType },
              {
                label: "Target ID",
                value: log.targetId?.slice(-12),
                mono: true,
              },
              { label: "Result", value: log.result },
              { label: "Date", value: fmtDate(log.createdAt) },
              { label: "Time", value: fmtTime(log.createdAt) },
              { label: "IP Address", value: log.ipAddress ?? "—", mono: true },
              {
                label: "User Agent",
                value: log.userAgent ? log.userAgent.slice(0, 40) + "…" : "—",
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className={s.detailCell}>
                <span className={s.detailLabel}>{label}</span>
                <span className={`${s.detailVal} ${mono ? s.mono : ""}`}>
                  {value || "—"}
                </span>
              </div>
            ))}
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
              <p className={s.errorBoxLabel}>⚠️ Error</p>
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

// ─── Purge Modal ──────────────────────────────────────────────────────────────
function PurgeModal({ onClose, onSuccess }) {
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePurge() {
    setLoading(true);
    setError("");
    try {
      const res = await api.delete("/audit/purge", {
        data: { olderThanDays: days },
      });
      onSuccess(
        `Purged ${res.data.data.purgedCount} entries older than ${days} days.`,
      );
    } catch (e) {
      setError(e.response?.data?.message || "Purge failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.confirmIcon}>🗑️</div>
        <h3 className={s.confirmTitle}>Purge Old Entries</h3>
        <p className={s.confirmSub}>
          Permanently deletes SUCCESS entries older than the selected number of
          days. FAILED entries are always preserved.
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
          <button className={s.btnGhost} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={s.btnRed} onClick={handlePurge} disabled={loading}>
            {loading ? <span className={s.spinner} /> : "Purge Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, index, onView }) {
  return (
    <div
      className={s.tableRow}
      style={{ animationDelay: `${index * 0.022}s` }}
      onClick={() => onView(log)}
    >
      <div className={s.tdRef}>
        <SeverityDot severity={log.severity} />
        <span className={s.refCode}>{log.ref}</span>
      </div>
      <div className={s.tdAdmin}>
        <Avatar user={log.admin} />
        <div className={s.tdAdminInfo}>
          <span className={s.tdAdminName}>
            {log.admin?.firstName} {log.admin?.lastName}
          </span>
          <span className={s.tdAdminEmail}>{log.admin?.email}</span>
        </div>
      </div>
      <div className={s.tdAction}>
        <span className={s.actionLabel}>{log.actionLabel}</span>
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
        <SeverityBadge severity={log.severity} />
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
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("logs"); // "logs" | "stats"
  const [detailTarget, setDetailTarget] = useState(null);
  const [showPurge, setShowPurge] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const searchTimer = useRef(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load stats once ────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/audit/stats?days=30")
      .then((r) => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Load logs ──────────────────────────────────────────────────────────────
  const loadLogs = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (search.trim()) params.search = search.trim();
        if (filterAction) params.action = filterAction;
        if (filterTarget) params.targetType = filterTarget;
        if (filterSeverity) params.severity = filterSeverity;
        if (filterResult) params.result = filterResult;
        if (filterFrom) params.from = filterFrom;
        if (filterTo) params.to = filterTo;

        const res = await api.get("/audit", { params });
        const d = res.data.data;
        setLogs(d.logs);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);
      } catch {
        showToast("Failed to load audit logs.", "error");
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      filterAction,
      filterTarget,
      filterSeverity,
      filterResult,
      filterFrom,
      filterTo,
    ],
  );

  useEffect(() => {
    loadLogs(1);
  }, [
    filterAction,
    filterTarget,
    filterSeverity,
    filterResult,
    filterFrom,
    filterTo,
  ]);

  function handleSearchChange(e) {
    setSearch(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadLogs(1), 400);
  }

  function clearFilters() {
    setSearch("");
    setFilterAction("");
    setFilterTarget("");
    setFilterSeverity("");
    setFilterResult("");
    setFilterFrom("");
    setFilterTo("");
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams({ limit: 5000 });
      if (filterAction) params.set("action", filterAction);
      if (filterTarget) params.set("targetType", filterTarget);
      if (filterResult) params.set("result", filterResult);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      window.open(`/api/audit/export?${params.toString()}`, "_blank");
    } catch {
      showToast("Export failed.", "error");
    }
  }

  const hasFilters =
    search ||
    filterAction ||
    filterTarget ||
    filterSeverity ||
    filterResult ||
    filterFrom ||
    filterTo;

  return (
    <AdminLayout>
      <div className={s.page}>
        {/* Toast */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            {toast.type === "success" ? "✅" : "❌"} {toast.msg}
          </div>
        )}

        {/* ── Page header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>System</p>
            <h1 className={s.pageTitle}>
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
              ↓ Export CSV
            </button>
            <button className={s.purgeBtn} onClick={() => setShowPurge(true)}>
              🗑️ Purge Old
            </button>
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className={s.viewToggle}>
          <button
            className={`${s.viewTab} ${view === "logs" ? s.viewTabActive : ""}`}
            onClick={() => setView("logs")}
          >
            📋 Log Entries
          </button>
          <button
            className={`${s.viewTab} ${view === "stats" ? s.viewTabActive : ""}`}
            onClick={() => setView("stats")}
          >
            📊 Analytics
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
                icon="📋"
                label="Total Actions (30d)"
                value={stats?.total?.toLocaleString()}
                accent="orange"
                delay={0}
              />
              <StatCard
                icon="✅"
                label="Success Rate"
                value={stats ? `${stats.successRate}%` : "—"}
                accent="green"
                delay={0.05}
              />
              <StatCard
                icon="🚨"
                label="Critical Actions"
                value={stats?.bySeverity?.critical ?? "—"}
                accent="red"
                delay={0.1}
              />
              <StatCard
                icon="⚠️"
                label="Warnings"
                value={stats?.bySeverity?.warning ?? "—"}
                accent="yellow"
                delay={0.15}
              />
            </div>

            <div className={s.statsTwoCol}>
              {/* Daily chart */}
              {statsLoading ? (
                <div className={s.skPanel} />
              ) : (
                <DailyChart data={stats?.dailyActivity} />
              )}

              {/* Severity bars */}
              <div className={s.panel}>
                <p className={s.panelTitle}>Severity Breakdown</p>
                {statsLoading ? (
                  <div className={s.skTier} />
                ) : (
                  <SeverityBars data={stats?.bySeverity} />
                )}
              </div>
            </div>

            {/* Top actions */}
            {!statsLoading && stats?.byAction?.length > 0 && (
              <div className={s.panel}>
                <p className={s.panelTitle}>Top Actions (30d)</p>
                <div className={s.topActions}>
                  {stats.byAction.slice(0, 8).map((a, i) => {
                    const m = SEVERITY_META[a.severity] ?? SEVERITY_META.info;
                    const max = stats.byAction[0]?.count || 1;
                    return (
                      <div key={i} className={s.topActionRow}>
                        <SeverityDot severity={a.severity} />
                        <span className={s.topActionLabel}>{a.label}</span>
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
                <p className={s.panelTitle}>Most Active Admins (30d)</p>
                <div className={s.adminList}>
                  {stats.topAdmins.map((a, i) => (
                    <div key={i} className={s.adminRow}>
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
            {!statsLoading && <ActivityFeed logs={stats?.recentActivity} />}
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
                <span className={s.searchIcon}>🔍</span>
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
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter row */}
              <div className={s.filterRow}>
                <select
                  className={s.select}
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
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
              {/* Head */}
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
                    <span className={s.emptyIcon}>📋</span>
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
                  ← Prev
                </button>
                <span className={s.pageInfo}>
                  Page {page} of {pages}
                </span>
                <button
                  className={s.pageBtn}
                  disabled={page === pages || loading}
                  onClick={() => loadLogs(page + 1)}
                >
                  Next →
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

      {/* Purge modal */}
      {showPurge && (
        <PurgeModal
          onClose={() => setShowPurge(false)}
          onSuccess={(msg) => {
            setShowPurge(false);
            showToast(msg);
            loadLogs(page);
          }}
        />
      )}
    </AdminLayout>
  );
}
