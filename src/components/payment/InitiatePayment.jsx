import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

export default function ReleasePayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleRelease() {
    setReleasing(true);
    setError("");
    try {
      await api.post(`/payments/release/${bookingId}`);
      setConfirmed(true);
      setTimeout(() => navigate(`/bookings/${bookingId}`), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to release payment.");
    } finally {
      setReleasing(false);
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

  if (confirmed)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successWrap}>
            <div className={styles.successRing}>
              <span className={styles.successCheck}>✓</span>
            </div>
            <h2 className={styles.successTitle}>Payment Released!</h2>
            <p className={styles.successText}>
              Funds have been transferred to {booking?.worker?.firstName}. The
              job is now marked complete.
            </p>
            <p className={styles.successSub}>Redirecting you back...</p>
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
            <div className={`${styles.payBadge} ${styles.payBadgeGreen}`}>
              Release Escrow
            </div>
          </div>

          {/* Worker card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.workerAvatar}>
                {booking?.worker?.avatar ? (
                  <img src={booking.worker.avatar} alt="" />
                ) : (
                  <span>
                    {booking?.worker?.firstName?.[0]}
                    {booking?.worker?.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className={styles.summaryLabel}>Releasing payment to</p>
                <h2 className={styles.summaryTitle}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </h2>
                <p className={styles.summaryCategory}>{booking?.title}</p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Release Summary</p>
            <div className={styles.breakdownRows}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Total Paid</span>
                <span className={styles.breakdownVal}>
                  {booking?.payment?.currency}{" "}
                  {Number(booking?.payment?.amount).toLocaleString()}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Platform Fee</span>
                <span className={styles.breakdownVal}>
                  {booking?.payment?.currency}{" "}
                  {Number(booking?.payment?.platformFee).toLocaleString()}
                </span>
              </div>
              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabelTotal}>
                  Worker Receives
                </span>
                <span
                  className={styles.breakdownValTotal}
                  style={{ color: "var(--green)" }}
                >
                  {booking?.payment?.currency}{" "}
                  {Number(booking?.payment?.workerPayout).toLocaleString()}
                </span>
              </div>
            </div>

            <div
              className={styles.escrowNote}
              style={{
                background: "rgba(34,197,94,0.06)",
                borderColor: "rgba(34,197,94,0.15)",
              }}
            >
              <span className={styles.escrowIcon}>✅</span>
              <p>
                By releasing payment, you confirm the job has been completed to
                your satisfaction. This action cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className={styles.inlineError}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className={`${styles.payBtn} ${styles.payBtnGreen}`}
            onClick={handleRelease}
            disabled={releasing}
          >
            {releasing ? (
              <>
                <span className={styles.spinner} /> Releasing...
              </>
            ) : (
              <>💸 Release Payment to Worker</>
            )}
          </button>

          <p className={styles.payDisclaimer}>
            Once released, funds are transferred immediately and cannot be
            reversed.
          </p>
        </div>
      </div>
    </HirerLayout>
  );
}
