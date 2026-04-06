import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import RaiseDisputeModal from "../disputes/RaiseDisputeModal";
import BookingInvoice from "./BookingInvoice";
import GpsCheckIn from "./GpsCheckIn";
import Translator from "../common/Translator";
import InsuranceAddon from "../hirer/InsuranceAddon";
import SOSButton from "./SOSButton";
import EmergencyContact from "./EmergencyContact";
import PaymentOptions from "../payment/PaymentOptions";
import VideoCallButton from "./VideoCallButton";

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};

const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(null);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);
        if (b.status === "COMPLETED") {
          api
            .get(`/reviews/check/${id}`)
            .then((r) => setHasReviewed(r.data.data.hasReviewed))
            .catch(() => setHasReviewed(false))
            .finally(() => setReviewCheckDone(true));
        } else {
          setReviewCheckDone(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (booking?.emergencyContact) {
      try {
        setEmergencyContact(JSON.parse(booking.emergencyContact));
      } catch {
        setEmergencyContact(null);
      }
    }
  }, [booking?.emergencyContact]);

  // 1. Add this useEffect for silent auto-refresh (add after your existing useEffect)
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      api
        .get(`/bookings/${id}`)
        .then((res) => {
          const updated = res.data.data.booking;
          // Only update state if something actually changed — avoids flicker
          setBooking((prev) => {
            if (!prev) return updated;
            if (
              prev.status !== updated.status ||
              prev.payment?.status !== updated.payment?.status
            ) {
              return updated;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 600000); // poll every 600 seconds

    return () => clearInterval(interval);
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
      setCancelReason("");
      setCancelError("");
    } catch (e) {
      setError(e.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setActing(false);
    }
  }

  function handleCancelSubmit() {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason for cancellation.");
      return;
    }
    updateStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  }

  if (loading) return <DetailSkeleton Layout={Layout} />;
  if (!booking) return <NotFound />;

  const meta = STATUS_META[booking.status] || {};
  const step = meta.step ?? 0;
  const isHirer = userId === booking.hirerId;
  const isWorker = userId === booking.workerId;
  const other = isHirer ? booking.worker : booking.hirer;
  const scheduled = new Date(booking.scheduledAt);

  // ── Derived GPS data ────────────────────────────────────────────────────────
  const hasCheckInGps =
    booking.checkInLat != null && booking.checkInLng != null;
  const hasCheckOutGps =
    booking.checkOutLat != null && booking.checkOutLng != null;

  const checkInDistKm =
    hasCheckInGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkInLat,
          booking.checkInLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  const checkOutDistKm =
    hasCheckOutGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkOutLat,
          booking.checkOutLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  return (
    <Layout>
      <div className={styles.page}>
        <Link to="/bookings" className={styles.back}>
          ← Back to Bookings
        </Link>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        <div className={styles.layout}>
          {/* ══ MAIN COLUMN ══ */}
          <div className={styles.main}>
            {/* Title */}
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
              {/* <p className={styles.description}>{booking.description}</p> */}
              <Translator text={booking.description} />
              {booking.notes && (
                <div className={styles.notes}>
                  <span className={styles.notesIcon}>📝</span>
                  <p>{booking.notes}</p>
                </div>
              )}
            </section>

            {/* Job details */}
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
                  label="Job Site Address"
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
                {booking.latitude && booking.longitude && (
                  <DetailItem
                    icon="🗺️"
                    label="Job Site GPS"
                    value={
                      <a
                        href={mapsUrl(booking.latitude, booking.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.gpsLink}
                      >
                        {booking.latitude.toFixed(5)},{" "}
                        {booking.longitude.toFixed(5)} →
                      </a>
                    }
                  />
                )}
              </div>
            </section>

            {/* ══ WORKER GPS LOCATION — visible to BOTH parties ══ */}
            {(hasCheckInGps || hasCheckOutGps) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Worker Location</h2>
                <p className={styles.gpsNote}>
                  GPS coordinates recorded when the worker checked in and out.
                  Visible to both the worker and hirer.
                </p>

                <div className={styles.gpsCards}>
                  {/* Check-in location */}
                  {hasCheckInGps && (
                    <div className={`${styles.gpsCard} ${styles.gpsCardIn}`}>
                      <div className={styles.gpsCardHeader}>
                        <span
                          className={styles.gpsCardDot}
                          style={{ background: "#16a34a" }}
                        />
                        <span className={styles.gpsCardTitle}>
                          Check-in Location
                        </span>
                        <span className={styles.gpsCardTime}>
                          {booking.checkInAt
                            ? new Date(booking.checkInAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                          {booking.checkInAt
                            ? ` · ${new Date(booking.checkInAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                            : ""}
                        </span>
                      </div>

                      <div className={styles.gpsCoordRow}>
                        <span className={styles.gpsCoordLabel}>
                          Coordinates
                        </span>
                        <span className={styles.gpsCoordValue}>
                          {booking.checkInLat.toFixed(5)},{" "}
                          {booking.checkInLng.toFixed(5)}
                        </span>
                      </div>

                      {checkInDistKm !== null && (
                        <div
                          className={`${styles.gpsDistRow} ${checkInDistKm > 1 ? styles.gpsDistFar : styles.gpsDistNear}`}
                        >
                          <span>
                            {checkInDistKm < 0.1
                              ? "✅"
                              : checkInDistKm > 1
                                ? "⚠️"
                                : "📏"}
                          </span>
                          <span>
                            {checkInDistKm < 0.1
                              ? "Worker was at the job site"
                              : `${checkInDistKm.toFixed(2)} km from job site`}
                          </span>
                        </div>
                      )}

                      <a
                        href={mapsUrl(booking.checkInLat, booking.checkInLng)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.gpsMapLink}
                      >
                        🗺️ View on Google Maps
                      </a>
                    </div>
                  )}

                  {/* Check-out location */}
                  {hasCheckOutGps && (
                    <div className={`${styles.gpsCard} ${styles.gpsCardOut}`}>
                      <div className={styles.gpsCardHeader}>
                        <span
                          className={styles.gpsCardDot}
                          style={{ background: "#dc2626" }}
                        />
                        <span className={styles.gpsCardTitle}>
                          Check-out Location
                        </span>
                        <span className={styles.gpsCardTime}>
                          {booking.checkOutAt
                            ? new Date(booking.checkOutAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                          {booking.checkOutAt
                            ? ` · ${new Date(booking.checkOutAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                            : ""}
                        </span>
                      </div>

                      <div className={styles.gpsCoordRow}>
                        <span className={styles.gpsCoordLabel}>
                          Coordinates
                        </span>
                        <span className={styles.gpsCoordValue}>
                          {booking.checkOutLat.toFixed(5)},{" "}
                          {booking.checkOutLng.toFixed(5)}
                        </span>
                      </div>

                      {checkOutDistKm !== null && (
                        <div
                          className={`${styles.gpsDistRow} ${checkOutDistKm > 1 ? styles.gpsDistFar : styles.gpsDistNear}`}
                        >
                          <span>
                            {checkOutDistKm < 0.1
                              ? "✅"
                              : checkOutDistKm > 1
                                ? "⚠️"
                                : "📏"}
                          </span>
                          <span>
                            {checkOutDistKm < 0.1
                              ? "Worker was at the job site"
                              : `${checkOutDistKm.toFixed(2)} km from job site`}
                          </span>
                        </div>
                      )}

                      <a
                        href={mapsUrl(booking.checkOutLat, booking.checkOutLng)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.gpsMapLink}
                      >
                        🗺️ View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Payment */}
            {booking.payment && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Payment</h2>
                <div className={styles.paymentCard}>
                  <PayRow
                    label="Total"
                    value={`${booking.payment.currency} ${booking.payment.amount?.toLocaleString()}`}
                  />
                  <PayRow
                    label="Platform Fee"
                    value={`${booking.payment.currency} ${booking.payment.platformFee?.toLocaleString()}`}
                    muted
                  />
                  <PayRow
                    label="Worker Payout"
                    value={`${booking.payment.currency} ${booking.payment.workerPayout?.toLocaleString()}`}
                    green
                  />
                  <div className={styles.paymentDivider} />
                  <PayRow
                    label="Provider"
                    value={booking.payment.provider}
                    capitalize
                  />
                  <PayRow
                    label="Status"
                    value={booking.payment.status}
                    extra={
                      <span
                        className={`${styles.payStatus} ${styles[`payStatus_${booking.payment.status?.toLowerCase()}`]}`}
                      >
                        {booking.payment.status}
                      </span>
                    }
                  />
                  {booking.payment.providerRef && (
                    <PayRow
                      label="Ref"
                      value={booking.payment.providerRef}
                      mono
                    />
                  )}
                </div>
              </section>
            )}

            {/* Reviews */}
            {booking.status === "COMPLETED" && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Reviews</h2>

                {booking.reviews?.length > 0 && (
                  <div className={styles.reviewsList}>
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
                    {(booking.reviews?.length ?? 0) < 2 &&
                      " Waiting for the other party."}
                  </div>
                )}
              </section>
            )}

            {/* Cancellation reason */}
            {booking.cancelReason && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Cancellation Reason</h2>
                <div className={styles.cancelReasonCard}>
                  <span className={styles.cancelReasonIcon}>⚠️</span>
                  <p className={styles.cancelReasonText}>
                    {booking.cancelReason}
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* ══ SIDEBAR ══ */}
          <div className={styles.sidebar}>
            {/* Other party card */}
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

            {/* Actions card */}
            <div className={styles.actionsCard}>
              <p className={styles.actionsTitle}>Actions</p>

              {/* WORKER ACTIONS */}

              {isWorker && (
                <>
                  {/* ... existing worker actions ... */}

                  <EmergencyContact
                    bookingId={booking.id}
                    bookingStatus={booking.status}
                    isWorker={isWorker}
                    existing={emergencyContact}
                    onSaved={(contact) => setEmergencyContact(contact)}
                  />

                  <SOSButton
                    bookingId={booking.id}
                    bookingStatus={booking.status}
                    isWorker={isWorker}
                    sosActivatedAt={booking.sosActivatedAt}
                    sosResolvedAt={booking.sosResolvedAt}
                    onUpdate={(updatedBooking) =>
                      setBooking((prev) => ({ ...prev, ...updatedBooking }))
                    }
                  />
                </>
              )}
              {isWorker && (
                <>
                  {booking.status === "PENDING" && (
                    <ActionBtn
                      label="Accept Booking"
                      color="green"
                      loading={acting}
                      onClick={() => updateStatus("ACCEPTED")}
                    />
                  )}

                  {/* ✅ Only show GPS check-in when booking is ACCEPTED AND payment is HELD */}
                  {booking.status === "ACCEPTED" &&
                    booking.payment?.status === "HELD" && (
                      <GpsCheckIn
                        bookingId={booking.id}
                        status={booking.status}
                        isWorker={isWorker}
                        jobLatitude={booking.latitude}
                        jobLongitude={booking.longitude}
                        onSuccess={(updatedBooking) => {
                          setBooking((prev) => ({
                            ...prev,
                            ...updatedBooking,
                          }));
                          setSuccess(
                            updatedBooking.status === "IN_PROGRESS"
                              ? "✅ Checked in — job is now in progress."
                              : "✅ Checked out — job marked as completed.",
                          );
                        }}
                      />
                    )}

                  {/* Show this message when accepted but payment not yet received */}
                  {booking.status === "ACCEPTED" &&
                    (!booking.payment ||
                      booking.payment.status === "PENDING") && (
                      <div className={styles.waitingPayment}>
                        ⏳ Waiting for hirer to complete payment before you can
                        check in.
                      </div>
                    )}

                  {/* Check-out is available once IN_PROGRESS */}
                  {booking.status === "IN_PROGRESS" && (
                    <GpsCheckIn
                      bookingId={booking.id}
                      status={booking.status}
                      isWorker={isWorker}
                      jobLatitude={booking.latitude}
                      jobLongitude={booking.longitude}
                      onSuccess={(updatedBooking) => {
                        setBooking((prev) => ({ ...prev, ...updatedBooking }));
                        setSuccess("✅ Checked out — job marked as completed.");
                      }}
                    />
                  )}

                  {["PENDING", "ACCEPTED"].includes(booking.status) && (
                    <CancelBox
                      label="Cancel Booking"
                      show={showCancel}
                      reason={cancelReason}
                      reasonError={cancelError}
                      acting={acting}
                      onOpen={() => {
                        setShowCancel(true);
                        setCancelError("");
                      }}
                      onClose={() => {
                        setShowCancel(false);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      onChangeReason={(v) => {
                        setCancelReason(v);
                        setCancelError("");
                      }}
                      onConfirm={handleCancelSubmit}
                    />
                  )}
                </>
              )}

              {/* ── HIRER ACTIONS ── */}
              {isHirer && (
                <>
                  {booking.status === "ACCEPTED" && !booking.payment && (
                    <>
                      <Link
                        to={`/bookings/${booking.id}/pay`}
                        className={`${styles.actionBtn} ${styles.actionBtn_orange}`}
                      >
                        Pay Now With 💳
                      </Link>

                      <PaymentOptions
                        booking={booking}
                        onSuccess={() =>
                          setSuccess("Payment submitted successfully.")
                        }
                      />
                    </>
                  )}

                  {/* Inside actionsCard, after hirer pay button */}
                  {isHirer && booking.status === "ACCEPTED" && (
                    <InsuranceAddon
                      bookingId={booking.id}
                      onPurchased={() =>
                        setSuccess("Insurance activated for this booking.")
                      }
                    />
                  )}

                  {booking.payment?.status === "HELD" && (
                    <Link
                      to={`/bookings/${booking.id}/release`}
                      className={`${styles.actionBtn} ${styles.actionBtn_green}`}
                    >
                      💸 Release Payment
                    </Link>
                  )}

                  {/* Hirer can cancel PENDING or ACCEPTED */}
                  {["PENDING", "ACCEPTED"].includes(booking.status) && (
                    <CancelBox
                      label="Cancel Booking"
                      show={showCancel}
                      reason={cancelReason}
                      reasonError={cancelError}
                      acting={acting}
                      onOpen={() => {
                        setShowCancel(true);
                        setCancelError("");
                      }}
                      onClose={() => {
                        setShowCancel(false);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      onChangeReason={(v) => {
                        setCancelReason(v);
                        setCancelError("");
                      }}
                      onConfirm={handleCancelSubmit}
                    />
                  )}
                </>
              )}

              {isHirer && booking.status === "ACCEPTED" && (
                <InsuranceAddon
                  bookingId={booking.id}
                  booking={booking}
                  onPurchased={() => setSuccess("Insurance activated.")}
                />
              )}

              {/* ── DISPUTE — both roles ── */}
              {(isHirer || isWorker) &&
                ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(
                  booking.status,
                ) && (
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
                    style={{ borderColor: "var(--red)", color: "var(--red)" }}
                    onClick={() => setShowDispute(true)}
                  >
                    ⚠️ Raise a Dispute
                  </button>
                )}

              {!isHirer && !isWorker && (
                <p className={styles.noActions}>No actions available.</p>
              )}
            </div>

            {/* Invoice */}
            {booking.status === "COMPLETED" && booking.payment && (
              <BookingInvoice booking={booking} />
            )}
          </div>
        </div>
      </div>

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
    </Layout>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────*/

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

function PayRow({ label, value, muted, green, capitalize, mono, extra }) {
  return (
    <div className={styles.paymentRow}>
      <span className={styles.payLabel}>{label}</span>
      {extra || (
        <span
          className={`${styles.payValue} ${muted ? styles.payMuted : ""} ${green ? styles.payGreen : ""} ${capitalize ? styles.payCapitalize : ""} ${mono ? styles.payRef : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function CancelBox({
  label,
  show,
  reason,
  reasonError,
  acting,
  onOpen,
  onClose,
  onChangeReason,
  onConfirm,
}) {
  if (!show) {
    return (
      <button
        className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
        style={{ borderColor: "var(--red)", color: "var(--red)" }}
        onClick={onOpen}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={styles.cancelBox}>
      <p className={styles.cancelBoxTitle}>
        Reason for cancellation <span className={styles.cancelRequired}>*</span>
      </p>
      <textarea
        className={`${styles.cancelInput} ${reasonError ? styles.cancelInputError : ""}`}
        placeholder="Please explain why you are cancelling this booking…"
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        rows={3}
      />
      {reasonError && <p className={styles.cancelFieldError}>{reasonError}</p>}
      <div className={styles.cancelRow}>
        <button
          className={styles.cancelConfirm}
          disabled={acting}
          onClick={onConfirm}
        >
          {acting ? <Spinner /> : "Confirm Cancellation"}
        </button>
        <button className={styles.cancelAbort} onClick={onClose}>
          Keep Booking
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, outline, loading, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${outline ? styles.actionBtn_outline : styles[`actionBtn_${color}`]}`}
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
