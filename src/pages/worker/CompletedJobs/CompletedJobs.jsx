import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import styles from "./CompletedJobs.module.css";

function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

function CompletedJobCard({ booking }) {
  const scheduled = new Date(booking.scheduledAt);
  const isPast = scheduled < new Date();

  return (
    <Link to={`/bookings/${booking.id}`} className={styles.card}>
      {/* Accent bar – green for completed */}
      <div className={`${styles.accentBar} ${styles.accent_green}`} />

      {/* Top row: Avatar + Status badge */}
      <div className={styles.cardTop}>
        <div className={styles.avatar}>
          {booking.hirer?.avatar ? (
            <img src={booking.hirer.avatar} alt="" />
          ) : (
            <span>{initials(booking.hirer)}</span>
          )}
        </div>
        <span className={`${styles.badge} ${styles.badge_green}`}>
          Completed
        </span>
      </div>

      {/* Title */}
      <h3 className={styles.cardTitle}>{booking.title}</h3>

      {/* Hirer + Category */}
      <p className={styles.cardParty}>
        {booking.hirer?.firstName} {booking.hirer?.lastName}
        {booking.category && (
          <>
            {" "}
            · <span className={styles.cat}>{booking.category.name}</span>
          </>
        )}
      </p>

      {/* Details: Scheduled date + Address */}
      <div className={styles.details}>
        <div className={`${styles.detail} ${isPast ? styles.detailFaded : ""}`}>
          <span className={styles.detailIcon}>📅</span>
          <span className={styles.detailText}>
            {scheduled.toLocaleDateString()} ·{" "}
            {scheduled.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailIcon}>📍</span>
          <span className={`${styles.detailText} ${styles.detailTruncate}`}>
            {booking.address}
          </span>
        </div>
      </div>

      {/* Footer: Agreed Rate + Total Earned */}
      <div className={styles.cardFooter}>
        <span className={styles.rate}>
          {formatCurrency(booking.agreedRate, booking.currency)}
        </span>
        <span className={styles.earnedTag}>
          Earned {formatCurrency(booking.totalEarned, booking.currency)}
        </span>
      </div>

      {/* Optional: Review */}
      {booking.review && (
        <div className={styles.reviewRow}>
          <span className={styles.stars}>
            {"★".repeat(booking.review.rating)}
            {"☆".repeat(5 - booking.review.rating)}
          </span>
          <span className={styles.reviewText}>“{booking.review.comment}”</span>
        </div>
      )}
    </Link>
  );
}

export default function CompletedJobs() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;
  const pages = Math.ceil(total / limit);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/workers/completed-jobs?page=${page}&limit=${limit}`)
      .then((res) => {
        const data = res.data.data;
        setBookings(data.bookings || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error("Failed to load completed jobs", err))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>History</p>
            <h1 className={styles.title}>
              Completed Jobs
              {total > 0 && <span className={styles.count}>{total}</span>}
            </h1>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyEmoji}>🏆</span>
            <p className={styles.emptyTitle}>No completed jobs yet</p>
            <p className={styles.emptyText}>
              You haven't completed any jobs. Keep working and they'll appear
              here!
            </p>
            <Link to="/jobs" className={styles.emptyBtn}>
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {bookings.map((b) => (
              <CompletedJobCard key={b.id} booking={b} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
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
    </WorkerLayout>
  );
}

function Skeleton() {
  return <div className={styles.skeleton} />;
}
