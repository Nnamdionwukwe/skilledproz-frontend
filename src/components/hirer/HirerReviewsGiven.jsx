import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../layout/HirerLayout";
import api from "../../lib/api";
import styles from "./HirerReviews.module.css";

function Stars({ rating }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function HirerReviewsGiven() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const limit = 10;
  const pages = Math.ceil(total / limit);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/reviews/my/given?page=${page}&limit=${limit}`)
      .then((res) => {
        const d = res.data.data;
        setReviews(d.reviews || []);
        setTotal(d.total || 0);
      })
      .catch(() => setError("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.badge}>Your Feedback</div>
            <h1 className={styles.title}>Reviews Given</h1>
            <p className={styles.sub}>
              Reviews you have submitted for workers after completed jobs
            </p>
          </div>
          <Link
            to="/dashboard/hirer/reviews/received"
            className={styles.switchBtn}
          >
            See Reviews Received →
          </Link>
        </div>

        {/* Stats bar */}
        {!loading && total > 0 && (
          <div className={styles.givenStats}>
            <div className={styles.givenStatItem}>
              <span className={styles.givenStatValue}>{total}</span>
              <span className={styles.givenStatLabel}>
                Review{total !== 1 ? "s" : ""} submitted
              </span>
            </div>
            <div className={styles.givenStatItem}>
              <span className={styles.givenStatValue}>
                {reviews.length > 0
                  ? (
                      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                    ).toFixed(1)
                  : "—"}
              </span>
              <span className={styles.givenStatLabel}>Avg rating given</span>
            </div>
          </div>
        )}

        {/* List */}
        <div className={styles.list}>
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)
          ) : error ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>⚠️</span>
              <p className={styles.emptyTitle}>{error}</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>✍️</span>
              <p className={styles.emptyTitle}>No reviews given yet</p>
              <p className={styles.emptySub}>
                After a job is completed, leave a review for your worker.
              </p>
              <Link to="/bookings" className={styles.emptyBtn}>
                View Bookings →
              </Link>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div
                key={r.id}
                className={styles.card}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>
                    {r.receiver?.avatar ? (
                      <img src={r.receiver.avatar} alt="" />
                    ) : (
                      <span>
                        {r.receiver?.firstName?.[0]}
                        {r.receiver?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.reviewerInfo}>
                    <p className={styles.reviewerName}>
                      {r.receiver?.firstName} {r.receiver?.lastName}
                      <span className={styles.reviewerRole}> · Worker</span>
                    </p>
                    <p className={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(r.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className={styles.ratingRight}>
                    <Stars rating={r.rating} />
                    <span className={styles.ratingNum}>{r.rating}/5</span>
                  </div>
                </div>

                {r.comment && <p className={styles.comment}>"{r.comment}"</p>}

                {r.booking && (
                  <div className={styles.bookingChip}>
                    <span className={styles.bookingIcon}>
                      {r.booking.category?.icon || "📋"}
                    </span>
                    <span className={styles.bookingTitle}>
                      {r.booking.title}
                    </span>
                    <span className={styles.bookingCat}>
                      {r.booking.category?.name}
                    </span>
                    <Link
                      to={`/workers/${r.receiver?.id}`}
                      className={styles.viewProfileLink}
                    >
                      View Profile →
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

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
    </HirerLayout>
  );
}
