import styles from "../BookingDetail.module.css";
import Spinner from "./Spinner";
export default function ActionBtn({ label, color, loading, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${styles[`actionBtn_${color}`]}`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : label}
    </button>
  );
}
