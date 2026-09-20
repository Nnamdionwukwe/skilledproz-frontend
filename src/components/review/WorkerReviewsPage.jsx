// src/pages/worker/reviews/ReviewsPage.jsx
import { useState, useEffect } from "react";
import {
  FiStar,
  FiInbox,
  FiSend,
  FiAlertCircle,
  FiCalendar,
  FiBriefcase,
  FiUser,
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";
import styles from "./Reviews.module.css";
import WorkerLayout from "../layout/WorkerLayout";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Stars
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ rating, size = "md" }) {
  return (
    <div className={`${styles.starsRow} ${styles[`stars_${size}`]}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= Math.round(rating) ? styles.starOn : styles.starOff}
        >
          <FiStar size={size === "lg" ? 16 : 14} fill="currentColor" />
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — shared across both tabs
// ─────────────────────────────────────────────────────────────────────────────
function ReviewSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skCard}>
          <div className={styles.skTop}>
            <div className={`${styles.skBlock} ${styles.skAvatar}`} />
            <div className={styles.skTopBody}>
              <div className={`${styles.skBlock} ${styles.skName}`} />
              <div className={`${styles.skBlock} ${styles.skDate}`} />
            </div>
            <div className={`${styles.skBlock} ${styles.skStars}`} />
          </div>
          <div className={`${styles.skBlock} ${styles.skComment}`} />
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className={styles.summarySkeleton} aria-hidden="true">
      <div className={`${styles.skBlock} ${styles.skBigNum}`} />
      <div className={styles.skBars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${styles.skBlock} ${styles.skBar}`} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page — Reviews (Received + Given tabs)
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerReviewsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("received"); // "received" | "given"

  // ── Received state ────────────────────────────────────────────────────
  const [received, setReceived] = useState([]);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedLoading, setReceivedLoading] = useState(true);
  const [receivedError, setReceivedError] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [distribution, setDistribution] = useState({});

  // ── Given state ───────────────────────────────────────────────────────
  const [given, setGiven] = useState([]);
  const [givenTotal, setGivenTotal] = useState(0);
  const [givenPage, setGivenPage] = useState(1);
  const [givenLoading, setGivenLoading] = useState(false);
  const [givenError, setGivenError] = useState("");
  const [givenLoaded, setGivenLoaded] = useState(false);

  const receivedPages = Math.max(1, Math.ceil(receivedTotal / PAGE_SIZE));
  const givenPages = Math.max(1, Math.ceil(givenTotal / PAGE_SIZE));

  // ── Fetch received ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setReceivedLoading(false);
      return;
    }
    setReceivedLoading(true);
    setReceivedError("");
    api
      .get(`/reviews/worker/${user.id}?page=${receivedPage}&limit=${PAGE_SIZE}`)
      .then((res) => {
        const data = res.data.data;
        setReceived(data.reviews || []);
        setReceivedTotal(data.total || 0);
        setAvgRating(data.avgRating || 0);
        setDistribution(data.distribution || {});
      })
      .catch((err) => {
        setReceived([]);
        setReceivedTotal(0);
        setReceivedError(
          err.response?.data?.message ||
            "Could not load your reviews. Please try again.",
        );
      })
      .finally(() => setReceivedLoading(false));
  }, [user?.id, receivedPage]);

  // ── Fetch given (lazy — only when the tab is opened) ──────────────────
  useEffect(() => {
    if (tab !== "given" || givenLoaded || !user?.id) return;
    setGivenLoading(true);
    setGivenError("");
    api
      .get(`/workers/dashboard/reviews/given?page=1&limit=${PAGE_SIZE}`)
      .then((res) => {
        const data = res.data.data;
        setGiven(data.reviews || []);
        setGivenTotal(data.total || 0);
        setGivenLoaded(true);
      })
      .catch((err) => {
        setGivenError(
          err.response?.data?.message ||
            "Could not load your given reviews. Please try again.",
        );
      })
      .finally(() => setGivenLoading(false));
  }, [tab, user?.id, givenLoaded]);

  // ── Refetch given when page changes (after initial load) ──────────────
  useEffect(() => {
    if (!givenLoaded || givenPage === 1 || !user?.id) return;
    setGivenLoading(true);
    setGivenError("");
    api
      .get(
        `/workers/dashboard/reviews/given?page=${givenPage}&limit=${PAGE_SIZE}`,
      )
      .then((res) => {
        const data = res.data.data;
        setGiven(data.reviews || []);
        setGivenTotal(data.total || 0);
      })
      .catch((err) => {
        setGivenError(
          err.response?.data?.message ||
            "Could not load your given reviews. Please try again.",
        );
      })
      .finally(() => setGivenLoading(false));
  }, [givenPage, givenLoaded, user?.id]);

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = distribution[star] || 0;
    return {
      star,
      count,
      pct: receivedTotal ? (count / receivedTotal) * 100 : 0,
    };
  });

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Reviews</h1>
            <p className={styles.pageSub}>
              {tab === "received"
                ? "Feedback you've received from clients"
                : "Feedback you've given to hirers you worked with"}
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "received"}
            className={`${styles.tab} ${tab === "received" ? styles.tabActive : ""}`}
            onClick={() => setTab("received")}
          >
            <FiInbox size={15} />
            <span>Received</span>
            {receivedTotal > 0 && (
              <span className={styles.tabCount}>{receivedTotal}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "given"}
            className={`${styles.tab} ${tab === "given" ? styles.tabActive : ""}`}
            onClick={() => setTab("given")}
          >
            <FiSend size={15} />
            <span>Given</span>
            {givenTotal > 0 && (
              <span className={styles.tabCount}>{givenTotal}</span>
            )}
          </button>
        </div>

        {/* ── Content ── */}
        {tab === "received" ? (
          <ReceivedTab
            loading={receivedLoading}
            error={receivedError}
            reviews={received}
            total={receivedTotal}
            avgRating={avgRating}
            ratingCounts={ratingCounts}
            page={receivedPage}
            pages={receivedPages}
            setPage={setReceivedPage}
          />
        ) : (
          <GivenTab
            loading={givenLoading}
            error={givenError}
            reviews={given}
            total={givenTotal}
            page={givenPage}
            pages={givenPages}
            setPage={setGivenPage}
          />
        )}
      </div>
    </WorkerLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Received tab
// ─────────────────────────────────────────────────────────────────────────────
function ReceivedTab({
  loading,
  error,
  reviews,
  total,
  avgRating,
  ratingCounts,
  page,
  pages,
  setPage,
}) {
  return (
    <>
      {/* Summary block */}
      {loading ? (
        <SummarySkeleton />
      ) : total > 0 ? (
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
      ) : null}

      {/* List */}
      {loading ? (
        <ReviewSkeleton />
      ) : error ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <FiAlertCircle size={36} />
          </span>
          <p className={styles.emptyTitle}>Could not load reviews</p>
          <p className={styles.emptyText}>{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <FiStar size={36} />
          </span>
          <p className={styles.emptyTitle}>No reviews yet</p>
          <p className={styles.emptyText}>
            Complete jobs to start receiving reviews from clients.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {reviews.map((r) => (
            <ReceivedCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {!loading && !error && pages > 1 && (
        <Pagination page={page} pages={pages} setPage={setPage} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Given tab
// ─────────────────────────────────────────────────────────────────────────────
function GivenTab({ loading, error, reviews, total, page, pages, setPage }) {
  return (
    <>
      {loading ? (
        <ReviewSkeleton />
      ) : error ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <FiAlertCircle size={36} />
          </span>
          <p className={styles.emptyTitle}>Could not load reviews</p>
          <p className={styles.emptyText}>{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <FiSend size={36} />
          </span>
          <p className={styles.emptyTitle}>No reviews given yet</p>
          <p className={styles.emptyText}>
            After completing a booking, you can leave feedback for the hirer.
            Your reviews will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {reviews.map((r) => (
            <GivenCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {!loading && !error && pages > 1 && (
        <Pagination page={page} pages={pages} setPage={setPage} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────────────────────
function ReceivedCard({ review }) {
  const giver = review.giver;
  const initials =
    `${giver?.firstName?.[0] || ""}${giver?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewTop}>
        <div className={styles.avatar}>
          {giver?.avatar ? (
            <img src={giver.avatar} alt={giver.firstName || "Reviewer"} />
          ) : (
            <span>{initials || "?"}</span>
          )}
        </div>
        <div className={styles.reviewTopBody}>
          <p className={styles.reviewerName}>
            {giver?.firstName} {giver?.lastName}
          </p>
          <div className={styles.reviewMeta}>
            {review.booking?.title && (
              <span className={styles.metaItem}>
                <FiBriefcase size={11} />
                {review.booking.title}
              </span>
            )}
            <span className={styles.metaItem}>
              <FiCalendar size={11} />
              {new Date(review.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.comment && (
        <p className={styles.reviewComment}>"{review.comment}"</p>
      )}
    </div>
  );
}

function GivenCard({ review }) {
  const receiver = review.receiver;
  const initials =
    `${receiver?.firstName?.[0] || ""}${receiver?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewTop}>
        <div className={styles.avatar}>
          {receiver?.avatar ? (
            <img src={receiver.avatar} alt={receiver.firstName || "Hirer"} />
          ) : (
            <span>{initials || "?"}</span>
          )}
        </div>
        <div className={styles.reviewTopBody}>
          <p className={styles.reviewerName}>
            {receiver?.firstName} {receiver?.lastName}
          </p>
          <div className={styles.reviewMeta}>
            {review.booking?.title && (
              <span className={styles.metaItem}>
                <FiBriefcase size={11} />
                {review.booking.title}
              </span>
            )}
            <span className={styles.metaItem}>
              <FiCalendar size={11} />
              {new Date(review.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {receiver?.role && (
              <span className={styles.metaItem}>
                <FiUser size={11} />
                {receiver.role.charAt(0) + receiver.role.slice(1).toLowerCase()}
              </span>
            )}
          </div>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.comment && (
        <p className={styles.reviewComment}>"{review.comment}"</p>
      )}
      <div className={styles.givenBadge}>
        <FiSend size={11} />
        <span>Review given by you</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────
function Pagination({ page, pages, setPage }) {
  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={page === 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
      >
        <FiArrowLeft size={14} /> Prev
      </button>
      <span className={styles.pageInfo}>
        {page} of {pages}
      </span>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={page === pages}
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
      >
        Next <FiArrowRight size={14} />
      </button>
    </div>
  );
}
