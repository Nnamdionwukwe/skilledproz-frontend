import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtFull } from "../../lib/analytics/formatUtils";
import styles from "./AdminAnalytics.module.css";

import {
  FiSearch,
  FiUsers,
  FiBriefcase,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiFilter,
  FiTag,
  FiTrendingUp,
  FiActivity,
  FiInfo,
} from "react-icons/fi";

const DATE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const SORT_OPTIONS = [
  { value: "demand", label: "Demand" },
  { value: "gap", label: "Opportunity gap" },
  { value: "bookings", label: "Bookings" },
  { value: "supply", label: "Supply" },
];

const FLAG_FILTERS = [
  { value: "all", label: "All categories" },
  { value: "supply_gap", label: "Supply gaps" },
  { value: "oversupplied", label: "Oversupplied" },
  { value: "dormant", label: "Dormant" },
];

const FLAG_META = {
  supply_gap: {
    label: "Supply gap",
    color: "red",
    icon: FiAlertTriangle,
    hint: "High demand, low/no supply — recruit workers here",
  },
  oversupplied: {
    label: "Oversupplied",
    color: "amber",
    icon: FiInfo,
    hint: "Many workers, little demand — reduce promotion",
  },
  dormant: {
    label: "Dormant",
    color: "dim",
    icon: FiInfo,
    hint: "No demand, no supply — consider removing or renaming",
  },
  balanced: {
    label: "Balanced",
    color: "green",
    icon: FiCheckCircle,
    hint: "Supply matches demand",
  },
};

