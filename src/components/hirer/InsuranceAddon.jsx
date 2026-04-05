import { useState, useEffect } from "react";
import api from "../../lib/api";
import styles from "./InsuranceAddon.module.css";

export default function InsuranceAddon({ bookingId, onPurchased }) {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .get("/insurance/plans")
      .then((res) => setPlans(res.data.data.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    setError("");
    try {
      const res = await api.post("/insurance/purchase", {
        planId: selected,
        bookingId: bookingId || null,
      });
      setPurchased(res.data.data);
      onPurchased?.(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed.");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selected);

  return (
    <div className={styles.wrap}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.triggerIcon}>🛡️</span>
        <div className={styles.triggerText}>
          <span className={styles.triggerTitle}>Add Insurance Cover</span>
          <span className={styles.triggerSub}>
            Protect your property and get peace of mind
          </span>
        </div>
        <span className={styles.triggerChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          {purchased ? (
            <div className={styles.successState}>
              <span className={styles.successIcon}>✅</span>
              <h3 className={styles.successTitle}>Insurance Activated!</h3>
              <p className={styles.successPlan}>{purchased.plan}</p>
              <div className={styles.receiptBox}>
                <div className={styles.receiptRow}>
                  <span>Reference</span>
                  <span className={styles.receiptRef}>
                    {purchased.reference}
                  </span>
                </div>
                <div className={styles.receiptRow}>
                  <span>Coverage</span>
                  <span>{purchased.coverage}</span>
                </div>
                <div className={styles.receiptRow}>
                  <span>Activated</span>
                  <span>
                    {new Date(purchased.purchasedAt).toLocaleDateString(
                      "en-GB",
                    )}
                  </span>
                </div>
              </div>
              <p className={styles.successNote}>
                Keep your reference number safe. It will also appear in your
                notifications.
              </p>
            </div>
          ) : (
            <>
              <p className={styles.panelTitle}>Choose a plan</p>
              <p className={styles.panelSub}>
                One-time add-on for this booking. Coverage activates immediately
                after purchase.
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
                        <span className={styles.planCurrency}>
                          {plan.currency}
                        </span>
                        <span className={styles.planAmount}>
                          {plan.price.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.planCoverage}>
                        Covers up to {plan.coverageCurrency}{" "}
                        {plan.coverageAmount.toLocaleString()}
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
                    Selected: <strong>{selectedPlan.name}</strong> —{" "}
                    {selectedPlan.currency}{" "}
                    {selectedPlan.price.toLocaleString()}
                  </div>
                )}
                <button
                  className={styles.purchaseBtn}
                  onClick={handlePurchase}
                  disabled={!selected || purchasing}
                >
                  {purchasing ? (
                    <>
                      <span className={styles.spinner} /> Activating...
                    </>
                  ) : (
                    "🛡️ Activate Insurance"
                  )}
                </button>
              </div>

              <p className={styles.disclaimer}>
                Insurance is provided in partnership with verified regional
                providers. Claims must be submitted within 48 hours of incident.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
