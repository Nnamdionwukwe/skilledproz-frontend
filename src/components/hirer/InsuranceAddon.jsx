import { useState, useEffect } from "react";
import api from "../../lib/api";
import styles from "./InsuranceAddon.module.css";

export default function InsuranceAddon({ bookingId, booking, onPurchased }) {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const isInsured = !!booking?.insuranceRef;

  useEffect(() => {
    api
      .get("/insurance/plans")
      .then((res) => setPlans(res.data.data.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async () => {
    if (!selected) return;
    setPurchasing(true);
    setError("");
    try {
      const res = await api.post("/insurance/checkout", {
        planId: selected,
        bookingId: bookingId || null,
      });
      // Redirect to Stripe
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed.");
      setPurchasing(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selected);

  // ── Already insured badge ──
  if (isInsured) {
    return (
      <div className={styles.insuredBadge}>
        <span>🛡️</span>
        <div>
          <p className={styles.insuredTitle}>
            Insured: {booking.insurancePlan}
          </p>
          <p className={styles.insuredRef}>Ref: {booking.insuranceRef}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.triggerIcon}>🛡️</span>
        <div className={styles.triggerText}>
          <span className={styles.triggerTitle}>Add Insurance Cover</span>
          <span className={styles.triggerSub}>
            Protect your property — charged in USD
          </span>
        </div>
        <span className={styles.triggerChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Choose a plan</p>
          <p className={styles.panelSub}>
            One-time cover for this booking. Paid securely via Stripe.
          </p>

          {loading ? (
            <div className={styles.plansGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.planSkeleton} />
              ))}
            </div>
          ) : (
            <div className={styles.plansGrid}>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  className={`${styles.planCard} ${selected === plan.id ? styles.planSelected : ""}`}
                  onClick={() => setSelected(plan.id)}
                >
                  {plan.popular && (
                    <div className={styles.popularBadge}>Most Popular</div>
                  )}
                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.planPrice}>
                    <span className={styles.planCurrency}>USD</span>
                    <span className={styles.planAmount}>${plan.price}</span>
                  </div>
                  <div className={styles.planCoverage}>
                    Covers up to ${plan.coverageAmount.toLocaleString()}
                  </div>
                  <ul className={styles.planFeatures}>
                    {plan.features.map((f, i) => (
                      <li key={i}>
                        <span>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          )}

          {error && <div className={styles.errorBox}>⚠️ {error}</div>}

          <div className={styles.purchaseRow}>
            {selectedPlan && (
              <div className={styles.selectedSummary}>
                {selectedPlan.name} — USD ${selectedPlan.price}
              </div>
            )}
            <button
              className={styles.purchaseBtn}
              onClick={handleCheckout}
              disabled={!selected || purchasing}
            >
              {purchasing ? (
                <>
                  <span className={styles.spinner} /> Redirecting...
                </>
              ) : (
                "🛡️ Pay & Activate Insurance"
              )}
            </button>
          </div>

          <p className={styles.disclaimer}>
            Secure payment via Stripe. Coverage activates immediately after
            payment.
          </p>
        </div>
      )}
    </div>
  );
}
