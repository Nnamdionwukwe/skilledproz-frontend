import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import styles from "./Review.module.css";

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

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => setError("Could not load booking."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return setError("Please select a star rating.");
    setSubmitting(true);
    setError("");
    try {
      await api.post("/reviews", { bookingId, rating, comment });
      setSubmitted(true);
      setTimeout(() => navigate(`/bookings/${bookingId}`), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to submit review.");
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
              <span className={styles.successStar}>⭐</span>
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
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
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
                  }}
                >
                  ★
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
                rows={4}
                maxLength={500}
              />
              <div className={styles.commentCount}>{comment.length} / 500</div>
            </div>

            {error && (
              <div className={styles.inlineError}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || !rating}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} /> Submitting...
                </>
              ) : (
                <>⭐ Submit Review</>
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
