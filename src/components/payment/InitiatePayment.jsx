import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

export default function InitiatePayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${bookingId}`);
      const { authorizationUrl, clientSecret } = res.data.data;
      if (authorizationUrl) {
        window.location.href = authorizationUrl; // Paystack
      } else if (clientSecret) {
        sessionStorage.setItem("stripe_client_secret", clientSecret);
        navigate(`/bookings/${bookingId}/stripe-confirm`); // Stripe
      } else {
        setError("Unknown payment provider response.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Payment initiation failed.");
    } finally {
      setPaying(false);
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

  if (error && !booking)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <Link to="/bookings" className={styles.backLink}>
              ← Back to Bookings
            </Link>
          </div>
        </div>
      </HirerLayout>
    );

  const fee = booking?.agreedRate ? (booking.agreedRate * 0.1).toFixed(2) : "—";
  const total = booking?.agreedRate
    ? (booking.agreedRate * 1.1).toFixed(2)
    : "—";

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          {/* Header */}
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
            </Link>
            <div className={styles.payBadge}>Secure Payment</div>
          </div>

          {/* Booking summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.summaryIconWrap}>
                <span className={styles.summaryIcon}>📋</span>
              </div>
              <div>
                <p className={styles.summaryLabel}>You're paying for</p>
                <h2 className={styles.summaryTitle}>{booking?.title}</h2>
                <p className={styles.summaryCategory}>
                  {booking?.category?.name}
                </p>
              </div>
            </div>

            <div className={styles.summaryMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>👷</span>
                <span className={styles.metaText}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📅</span>
                <span className={styles.metaText}>
                  {new Date(booking?.scheduledAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📍</span>
                <span className={styles.metaText}>{booking?.address}</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Payment Breakdown</p>
            <div className={styles.breakdownRows}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Agreed Rate</span>
                <span className={styles.breakdownVal}>
                  {booking?.currency}{" "}
                  {Number(booking?.agreedRate).toLocaleString()}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>
                  Platform Fee (10%)
                </span>
                <span className={styles.breakdownVal}>
                  {booking?.currency} {fee}
                </span>
              </div>
              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabelTotal}>Total</span>
                <span className={styles.breakdownValTotal}>
                  {booking?.currency} {Number(total).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.escrowNote}>
              <span className={styles.escrowIcon}>🔒</span>
              <p>
                Funds are held in escrow and only released to the worker after
                you confirm the job is complete.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.inlineError}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* CTA */}
          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <>
                <span className={styles.spinner} /> Processing...
              </>
            ) : (
              <>
                💳 Pay {booking?.currency} {Number(total).toLocaleString()}{" "}
                Securely
              </>
            )}
          </button>

          <p className={styles.payDisclaimer}>
            Powered by Paystack & Stripe. Your payment is protected and
            encrypted.
          </p>
        </div>
      </div>
    </HirerLayout>
  );
}
