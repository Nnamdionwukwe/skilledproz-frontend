// src/components/booking/BookingDetail/WorkerPaymentPreview.jsx
import {
  FaMoneyBillWave,
  FaClock,
  FaHandshake,
  FaInfoCircle,
} from "react-icons/fa";
import styles from "./BookingDetail.module.css";
import { calcPricing } from "../../utils/pricing";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WorkerPaymentPreview({ booking }) {
  const p = calcPricing(booking);
  const currency = p.currency || "NGN";
  const subtotal = p.subtotal;
  const platformFee = p.hirerFee; // fee paid by hirer
  const workerPayout = p.workerPayout; // what worker earns

  // Determine unit label for display
  const unitLabel = p.unitLabel || "unit";
  const unitSuffix = p.unitSuffix || "";

  return (
    <div className={styles.workerPaymentPreview}>
      <div className={styles.workerPaymentHeader}>
        <FaMoneyBillWave className={styles.workerPaymentIcon} />
        <h3 className={styles.workerPaymentTitle}>Your Earnings Estimate</h3>
        <span className={styles.workerPaymentBadge}>Before accepting</span>
      </div>

      <div className={styles.workerPaymentBody}>
        <div className={styles.workerPaymentRow}>
          <span className={styles.workerPaymentLabel}>Agreed Rate</span>
          <span className={styles.workerPaymentValue}>
            {formatPrice(p.agreedRate, currency)}
            {unitSuffix}
          </span>
        </div>

        {p.hasQty && (
          <div className={styles.workerPaymentRow}>
            <span className={styles.workerPaymentLabel}>Duration</span>
            <span className={styles.workerPaymentValue}>
              {p.qty} {unitLabel}
              {p.qty !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {p.hasQty && (
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
              {unitSuffix}
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
