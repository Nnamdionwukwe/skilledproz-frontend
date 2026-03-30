import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

// ── Load Stripe once outside component to avoid re-initialisation ─────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// ── Stripe appearance config — matches dark theme ────────────────────────────
const stripeAppearance = {
  theme: "night",
  variables: {
    colorPrimary: "#f97316",
    colorBackground: "#0c0c18",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.45)",
    colorTextPlaceholder: "rgba(255,255,255,0.2)",
    colorIconTab: "#ffffff",
    colorLogo: "dark",
    borderRadius: "10px",
    fontFamily: "DM Sans, sans-serif",
    fontSizeBase: "15px",
    spacingUnit: "5px",
  },
  rules: {
    ".Input": {
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "none",
      color: "#ffffff",
    },
    ".Input:focus": {
      border: "1px solid #f97316",
      boxShadow: "0 0 0 3px rgba(249,115,22,0.12)",
    },
    ".Label": {
      color: "rgba(255,255,255,0.45)",
      fontWeight: "600",
      fontSize: "12px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    ".Tab": {
      backgroundColor: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    ".Tab:hover": {
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    ".Tab--selected": {
      backgroundColor: "rgba(249,115,22,0.12)",
      border: "1px solid rgba(249,115,22,0.25)",
    },
    ".Error": {
      color: "#ef4444",
    },
  },
};

// ── Inner form — must be inside <Elements> ────────────────────────────────────
function CheckoutForm({ bookingId, booking }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe will redirect here after 3DS or additional auth
        return_url: `${window.location.origin}/bookings/${bookingId}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    // Payment succeeded — clean up session storage
    sessionStorage.removeItem("stripe_client_secret");
    sessionStorage.removeItem("stripe_booking_id");

    navigate(`/bookings/${bookingId}?payment=success`);
  }

  const total = booking?.payment?.amount
    ? Number(booking.payment.amount)
    : null;

  return (
    <form onSubmit={handleSubmit} className={styles.stripeForm}>
      {/* Card element */}
      <div className={styles.stripeElementWrap}>
        <p className={styles.breakdownTitle}>Card Details</p>
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: "tabs",
            fields: {
              billingDetails: { address: { country: "auto" } },
            },
          }}
        />
      </div>

      {/* Amount summary */}
      {booking && (
        <div className={styles.stripeSummary}>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Job</span>
            <span
              className={styles.breakdownVal}
              style={{
                maxWidth: 220,
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {booking.title}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Worker Payout</span>
            <span className={styles.breakdownVal}>
              {booking.currency}{" "}
              {Number(booking.agreedRate * 0.85).toLocaleString()}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Platform Fee (10%)</span>
            <span className={styles.breakdownVal}>
              {booking.currency}{" "}
              {Number(booking.agreedRate * 0.1).toLocaleString()}
            </span>
          </div>
          <div className={styles.breakdownDivider} />
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabelTotal}>Total Charged</span>
            <span className={styles.breakdownValTotal}>
              {booking.currency} {Number(booking.agreedRate).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.inlineError}>
          <span>⚠️</span> {error}
        </div>
      )}

      <button
        type="submit"
        className={styles.payBtn}
        disabled={!stripe || !ready || paying}
      >
        {paying ? (
          <>
            <span className={styles.spinner} /> Processing...
          </>
        ) : (
          <>
            🔒 Confirm & Pay {booking?.currency}{" "}
            {Number(booking?.agreedRate).toLocaleString()}
          </>
        )}
      </button>

      <p className={styles.payDisclaimer}>
        Secured by Stripe. Funds are held in escrow until you confirm job
        completion.
      </p>
    </form>
  );
}

// ── Outer wrapper — loads booking + provides Elements context ─────────────────
export default function StripeConfirm() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try sessionStorage first (set by InitiatePayment)
    const stored = sessionStorage.getItem("stripe_client_secret");

    if (stored) {
      setClientSecret(stored);
    } else {
      // If page refreshed or navigated directly, re-initiate
      api
        .post(`/payments/initiate/${bookingId}`)
        .then((res) => {
          const { clientSecret: cs } = res.data.data;
          if (!cs) {
            setError("This booking uses Paystack. Please go back and pay.");
            return;
          }
          setClientSecret(cs);
          sessionStorage.setItem("stripe_client_secret", cs);
        })
        .catch((e) => {
          setError(
            e.response?.data?.message || "Could not load payment details.",
          );
        });
    }

    // Also load booking details
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skCard} />
        </div>
      </HirerLayout>
    );

  if (error)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
            </Link>
          </div>
        </div>
      </HirerLayout>
    );

  if (!clientSecret)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.verifyWrap}>
            <div className={styles.verifySpinner} />
            <h2 className={styles.verifyTitle}>Loading Payment</h2>
            <p className={styles.verifyText}>Setting up secure checkout...</p>
          </div>
        </div>
      </HirerLayout>
    );

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          {/* Header */}
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
            </Link>
            <div className={styles.payBadge}>🔒 Stripe Secure</div>
          </div>

          {/* Booking summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.summaryIconWrap}>
                <span className={styles.summaryIcon}>💳</span>
              </div>
              <div>
                <p className={styles.summaryLabel}>Complete payment for</p>
                <h2 className={styles.summaryTitle}>{booking?.title}</h2>
                <p className={styles.summaryCategory}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                  {booking?.category?.name && ` · ${booking.category.name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Stripe Elements */}
          <div className={styles.breakdownCard}>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
                fonts: [
                  {
                    cssSrc:
                      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap",
                  },
                ],
              }}
            >
              <CheckoutForm bookingId={bookingId} booking={booking} />
            </Elements>
          </div>

          {/* Trust signals */}
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
