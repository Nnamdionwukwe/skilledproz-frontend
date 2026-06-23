import styles from "./BookingDetail.module.css";
export default function SosBanner({
  booking,
  isHirer,
  resolvingSOS,
  onResolve,
}) {
  return (
    <div className={styles.sosBanner}>
      <span className={styles.sosBannerIcon}>🆘</span>
      <div className={styles.sosBannerBody}>
        <p className={styles.sosBannerTitle}>SOS Alert Active</p>
        <p className={styles.sosBannerDesc}>
          The worker has triggered an emergency alert.{" "}
          {booking.sosActivatedAt && (
            <>
              Activated {new Date(booking.sosActivatedAt).toLocaleTimeString()}
            </>
          )}
        </p>
      </div>
      {(isHirer || false) && (
        <button
          className={styles.sosResolveBtn}
          onClick={onResolve}
          disabled={resolvingSOS}
        >
          {resolvingSOS ? "Resolving…" : "Mark Resolved"}
        </button>
      )}
    </div>
  );
}
