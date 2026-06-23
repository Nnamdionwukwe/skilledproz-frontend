import styles from "./BookingDetail.module.css";
export default function PendingBanner({ workerName }) {
  return (
    <div className={styles.pendingBanner}>
      <div className={styles.pendingBannerPulse}>
        <span className={styles.pendingBannerDot} />
      </div>
      <div className={styles.pendingBannerBody}>
        <p className={styles.pendingBannerTitle}>
          ⏳ Waiting for {workerName || "the worker"} to respond
        </p>
        <p className={styles.pendingBannerDesc}>
          Your booking request has been sent. {workerName} hasn't accepted yet —
          you'll be notified the moment they do. You can cancel for free until
          they accept.
        </p>
      </div>
    </div>
  );
}
