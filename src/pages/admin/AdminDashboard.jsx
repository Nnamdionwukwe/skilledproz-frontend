import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminDashboard.module.css";

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function StatCard({ label, value, sub, icon, accent, link }) {
  const card = (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
  return link ? (
    <Link to={link} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  ) : (
    card
  );
}

function Badge({ status }) {
  const map = {
    PENDING: { cls: "pending", label: "Pending" },
    ACCEPTED: { cls: "accepted", label: "Accepted" },
    IN_PROGRESS: { cls: "active", label: "In Progress" },
    COMPLETED: { cls: "completed", label: "Completed" },
    CANCELLED: { cls: "cancelled", label: "Cancelled" },
    DISPUTED: { cls: "disputed", label: "Disputed" },
  };
  const s = map[status] || { cls: "pending", label: status };
  return <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [topCategories, setTopCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/bookings?page=1&limit=5"),
      api.get("/admin/disputes"),
    ])
      .then(([statsRes, bookingsRes, disputesRes]) => {
        setStats(statsRes.data.data);
        setRecentBookings(bookingsRes.data.data?.bookings || []);
        setDisputes(disputesRes.data.data?.disputes || []);
        setTopCategories(statsRes.data.data?.topCategories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const o = stats?.overview;

  // Monthly revenue for mini chart
  const revenueEntries = Object.entries(stats?.monthlyRevenue || {}).sort();
  const maxRevenue = Math.max(...revenueEntries.map(([, v]) => v), 1);

  if (loading)
    return (
      <AdminLayout>
        <div className={styles.skGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skeleton} style={{ height: 100 }} />
          ))}
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Alert banner for disputes ── */}
        {o?.disputedBookings > 0 && (
          <Link to="/admin/disputes" className={styles.alertBanner}>
            <span>⚠️</span>
            <span>
              {o.disputedBookings} active dispute
              {o.disputedBookings !== 1 ? "s" : ""} require your attention
            </span>
            <span className={styles.alertArrow}>→</span>
          </Link>
        )}

        {/* ── Stats grid ── */}
        <div className={styles.statsGrid}>
          <StatCard
            icon="👥"
            label="Total Users"
            value={fmt(o?.totalUsers)}
            sub={`+${o?.newUsersToday} today`}
            accent="orange"
            link="/admin/users"
          />
          <StatCard
            icon="🔨"
            label="Workers"
            value={fmt(o?.totalWorkers)}
            sub="Registered"
            link="/admin/users?role=WORKER"
          />
          <StatCard
            icon="🏢"
            label="Hirers"
            value={fmt(o?.totalHirers)}
            sub="Registered"
            link="/admin/users?role=HIRER"
          />
          <StatCard
            icon="📋"
            label="Total Bookings"
            value={fmt(o?.totalBookings)}
            sub={`${o?.activeBookings} active`}
            link="/admin/bookings"
          />
          <StatCard
            icon="✅"
            label="Completed"
            value={fmt(o?.completedBookings)}
            sub="Jobs done"
            accent="green"
          />
          <StatCard
            icon="💰"
            label="Platform Revenue"
            value={fmt(o?.totalRevenue, "₦")}
            sub="All time"
            accent="orange"
            link="/admin/payments"
          />
        </div>

        <div className={styles.twoCol}>
          {/* ── Revenue chart ── */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Revenue (6 months)</h2>
            </div>
            {revenueEntries.length === 0 ? (
              <div className={styles.empty}>
                <span>📊</span>
                <p>No revenue data yet</p>
              </div>
            ) : (
              <div className={styles.barChart}>
                {revenueEntries.map(([month, value]) => (
                  <div key={month} className={styles.barWrap}>
                    <div className={styles.barLabel}>{month.slice(5)}</div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ height: `${(value / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <div className={styles.barValue}>₦{fmt(value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Top categories ── */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Top Categories</h2>
              <Link to="/admin/categories" className={styles.panelLink}>
                Manage →
              </Link>
            </div>
            {topCategories.slice(0, 6).map((cat, i) => (
              <div key={cat.id} className={styles.catRow}>
                <span className={styles.catRank}>#{i + 1}</span>
                <span className={styles.catIcon}>{cat.icon || "🔧"}</span>
                <div className={styles.catInfo}>
                  <span className={styles.catName}>{cat.name}</span>
                  <div className={styles.catBar}>
                    <div
                      className={styles.catBarFill}
                      style={{
                        width: `${Math.min(100, (cat._count.bookings / (topCategories[0]?._count.bookings || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className={styles.catCount}>
                  {cat._count.bookings} bookings
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.twoCol}>
          {/* ── Recent bookings ── */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recent Bookings</h2>
              <Link to="/admin/bookings" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {recentBookings.length === 0 ? (
              <div className={styles.empty}>
                <span>📋</span>
                <p>No bookings yet</p>
              </div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className={styles.bookingRow}>
                  <div className={styles.bookingInfo}>
                    <p className={styles.bookingTitle}>{b.title}</p>
                    <p className={styles.bookingMeta}>
                      {b.hirer?.firstName} → {b.worker?.firstName} ·{" "}
                      {b.category?.name}
                    </p>
                  </div>
                  <div className={styles.bookingRight}>
                    <Badge status={b.status} />
                    <span className={styles.bookingAmount}>
                      ₦{fmt(b.agreedRate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Active disputes ── */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Active Disputes</h2>
              <Link to="/admin/disputes" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {disputes.length === 0 ? (
              <div className={styles.empty}>
                <span>⚖️</span>
                <p>No active disputes 🎉</p>
              </div>
            ) : (
              disputes.slice(0, 4).map((d) => (
                <Link
                  key={d.id}
                  to={`/admin/disputes`}
                  className={styles.disputeRow}
                >
                  <div className={styles.disputeAvatars}>
                    <div className={styles.miniAvatar}>
                      {d.hirer?.firstName?.[0]}
                    </div>
                    <div
                      className={`${styles.miniAvatar} ${styles.miniAvatarB}`}
                    >
                      {d.worker?.firstName?.[0]}
                    </div>
                  </div>
                  <div className={styles.disputeInfo}>
                    <p className={styles.disputeTitle}>{d.title}</p>
                    <p className={styles.disputeMeta}>
                      {d.hirer?.firstName} vs {d.worker?.firstName}
                    </p>
                  </div>
                  <span className={styles.disputeAmount}>
                    ₦{fmt(d.agreedRate)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
