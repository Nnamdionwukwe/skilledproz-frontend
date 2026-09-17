import styles from "./PostCardSkeleton.module.css";

export default function PostCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      {/* Header */}
      <div className={styles.header}>
        <div className={`${styles.skeleton} ${styles.avatar}`} />
        <div className={styles.authorInfo}>
          <div className={`${styles.skeleton} ${styles.nameLine}`} />
          <div className={`${styles.skeleton} ${styles.titleLine}`} />
          <div className={`${styles.skeleton} ${styles.timeLine}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.deleteBtn}`} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={`${styles.skeleton} ${styles.textLine}`} />
        <div className={`${styles.skeleton} ${styles.textLine}`} />
        <div className={`${styles.skeleton} ${styles.textLineShort}`} />
      </div>

      {/* Image block */}
      <div className={styles.imageWrap}>
        <div className={`${styles.skeleton} ${styles.image}`} />
      </div>

      {/* Count row */}
      <div className={styles.countRow}>
        <div className={`${styles.skeleton} ${styles.countChip}`} />
        <div className={`${styles.skeleton} ${styles.countChip}`} />
      </div>

      {/* Action bar */}
      <div className={styles.actionBar}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.actionBtn}>
            <div className={`${styles.skeleton} ${styles.actionIcon}`} />
            <div className={`${styles.skeleton} ${styles.actionLabel}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
