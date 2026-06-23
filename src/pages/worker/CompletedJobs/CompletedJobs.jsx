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

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

function CompletedJobCard({ booking }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>{booking.title}</h3>
          <span className={styles.statusBadge}>✅ Completed</span>
        </div>
        <span className={styles.completedDate}>
          Completed {timeAgo(booking.completedAt)}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.description}>{booking.description}</p>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Hirer</span>
            <div className={styles.hirerInfo}>
              {booking.hirer?.avatar ? (
                <img
                  src={booking.hirer.avatar}
                  alt=""
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatar}>{initials(booking.hirer)}</div>
              )}
              <span>
                {booking.hirer?.firstName} {booking.hirer?.lastName}
                {booking.hirer?.hirerProfile?.companyName && (
                  <span className={styles.companyName}>
                    ({booking.hirer.hirerProfile.companyName})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Category</span>
            <span className={styles.category}>
              {booking.category?.icon} {booking.category?.name}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Scheduled</span>
            <span>
              {new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Agreed Rate</span>
            <span className={styles.amount}>
              {formatCurrency(booking.agreedRate, booking.currency)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Total Earned</span>
            <span className={styles.earned}>
              {formatCurrency(booking.totalEarned, booking.currency)}
            </span>
          </div>

          {booking.review && (
            <div className={`${styles.metaItem} ${styles.fullWidth}`}>
              <span className={styles.metaLabel}>Your Review</span>
              <div className={styles.review}>
                <span className={styles.stars}>
                  {"★".repeat(booking.review.rating)}
                  {"☆".repeat(5 - booking.review.rating)}
                </span>
                <span className={styles.reviewComment}>
                  “{booking.review.comment}”
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <Link to={`/bookings/${booking.id}`} className={styles.detailLink}>
          View Full Details →
        </Link>
      </div>
    </div>
  );
}

export default function CompletedJobs() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;
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
        <div className={styles.header}>
          <h1 className={styles.title}>Completed Jobs</h1>
          <p className={styles.subtitle}>
            {total} job{total !== 1 ? "s" : ""} completed
          </p>
        </div>

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p className={styles.emptyTitle}>No completed jobs yet</p>
            <p className={styles.emptyText}>
              You haven't completed any jobs. Keep working and they'll appear
              here!
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {bookings.map((booking) => (
              <CompletedJobCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}

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
