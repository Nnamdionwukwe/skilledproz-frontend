// StripeConfirm.jsx — complete rewrite fixing all three Stripe errors
import { useState, useEffect, useRef } from "react";
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

// ── Load Stripe ONCE — must be outside any component ─────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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
    ".Tab:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
    ".Tab--selected": {
      backgroundColor: "rgba(249,115,22,0.12)",
      border: "1px solid rgba(249,115,22,0.25)",
    },
    ".Error": { color: "#ef4444" },
  },
};

// ── Inner checkout form — only rendered once Elements is ready ────────────────
function CheckoutForm({ bookingId, booking }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Guard: never call confirmPayment before the PaymentElement is mounted+ready
  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;

    setPaying(true);
    setError("");

    // Submit the elements form first (required since Stripe Elements v3)
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Please check your card details.");
      setPaying(false);
      return;
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${bookingId}?payment=success`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    sessionStorage.removeItem("stripe_client_secret");
    navigate(`/bookings/${bookingId}?payment=success`);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.stripeForm}>
      <div className={styles.stripeElementWrap}>
        <p className={styles.breakdownTitle}>Card Details</p>
        {/* translate="no" prevents Google Translate from wrapping text nodes
            inside the Stripe iframe and crashing React reconciliation */}
        <div translate="no">
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: "tabs",
              // Only show card — hides unactivated Amazon Pay / Link
              paymentMethodOrder: ["card"],
              fields: {
                billingDetails: { address: { country: "auto" } },
              },
              wallets: {
                // Suppress Apple Pay warning (domain not registered)
                applePay: "never",
                googlePay: "auto",
              },
            }}
          />
        </div>
      </div>

      {booking && (
        <div className={styles.stripeSummary}>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Job</span>
            <span
              className={styles.breakdownVal}
              style={{
                maxWidth: 200,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {booking.title}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Agreed Rate</span>
            <span className={styles.breakdownVal}>
              {booking.currency} {Number(booking.agreedRate).toLocaleString()}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Platform Fee (10%)</span>
            <span className={styles.breakdownVal}>
              {booking.currency} {Number(booking.agreedRate * 0.1).toFixed(2)}
            </span>
          </div>
          <div className={styles.breakdownDivider} />
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabelTotal}>Total Charged</span>
            <span className={styles.breakdownValTotal}>
              {booking.currency}{" "}
              {Number(booking.agreedRate * 1.1).toLocaleString()}
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
        ) : !ready ? (
          <>
            <span className={styles.spinner} /> Loading payment form...
          </>
        ) : (
          <>
            🔒 Confirm &amp; Pay {booking?.currency}{" "}
            {Number(booking?.agreedRate * 1.1).toLocaleString()}
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

// ── Outer wrapper ─────────────────────────────────────────────────────────────
export default function StripeConfirm() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("stripe_client_secret");

    const loadBooking = api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {});

    if (stored) {
      setClientSecret(stored);
      loadBooking.finally(() => setLoading(false));
    } else {
      Promise.all([
        api
          .post(`/payments/initiate/${bookingId}`)
          .then((res) => {
            const { clientSecret: cs, authorizationUrl } = res.data.data;
            if (authorizationUrl) {
              // Paystack booking — redirect instead
              window.location.href = authorizationUrl;
              return;
            }
            if (!cs) {
              setError("Could not load payment details.");
              return;
            }
            setClientSecret(cs);
            sessionStorage.setItem("stripe_client_secret", cs);
          })
          .catch((e) =>
            setError(
              e.response?.data?.message || "Could not load payment details.",
            ),
          ),
        loadBooking,
      ]).finally(() => setLoading(false));
    }
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
            <h2 className={styles.verifyTitle}>Setting up secure payment...</h2>
          </div>
        </div>
      </HirerLayout>
    );

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
            </Link>
            <div className={styles.payBadge}>🔒 Stripe Secure</div>
          </div>

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

          <div className={styles.breakdownCard}>
            {/* KEY on Elements forces full remount when clientSecret changes,
                preventing the insertBefore/removeChild reconciliation crash */}
            <Elements
              key={clientSecret}
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
