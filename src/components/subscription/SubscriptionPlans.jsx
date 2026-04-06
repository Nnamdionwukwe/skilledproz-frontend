import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./SubscriptionPlans.module.css";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";

export default function SubscriptionPlans({ onClose }) {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  useEffect(() => {
    Promise.all([
      api.get(`/subscriptions/plans?role=${user?.role}`),
      api.get("/subscriptions/my"),
    ])
      .then(([plansRes, myRes]) => {
        setPlans(plansRes.data.data.plans || []);
        setCurrent(myRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    setError("");
    try {
      const res = await api.post("/subscriptions/checkout", { planId });
      // Redirect to Stripe Checkout
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start checkout.");
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription?")) return;
    try {
      await api.post("/subscriptions/cancel");
      setSuccess("Subscription cancelled.");
      const myRes = await api.get("/subscriptions/my");
      setCurrent(myRes.data.data);
    } catch {
      setError("Failed to cancel.");
    }
  };

  return (
    <Layout>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Choose Your Plan</h2>
            <p className={styles.sub}>
              {user?.role === "WORKER"
                ? "Boost your profile and win more jobs"
                : "Hire smarter, faster, and at scale"}
            </p>
          </div>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {/* Current plan banner */}
        {current && current.subscription?.tier !== "FREE" && (
          <div className={styles.currentBanner}>
            <span>✅</span>
            <div>
              <p className={styles.currentTitle}>
                Active: <strong>{current.plan?.name}</strong>
              </p>
              {current.expiresAt && (
                <p className={styles.currentExpiry}>
                  Renews{" "}
                  {new Date(current.expiresAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <button className={styles.cancelLink} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}
        {success && <div className={styles.successBox}>✅ {success}</div>}

        {loading ? (
          <div className={styles.plansGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.plansGrid}>
            {plans.map((plan) => {
              const isCurrent = current?.subscription?.tier === plan.tier;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`${styles.planCard} ${isPopular ? styles.planPopular : ""} ${isCurrent ? styles.planCurrent : ""}`}
                >
                  {isPopular && (
                    <div className={styles.popularBadge}>Most Popular</div>
                  )}
                  {isCurrent && (
                    <div className={styles.currentBadge}>Current Plan</div>
                  )}

                  <div className={styles.planTier}>{plan.tier}</div>
                  <h3 className={styles.planName}>{plan.name}</h3>

                  <div className={styles.planPrice}>
                    {plan.price === 0 ? (
                      <span className={styles.priceAmount}>Free</span>
                    ) : (
                      <>
                        <span className={styles.priceCurrency}>
                          {plan.currency}
                        </span>
                        <span className={styles.priceAmount}>
                          {plan.price.toLocaleString()}
                        </span>
                        <span className={styles.pricePer}>/mo</span>
                      </>
                    )}
                  </div>

                  <ul className={styles.featureList}>
                    {plan.features.map((f, i) => (
                      <li key={i}>
                        <span className={styles.featureCheck}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`${styles.planBtn} ${isCurrent ? styles.planBtnCurrent : isPopular ? styles.planBtnPopular : styles.planBtnDefault}`}
                    onClick={() =>
                      !isCurrent && plan.price > 0 && handleSubscribe(plan.id)
                    }
                    disabled={
                      isCurrent || plan.price === 0 || subscribing === plan.id
                    }
                  >
                    {subscribing === plan.id ? (
                      <>
                        <span className={styles.spinner} /> Activating...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : plan.price === 0 ? (
                      "Free Plan"
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className={styles.disclaimer}>
          Payments processed securely. Cancel anytime. All prices in USD.
        </p>
      </div>
    </Layout>
  );
}
