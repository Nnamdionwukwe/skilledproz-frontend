import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminAnalytics.module.css";

import {
  FiArrowLeft,
  FiActivity,
  FiEye,
  FiClock,
  FiMousePointer,
  FiRefreshCw,
} from "react-icons/fi";
import analyticsApi from "../../lib/analytics/analyticsApi";
import {
  fmtNum,
  fmtFull,
  fmtDuration,
  timeAgo,
  fmtDate,
} from "../../lib/analytics/formatUtils";

function StatCard({ icon, label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        {sub && <span className={styles.statSub}>{sub}</span>}
      </div>
      <div className={styles.statValue}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function AdminUserCoverage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    analyticsApi
      .userCoverage(userId)
      .then((r) => setData(r.data.data))
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to load user"),
      )
      .finally(() => setLoading(false));
  }, [userId, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const user = data?.user;
  const insight = data?.insight;

  const recentSessions = data?.recentSessions || [];
  const recentEvents = data?.recentEvents || [];
  const recentPageViews = data?.recentPageViews || [];
  const recentInteractions = data?.recentInteractions || [];
  const segments = insight?.segments || [];

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Link
          to="/admin/analytics"
          className={styles.rowLink}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <FiArrowLeft size={14} /> Back to Analytics
        </Link>

        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>User Coverage</p>
            <h1 className={styles.pageTitle}>
              {user ? `${user.firstName} ${user.lastName}` : "User"}
            </h1>
            {user && (
              <p className={styles.panelSub}>
                {user.email} · {user.role}
              </p>
            )}
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.refreshBtn}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading && (
          <div
            className={styles.skGrid}
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skCard} style={{ height: 100 }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className={styles.panel}>
            <div className={styles.panelBody} style={{ color: "#ef4444" }}>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── Overview cards ── */}
            <div className={styles.statsGrid}>
              <StatCard
                icon={<FiActivity size={16} />}
                label="Engagement Score"
                value={insight?.engagementScore ?? 0}
                sub={
                  (insight?.engagementScore ?? 0) >= 70
                    ? "Power user"
                    : (insight?.engagementScore ?? 0) >= 40
                      ? "Active"
                      : "Low"
                }
              />
              <StatCard
                icon={<FiClock size={16} />}
                label="Total Sessions"
                value={fmtFull(insight?.totalSessions ?? 0)}
                sub={
                  insight?.lastActiveAt
                    ? timeAgo(insight.lastActiveAt)
                    : "never"
                }
              />
              <StatCard
                icon={<FiEye size={16} />}
                label="Page Views"
                value={fmtNum(insight?.totalPageViews ?? 0)}
              />
              <StatCard
                icon={<FiMousePointer size={16} />}
                label="Events Tracked"
                value={fmtNum(insight?.totalEventsCount ?? 0)}
              />
              <StatCard
                icon={<FiClock size={16} />}
                label="Time on Platform"
                value={fmtDuration(insight?.totalTimeOnPlatform)}
              />
              <StatCard
                icon={<FiActivity size={16} />}
                label="Avg Session"
                value={fmtDuration(insight?.avgSessionDurationMs)}
              />
              <StatCard
                icon={<FiActivity size={16} />}
                label="Feature Adoption"
                value={`${Math.round(insight?.featureAdoptionPct ?? 0)}%`}
              />
              <StatCard
                icon={<FiActivity size={16} />}
                label="Bounce Rate"
                value={`${Math.round((insight?.bounceRate ?? 0) * 100)}%`}
              />
            </div>

            {/* ── Segments ── */}
            {segments.length > 0 && (
              <div className={styles.panel} style={{ marginBottom: 24 }}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Segments</h3>
                  <p className={styles.panelSub}>
                    This user belongs to {segments.length} segment(s)
                  </p>
                </div>
                <div
                  className={styles.panelBody}
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {segments.map((s) => (
                    <span
                      key={s}
                      className={`${styles.pill} ${styles.pillOrange}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent sessions ── */}
            <div className={styles.twoCol}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Recent Sessions</h3>
                  <p className={styles.panelSub}>
                    Last {recentSessions.length} browser sessions
                  </p>
                </div>
                <div className={styles.panelBody} style={{ padding: 0 }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Started</th>
                        <th>Duration</th>
                        <th>Events</th>
                        <th>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className={styles.noData}>
                            No sessions yet
                          </td>
                        </tr>
                      )}
                      {recentSessions.map((s) => (
                        <tr key={s.id}>
                          <td>{fmtDate(s.startedAt)}</td>
                          <td>{fmtDuration(s.durationMs)}</td>
                          <td>{s.eventsCount}</td>
                          <td>
                            <span className={styles.pill}>
                              {s.deviceType || "unknown"} · {s.os || "?"} ·{" "}
                              {s.browser || "?"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Recent events ── */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Recent Events</h3>
                  <p className={styles.panelSub}>
                    Last {recentEvents.length} events
                  </p>
                </div>
                <div
                  className={styles.panelBody}
                  style={{ padding: 0, maxHeight: 500, overflowY: "auto" }}
                >
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Page</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.length === 0 && (
                        <tr>
                          <td colSpan={3} className={styles.noData}>
                            No events yet
                          </td>
                        </tr>
                      )}
                      {recentEvents.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <span className={styles.pillOrange}>
                              {e.eventName}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: "#888" }}>
                            {e.pageRef || "—"}
                          </td>
                          <td style={{ fontSize: 11, color: "#888" }}>
                            {timeAgo(e.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Recent page views ── */}
            <div className={styles.panel} style={{ marginBottom: 24 }}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Pages Visited</h3>
                <p className={styles.panelSub}>
                  Last {recentPageViews.length} page views
                </p>
              </div>
              <div
                className={styles.panelBody}
                style={{ padding: 0, maxHeight: 400, overflowY: "auto" }}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Ref</th>
                      <th>Duration</th>
                      <th>Scroll</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPageViews.length === 0 && (
                      <tr>
                        <td colSpan={5} className={styles.noData}>
                          No page views yet
                        </td>
                      </tr>
                    )}
                    {recentPageViews.map((pv) => (
                      <tr key={pv.id}>
                        <td style={{ fontSize: 12 }}>{pv.pagePath}</td>
                        <td style={{ fontSize: 11, color: "#888" }}>
                          {pv.pageRef}
                        </td>
                        <td>
                          {pv.durationMs ? fmtDuration(pv.durationMs) : "—"}
                        </td>
                        <td>
                          {pv.scrollDepthPct != null
                            ? `${pv.scrollDepthPct}%`
                            : "—"}
                        </td>
                        <td style={{ fontSize: 11, color: "#888" }}>
                          {timeAgo(pv.enteredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Recent interactions ── */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Interactions</h3>
                <p className={styles.panelSub}>
                  Last {recentInteractions.length} clicks and interactions
                </p>
              </div>
              <div
                className={styles.panelBody}
                style={{ padding: 0, maxHeight: 400, overflowY: "auto" }}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Element</th>
                      <th>Type</th>
                      <th>Action</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInteractions.length === 0 && (
                      <tr>
                        <td colSpan={4} className={styles.noData}>
                          No interactions yet
                        </td>
                      </tr>
                    )}
                    {recentInteractions.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <span className={styles.pill}>{it.elementId}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>{it.elementType}</td>
                        <td style={{ fontSize: 12 }}>{it.action}</td>
                        <td style={{ fontSize: 11, color: "#888" }}>
                          {timeAgo(it.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
