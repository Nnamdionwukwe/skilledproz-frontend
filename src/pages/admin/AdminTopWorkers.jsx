import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtNum, fmtFull, timeAgo } from "../../lib/analytics/formatUtils";
import styles from "./AdminAnalytics.module.css";

import {
  FiUsers,
  FiEye,
  FiMousePointer,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiMapPin,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

const SORT_OPTIONS = [
  { value: "bookings", label: "Bookings" },
  { value: "views", label: "Profile views" },
  { value: "bookIntent", label: "Book intent" },
  { value: "conversion", label: "Conversion rate" },
  { value: "earnings", label: "Earnings" },
  { value: "rating", label: "Rating" },
];

const DATE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const VERIFIED_OPTIONS = [
  { value: false, label: "All workers" },
  { value: true, label: "Verified only" },
];

function fmtCurrency(n, currency = "₦") {
  if (n == null) return "—";
  return `${currency} ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

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

export default function AdminTopWorkers() {
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState("bookings");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      days: String(days),
      sortBy,
      verifiedOnly: String(verifiedOnly),
      limit: "100",
    });

    analyticsApi
      .topWorkers(params.toString())
      .then((res) => setData(res.data.data))
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load top workers");
      })
      .finally(() => setLoading(false));
  }, [days, sortBy, verifiedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const workers = data?.workers || [];

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Analytics</p>
            <h1 className={styles.pageTitle}>Top Workers</h1>
            <p className={styles.panelSub}>
              Ranked by real activity — profile views, book intent, and
              completed bookings.
            </p>
          </div>
          <div className={styles.headerRight}>
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

        {/* Filters */}
        <div className={styles.panel}>
          <div className={styles.panelBody}>
            <div className={styles.funnelControls}>
              <div className={styles.funnelControlGroup}>
                <span className={styles.funnelControlLabel}>Window</span>
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
              </div>

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
                <span className={styles.funnelControlLabel}>Status</span>
                <div className={styles.rangeGroup}>
                  {VERIFIED_OPTIONS.map((v) => (
                    <button
                      key={String(v.value)}
                      className={`${styles.rangeBtn} ${verifiedOnly === v.value ? styles.rangeBtnActive : ""}`}
                      onClick={() => setVerifiedOnly(v.value)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className={styles.statsGrid}>
            <SummaryCard
              icon={<FiUsers size={16} />}
              label="Workers tracked"
              value={fmtFull(summary.totalWorkers)}
              sub={data.window}
            />
            <SummaryCard
              icon={<FiEye size={16} />}
              label="Profile views"
              value={fmtNum(summary.totalViews)}
            />
            <SummaryCard
              icon={<FiMousePointer size={16} />}
              label="Book intent"
              value={fmtNum(summary.totalIntent)}
              sub={`${summary.overallConversion}% of views`}
            />
            <SummaryCard
              icon={<FiCheckCircle size={16} />}
              label="Bookings completed"
              value={fmtFull(summary.totalBookings)}
              accent="green"
            />
            <SummaryCard
              icon={<FiZap size={16} />}
              label="Earnings (window)"
              value={fmtCurrency(summary.totalEarnings)}
              accent="orange"
            />
            <SummaryCard
              icon={<FiAlertTriangle size={16} />}
              label="Dead profiles"
              value={fmtFull(summary.deadProfiles)}
              sub="High views, low conversion"
              accent={summary.deadProfiles > 0 ? "red" : undefined}
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

        {/* Table */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Leaderboard</h3>
            <p className={styles.panelSub}>
              {data ? `${workers.length} workers · ${data.window}` : "Loading…"}
            </p>
          </div>

          {loading && !data && (
            <div className={styles.panelBody}>
              <div className={styles.funnelSkeleton}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={styles.funnelSkeletonRow}
                    style={{ height: 56, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {data && workers.length === 0 && (
            <div className={styles.panelBody}>
              <div className={styles.noData}>
                No worker activity in this window yet. Once workers start
                receiving profile views, they'll appear here.
              </div>
            </div>
          )}

          {data && workers.length > 0 && (
            <div className={styles.panelBody} style={{ padding: 0 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Worker</th>
                    <th>Category</th>
                    <th className={styles.numCell}>Views</th>
                    <th className={styles.numCell}>Intent</th>
                    <th className={styles.numCell}>Conv.</th>
                    <th className={styles.numCell}>Bookings</th>
                    <th className={styles.numCell}>Earnings</th>
                    <th className={styles.numCell}>Rating</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w, i) => (
                    <tr key={w.id}>
                      <td>
                        <span className={styles.rankBadge}>
                          {i === 0
                            ? "🥇"
                            : i === 1
                              ? "🥈"
                              : i === 2
                                ? "🥉"
                                : i + 1}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/analytics/user/${w.id}`}
                          className={styles.userCell}
                          style={{ textDecoration: "none" }}
                        >
                          <div className={styles.userAvatar}>
                            {w.avatar ? (
                              <img src={w.avatar} alt="" />
                            ) : (
                              `${w.firstName?.[0] || ""}${w.lastName?.[0] || ""}`
                            )}
                          </div>
                          <div>
                            <div className={styles.userName}>
                              {w.firstName} {w.lastName}
                              {w.verificationStatus === "VERIFIED" && (
                                <FiCheckCircle
                                  size={12}
                                  style={{
                                    marginLeft: 4,
                                    verticalAlign: -1,
                                    color: "var(--green)",
                                  }}
                                />
                              )}
                            </div>
                            <div className={styles.userEmail}>
                              {w.title || "—"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {w.primaryCategory ? (
                          <span className={styles.pill}>
                            {w.primaryCategory.icon} {w.primaryCategory.name}
                          </span>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>
                      <td className={styles.numCell}>{fmtFull(w.views)}</td>
                      <td className={styles.numCell}>
                        {fmtFull(w.bookIntent)}
                      </td>
                      <td className={styles.numCell}>
                        <span
                          className={`${styles.pill} ${
                            w.isDeadProfile
                              ? styles.pillRed
                              : w.conversion >= 10
                                ? styles.pillGreen
                                : styles.pill
                          }`}
                        >
                          {w.conversion.toFixed(1)}%
                        </span>
                      </td>
                      <td className={styles.numCell}>
                        <span
                          className={`${styles.pill} ${w.bookingsCompleted > 0 ? styles.pillGreen : ""}`}
                        >
                          {w.bookingsCompleted}
                        </span>
                      </td>
                      <td className={styles.numCell}>
                        {w.earnings > 0 ? (
                          fmtCurrency(w.earnings)
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>
                      <td className={styles.numCell}>
                        {w.avgRating > 0 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <FiStar size={11} style={{ color: "#fbbf24" }} />
                            {w.avgRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {w.lastSeen ? timeAgo(w.lastSeen) : "never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
