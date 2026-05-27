// src/components/booking/FlutterwaveConfirm.jsx
// Replaces StripeConfirm.jsx — no card input form.
// Flutterwave/Paystack are hosted payment pages, so this component:
//   1. Loads the booking
//   2. Calls POST /api/payments/initiate/:bookingId → gets paymentUrl
//   3. Shows a "Redirecting…" screen with fee breakdown
//   4. Redirects to the hosted payment URL
//
// Route stays: /bookings/:bookingId/pay-confirm  (update your router)
// Old route:   /bookings/:bookingId/stripe-confirm  (can keep the same path)

import { useState, useEffect, useRef } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

// ── Fee config (mirrors backend FEE_CONFIG Phase 1) ───────────────────────────
const HIRER_FEE_RATE = 0.05;

function feeBreakdown(booking) {
  if (!booking) return null;
  const agreedRate = booking.agreedRate || 0;
  const hirerFee = parseFloat((agreedRate * HIRER_FEE_RATE).toFixed(2));
  const totalCharged = parseFloat((agreedRate + hirerFee).toFixed(2));
  const workerPayout = agreedRate; // 100%
  return {
    agreedRate,
    hirerFee,
    totalCharged,
    workerPayout,
    currency: booking.currency || "USD",
  };
}

// ── Payment return handler — reads URL params after redirect back ─────────────
function PaymentReturnBanner({ bookingId }) {
  const [params] = useSearchParams();
  const payStatus = params.get("payment");
  const navigate = useNavigate();

  if (!payStatus) return null;

  if (payStatus === "flw_ok" || payStatus === "ps_ok") {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successRing}>
          <span className={styles.successCheck}>✓</span>
        </div>
        <h2 className={styles.successTitle}>Payment Successful!</h2>
        <p className={styles.successText}>
          Your payment is held securely in escrow. The worker can now check in
          and begin the job.
        </p>
        <button
          className={`${styles.payBtn} ${styles.payBtnGreen}`}
          onClick={() => navigate(`/bookings/${bookingId}`)}
        >
          View Booking →
        </button>
      </div>
    );
  }

  if (payStatus === "cancelled") {
    return (
      <div className={styles.successWrap}>
        <div className={styles.failRing}>
          <span className={styles.failIcon}>✕</span>
        </div>
        <h2 className={styles.failTitle}>Payment Cancelled</h2>
        <p className={styles.failText}>
          You cancelled the payment. You can try again from the booking page.
        </p>
        <Link
          to={`/bookings/${bookingId}`}
          className={styles.backLink}
          style={{ marginTop: 8 }}
        >
          ← Back to Booking
        </Link>
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FlutterwaveConfirm() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const payStatus = params.get("payment");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(null); // "flutterwave" | "paystack"

  const autoRedirectRef = useRef(false);

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // If this page is loaded without a payment status param, initiate automatically
  useEffect(() => {
    if (!payStatus && booking && !autoRedirectRef.current && !paying) {
      autoRedirectRef.current = true;
      initiatePayment();
    }
  }, [booking, payStatus]);

  async function initiatePayment() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${bookingId}`);
      const { paymentUrl, provider: prov } = res.data.data;
      if (!paymentUrl) {
        setError("Payment URL not received. Try again.");
        setPaying(false);
        return;
      }
      setProvider(prov);
      // Brief delay so user sees the redirect screen
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 800);
    } catch (e) {
      setError(e.response?.data?.message || "Payment initiation failed.");
      setPaying(false);
      autoRedirectRef.current = false;
    }
  }

  if (loading)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skCard} />
        </div>
      </HirerLayout>
    );

  const fees = feeBreakdown(booking);

  // ── Show return states (payment=flw_ok, payment=cancelled etc.) ──────────
  if (payStatus) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <PaymentReturnBanner bookingId={bookingId} />
        </div>
      </HirerLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && !paying)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            <div className={styles.payHeader}>
              <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
                ← Back to Booking
              </Link>
            </div>
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠️</span>
              <p>{error}</p>
              <button
                className={styles.payBtn}
                onClick={initiatePayment}
                style={{ marginTop: 12 }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </HirerLayout>
    );

  // ── Redirecting / loading state ───────────────────────────────────────────
  if (paying || !error) {
    const provMeta = PROVIDER_META[provider] ?? {
      label: "Payment Provider",
      icon: "💳",
      badge: "Secure",
    };
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            {/* Header */}
            <div className={styles.payHeader}>
              <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
                ← Back to Booking
              </Link>
              <div className={styles.payBadge}>🔒 Secure Checkout</div>
            </div>

            {/* Booking summary card */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryIconWrap}>
                  <span className={styles.summaryIcon}>💳</span>
                </div>
                <div>
                  <p className={styles.summaryLabel}>Completing payment for</p>
                  <h2 className={styles.summaryTitle}>{booking?.title}</h2>
                  <p className={styles.summaryCategory}>
                    {booking?.worker?.firstName} {booking?.worker?.lastName}
                    {booking?.category?.name && ` · ${booking.category.name}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            {fees && (
              <div className={styles.breakdownCard}>
                <p className={styles.breakdownTitle}>What You're Paying</p>
                <div className={styles.breakdownRows}>
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>Agreed Rate</span>
                    <span className={styles.breakdownVal}>
                      {fees.currency} {fees.agreedRate.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>
                      Service Fee (5%)
                    </span>
                    <span className={styles.breakdownVal}>
                      + {fees.currency}{" "}
                      {fees.hirerFee.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span
                      className={styles.breakdownLabel}
                      style={{ color: "var(--green)", fontSize: "0.8rem" }}
                    >
                      🎉 Worker receives (no deductions)
                    </span>
                    <span
                      className={styles.breakdownVal}
                      style={{ color: "var(--green)" }}
                    >
                      {fees.currency} {fees.workerPayout.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.breakdownDivider} />
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabelTotal}>
                      Total Charged
                    </span>
                    <span className={styles.breakdownValTotal}>
                      {fees.currency} {fees.totalCharged.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Redirect status */}
            <div className={styles.verifyWrap}>
              <div className={styles.verifySpinner} />
              <h2 className={styles.verifyTitle}>
                {provider
                  ? `Redirecting to ${provMeta.label}…`
                  : "Setting up secure payment…"}
              </h2>
              <p className={styles.verifyText}>
                {provider
                  ? `You'll complete payment on ${provMeta.label}'s secure hosted page. Do not close this tab.`
                  : "Please wait while we prepare your payment session…"}
              </p>
              {provider && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 20,
                      padding: "3px 10px",
                    }}
                  >
                    {provMeta.icon} {provMeta.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Manual trigger if auto-redirect fails */}
            {!paying && (
              <button className={styles.payBtn} onClick={initiatePayment}>
                💳 Proceed to Payment
              </button>
            )}

            <div className={styles.trustRow}>
              <span className={styles.trustItem}>🔐 256-bit SSL</span>
              <span className={styles.trustItem}>🛡️ Escrow protected</span>
              <span className={styles.trustItem}>↩️ Refund policy</span>
            </div>
          </div>
        </div>
      </HirerLayout>
    );
  }

  return null;
}

// Provider display meta (module-level since it's used inside component)
const PROVIDER_META = {
  flutterwave: {
    label: "Flutterwave",
    icon: "🦋",
    badge: "International payments",
  },
  paystack: { label: "Paystack", icon: "💚", badge: "Nigeria / Africa" },
};
