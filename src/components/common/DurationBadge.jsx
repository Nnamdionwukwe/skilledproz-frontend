import { formatJobDurationParts } from "../utils/formatDuration";
import styles from "./DurationBadge.module.css";

export default function DurationBadge({ job, size = "md" }) {
  const parts = formatJobDurationParts(job);
  if (!parts) return null;

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      <span className={styles.icon}>{parts.icon}</span>
      <span className={styles.primary}>{parts.primary}</span>
      {parts.equivalents.length > 0 && (
        <span className={styles.equiv}>
          ({parts.equivalents.map((e) => e.label).join(", ")})
        </span>
      )}
    </div>
  );
}
