// src/pages/subscription/SubscriptionPlans.jsx
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
  FiDownload,
  FiPrinter,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";

// ─── Receipt Generator (Exact copy from WalletTransactionDetail) ──────────
const STATUS_CONFIG = {
  PENDING: { label: "Pending Review" },
  PROCESSING: { label: "Processing" },
  COMPLETED: { label: "Completed" },
  SUCCESS: { label: "Success" },
  FAILED: { label: "Failed" },
  REVERSED: { label: "Reversed" },
  CANCELLED: { label: "Cancelled" },
  INITIATED: { label: "Initiated" },
};

function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionLabel(type) {
  const labels = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    PAYMENT: "Payment",
    SUBSCRIPTION: "Subscription",
    REFUND: "Refund",
    BONUS: "Bonus",
    ADJUSTMENT: "Adjustment",
  };
  return labels[type] || type;
}

function getPaymentChannel(tx) {
  if (tx.type === "SUBSCRIPTION") return { label: "Subscription" };
  return { label: "Payment" };
}

function generateReceiptHTML(transaction) {
  const isCredit = false; // Subscriptions are always debits
  const amountPrefix = "-";
  const channel = getPaymentChannel(transaction);
  const isPaid =
    transaction.status === "COMPLETED" || transaction.status === "SUCCESS";

  // Get the current platform theme
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Theme Colors
  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const textDim = isDark ? "#a1a1aa" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const borderDash = isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";
  const footerBg = isDark ? "#0c0c18" : "#f9fafb";
  const tearColor = isDark ? "#080810" : "#f9fafb";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: ${bg}; 
      color: ${text};
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      padding: 20px; 
    }
    .receipt { 
      max-width: 520px; 
      width: 100%; 
      background: ${panel}; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 24px rgba(0,0,0,${isDark ? "0.4" : "0.1"}); 
      border: 1px solid ${border};
    }
    .receipt-header { 
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
      color: #ffffff; 
      padding: 32px 32px 24px; 
      text-align: center; 
    }
    .receipt-header .logo { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      width: 56px; 
      height: 56px; 
      background: rgba(255,255,255,0.2); 
      border-radius: 14px; 
      margin-bottom: 12px; 
    }
    .receipt-header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; color: #fff; }
    .receipt-status { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      margin-top: 16px; 
      padding: 6px 16px; 
      background: rgba(255,255,255,0.2); 
      border-radius: 999px; 
      font-size: 12px; 
      font-weight: 700; 
      letter-spacing: 0.05em; 
      text-transform: uppercase; 
      color: #fff;
    }
    .receipt-amount { 
      text-align: center; 
      padding: 28px 32px 24px; 
      border-bottom: 2px dashed ${borderDash}; 
    }
    .receipt-amount .label { 
      font-size: 12px; 
      color: ${textDim}; 
      text-transform: uppercase; 
      letter-spacing: 0.08em; 
      font-weight: 700; 
    }
    .receipt-amount .value { 
      font-size: 36px; 
      font-weight: 800; 
      margin-top: 8px; 
      letter-spacing: -0.02em; 
    }
    .receipt-amount .value.credit { color: #22c55e; }
    .receipt-amount .value.debit { color: #ef4444; }
    .receipt-amount .channel { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      margin-top: 12px; 
      padding: 4px 12px; 
      background: rgba(249, 115, 22, 0.15); 
      color: #f97316; 
      border-radius: 999px; 
      font-size: 11px; 
      font-weight: 700; 
    }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${border}; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: ${textDim}; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: ${text}; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${textDim}; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid ${border}; border-bottom: none; }
    .net-row .label { font-weight: 700; color: ${text}; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: ${footerBg}; text-align: center; font-size: 12px; color: ${textDim}; }
    .receipt-footer strong { color: ${text}; }
    .tear-line { height: 16px; background-image: radial-gradient(circle, ${tearColor} 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: ${footerBg}; }

    /* --- PRINT SPECIFIC STYLES --- */
    @media print {
      @page { size: auto; margin: 0; }
      body { background: #fff; color: #000; display: block; padding: 0; }
      .receipt { 
        max-width: 100%; 
        box-shadow: none; 
        border-radius: 0; 
        border: none;
        page-break-inside: avoid;
        transform: scale(0.85); 
        transform-origin: top center;
        margin: 0 auto;
      }
      /* Force white background and dark text for printing */
      .receipt { background: #fff !important; }
      .receipt-body { background: #fff !important; padding: 16px 32px; }
      .receipt-footer { background: #fff !important; border-top: 1px solid #eee; }
      .row .value, .net-row .label { color: #000 !important; }
      .row .label, .receipt-amount .label, .receipt-footer { color: #555 !important; }
      .tear-line { display: none; }
      .row { padding: 8px 0; border-bottom: 1px solid #eee; }
      .receipt-header { padding: 24px 32px 16px; }
      .receipt-amount { padding: 20px 32px; border-bottom: 2px dashed #eee; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 12h8" /><path d="M8 8h4" /><path d="M8 16h6" />
        </svg>
      </div>
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status ${isPaid ? "paid" : ""}">${STATUS_CONFIG[transaction.status]?.label || transaction.status}</div>
    </div>

    <div class="receipt-amount">
      <div class="label">${isCredit ? "Amount Received" : "Amount Charged"}</div>
      <div class="value ${isCredit ? "credit" : "debit"}">${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>

    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${getTransactionLabel(transaction.type)}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${formatDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>` : ""}

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Gross Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span></div>
      <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span></div>

      ${
        transaction.meta?.paymentProvider
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row"><span class="label">Provider</span><span class="value">${transaction.meta.paymentProvider}</span></div>
      ${transaction.meta?.transactionId ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${transaction.meta.transactionId}</span></div>` : ""}
      `
          : ""
      }
    </div>

    <div class="tear-line"></div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

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

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.subscriptionPlans.view", {
      role: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    setLoading(true);
    Promise.all([
      api.get(`/subscriptions/plans?role=${user.role}`),
      api.get("/subscriptions/my"),
    ])
      .then(([plansRes, myRes]) => {
        const loadedPlans = plansRes.data.data.plans || [];
        const myData = myRes.data.data;
        setPlans(loadedPlans);
        setCurrent(myData);

        // ── ANALYTICS: subscription plans loaded ────────────────────────
        tracker.track("subscriptionPlans.loaded", {
          role: user.role,
          plansCount: loadedPlans.length,
          currentTier: myData?.subscription?.tier || "FREE",
          currentPlanId: myData?.planId || null,
          hasActiveSubscription: myData?.subscription?.tier !== "FREE",
        });
      })
      .catch((err) => {
        // ── ANALYTICS: plans load failed ────────────────────────────────
        tracker.track("subscriptionPlans.load.failed", {
          role: user.role,
          reason: err.response?.data?.message || "unknown",
        });
      })
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

    // ── ANALYTICS: promo code apply attempt ─────────────────────────────
    tracker.action("subscriptionPlans.promo.apply.attempt", {
      codeLength: code.length,
    });

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

        // ── ANALYTICS: promo code applied successfully ──────────────────
        tracker.action("subscriptionPlans.promo.applied", {
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
      } else {
        setPromoError("Invalid promo code.");

        // ── ANALYTICS: promo code invalid ───────────────────────────────
        tracker.action("subscriptionPlans.promo.invalid", {
          codeLength: code.length,
        });
      }
    } catch (err) {
      setPromoError(
        err.response?.data?.message || "Invalid or expired promo code.",
      );

      // ── ANALYTICS: promo code validate failed ─────────────────────────
      tracker.action("subscriptionPlans.promo.failed", {
        codeLength: code.length,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    // ── ANALYTICS: promo code removed ───────────────────────────────────
    tracker.action("subscriptionPlans.promo.removed", {
      code: promoApplied?.code || null,
    });

    setPromoApplied(null);
    setPromoSuccess("");
    setPromoError("");
    setPromoInput("");
  };

  // ── Subscribe (Paystack checkout) ────────────────────────────────────────────
  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    setError("");

    // ── ANALYTICS: subscription checkout attempt ────────────────────────
    const plan = plans.find((p) => p.id === planId);
    tracker.action("subscriptionPlans.subscribe.attempt", {
      planId,
      planName: plan?.name || null,
      planTier: plan?.tier || null,
      planPrice: plan?.price || null,
      currency: plan?.currency || null,
      hasPromo: !!promoApplied,
      promoCode: promoApplied?.code || null,
    });

    try {
      const res = await api.post("/subscriptions/checkout", {
        planId,
        ...(promoApplied ? { promoCode: promoApplied.code } : {}),
      });

      const url = res.data?.data?.url;
      if (!url) {
        setError("Could not open checkout. Please try again.");
        setSubscribing(null);

        // ── ANALYTICS: no checkout URL returned ────────────────────────
        tracker.action("subscriptionPlans.subscribe.failed", {
          planId,
          reason: "no_checkout_url",
        });
        return;
      }

      // ── ANALYTICS: checkout redirecting ─────────────────────────────
      tracker.action("subscriptionPlans.subscribe.redirecting", {
        planId,
        planName: plan?.name || null,
      });

      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start checkout.");
      setSubscribing(null);

      // ── ANALYTICS: checkout failed ─────────────────────────────────
      tracker.action("subscriptionPlans.subscribe.failed", {
        planId,
        reason: err.response?.data?.message || "unknown",
      });
    }
  };

  // ── Cancel confirmation ──────────────────────────────────────────────────────
  const requestCancel = () => {
    setShowCancelConfirm(true);
    // ── ANALYTICS: cancel modal opened ──────────────────────────────────
    tracker.action("subscriptionPlans.cancel.opened", {
      currentTier: current?.subscription?.tier || null,
    });
  };
  const dismissCancel = () => setShowCancelConfirm(false);

  const confirmCancel = async () => {
    setCancelling(true);
    setError("");

    // ── ANALYTICS: cancel confirmation attempt ──────────────────────────
    tracker.action("subscriptionPlans.cancel.attempt", {
      currentTier: current?.subscription?.tier || null,
      planId: current?.planId || null,
    });

    try {
      await api.post("/subscriptions/cancel");
      setSuccess("Subscription cancelled.");
      const myRes = await api.get("/subscriptions/my");
      setCurrent(myRes.data.data);
      setShowCancelConfirm(false);

      // ── ANALYTICS: subscription cancelled ───────────────────────────
      tracker.action("subscriptionPlans.cancel.success", {
        previousTier: current?.subscription?.tier || null,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel.");

      // ── ANALYTICS: cancel failed ────────────────────────────────────
      tracker.action("subscriptionPlans.cancel.failed", {
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!current) return;

    // Construct the transaction object for the receipt
    const transaction = {
      reference:
        current.subscription?.reference || `SUB-${current.planId || "PLAN"}`,
      type: "SUBSCRIPTION",
      amount: current.plan?.price || 0,
      currency: current.plan?.currency || "NGN",
      status: "COMPLETED",
      createdAt: current.createdAt || new Date().toISOString(),
      completedAt: current.createdAt || new Date().toISOString(),
      description: `Subscription for ${current.plan?.name || "Plan"}`,
      fee: 0,
      netAmount: current.plan?.price || 0,
      meta: {
        paymentProvider: "Paystack",
      },
    };

    try {
      const html = generateReceiptHTML(transaction);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${transaction.reference}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download receipt. Please try again.");
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
              data-track-id="subscriptionPlans.close"
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
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginLeft: "auto",
                alignItems: "center",
              }}
            >
              <button
                className={styles.cancelLink}
                onClick={handleDownloadReceipt}
                type="button"
                style={{ margin: 0, color: "var(--orange)" }}
                data-track-id="subscriptionPlans.receipt.download"
              >
                <FiDownload
                  size={14}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />{" "}
                Receipt
              </button>
              <button
                className={styles.cancelLink}
                onClick={requestCancel}
                type="button"
                style={{ margin: 0 }}
                data-track-id="subscriptionPlans.cancel.open"
              >
                Cancel
              </button>
            </div>
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
                data-track-id="subscriptionPlans.promo.remove"
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
                data-track-id="subscriptionPlans.promo.input"
              />
              <button
                className={styles.promoApplyBtn}
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoLoading}
                type="button"
                data-track-id="subscriptionPlans.promo.apply"
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
                    data-track-id={`subscriptionPlans.subscribe.${plan.id}`}
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
                data-track-id="subscriptionPlans.cancel.keep"
              >
                Keep Plan
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmCancel}
                disabled={cancelling}
                type="button"
                data-track-id="subscriptionPlans.cancel.confirm"
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