function SummaryCard({ icon, label, value, sub, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function FlagPill({ flag }) {
  const meta = FLAG_META[flag] || FLAG_META.balanced;
  const Icon = meta.icon;
  return (
    <span
      className={`${styles.pill} ${styles[`pill${meta.color === "amber" ? "" : meta.color.charAt(0).toUpperCase() + meta.color.slice(1)}`]}`}
      title={meta.hint}
      style={
        meta.color === "amber"
          ? {
              background: "rgba(234,179,8,0.12)",
              color: "#ca8a04",
              border: "1px solid rgba(234,179,8,0.25)",
            }
          : undefined
      }
    >
      <Icon size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
      {meta.label}
    </span>
  );
}

export default function AdminCategoryDemand() {
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState("demand");
  const [flagFilter, setFlagFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      days: String(days),
      sortBy,
      limit: "500",
    });
    analyticsApi
      .categoryDemand(params.toString())
      .then((res) => setData(res.data.data))
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load category demand",
        );
      })
      .finally(() => setLoading(false));
  }, [days, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side filter (search + flag) applied on top of server results
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.filter((c) => {
      if (flagFilter !== "all" && c.flag !== flagFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, flagFilter, searchQuery]);

  const summary = data?.summary;

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Analytics</p>
            <h1 className={styles.pageTitle}>Category Demand</h1>
            <p className={styles.panelSub}>
              Search demand vs worker supply — find where to invest and where to
              prune.
            </p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.rangeGroup}>
              {DATE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  className={`${styles.rangeBtn} ${days === d.value ? styles.rangeBtnActive : ""}`}
                  onClick={() => setDays(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              className={styles.refreshBtn}
              onClick={load}
              disabled={loading}
              title="Refresh"
            >
              <FiRefreshCw size={14} style={{ opacity: loading ? 0.5 : 1 }} />
            </button>
          </div>
        </div>

        {/* Warning about unmatched demand */}
        {data && data.unmatchedDemandEvents > 0 && (
          <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div
                className={styles.funnelError}
                style={{
                  background: "rgba(234,179,8,0.08)",
                  borderColor: "rgba(234,179,8,0.25)",
                  color: "#ca8a04",
                }}
              >
                <FiInfo size={16} />
                <span>
                  <strong>Note:</strong> {data.unmatchedDemandEvents} demand
                  event{data.unmatchedDemandEvents !== 1 ? "s" : ""} couldn't be
                  matched to a category (missing <code>categoryId</code> /{" "}
                  <code>categorySlug</code> / <code>categoryName</code> in the
                  event payload). Totals may be slightly undercounted.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className={styles.statsGrid}>
            <SummaryCard
              icon={<FiSearch size={16} />}
              label="Total demand events"
              value={fmtFull(summary.totalSearches)}
              sub={data.window}
            />
            <SummaryCard
              icon={<FiTag size={16} />}
              label="Categories tracked"
              value={`${summary.trackedCategories}/${summary.totalCategories}`}
              sub="with demand in window"
            />
            <SummaryCard
              icon={<FiAlertTriangle size={16} />}
              label="Supply gaps"
              value={fmtFull(summary.supplyGaps)}
              sub="High demand · low supply"
              accent={summary.supplyGaps > 0 ? "red" : undefined}
            />
            <SummaryCard
              icon={<FiInfo size={16} />}
              label="Oversupplied"
              value={fmtFull(summary.oversupplied)}
              sub="Low demand · many workers"
              accent={summary.oversupplied > 0 ? "amber" : undefined}
            />
            <SummaryCard
              icon={<FiUsers size={16} />}
              label="Total workers"
              value={fmtFull(summary.totalWorkers)}
            />
            <SummaryCard
              icon={<FiCheckCircle size={16} />}
              label="Bookings"
              value={fmtFull(summary.totalBookings)}
              accent="green"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div className={styles.funnelError}>
                <FiAlertTriangle size={16} />
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.panel}>
          <div className={styles.panelBody}>
            <div className={styles.funnelControls}>
              <div className={styles.funnelControlGroup}>
                <span className={styles.funnelControlLabel}>Sort by</span>
                <div className={styles.rangeGroup}>
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      className={`${styles.rangeBtn} ${sortBy === o.value ? styles.rangeBtnActive : ""}`}
                      onClick={() => setSortBy(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.funnelControlGroup}>
                <span className={styles.funnelControlLabel}>Filter</span>
                <div className={styles.rangeGroup}>
                  {FLAG_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`${styles.rangeBtn} ${flagFilter === f.value ? styles.rangeBtnActive : ""}`}
                      onClick={() => setFlagFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.funnelControlGroupEnd}>
                <div className={styles.searchWrap}>
                  <FiSearch size={13} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Categories</h3>
            <p className={styles.panelSub}>
              {data
                ? `${filteredCategories.length} of ${data.categories.length} · ${data.window}`
                : "Loading…"}
            </p>
          </div>

          {loading && !data && (
            <div className={styles.panelBody}>
              <div className={styles.funnelSkeleton}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={styles.funnelSkeletonRow}
                    style={{ height: 52, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {data && filteredCategories.length === 0 && (
            <div className={styles.panelBody}>
              <div className={styles.noData}>
                No categories match the current filter.
              </div>
            </div>
          )}

          {data && filteredCategories.length > 0 && (
            <div className={styles.panelBody} style={{ padding: 0 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Category</th>
                    <th className={styles.numCell}>Demand</th>
                    <th className={styles.numCell}>Unique users</th>
                    <th className={styles.numCell}>Workers</th>
                    <th className={styles.numCell}>Jobs</th>
                    <th className={styles.numCell}>Bookings</th>
                    <th className={styles.numCell}>Demand / worker</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c, i) => (
                    <tr key={c.id}>
                      <td>
                        <span className={styles.rankBadge}>{i + 1}</span>
                      </td>
                      <td>
                        <div className={styles.userCell}>
                          <div
                            className={styles.userAvatar}
                            style={{
                              fontSize: 14,
                              background: "var(--orange-dim)",
                            }}
                          >
                            {c.icon || "🔧"}
                          </div>
                          <div>
                            <div className={styles.userName}>
                              {c.name}
                              {c.isUserSubmitted && (
                                <span
                                  className={styles.pill}
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    padding: "1px 5px",
                                  }}
                                >
                                  User suggested
                                </span>
                              )}
                            </div>
                            {c.parent && (
                              <div className={styles.userEmail}>
                                ↳ {c.parent.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={styles.numCell}>
                        <strong
                          style={{
                            color:
                              c.demandScore >= 5
                                ? "var(--orange)"
                                : c.demandScore > 0
                                  ? "var(--text)"
                                  : "var(--text-muted)",
                          }}
                        >
                          {fmtFull(c.demandScore)}
                        </strong>
                      </td>
                      <td className={styles.numCell}>
                        {c.uniqueInterestedUsers}
                      </td>
                      <td className={styles.numCell}>
                        <span
                          className={`${styles.pill} ${c.workers === 0 && c.demandScore > 0 ? styles.pillRed : ""}`}
                        >
                          {c.workers}
                        </span>
                      </td>
                      <td className={styles.numCell}>{c.jobPosts}</td>
                      <td className={styles.numCell}>
                        <span
                          className={`${styles.pill} ${c.totalBookings > 0 ? styles.pillGreen : ""}`}
                        >
                          {c.totalBookings}
                        </span>
                      </td>
                      <td className={styles.numCell}>
                        {c.workers > 0 ? (
                          <span
                            style={{
                              color:
                                c.demandPerWorker >= 2
                                  ? "var(--red)"
                                  : c.demandPerWorker >= 1
                                    ? "var(--orange)"
                                    : "var(--text-dim)",
                              fontWeight: 700,
                            }}
                          >
                            {c.demandPerWorker.toFixed(1)}
                          </span>
                        ) : c.demandScore > 0 ? (
                          <span
                            style={{ color: "var(--red)", fontWeight: 700 }}
                          >
                            ∞
                          </span>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>
                      <td>
                        <FlagPill flag={c.flag} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>How to read this</h3>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.demandLegend}>
              <div className={styles.demandLegendItem}>
                <span
                  className={styles.pill}
                  style={{
                    background: "var(--red-dim)",
                    color: "var(--red)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  Supply gap
                </span>
                <span>
                  People are searching, but you have no workers — highest
                  priority to fill
                </span>
              </div>
              <div className={styles.demandLegendItem}>
                <span
                  className={styles.pill}
                  style={{
                    background: "rgba(234,179,8,0.12)",
                    color: "#ca8a04",
                    border: "1px solid rgba(234,179,8,0.25)",
                  }}
                >
                  Oversupplied
                </span>
                <span>
                  Many workers, few searches — deprioritize promotion, maybe
                  consolidate
                </span>
              </div>
              <div className={styles.demandLegendItem}>
                <span className={styles.pill}>Dormant</span>
                <span>
                  No demand and no supply — consider removing or renaming
                </span>
              </div>
              <div className={styles.demandLegendItem}>
                <span
                  className={styles.pill}
                  style={{
                    background: "var(--green-dim)",
                    color: "var(--green)",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  Balanced
                </span>
                <span>Healthy mix of demand and supply</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
