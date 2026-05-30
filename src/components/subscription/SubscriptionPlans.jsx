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

  // ── Promo code state ────────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(null); // { code, discountType, discountValue, description }
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

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

  // ── Compute discounted price for a given plan price ──────────────────────────
  function getDiscountedPrice(originalPrice) {
    if (!promoApplied || originalPrice === 0) return null;
    const { discountType, discountValue } = promoApplied;
    const discount =
      discountType === "PERCENT"
        ? parseFloat(((originalPrice * discountValue) / 100).toFixed(2))
        : Math.min(discountValue, originalPrice);
    const finalPrice = Math.max(0, originalPrice - discount);
    return { discount, finalPrice };
  }

  // ── Apply promo code ─────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      // Validate without planId — backend returns discountType + discountValue
      // so we can compute per-plan discounts client-side
      const res = await api.get(`/subscriptions/promo/validate/${code}`);
      const data = res.data.data;

      if (data.valid) {
        setPromoApplied({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          description: data.description,
          expiresAt: data.expiresAt,
        });
        const label =
          data.discountType === "PERCENT"
            ? `${data.discountValue}% off`
            : `₦${Number(data.discountValue).toLocaleString()} off`;
        setPromoSuccess(`Code applied — ${label} on your subscription!`);
        setPromoInput("");
      } else {
        setPromoError("Invalid promo code.");
      }
    } catch (err) {
      setPromoError(
        err.response?.data?.message || "Invalid or expired promo code.",
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoSuccess("");
    setPromoError("");
    setPromoInput("");
  };

  // ── Subscribe (Paystack checkout) ────────────────────────────────────────────
  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    setError("");
    try {
      const res = await api.post("/subscriptions/checkout", {
        planId,
        ...(promoApplied ? { promoCode: promoApplied.code } : {}),
      });
      // Redirect to Paystack hosted checkout page
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

        {/* ── Promo code section ─────────────────────────────────────────────── */}
        <div className={styles.promoSection}>
          {promoApplied ? (
            /* Applied state — show the active code as a dismissible tag */
            <div className={styles.promoAppliedRow}>
              <span className={styles.promoTag}>
                🏷️ <strong>{promoApplied.code}</strong>
                {promoApplied.discountType === "PERCENT"
                  ? ` — ${promoApplied.discountValue}% off`
                  : ` — ₦${Number(promoApplied.discountValue).toLocaleString()} off`}
              </span>
              <button
                className={styles.promoRemoveBtn}
                onClick={handleRemovePromo}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            /* Input state */
            <div className={styles.promoInputRow}>
              <input
                className={styles.promoInput}
                type="text"
                placeholder="Have a promo code?"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) =>
                  e.key === "Enter" && !promoLoading && handleApplyPromo()
                }
                maxLength={20}
              />
              <button
                className={styles.promoApplyBtn}
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoLoading}
              >
                {promoLoading ? <span className={styles.spinner} /> : "Apply"}
              </button>
            </div>
          )}
          {promoSuccess && (
            <p className={styles.promoSuccessMsg}>✓ {promoSuccess}</p>
          )}
          {promoError && <p className={styles.promoErrorMsg}>✗ {promoError}</p>}
        </div>

        {/* ── Plans grid ────────────────────────────────────────────────────── */}
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
              const discounted = getDiscountedPrice(plan.price);

              return (
                <div
                  key={plan.id}
                  className={[
                    styles.planCard,
                    isPopular ? styles.planPopular : "",
                    isCurrent ? styles.planCurrent : "",
                  ].join(" ")}
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
                    ) : discounted ? (
                      /* Show discounted price when promo is applied */
                      <div className={styles.priceDiscountWrap}>
                        <span className={styles.priceStrike}>
                          {plan.currency} {plan.price.toLocaleString()}
                        </span>
                        <div className={styles.priceRow}>
                          <span className={styles.priceCurrency}>
                            {plan.currency}
                          </span>
                          <span className={styles.priceAmount}>
                            {discounted.finalPrice.toLocaleString()}
                          </span>
                          <span className={styles.pricePer}>
                            /{plan.billingCycle === "yearly" ? "yr" : "mo"}
                          </span>
                        </div>
                        <span className={styles.savingsBadge}>
                          Save ₦{discounted.discount.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className={styles.priceCurrency}>
                          {plan.currency}
                        </span>
                        <span className={styles.priceAmount}>
                          {plan.price.toLocaleString()}
                        </span>
                        <span className={styles.pricePer}>
                          /{plan.billingCycle === "yearly" ? "yr" : "mo"}
                        </span>
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
                    className={[
                      styles.planBtn,
                      isCurrent
                        ? styles.planBtnCurrent
                        : isPopular
                          ? styles.planBtnPopular
                          : styles.planBtnDefault,
                    ].join(" ")}
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
          Payments processed securely by Paystack. Cancel anytime. All prices in
          NGN.
        </p>
      </div>
    </Layout>
  );
}
