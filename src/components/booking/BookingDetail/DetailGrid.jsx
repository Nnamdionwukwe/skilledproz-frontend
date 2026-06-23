import styles from "./BookingDetail.module.css";
import { DetailItem } from "./common";
import FeeBreakdown from "./FeeBreakdown";

export default function DetailGrid({
  booking,
  dur,
  mapsUrl,
  calcDuration,
  feeBreakdown,
  referralDiscount,
  referralApplied,
  onReferralToggle,
}) {
  // ─── Job Type config ──────────────────────────────────────────────────────
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
      {/* ─── Job Details Grid ────────────────────────────────────────────── */}
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
      </section>

      {/* ─── Job Type & Location Type Cards ─────────────────────────────── */}
      {(booking.jobType || booking.locationType) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Job Type &amp; Location</h2>

          {/* Job Type Cards */}
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

          {/* Location Type Cards */}
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
              {/* Remote note */}
              {booking.locationType === "REMOTE" && (
                <div className={styles.locationRemoteNote}>
                  🌐 This is a remote engagement — no physical job site
                  attendance required.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Fee Breakdown ────────────────────────────────────────────────── */}
      {feeBreakdown && (
        <FeeBreakdown
          feeBreakdown={feeBreakdown}
          referralDiscount={referralDiscount}
          referralApplied={referralApplied}
          onReferralToggle={onReferralToggle}
          currency={booking.currency}
        />
      )}
    </>
  );
}
