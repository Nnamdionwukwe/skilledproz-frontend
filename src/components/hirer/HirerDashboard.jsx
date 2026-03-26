import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./HirerDashboard.module.css";
import api from "../../lib/api";

export default function HirerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/hirers/me/dashboard")
      .then((res) => {
        setData(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <HirerLayout>
        <DashboardSkeleton />
      </HirerLayout>
    );
  if (!data)
    return (
      <HirerLayout>
        <p style={{ color: "var(--text-dim)", padding: "2rem" }}>
          Failed to load dashboard.
        </p>
      </HirerLayout>
    );

  const { stats, recentBookings, recentWorkers } = data;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Overview</p>
            <h1 className={styles.title}>Your Dashboard</h1>
          </div>
          <Link to="/dashboard/hirer/post-job" className={styles.ctaBtn}>
            <span className={styles.ctaBtnIcon}>+</span>
            Post a Job
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <StatCard
            label="Total Bookings"
            value={stats.totalBookings}
            icon="📋"
            delay={0}
          />
          <StatCard
            label="Active Jobs"
            value={stats.activeBookings}
            icon="⚡"
            accent="orange"
            delay={0.05}
          />
          <StatCard
            label="Completed"
            value={stats.completedBookings}
            icon="✅"
            accent="green"
            delay={0.1}
          />
          <StatCard
            label="Total Spent"
            value={`₦${(stats.totalSpent || 0).toLocaleString()}`}
            icon="💳"
            delay={0.15}
          />
        </div>

        <div className={styles.grid2}>
          {/* Recent bookings */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recent Bookings</h2>
              <Link to="/dashboard/hirer/bookings" className={styles.panelLink}>
                View all →
              </Link>
            </div>
            <div className={styles.bookingList}>
              {recentBookings.length === 0 && (
                <p className={styles.empty}>No bookings yet.</p>
              )}
              {recentBookings.map((b, i) => (
                <BookingRow key={b.id} booking={b} delay={i * 0.05} />
              ))}
            </div>
          </section>

          {/* Recent workers */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recent Workers</h2>
              <Link
                to="/dashboard/hirer/saved-workers"
                className={styles.panelLink}
              >
                View all →
              </Link>
            </div>
            <div className={styles.workerList}>
              {recentWorkers.length === 0 && (
                <p className={styles.empty}>No workers hired yet.</p>
              )}
              {recentWorkers.map((w, i) => (
                <WorkerRow key={w.id} worker={w} delay={i * 0.05} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </HirerLayout>
  );
}

function StatCard({ label, value, icon, accent, delay }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`statCard_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  );
}

function BookingRow({ booking, delay }) {
  const statusMap = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    IN_PROGRESS: "inprogress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    DISPUTED: "disputed",
  };
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className={styles.bookingRow}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={styles.bookingRowLeft}>
        <div className={styles.bookingAvatar}>
          {booking.worker?.avatar ? (
            <img src={booking.worker.avatar} alt="" />
          ) : (
            <span>
              {booking.worker?.firstName?.[0]}
              {booking.worker?.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className={styles.bookingTitle}>{booking.title}</p>
          <p className={styles.bookingMeta}>
            {booking.worker?.firstName} {booking.worker?.lastName} ·{" "}
            {booking.category?.name}
          </p>
        </div>
      </div>
      <span
        className={`${styles.badge} ${styles[`badge_${statusMap[booking.status]}`]}`}
      >
        {booking.status.replace("_", " ")}
      </span>
    </Link>
  );
}

function WorkerRow({ worker, delay }) {
  return (
    <Link
      to={`/workers/${worker.id}`}
      className={styles.workerRow}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={styles.workerAvatar}>
        {worker.avatar ? (
          <img src={worker.avatar} alt="" />
        ) : (
          <span>
            {worker.firstName?.[0]}
            {worker.lastName?.[0]}
          </span>
        )}
      </div>
      <div className={styles.workerInfo}>
        <p className={styles.workerName}>
          {worker.firstName} {worker.lastName}
        </p>
        <p className={styles.workerTitle}>{worker.workerProfile?.title}</p>
      </div>
      <div className={styles.workerRating}>
        <span className={styles.star}>★</span>
        <span>{worker.workerProfile?.avgRating?.toFixed(1) || "—"}</span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonHeader} />
      <div className={styles.statsGrid}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
      <div className={styles.grid2}>
        <div className={styles.skeletonPanel} />
        <div className={styles.skeletonPanel} />
      </div>
    </div>
  );
}
