import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import styles from "./Review.module.css";
import {
  FaStar,
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
} from "react-icons/fa";
import tracker from "../../lib/analytics/tracker";

export default function LeaveReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.leaveReview.view", {
      bookingId: bookingId || null,
      viewerRole: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);

        // ── ANALYTICS: booking context loaded ───────────────────────────
        tracker.track("leaveReview.booking.loaded", {
          bookingId,
          status: b.status,
          viewerIsHirer: user?.id === b.hirerId,
          hasCategory: !!b.category,
          categoryId: b.category?.id || null,
        });
      })
      .catch((err) => {
        setError("Could not load booking.");

        // ── ANALYTICS: booking load failed ──────────────────────────────
        tracker.track("leaveReview.booking.load.failed", {
          bookingId,
          reason: err.response?.data?.message || "unknown",
        });
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) {
      setError("Please select a star rating.");
      tracker.action("leaveReview.submit.blocked", {
        reason: "no_rating",
        hasComment: comment.length > 0,
      });
      return;
    }
    setSubmitting(true);
    setError("");

    // ── ANALYTICS: review submit attempt ─────────────────────────────────
    tracker.action("leaveReview.submit.attempt", {
      bookingId,
      rating,
      hasComment: comment.trim().length > 0,
      commentLength: comment.length,
      viewerRole: user?.role || "GUEST",
      isHirer,
    });

    try {
      await api.post("/reviews", { bookingId, rating, comment });
      setSubmitted(true);

      // ── ANALYTICS: review submitted successfully ────────────────────
      tracker.action("leaveReview.submitted", {
        bookingId,
        rating,
        hasComment: comment.trim().length > 0,
        commentLength: comment.length,
        viewerRole: user?.role || "GUEST",
        isHirer,
      });

      setTimeout(() => navigate(`/bookings/${bookingId}`), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to submit review.");

      // ── ANALYTICS: review submit failed ─────────────────────────────
      tracker.action("leaveReview.submit.failed", {
        bookingId,
        rating,
        viewerRole: user?.role || "GUEST",
        reason: e.response?.data?.message || "unknown",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isHirer = user?.id === booking?.hirerId;
  const reviewee = isHirer ? booking?.worker : booking?.hirer;

  const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  if (loading)
    return (
      <Layout>
        <div className={styles.page}>
          <div className={styles.skCard} />
        </div>
      </Layout>
    );

  if (submitted)
    return (
      <Layout>
        <div className={styles.page}>
          <div className={styles.successWrap}>
            <div className={styles.successRing}>
              <FaStar size={48} color="#fbbf24" />
            </div>
            <h2 className={styles.successTitle}>Review Submitted!</h2>
            <p className={styles.successText}>
              Your feedback helps build trust on SkilledProz. Thank you!
            </p>
            <p className={styles.successSub}>Redirecting...</p>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.reviewWrap}>
          {/* Header */}
          <div className={styles.reviewHeader}>
            <Link
              to={`/bookings/${bookingId}`}
              className={styles.backLink}
              data-track-id="leaveReview.back"
            >
              <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Booking
            </Link>
          </div>

          {/* Reviewee card */}
          <div className={styles.revieweeCard}>
            <div className={styles.revieweeAvatar}>
              {reviewee?.avatar ? (
                <img src={reviewee.avatar} alt="" />
              ) : (
                <span>
                  {reviewee?.firstName?.[0]}
                  {reviewee?.lastName?.[0]}
                </span>
              )}
            </div>
            <div>
              <p className={styles.revieweeLabel}>
                {isHirer ? "Rate your worker" : "Rate your client"}
              </p>
              <h2 className={styles.revieweeName}>
                {reviewee?.firstName} {reviewee?.lastName}
              </h2>
              <p className={styles.revieweeJob}>{booking?.title}</p>
            </div>
          </div>

          {/* Star picker */}
          <div className={styles.starCard}>
            <p className={styles.starLabel}>
              How would you rate this experience?
            </p>
            <div className={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.starBtn} ${
                    s <= (hovered || rating) ? styles.starBtnActive : ""
                  }`}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => {
                    setRating(s);
                    setError("");

                    // ── ANALYTICS: rating selected ─────────────────────
                    tracker.action("leaveReview.rating.selected", {
                      bookingId,
                      rating: s,
                      viewerRole: user?.role || "GUEST",
                    });
                  }}
                  data-track-id={`leaveReview.star.${s}`}
                >
                  <FaStar
                    size={32}
                    color={s <= (hovered || rating) ? "#fbbf24" : "#374151"}
                  />
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className={styles.starLabelText}>
                {LABELS[hovered || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <form onSubmit={handleSubmit}>
            <div className={styles.commentCard}>
              <label className={styles.commentLabel}>
                Write a review{" "}
                <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                className={styles.commentInput}
                placeholder={
                  isHirer
                    ? "Describe the quality of work, professionalism, punctuality..."
                    : "Describe how the client communicated, paid on time, was respectful..."
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onFocus={() => {
                  if (!comment) {
                    tracker.track("leaveReview.comment.focused", {
                      bookingId,
                    });
                  }
                }}
                rows={4}
                maxLength={500}
                data-track-id="leaveReview.comment"
              />
              <div className={styles.commentCount}>{comment.length} / 500</div>
            </div>

            {error && (
              <div className={styles.inlineError}>
                <FaExclamationTriangle style={{ marginRight: "6px" }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || !rating}
              data-track-id="leaveReview.submit"
            >
              {submitting ? (
                <>
                  <FaSpinner className={styles.spinner} /> Submitting...
                </>
              ) : (
                <>
                  <FaStar style={{ marginRight: "6px" }} /> Submit Review
                </>
              )}
            </button>
          </form>

          <p className={styles.disclaimer}>
            Reviews are public and help the community make informed decisions.
          </p>
        </div>
      </div>
    </Layout>
  );
}
