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

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{star} ★</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.barCount}>{count}</span>
    </div>
  );
}

export default function HirerReviewsReceived() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [distribution, setDistribution] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const limit = 10;
  const pages = Math.ceil(total / limit);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/hirers/me/reviews?page=${page}&limit=${limit}`)
      .then((res) => {
        const d = res.data.data;
        setReviews(d.reviews || []);
        setTotal(d.total || 0);
        setAvgRating(d.avgRating || 0);
        setDistribution(d.distribution || {});
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
            <div className={styles.badge}>Your Reputation</div>
            <h1 className={styles.title}>Reviews Received</h1>
            <p className={styles.sub}>
              Feedback workers have left about you as a hirer
            </p>
          </div>
          <Link
            to="/dashboard/hirer/reviews/given"
            className={styles.switchBtn}
          >
            See Reviews Given →
          </Link>
        </div>

        {/* Summary */}
        {!loading && total > 0 && (
          <div className={styles.summary}>
            <div className={styles.ratingHero}>
              <span className={styles.ratingBig}>
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <div>
                <Stars rating={Math.round(avgRating)} />
                <p className={styles.ratingCount}>
                  {total} review{total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className={styles.bars}>
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar
                  key={s}
                  star={s}
                  count={distribution[s] || 0}
                  total={total}
                />
              ))}
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
              <span className={styles.emptyIcon}>⭐</span>
              <p className={styles.emptyTitle}>No reviews yet</p>
              <p className={styles.emptySub}>
                Complete jobs to start receiving reviews from workers.
              </p>
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
                    {r.giver?.avatar ? (
                      <img src={r.giver.avatar} alt="" />
                    ) : (
                      <span>
                        {r.giver?.firstName?.[0]}
                        {r.giver?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.reviewerInfo}>
                    <p className={styles.reviewerName}>
                      {r.giver?.firstName} {r.giver?.lastName}
                      <span className={styles.reviewerRole}> · Worker</span>
                    </p>
                    <p className={styles.reviewerLocation}>
                      {[r.giver?.city, r.giver?.country]
                        .filter(Boolean)
                        .join(", ")}
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
