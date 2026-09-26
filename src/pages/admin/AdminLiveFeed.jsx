import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { timeAgo, fmtFull } from "../../lib/analytics/formatUtils";
import styles from "./AdminAnalytics.module.css";

import { FiRadio, FiRefreshCw, FiUsers } from "react-icons/fi";
import analyticsApi from "../../lib/analytics/analyticsApi";

const WINDOW_OPTIONS = [5, 15, 30, 60];

export default function AdminLiveFeed() {
  const [minutes, setMinutes] = useState(15);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    analyticsApi
      .live(minutes)
      .then((r) => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, load]);

  const events = data?.events || [];
  const activeSessions = data?.activeSessions ?? 0;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Real-Time</p>
            <h1 className={styles.pageTitle}>Live Activity Feed</h1>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.rangeGroup}>
              {WINDOW_OPTIONS.map((m) => (
                <button
                  key={m}
                  className={`${styles.rangeBtn} ${minutes === m ? styles.rangeBtnActive : ""}`}
                  onClick={() => setMinutes(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
            <button
              className={styles.refreshBtn}
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
            >
              <FiRefreshCw
                size={16}
                style={{ opacity: autoRefresh ? 1 : 0.4 }}
              />
            </button>
            {autoRefresh && (
              <div className={styles.liveTag}>
                <FiRadio size={10} /> Live
              </div>
            )}
          </div>
        </div>

        {loading && !data && (
          <div className={styles.skGrid} style={{ gridTemplateColumns: "1fr" }}>
            <div className={styles.skCard} style={{ height: 400 }} />
          </div>
        )}

        {data && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statTop}>
                  <span className={styles.statIcon}>
                    <FiUsers size={16} />
                  </span>
                </div>
                <div className={styles.statValue}>
                  {fmtFull(activeSessions)}
                </div>
                <div className={styles.statLabel}>Active Sessions</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statTop}>
                  <span className={styles.statIcon}>
                    <FiRadio size={16} />
                  </span>
                </div>
                <div className={styles.statValue}>{events.length}</div>
                <div className={styles.statLabel}>Events in Window</div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Event Stream</h3>
                <p className={styles.panelSub}>
                  Last {minutes} minutes · auto-refreshing every 5s
                </p>
              </div>
              <div className={styles.panelBody}>
                {events.length === 0 ? (
                  <div className={styles.noData}>No events in this window</div>
                ) : (
                  <div className={styles.feedList}>
                    {events.map((e) => (
                      <div key={e.id} className={styles.feedItem}>
                        <span className={styles.feedItemTime}>
                          {timeAgo(e.createdAt)}
                        </span>
                        <span className={styles.feedItemEvent}>
                          {e.eventName}
                        </span>
                        <span className={styles.feedItemUser}>
                          {e.user ? (
                            <Link
                              to={`/admin/analytics/user/${e.user.id}`}
                              className={styles.rowLink}
                            >
                              {e.user.firstName} {e.user.lastName}
                            </Link>
                          ) : (
                            <span style={{ color: "#888" }}>anonymous</span>
                          )}
                        </span>
                        <span className={styles.feedItemMeta}>
                          {e.pageRef || ""}
                          {e.deviceType && ` · ${e.deviceType}`}
                          {e.browser && ` · ${e.browser}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
