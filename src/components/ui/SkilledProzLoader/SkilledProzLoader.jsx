import styles from "./SkilledProzLoader.module.css";

export default function SkilledProzLoader() {
  return (
    <div className={styles.loaderContainer}>
      {/* ── Animated SkilledProz Logo ── */}
      <div className={styles.logoWrapper}>
        <div className={styles.logoGlow} />
        <img
          src="/skilledproz.PNG"
          alt="SkilledProz"
          className={styles.logoImage}
        />
        <div className={styles.logoRing} />
        <div className={styles.logoRingInner} />
      </div>

      {/* ── Loading Text ── */}
      <p className={styles.loadingText}>Loading...</p>

      {/* ── Progress Bar ── */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar} />
      </div>

      {/* ── Brand Tagline ── */}
      <p className={styles.tagline}>
        Connecting skilled professionals worldwide
      </p>
    </div>
  );
}
