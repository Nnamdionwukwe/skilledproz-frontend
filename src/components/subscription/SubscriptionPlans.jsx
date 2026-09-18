import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./SubscriptionPlans.module.css";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiTag,
  FiCheck,
} from "react-icons/fi";

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
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  // ── Cancel confirmation modal ───────────────────────────────────────────────
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  useEffect(() => {
    if (!user?.role) return;
    setLoading(true);
    Promise.all([
      api.get(`/subscriptions/plans?role=${user.role}`),
      api.get("/subscriptions/my"),
    ])
      .then(([plansRes, myRes]) => {
        setPlans(plansRes.data.data.plans || []);
        setCurrent(myRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.role]);

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

      const url = res.data?.data?.url;
      if (!url) {
        setError("Could not open checkout. Please try again.");
        setSubscribing(null);
        return;
      }

      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start checkout.");
      setSubscribing(null);
    }
  };

  // ── Cancel confirmation ──────────────────────────────────────────────────────
  const requestCancel = () => setShowCancelConfirm(true);
  const dismissCancel = () => setShowCancelConfirm(false);

  const confirmCancel = async () => {
    setCancelling(true);
    setError("");
    try {
      await api.post("/subscriptions/cancel");
      setSuccess("Subscription cancelled.");
      const myRes = await api.get("/subscriptions/my");
      setCurrent(myRes.data.data);
      setShowCancelConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel.");
    } finally {
      setCancelling(false);
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
            <button
              className={styles.closeBtn}
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Current plan banner */}
        {current && current.subscription?.tier !== "FREE" && (
          <div className={styles.currentBanner}>
            <FiCheckCircle size={16} />
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
            <button
              className={styles.cancelLink}
              onClick={requestCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorBox} role="alert">
            <FiAlertTriangle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className={styles.successBox} role="status">
            <FiCheckCircle size={14} /> {success}
          </div>
        )}

        {/* ── Promo code section ─────────────────────────────────────────────── */}
        <div className={styles.promoSection}>
          {promoApplied ? (
            <div className={styles.promoAppliedRow}>
              <span className={styles.promoTag}>
                <FiTag size={13} />
                <strong>{promoApplied.code}</strong>
                {promoApplied.discountType === "PERCENT"
                  ? ` — ${promoApplied.discountValue}% off`
                  : ` — ₦${Number(promoApplied.discountValue).toLocaleString()} off`}
              </span>
              <button
                className={styles.promoRemoveBtn}
                onClick={handleRemovePromo}
                type="button"
              >
                <FiX size={12} /> Remove
              </button>
            </div>
          ) : (
            <div className={styles.promoInputRow}>
              <input
                className={styles.promoInput}
                type="text"
                placeholder="Have a promo code?"
                value={promoInput}
                onChange={(e) =>
                  setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && !promoLoading && handleApplyPromo()
                }
                maxLength={20}
              />
              <button
                className={styles.promoApplyBtn}
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoLoading}
                type="button"
              >
                {promoLoading ? <span className={styles.spinner} /> : "Apply"}
              </button>
            </div>
          )}
          {promoSuccess && (
            <p className={styles.promoSuccessMsg}>
              <FiCheck size={12} /> {promoSuccess}
            </p>
          )}
          {promoError && (
            <p className={styles.promoErrorMsg}>
              <FiX size={12} /> {promoError}
            </p>
          )}
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
              const isCurrent =
                current?.planId === plan.id ||
                (!current?.planId && current?.subscription?.tier === plan.tier);
              const isPopular = plan.popular;
              const discounted = getDiscountedPrice(plan.price);
              const isYearly =
                plan.billingCycle === "yearly" ||
                (typeof plan.id === "string" && plan.id.endsWith("_yearly"));

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
                            /{isYearly ? "yr" : "mo"}
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
                          /{isYearly ? "yr" : "mo"}
                        </span>
                      </>
                    )}
                  </div>

                  <ul className={styles.featureList}>
                    {(plan.features || []).map((f, i) => (
                      <li key={i}>
                        <span className={styles.featureCheck}>
                          <FiCheck size={14} />
                        </span>
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
                    type="button"
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

      {/* ── Cancel confirmation modal ─────────────────────────────────────── */}
      {showCancelConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={dismissCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-sub-title"
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <FiAlertTriangle size={20} />
            </div>
            <h3 id="cancel-sub-title" className={styles.modalTitle}>
              Cancel subscription?
            </h3>
            <p className={styles.modalText}>
              Your plan stays active until the end of the current billing
              period. After that, you'll drop back to the Free plan.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={dismissCancel}
                disabled={cancelling}
                type="button"
              >
                Keep Plan
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmCancel}
                disabled={cancelling}
                type="button"
              >
                {cancelling ? (
                  <>
                    <span className={styles.spinner} /> Cancelling...
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
