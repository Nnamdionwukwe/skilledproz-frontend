import styles from "./BookingDetail.module.css";
const STATUS_META = {
  /* copy from original */
};
export default function TitleBlock({ booking }) {
  const meta = STATUS_META[booking.status] || {};
  return (
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
  );
}
