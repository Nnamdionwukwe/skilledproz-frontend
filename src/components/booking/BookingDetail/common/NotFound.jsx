import { Link } from "react-router-dom";
import styles from "../BookingDetail.module.css";
export default function NotFound({ backTo = "/bookings" }) {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>🔍</span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link to={backTo} className={styles.back}>
          ← Back to Bookings
        </Link>
      </div>
    </div>
  );
}
