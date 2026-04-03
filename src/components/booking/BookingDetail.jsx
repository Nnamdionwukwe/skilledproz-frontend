import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import RaiseDisputeModal from "../disputes/RaiseDisputeModal";

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};

const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const role = user?.role;
  const userId = user?.id;

  // useEffect(() => {
  //   api
  //     .get(`/bookings/${id}`)
  //     .then((res) => {
  //       setBooking(res.data.data.booking);
  //       setLoading(false);
  //     })
  //     .catch((err) => {
  //       setLoading(false);
  //     });
  // }, [id]);

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);

        // Check if current user already reviewed this booking
        if (b.status === "COMPLETED") {
          api
            .get(`/reviews/check/${id}`)
            .then((r) => {
              setHasReviewed(r.data.data.hasReviewed);
            })
            .catch(() => setHasReviewed(false))
            .finally(() => setReviewCheckDone(true));
        } else {
          setReviewCheckDone(true);
        }
      })
      .catch(() => {
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status, extra = {}) {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/bookings/${id}/status`, {
        status,
        ...extra,
      });
      setBooking(res.data.data.booking);
      setSuccess(
        `Booking ${status.toLowerCase().replace("_", " ")} successfully.`,
      );
      setShowCancel(false);
    } catch (e) {
      setError(e.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleCheckIn() {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/bookings/${id}/checkin`);
      setBooking(res.data.data.booking);
      setSuccess("Checked in — job is now in progress.");
    } catch {
      setError("Check-in failed.");
    } finally {
      setActing(false);
    }
  }

  async function handleCheckOut() {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/bookings/${id}/checkout`);
      setBooking(res.data.data.booking);
      setSuccess("Checked out — job marked as completed.");
    } catch {
      setError("Check-out failed.");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <DetailSkeleton Layout={Layout} />;
  if (!booking) return <NotFound />;

  const meta = STATUS_META[booking.status] || {};
  const step = meta.step ?? 0;
  const isHirer = userId === booking.hirerId;
  const isWorker = userId === booking.workerId;
  const other = isHirer ? booking.worker : booking.hirer;
  const scheduled = new Date(booking.scheduledAt);

  return (
    <Layout>
      <div className={styles.page}>
        {/* ✅ Use Link instead of <a> */}
        <Link to="/bookings" className={styles.back}>
          ← Back to Bookings
        </Link>

        {/* Alerts */}
        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.main}>
            {/* Title block */}
            <div className={styles.titleBlock}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{booking.title}</h1>
                <span
                  className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}
                >
                  {meta.label}
                </span>
              </div>
              {booking.category && (
                <span className={styles.category}>{booking.category.name}</span>
              )}
            </div>

            {/* Timeline */}
            {step >= 0 && (
              <div className={styles.timelineWrap}>
                <div className={styles.timeline}>
                  {TIMELINE_STEPS.map((s, i) => (
                    <div key={s} className={styles.timelineItem}>
                      <div
                        className={`${styles.timelineDot} ${i <= step ? styles.timelineDotActive : ""} ${i === step ? styles.timelineDotCurrent : ""}`}
                      >
                        {i < step ? "✓" : i + 1}
                      </div>
                      <span
                        className={`${styles.timelineLabel} ${i <= step ? styles.timelineLabelActive : ""}`}
                      >
                        {s}
                      </span>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`${styles.timelineLine} ${i < step ? styles.timelineLineActive : ""}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <p className={styles.description}>{booking.description}</p>
              {booking.notes && (
                <div className={styles.notes}>
                  <span className={styles.notesIcon}>📝</span>
                  <p>{booking.notes}</p>
                </div>
              )}
            </section>

            {/* Details grid */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Job Details</h2>
              <div className={styles.detailGrid}>
                <DetailItem
                  icon="📅"
                  label="Scheduled"
                  value={`${scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                />
                <DetailItem
                  icon="📍"
                  label="Location"
                  value={booking.address}
                />
                <DetailItem
                  icon="💰"
                  label="Agreed Rate"
                  value={`${booking.currency} ${booking.agreedRate?.toLocaleString()}`}
                  accent
                />
                {booking.estimatedHours && (
                  <DetailItem
                    icon="⏱️"
                    label="Est. Duration"
                    value={`${booking.estimatedHours}h`}
                  />
                )}
                {booking.checkInAt && (
                  <DetailItem
                    icon="🟢"
                    label="Checked In"
                    value={new Date(booking.checkInAt).toLocaleString()}
                  />
                )}
                {booking.checkOutAt && (
                  <DetailItem
                    icon="🔴"
                    label="Checked Out"
                    value={new Date(booking.checkOutAt).toLocaleString()}
                  />
                )}
                {booking.completedAt && (
                  <DetailItem
                    icon="✅"
                    label="Completed"
                    value={new Date(booking.completedAt).toLocaleString()}
                  />
                )}
              </div>
            </section>

            {/* Payment info */}
            {booking.payment && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Payment</h2>
                <div className={styles.paymentCard}>
                  <div className={styles.paymentRow}>
                    <span className={styles.payLabel}>Total</span>
                    <span className={styles.payValue}>
                      {booking.payment.currency}{" "}
                      {booking.payment.amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span className={styles.payLabel}>Platform Fee</span>
                    <span className={styles.payMuted}>
                      {booking.payment.currency}{" "}
                      {booking.payment.platformFee?.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span className={styles.payLabel}>Worker Payout</span>
                    <span className={styles.payGreen}>
                      {booking.payment.currency}{" "}
                      {booking.payment.workerPayout?.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.paymentDivider} />
                  <div className={styles.paymentRow}>
                    <span className={styles.payLabel}>Provider</span>
                    <span
                      className={styles.payValue}
                      style={{ textTransform: "capitalize" }}
                    >
                      {booking.payment.provider}
                    </span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span className={styles.payLabel}>Status</span>
                    <span
                      className={`${styles.payStatus} ${styles[`payStatus_${booking.payment.status.toLowerCase()}`]}`}
                    >
                      {booking.payment.status}
                    </span>
                  </div>
                  {booking.payment.providerRef && (
                    <div className={styles.paymentRow}>
                      <span className={styles.payLabel}>Ref</span>
                      <span className={styles.payRef}>
                        {booking.payment.providerRef}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Review */}
            {/* {booking.review && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Review</h2>
                <div className={styles.reviewCard}>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < booking.review.rating
                            ? styles.starFilled
                            : styles.starEmpty
                        }
                      >
                        ★
                      </span>
                    ))}
                    <span className={styles.ratingNum}>
                      {booking.review.rating}/5
                    </span>
                  </div>
                  {booking.review.comment && (
                    <p className={styles.reviewComment}>
                      "{booking.review.comment}"
                    </p>
                  )}
                </div>
              </section>
            )} */}
            {/* Reviews Section */}
            {booking.status === "COMPLETED" && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Reviews</h2>

                {/* Show all reviews for this booking */}
                {booking.reviews && booking.reviews.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {booking.reviews.map((review) => (
                      <div key={review.id} className={styles.reviewCard}>
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
                              <span className={styles.reviewerRole}>
                                {" "}
                                ·{" "}
                                {review.giver?.role === "HIRER"
                                  ? "Hirer"
                                  : "Worker"}
                              </span>
                            </p>
                            <p className={styles.reviewDate}>
                              {new Date(review.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}{" "}
                              at{" "}
                              {new Date(review.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                          <div className={styles.stars}>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < review.rating
                                    ? styles.starFilled
                                    : styles.starEmpty
                                }
                              >
                                ★
                              </span>
                            ))}
                            <span className={styles.ratingNum}>
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className={styles.reviewComment}>
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Leave a review — only if this user hasn't reviewed yet */}
                {reviewCheckDone && !hasReviewed && (
                  <Link
                    to={`/bookings/${booking.id}/review`}
                    className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
                    style={{ display: "inline-flex", marginTop: "1rem" }}
                  >
                    ⭐ Leave a Review
                  </Link>
                )}

                {reviewCheckDone && hasReviewed && (
                  <div className={styles.reviewedNote}>
                    ✅ Your review has been submitted.
                    {booking.reviews?.length < 2 &&
                      " Waiting for the other party."}
                    {booking.reviews?.length >= 2 && " Both reviews submitted."}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className={styles.sidebar}>
            {/* Other party */}
            <div className={styles.partyCard}>
              <p className={styles.partyLabel}>
                {isHirer ? "Worker" : "Hirer"}
              </p>
              <div className={styles.partyAvatar}>
                {other?.avatar ? (
                  <img src={other.avatar} alt="" />
                ) : (
                  <span>
                    {other?.firstName?.[0]}
                    {other?.lastName?.[0]}
                  </span>
                )}
              </div>
              <p className={styles.partyName}>
                {other?.firstName} {other?.lastName}
              </p>
              {other?.phone && (
                <a href={`tel:${other.phone}`} className={styles.partyPhone}>
                  📱 {other.phone}
                </a>
              )}
              <a
                href={`/messages?with=${other?.id}&booking=${booking.id}`}
                className={styles.messageBtn}
              >
                💬 Send Message
              </a>
            </div>

            {/* Actions */}
            <div className={styles.actionsCard}>
              <p className={styles.actionsTitle}>Actions</p>

              {/* WORKER actions */}
              {isWorker && booking.status === "PENDING" && (
                <>
                  <ActionBtn
                    label="Accept Booking"
                    color="green"
                    loading={acting}
                    onClick={() => updateStatus("ACCEPTED")}
                  />
                  <ActionBtn
                    label="Reject Booking"
                    color="red"
                    loading={acting}
                    onClick={() => updateStatus("REJECTED")}
                  />
                </>
              )}
              {isWorker && booking.status === "ACCEPTED" && (
                <ActionBtn
                  label="Check In — Start Job"
                  color="indigo"
                  loading={acting}
                  onClick={handleCheckIn}
                />
              )}
              {isWorker && booking.status === "IN_PROGRESS" && (
                <ActionBtn
                  label="Check Out — Mark Complete"
                  color="green"
                  loading={acting}
                  onClick={handleCheckOut}
                />
              )}

              {/* HIRER actions */}
              {isHirer && booking.status === "ACCEPTED" && !booking.payment && (
                // ✅ Use Link instead of <a href>
                <Link
                  to={`/bookings/${booking.id}/pay`}
                  className={`${styles.actionBtn} ${styles.actionBtn_orange}`}
                >
                  💳 Pay Now
                </Link>
              )}
              {isHirer && booking.payment?.status === "HELD" && (
                // ✅ Use Link instead of <a href>
                <Link
                  to={`/bookings/${booking.id}/release`}
                  className={`${styles.actionBtn} ${styles.actionBtn_green}`}
                >
                  💸 Release Payment
                </Link>
              )}
              {isHirer && ["PENDING", "ACCEPTED"].includes(booking.status) && (
                <>
                  {!showCancel ? (
                    <ActionBtn
                      label="Cancel Booking"
                      color="red"
                      outline
                      loading={false}
                      onClick={() => setShowCancel(true)}
                    />
                  ) : (
                    <div className={styles.cancelBox}>
                      <textarea
                        className={styles.cancelInput}
                        placeholder="Reason for cancellation (optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                      />
                      <div className={styles.cancelRow}>
                        <button
                          className={styles.cancelConfirm}
                          disabled={acting}
                          onClick={() =>
                            updateStatus("CANCELLED", { cancelReason })
                          }
                        >
                          {acting ? <Spinner /> : "Confirm Cancel"}
                        </button>
                        <button
                          className={styles.cancelAbort}
                          onClick={() => setShowCancel(false)}
                        >
                          Keep Booking
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Raise dispute — show for active bookings */}
                  {["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(
                    booking.status,
                  ) && (
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
                      style={{
                        borderColor: "var(--red)",
                        color: "var(--red)",
                        marginTop: "0.5rem",
                      }}
                      onClick={() => setShowDispute(true)}
                    >
                      ⚠️ Raise a Dispute
                    </button>
                  )}

                  {/* Dispute modal */}
                  {showDispute && (
                    <RaiseDisputeModal
                      bookingId={booking.id}
                      bookingTitle={booking.title}
                      onClose={() => setShowDispute(false)}
                      onSuccess={() =>
                        setSuccess(
                          "Dispute raised. Our team will review within 24–48 hours.",
                        )
                      }
                    />
                  )}
                </>
              )}
              {!isHirer && !isWorker && (
                <p className={styles.noActions}>No actions available.</p>
              )}
              {(booking.status === "COMPLETED" ||
                booking.status === "CANCELLED") &&
                !booking.review && (
                  <Link
                    to={`/bookings/${booking.id}/review`}
                    className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
                  >
                    ⭐ Leave a Review
                  </Link>
                )}
            </div>

            {/* Cancel reason */}
            {booking.cancelReason && (
              <div className={styles.cancelReasonCard}>
                <p className={styles.cancelReasonLabel}>Cancellation reason</p>
                <p className={styles.cancelReasonText}>
                  {booking.cancelReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function DetailItem({ icon, label, value, accent }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <p className={styles.detailLabel}>{label}</p>
        <p
          className={`${styles.detailValue} ${accent ? styles.detailAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, outline, loading, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${outline ? styles[`actionBtn_outline`] : styles[`actionBtn_${color}`]}`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : label}
    </button>
  );
}

function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}

function DetailSkeleton({ Layout }) {
  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.skBack} />
        <div className={styles.layout}>
          <div className={styles.skMain} />
          <div className={styles.skSide} />
        </div>
      </div>
    </Layout>
  );
}

function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>🔍</span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link to="/bookings" className={styles.back}>
          ← Back to Bookings
        </Link>
      </div>
    </div>
  );
}
