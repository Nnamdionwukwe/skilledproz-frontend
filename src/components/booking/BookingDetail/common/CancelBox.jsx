import styles from "../BookingDetail.module.css";
import Spinner from "./Spinner";
export default function CancelBox({
  show,
  reason,
  reasonError,
  acting,
  onOpen,
  onClose,
  onChangeReason,
  onConfirm,
}) {
  if (!show)
    return (
      <button
        className={`${styles.actionBtn} ${styles.actionBtn_redOutline}`}
        onClick={onOpen}
      >
        Cancel Booking
      </button>
    );
  return (
    <div className={styles.cancelBox}>
      <p className={styles.cancelBoxTitle}>
        Reason <span className={styles.cancelRequired}>*</span>
      </p>
      <textarea
        className={`${styles.cancelInput} ${reasonError ? styles.cancelInputError : ""}`}
        placeholder="Please explain why you are cancelling…"
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
