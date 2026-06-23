import styles from "../BookingDetail.module.css";
export default function PayRow({
  label,
  value,
  muted,
  green,
  capitalize,
  mono,
  extra,
}) {
  return (
    <div className={styles.paymentRow}>
      <span className={styles.payLabel}>{label}</span>
      {extra || (
        <span
          className={[
            styles.payValue,
            muted && styles.payMuted,
            green && styles.payGreen,
            capitalize && styles.payCapitalize,
            mono && styles.payRef,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value}
        </span>
      )}
    </div>
  );
}
