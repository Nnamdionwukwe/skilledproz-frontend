import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import styles from "./FeatureGate.module.css";
import { useSubscription } from "../context/SubscriptionContext";

export default function FeatureGate({ feature, children, fallback }) {
  const { features, isFreeTier } = useSubscription();
  const { user } = useAuthStore();

  if (features[feature]) return children;

  if (fallback) return fallback;

  return (
    <div className={styles.gate}>
      <div className={styles.gateIcon}>⭐</div>
      <p className={styles.gateTitle}>Pro Feature</p>
      <p className={styles.gateSub}>Upgrade your plan to unlock this feature</p>
      <Link
        to={`/dashboard/${user?.role?.toLowerCase()}/subscription`}
        className={styles.gateBtn}
      >
        Upgrade Now →
      </Link>
    </div>
  );
}
