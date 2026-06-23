import styles from "./BookingDetail.module.css";
const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];
export default function Timeline({ step }) {
  return (
    <div className={styles.timelineWrap}>
      <div className={styles.timeline}>
        {TIMELINE_STEPS.map((s, i) => (
          <div key={s} className={styles.timelineItem}>
            <div
              className={`${styles.timelineDot} ${i <= step ? styles.timelineDotActive : ""} ${i === step ? styles.timelineDotCurrent : ""}`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`${styles.timelineLabel} ${i <= step ? styles.timelineLabelActive : ""}`}
            >
              {s}
            </span>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`${styles.timelineLine} ${i < step ? styles.timelineLineActive : ""}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
