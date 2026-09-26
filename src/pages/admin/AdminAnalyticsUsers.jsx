import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminAnalytics.module.css";

import {
  FiUsers,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtFull, fmtDuration, timeAgo } from "../../lib/analytics/formatUtils";

const SORT_OPTIONS = [
  { value: "engagementScore", label: "Engagement" },
  { value: "lastActiveAt", label: "Last Active" },
  { value: "totalSessions", label: "Sessions" },
  { value: "totalTimeOnPlatform", label: "Time on Platform" },
];

export default function AdminAnalyticsUsers() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const page = parseInt(params.get("page") || "1", 10);
  const segment = params.get("segment") || "";
  const sortBy = params.get("sortBy") || "engagementScore";
  const minScore = params.get("minScore") || "";

  const load = useCallback(() => {
    setLoading(true);
    analyticsApi
      .listUsers({ page, segment, sortBy, minScore })
      .then((r) => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, segment, sortBy, minScore]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const users = data?.users || [];
  const totalUsers = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Coverage</p>
            <h1 className={styles.pageTitle}>User Insights</h1>
          </div>
          <div className={styles.headerRight}>
            <select
              value={sortBy}
              onChange={(e) => setParam("sortBy", e.target.value)}
              className={styles.rangeBtn}
              style={{ padding: "8px 12px" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Min score"
              value={minScore}
              onChange={(e) => setParam("minScore", e.target.value)}
              className={styles.rangeBtn}
              style={{ padding: "8px 12px", width: 110 }}
            />
            <button className={styles.refreshBtn} onClick={load}>
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className={styles.skGrid} style={{ gridTemplateColumns: "1fr" }}>
            <div className={styles.skCard} style={{ height: 500 }} />
          </div>
        )}

        {data && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Users with Insights</h3>
              <p className={styles.panelSub}>
                {fmtFull(totalUsers)} user(s) · sorted by {sortBy}
              </p>
            </div>
            <div className={styles.panelBody} style={{ padding: 0 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Score</th>
                    <th>Sessions</th>
                    <th>Page Views</th>
                    <th>Time</th>
                    <th>Segments</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.noData}>
                        No insights yet. Run the aggregation job to populate.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const segments = u.segments || [];
                    const userObj = u.user || {};
                    return (
                      <tr key={u.id}>
                        <td>
                          <Link
                            to={`/admin/analytics/user/${userObj.id}`}
                            className={styles.userCell}
                            style={{ textDecoration: "none" }}
                          >
                            <div className={styles.userAvatar}>
                              {userObj.avatar ? (
                                <img src={userObj.avatar} alt="" />
                              ) : (
                                `${userObj.firstName?.[0] || ""}${userObj.lastName?.[0] || ""}`
                              )}
                            </div>
                            <div>
                              <div className={styles.userName}>
                                {userObj.firstName} {userObj.lastName}
                              </div>
                              <div className={styles.userEmail}>
                                {userObj.email}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <span className={styles.scoreBar}>
                            <span
                              className={styles.scoreBarFill}
                              style={{
                                width: `${u.engagementScore ?? 0}%`,
                              }}
                            />
                          </span>
                          <strong>{u.engagementScore ?? 0}</strong>
                        </td>
                        <td>{fmtFull(u.totalSessions ?? 0)}</td>
                        <td>{fmtFull(u.totalPageViews ?? 0)}</td>
                        <td>{fmtDuration(u.totalTimeOnPlatform)}</td>
                        <td>
                          {segments.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className={styles.pillOrange}
                              style={{ marginRight: 4 }}
                            >
                              {s}
                            </span>
                          ))}
                          {segments.length > 2 && (
                            <span className={styles.pill}>
                              +{segments.length - 2}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: "#888" }}>
                          {timeAgo(u.lastActiveAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setParam("page", String(page - 1))}
                >
                  <FiChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setParam("page", String(page + 1))}
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
