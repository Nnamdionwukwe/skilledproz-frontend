import { useState, useEffect } from "react";
import WorkerLayout from "../../components/layout/WorkerLayout";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./Review.module.css";

function Stars({ rating, size = "md" }) {
  return (
    <div className={`${styles.starsRow} ${styles[`stars_${size}`]}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= Math.round(rating) ? styles.starOn : styles.starOff}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function WorkerReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  const pages = Math.ceil(total / 10);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api
      .get(`/reviews/worker/${user.id}?page=${page}&limit=10`)
      .then((res) => {
        const data = res.data.data;
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
        if (data.reviews?.length) {
          const avg =
            data.reviews.reduce((s, r) => s + r.rating, 0) /
            data.reviews.length;
          setAvgRating(avg);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id, page]);

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  return (
    <WorkerLayout>
      <div className={styles.dashPage}>
        {/* ── Summary block ── */}
        <div className={styles.summaryBlock}>
          <div className={styles.ratingHero}>
            <span className={styles.ratingBig}>
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </span>
            <div>
              <Stars rating={avgRating} size="lg" />
              <p className={styles.ratingCount}>
                {total} review{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className={styles.ratingBars}>
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className={styles.ratingBarRow}>
                <span className={styles.ratingBarLabel}>{star} ★</span>
                <div className={styles.ratingBarTrack}>
                  <div
                    className={styles.ratingBarFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={styles.ratingBarCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reviews list ── */}
        <div className={styles.reviewsList}>
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className={styles.skReview} />)
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⭐</span>
              <p className={styles.emptyTitle}>No reviews yet</p>
              <p className={styles.emptyText}>
                Complete jobs to start receiving reviews from clients.
              </p>
            </div>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
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
    </WorkerLayout>
  );
}

function ReviewCard({ review }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewCardTop}>
        <div className={styles.reviewerAvatar}>
          {review.giver?.avatar ? (
            <img src={review.giver.avatar} alt="" />
          ) : (
            <span>
              {review.giver?.firstName?.[0]}
              {review.giver?.lastName?.[0]}
            </span>
          )}
        </div>
        <div className={styles.reviewerInfo}>
          <p className={styles.reviewerName}>
            {review.giver?.firstName} {review.giver?.lastName}
          </p>
          <p className={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.comment && (
        <p className={styles.reviewComment}>"{review.comment}"</p>
      )}
    </div>
  );
}
