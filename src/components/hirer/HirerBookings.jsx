import { useState, useEffect } from "react";
import styles from "./HirerBookings.module.css";
import api from "../../lib/api";

const STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default function HirerBookings() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (filter !== "ALL") params.status = filter;
    api.get("/hirers/me/bookings", { params }).then((res) => {
      setBookings(res.data.data.bookings);
      setStats(res.data.data.stats || {});
      setPages(res.data.data.pages);
      setLoading(false);
    });
  }, [filter, page]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your Jobs</p>
          <h1 className={styles.title}>Bookings</h1>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniStatVal}>
              {stats.totalBookings || 0}
            </span>
            <span className={styles.miniStatLabel}>Total</span>
          </div>
          <div className={styles.miniStatDivider} />
          <div className={styles.miniStat}>
            <span className={`${styles.miniStatVal} ${styles.orange}`}>
              ${(stats.totalSpent || 0).toLocaleString()}
            </span>
            <span className={styles.miniStatLabel}>Spent</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterBar}>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ""}`}
            onClick={() => {
              setFilter(s);
              setPage(1);
            }}
          >
            {s === "IN_PROGRESS"
              ? "In Progress"
              : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className={styles.grid}>
          {bookings.map((b, i) => (
            <BookingCard key={b.id} booking={b} delay={i * 0.04} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            {page} / {pages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, delay }) {
  const statusColors = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    IN_PROGRESS: "inprogress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    DISPUTED: "disputed",
  };

  const scheduled = new Date(booking.scheduledAt);

  return (
    <a
      href={`/bookings/${booking.id}`}
      className={styles.card}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Top */}
      <div className={styles.cardTop}>
        <div className={styles.workerAvatar}>
          {booking.worker?.avatar ? (
            <img src={booking.worker.avatar} alt="" />
          ) : (
            <span>
              {booking.worker?.firstName?.[0]}
              {booking.worker?.lastName?.[0]}
            </span>
          )}
        </div>
        <span
          className={`${styles.badge} ${styles[`badge_${statusColors[booking.status]}`]}`}
        >
          {booking.status.replace("_", " ")}
        </span>
      </div>

      {/* Body */}
      <h3 className={styles.cardTitle}>{booking.title}</h3>
      <p className={styles.cardWorker}>
        {booking.worker?.firstName} {booking.worker?.lastName}
        {booking.category && (
          <>
            {" "}
            · <span className={styles.category}>{booking.category.name}</span>
          </>
        )}
      </p>

      {/* Meta */}
      <div className={styles.cardMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaIcon}>📅</span>
          <span>
            {scheduled.toLocaleDateString()}{" "}
            {scheduled.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaIcon}>📍</span>
          <span className={styles.metaAddress}>{booking.address}</span>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        <span className={styles.rate}>
          {booking.currency} {booking.agreedRate?.toLocaleString()}
        </span>
        {booking.payment && (
          <span
            className={`${styles.payBadge} ${styles[`pay_${booking.payment.status.toLowerCase()}`]}`}
          >
            {booking.payment.status}
          </span>
        )}
      </div>
    </a>
  );
}

function EmptyState({ filter }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>📋</span>
      <p className={styles.emptyTitle}>No bookings found</p>
      <p className={styles.emptyText}>
        {filter === "ALL"
          ? "You haven't made any bookings yet."
          : `No ${filter.toLowerCase().replace("_", " ")} bookings.`}
      </p>
      <a href="/search" className={styles.emptyBtn}>
        Find a Worker
      </a>
    </div>
  );
}

function SkeletonCard() {
  return <div className={styles.skeletonCard} />;
}
