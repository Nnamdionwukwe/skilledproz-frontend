import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import styles from "./DashboardPlaceholder.module.css";

export default function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>SP</span>
          <span className={styles.logoName}>SkilledProz</span>
        </div>
        <div className={styles.badge}>
          {user?.role === "WORKER" ? "🔧 Worker" : "💼 Hirer"}
        </div>
        <h1 className={styles.title}>Welcome, {user?.firstName}!</h1>
        <p className={styles.sub}>
          Your account is active. The full dashboard is coming in Phase 2.
        </p>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Role</span>
            <span className={styles.infoValue}>{user?.role}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Verified</span>
            <span className={styles.infoValue}>
              {user?.isEmailVerified ? "✅ Yes" : "⚠️ No"}
            </span>
          </div>
        </div>
        <div className={styles.phases}>
          <div className={`${styles.phase} ${styles.phaseDone}`}>
            <span className={styles.phaseIcon}>✓</span>
            <span>Phase 1 — Auth &amp; Foundation</span>
          </div>
          <div className={`${styles.phase} ${styles.phaseNext}`}>
            <span className={styles.phaseIcon}>→</span>
            <span>Phase 2 — Search &amp; Discovery</span>
          </div>
          <div className={styles.phase}>
            <span className={styles.phaseIcon}>·</span>
            <span>Phase 3 — Booking Flow</span>
          </div>
          <div className={styles.phase}>
            <span className={styles.phaseIcon}>·</span>
            <span>Phase 4 — Dashboards</span>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
