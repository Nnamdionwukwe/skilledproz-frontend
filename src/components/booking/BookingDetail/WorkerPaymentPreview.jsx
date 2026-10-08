import {
  FaMoneyBillWave,
  FaClock,
  FaHandshake,
  FaInfoCircle,
} from "react-icons/fa";
import styles from "./BookingDetail.module.css";
import { calcPricing } from "../../../utils/pricing";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WorkerPaymentPreview({ booking, isWorker }) {
  if (!isWorker) return null;

  const p = calcPricing(booking);
  const currency = p.currency || "NGN";
  const subtotal = p.subtotal;
  const platformFee = p.hirerFee;
  const workerPayout = p.workerPayout;

  const unitLabel = p.unitLabel || "unit";
  const unitSuffix = p.unitSuffix || "";

  // ── Job-post booking flag ──
  const isJobPostBooking = booking?.source === "JOB_POST";

  // Human-friendly duration string for job-post bookings
  const realDurationText =
    booking?.estimatedValue && booking?.estimatedUnit
      ? `${booking.estimatedValue} ${
          {
            hours: booking.estimatedValue == 1 ? "hour" : "hours",
            days: booking.estimatedValue == 1 ? "day" : "days",
            weeks: booking.estimatedValue == 1 ? "week" : "weeks",
            months: booking.estimatedValue == 1 ? "month" : "months",
            years: booking.estimatedValue == 1 ? "year" : "years",
            custom: "",
          }[booking.estimatedUnit] || booking.estimatedUnit
        }`
      : null;

  return (
    <div className={styles.workerPaymentPreview}>
      <div className={styles.workerPaymentHeader}>
        <FaMoneyBillWave className={styles.workerPaymentIcon} />
        <h3 className={styles.workerPaymentTitle}>
          {isJobPostBooking
            ? "Your Earnings (From Job Post)"
            : "Your Earnings Estimate"}
        </h3>
        <span className={styles.workerPaymentBadge}>Before accepting</span>
      </div>

      <div className={styles.workerPaymentBody}>
        <div className={styles.workerPaymentRow}>
          <span className={styles.workerPaymentLabel}>
            {isJobPostBooking ? "Agreed Total" : "Agreed Rate"}
          </span>
          <span className={styles.workerPaymentValue}>
            {formatPrice(p.agreedRate, currency)}
            {/* Only show the /hr suffix for direct bookings — the job-post
                amount is already the total */}
            {!isJobPostBooking && unitSuffix}
          </span>
        </div>

        {/* Real duration for job-post bookings */}
        {isJobPostBooking && realDurationText && (
          <div className={styles.workerPaymentRow}>
            <span className={styles.workerPaymentLabel}>Duration</span>
            <span className={styles.workerPaymentValue}>
              {realDurationText}
              {booking.estimatedHours && (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 11,
                    marginLeft: 4,
                  }}
                >
                  (≈ {booking.estimatedHours}h)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Duration & subtotal for direct bookings */}
        {!isJobPostBooking && p.hasQty && (
          <div className={styles.workerPaymentRow}>
            <span className={styles.workerPaymentLabel}>Duration</span>
            <span className={styles.workerPaymentValue}>
              {p.qty} {unitLabel}
              {p.qty !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {!isJobPostBooking && p.hasQty && (
          <div className={styles.workerPaymentRow}>
            <span className={styles.workerPaymentLabel}>
              Subtotal ({p.qty} × {formatPrice(p.agreedRate, currency)})
            </span>
            <span className={styles.workerPaymentValue}>
              {formatPrice(subtotal, currency)}
            </span>
          </div>
        )}

        {booking.isNegotiated && booking.negotiatedRate && (
          <div className={styles.workerPaymentRow}>
            <span className={styles.workerPaymentLabel}>
              <FaHandshake style={{ marginRight: "4px" }} /> Negotiated Rate
            </span>
            <span className={styles.workerPaymentValue}>
              {formatPrice(booking.negotiatedRate, currency)}
              {!isJobPostBooking && unitSuffix}
            </span>
          </div>
        )}

        <div className={styles.workerPaymentDivider} />

        <div className={styles.workerPaymentRow}>
          <span className={styles.workerPaymentLabel}>
            Platform Fee (5%)
            <span className={styles.workerPaymentNote}>(paid by hirer)</span>
          </span>
          <span className={styles.workerPaymentValue}>
            + {formatPrice(platformFee, currency)}
          </span>
        </div>

        <div className={styles.workerPaymentDivider} />

        <div
          className={`${styles.workerPaymentRow} ${styles.workerPaymentTotal}`}
        >
          <span className={styles.workerPaymentLabelTotal}>
            <FaMoneyBillWave style={{ marginRight: "6px" }} />
            You Earn
          </span>
          <span className={styles.workerPaymentValueTotal}>
            {formatPrice(workerPayout, currency)}
          </span>
        </div>

        <div className={styles.workerPaymentNoteBox}>
          <FaInfoCircle />
          <p>
            This is the amount you will receive after the job is completed and
            the hirer releases payment. The platform fee is covered by the
            hirer.
          </p>
        </div>
      </div>
    </div>
  );
}
