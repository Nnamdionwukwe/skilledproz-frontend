import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

function StatCard({ label, value, sub, icon, accent, delay = 0 }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statValue}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, label }) {
  if (!data || !Object.keys(data).length)
    return <div className={styles.noData}>No data yet</div>;
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className={styles.barChart}>
      {entries.map(([key, val]) => (
        <div key={key} className={styles.barGroup}>
          <div className={styles.barWrap}>
            <div
              className={styles.bar}
              style={{ height: `${Math.max(4, (val / max) * 120)}px` }}
              title={`${key}: ${val}`}
            />
          </div>
          <div className={styles.barLabel}>{key.slice(5)}</div>
          <div className={styles.barVal}>
            {val > 999 ? `${(val / 1000).toFixed(1)}k` : val}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryTable({ categories }) {
  if (!categories?.length)
    return <div className={styles.noData}>No categories</div>;
  return (
    <div className={styles.catTable}>
      {categories.map((c, i) => (
        <div
          key={c.id}
          className={styles.catRow}
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className={styles.catRank}>#{i + 1}</div>
          <div className={styles.catInfo}>
            <span className={styles.catIcon}>{c.icon || "🔧"}</span>
            <span className={styles.catName}>{c.name}</span>
          </div>
          <div className={styles.catStats}>
            <span className={styles.catBadge}>
              {c._count?.bookings || 0} bookings
            </span>
            <span className={styles.catBadgeDim}>
              {c._count?.workers || 0} workers
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => {
        setData(r.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const ov = data?.overview || {};
  const fmtCurrency = (n) =>
    `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Platform</p>
            <h1 className={styles.pageTitle}>Analytics</h1>
          </div>
          <div className={styles.liveTag}>● Live</div>
        </div>

        {loading ? (
          <div className={styles.skGrid}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className={styles.statsGrid}>
              <StatCard
                label="Total Users"
                value={ov.totalUsers?.toLocaleString()}
                icon="👥"
                delay={0}
              />
              <StatCard
                label="Workers"
                value={ov.totalWorkers?.toLocaleString()}
                icon="🔨"
                delay={0.04}
              />
              <StatCard
                label="Hirers"
                value={ov.totalHirers?.toLocaleString()}
                icon="🏢"
                delay={0.08}
              />
              <StatCard
                label="Total Bookings"
                value={ov.totalBookings?.toLocaleString()}
                icon="📋"
                delay={0.12}
              />
              <StatCard
                label="Active Jobs"
                value={ov.activeBookings?.toLocaleString()}
                icon="⚡"
                accent="orange"
                delay={0.16}
              />
              <StatCard
                label="Completed"
                value={ov.completedBookings?.toLocaleString()}
                icon="✅"
                accent="green"
                delay={0.2}
              />
              <StatCard
                label="Disputes"
                value={ov.disputedBookings?.toLocaleString()}
                icon="⚖️"
                accent="red"
                delay={0.24}
              />
              <StatCard
                label="Platform Revenue"
                value={fmtCurrency(ov.totalRevenue)}
                icon="💰"
                accent="orange"
                sub="from fees"
                delay={0.28}
              />
              <StatCard
                label="New Users Today"
                value={ov.newUsersToday}
                icon="🆕"
                delay={0.32}
              />
              <StatCard
                label="Bookings Today"
                value={ov.newBookingsToday}
                icon="📅"
                delay={0.36}
              />
              <StatCard
                label="Categories"
                value={ov.totalCategories}
                icon="🔧"
                delay={0.4}
              />
            </div>

            <div className={styles.twoCol}>
              {/* Monthly revenue chart */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>
                    Monthly Revenue (Last 6 months)
                  </h3>
                </div>
                <div className={styles.panelBody}>
                  <BarChart data={data?.monthlyRevenue} />
                </div>
              </div>

              {/* Top categories */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Top Categories</h3>
                </div>
                <div className={styles.panelBody}>
                  <CategoryTable categories={data?.topCategories} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
