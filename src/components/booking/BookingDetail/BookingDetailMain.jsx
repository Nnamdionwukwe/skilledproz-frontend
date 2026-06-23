import { Link } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import Translator from "../../common/Translator";

// ── Inline helpers ──────────────────────────────────────────────────────
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

function GpsCard({ title, dotColor, timestamp, lat, lng, distKm, cardClass }) {
  const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <div className={`${styles.gpsCard} ${cardClass}`}>
      <div className={styles.gpsCardHeader}>
        <span className={styles.gpsCardDot} style={{ background: dotColor }} />
        <span className={styles.gpsCardTitle}>{title}</span>
        {timestamp && (
          <span className={styles.gpsCardTime}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ·{" "}
            {new Date(timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div className={styles.gpsCoordRow}>
        <span className={styles.gpsCoordLabel}>Coordinates</span>
        <span className={styles.gpsCoordValue}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
      {distKm !== null && (
        <div
          className={`${styles.gpsDistRow} ${distKm > 1 ? styles.gpsDistFar : styles.gpsDistNear}`}
        >
          <span>{distKm < 0.1 ? "✅" : distKm > 1 ? "⚠️" : "📏"}</span>
          <span>
            {distKm < 0.1
              ? "Worker was at the job site"
              : `${distKm.toFixed(2)} km from job site`}
          </span>
        </div>
      )}
      <a
        href={mapsUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className={styles.gpsMapLink}
      >
        🗺️ View on Google Maps
      </a>
    </div>
  );
}

export default function BookingDetailMain({
  booking,
  step,
  dur,
  mapsUrl,
  calcDuration,
  hasCheckInGps,
  hasCheckOutGps,
  checkInDistKm,
  checkOutDistKm,
  reviewCheckDone,
  hasReviewed,
  bookingId,
  invoiceLoading,
  onDownloadInvoice,
  onRefund,
  refundLoading,
  isHirer,
  paymentStatus,
  isWorker,
  workerName,
}) {
  const STATUS_META = {
    PENDING: { label: "Pending", color: "yellow" },
    ACCEPTED: { label: "Accepted", color: "orange" },
    IN_PROGRESS: { label: "In Progress", color: "indigo" },
    COMPLETED: { label: "Completed", color: "green" },
    CANCELLED: { label: "Cancelled", color: "red" },
    DISPUTED: { label: "Disputed", color: "rose" },
  };
  const meta = STATUS_META[booking.status] || {};
  const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

  const JOB_TYPES = {
    FULL_TIME: { icon: "💼", label: "Full-time" },
    PART_TIME: { icon: "⏰", label: "Part-time" },
    CONTRACT: { icon: "📄", label: "Contract" },
    TEMPORARY: { icon: "⏳", label: "Temporary" },
  };
  const LOC_TYPES = {
    REMOTE: { icon: "🌐", label: "Remote" },
    ON_SITE: { icon: "📍", label: "On-site" },
    HYBRID: { icon: "🔀", label: "Hybrid" },
  };

  return (
    <>
      {/* Title block */}
      <div className={styles.titleBlock}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{booking.title}</h1>
          <span className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}>
            {meta.label}
          </span>
        </div>
        {booking.category && (
          <span className={styles.categoryPill}>{booking.category.name}</span>
        )}
        {booking.isNegotiated && (
          <span className={styles.negotiatedPill}>💬 Negotiated rate</span>
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

      {/* Pending banner */}
      {booking.status === "PENDING" && isWorker && (
        <div className={styles.pendingBanner}>
          <div className={styles.pendingBannerPulse}>
            <span className={styles.pendingBannerDot} />
          </div>
          <div className={styles.pendingBannerBody}>
            <p className={styles.pendingBannerTitle}>
              ⏳ Waiting for {workerName || "the worker"} to respond
            </p>
            <p className={styles.pendingBannerDesc}>
              Your booking request has been sent. {workerName} hasn't accepted
              yet — you'll be notified the moment they do. You can cancel for
              free until they accept.
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <Translator text={booking.description} />
        {booking.notes && (
          <div className={styles.notes}>
            <span className={styles.notesIcon}>📝</span>
            <p>{booking.notes}</p>
          </div>
        )}
      </section>

      {/* Job Details */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Job Details</h2>
        <div className={styles.detailGrid}>
          <DetailItem
            icon="📅"
            label="Scheduled"
            value={
              new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }) +
              " at " +
              new Date(booking.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          {booking.address && (
            <DetailItem
              icon="📍"
              label="Job Site Address"
              value={
                <>
                  {booking.address}
                  {booking.latitude && booking.longitude && (
                    <a
                      href={mapsUrl(booking.latitude, booking.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.mapLink}
                    >
                      {" "}
                      View map ↗
                    </a>
                  )}
                </>
              }
            />
          )}
          <DetailItem
            icon="💰"
            label="Agreed Rate"
            value={`${booking.currency} ${booking.agreedRate?.toLocaleString()}`}
            accent
          />
          {booking.isNegotiated && booking.negotiationNote && (
            <DetailItem
              icon="💬"
              label="Negotiation Note"
              value={booking.negotiationNote}
            />
          )}
          {dur && (
            <DetailItem
              icon="⏱️"
              label="Est. Duration"
              value={
                <>
                  {dur.main}
                  {dur.sub && (
                    <span className={styles.durationSub}> {dur.sub}</span>
                  )}
                </>
              }
            />
          )}
          {booking.checkInAt && (
            <DetailItem
              icon="✅"
              label="Checked In"
              value={
                <span className={styles.greenText}>
                  {new Date(booking.checkInAt).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              }
            />
          )}
          {booking.checkOutAt && (
            <DetailItem
              icon="🏁"
              label="Checked Out"
              value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}
          {booking.checkInAt && booking.checkOutAt && (
            <DetailItem
              icon="🕐"
              label="Actual Duration"
              value={calcDuration(booking.checkInAt, booking.checkOutAt)}
            />
          )}
          {booking.insurancePolicyNumber && (
            <DetailItem
              icon="🛡️"
              label="Insurance"
              value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insurancePolicyNumber}`}
            />
          )}
          {booking.jobType && (
            <DetailItem
              icon={
                booking.jobType === "FULL_TIME"
                  ? "💼"
                  : booking.jobType === "PART_TIME"
                    ? "⏰"
                    : booking.jobType === "CONTRACT"
                      ? "📄"
                      : "⏳"
              }
              label="Job Type"
              value={
                booking.jobType === "FULL_TIME"
                  ? "Full-time"
                  : booking.jobType === "PART_TIME"
                    ? "Part-time"
                    : booking.jobType === "CONTRACT"
                      ? "Contract"
                      : "Temporary"
              }
            />
          )}
          {booking.locationType && (
            <DetailItem
              icon={
                booking.locationType === "REMOTE"
                  ? "🌐"
                  : booking.locationType === "ON_SITE"
                    ? "📍"
                    : "🔀"
              }
              label="Location Type"
              value={
                booking.locationType === "REMOTE"
                  ? "Remote"
                  : booking.locationType === "ON_SITE"
                    ? "On-site"
                    : "Hybrid"
              }
            />
          )}
        </div>

        {/* Job Type / Location Type cards */}
        {(booking.jobType || booking.locationType) && (
          <div style={{ marginTop: "1rem" }}>
            {booking.jobType && (
              <div className={styles.typeCardGroup}>
                <p className={styles.typeCardGroupLabel}>Job Type</p>
                <div className={styles.typeCards}>
                  {Object.entries(JOB_TYPES).map(([key, cfg]) => (
                    <div
                      key={key}
                      className={`${styles.typeCard} ${booking.jobType === key ? styles.typeCardActive : styles.typeCardInactive}`}
                    >
                      {booking.jobType === key && (
                        <span className={styles.typeCardSelectedDot} />
                      )}
                      <span className={styles.typeCardIcon}>{cfg.icon}</span>
                      <span className={styles.typeCardLabel}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {booking.locationType && (
              <div
                className={styles.typeCardGroup}
                style={{ marginTop: "1.25rem" }}
              >
                <p className={styles.typeCardGroupLabel}>Location Type</p>
                <div className={styles.typeCards}>
                  {Object.entries(LOC_TYPES).map(([key, cfg]) => (
                    <div
                      key={key}
                      className={`${styles.typeCard} ${styles.typeCardLoc} ${booking.locationType === key ? styles.typeCardActive : styles.typeCardInactive}`}
                    >
                      {booking.locationType === key && (
                        <span className={styles.typeCardSelectedDot} />
                      )}
                      <span className={styles.typeCardIcon}>{cfg.icon}</span>
                      <span className={styles.typeCardLabel}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
                {booking.locationType === "REMOTE" && (
                  <div className={styles.locationRemoteNote}>
                    🌐 This is a remote engagement — no physical job site
                    attendance required.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* GPS section */}
      {(hasCheckInGps || hasCheckOutGps) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Worker Location</h2>
          <p className={styles.gpsNote}>
            GPS recorded at check-in and check-out. Visible to both parties.
          </p>
          <div className={styles.gpsCards}>
            {hasCheckInGps && (
              <GpsCard
                title="Check-in Location"
                dotColor="#16a34a"
                timestamp={booking.checkInAt}
                lat={booking.checkInLat}
                lng={booking.checkInLng}
                distKm={checkInDistKm}
                cardClass={styles.gpsCardIn}
              />
            )}
            {hasCheckOutGps && (
              <GpsCard
                title="Check-out Location"
                dotColor="#dc2626"
                timestamp={booking.checkOutAt}
                lat={booking.checkOutLat}
                lng={booking.checkOutLng}
                distKm={checkOutDistKm}
                cardClass={styles.gpsCardOut}
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
                        {review.giver?.firstName} {review.giver?.lastName}{" "}
                        <span className={styles.reviewerRole}>
                          ·{" "}
                          {review.giver?.role === "HIRER" ? "Hirer" : "Worker"}
                        </span>
                      </p>
                      <p className={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short", year: "numeric" },
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
                    <p className={styles.reviewComment}>"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {reviewCheckDone && !hasReviewed && (
            <Link
              to={`/bookings/${bookingId}/review`}
              className={`${styles.actionBtn} ${styles.actionBtn_outline}`}
              style={{ display: "inline-flex", marginTop: "1rem" }}
            >
              ⭐ Leave a Review
            </Link>
          )}
          {reviewCheckDone && hasReviewed && (
            <div className={styles.reviewedNote}>
              ✅ Your review has been submitted.{" "}
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
            <p className={styles.cancelReasonText}>{booking.cancelReason}</p>
          </div>
        </section>
      )}

      {/* Bottom actions (invoice & refund) */}
      {booking.status === "COMPLETED" && (
        <div className={styles.bottomActions}>
          <button
            className={styles.invoiceBtn}
            onClick={onDownloadInvoice}
            disabled={invoiceLoading}
          >
            {invoiceLoading ? "⏳" : "📄"} Download Invoice
          </button>
          {isHirer && paymentStatus === "RELEASED" && (
            <button
              className={styles.refundBtn}
              onClick={onRefund}
              disabled={refundLoading}
            >
              {refundLoading ? "Processing…" : "↩ Request Refund"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
