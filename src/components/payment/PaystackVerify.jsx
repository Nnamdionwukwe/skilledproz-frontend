import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import styles from "./Payment.module.css";

export default function PaystackVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed

  useEffect(() => {
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      return;
    }

    api
      .get(`/payments/verify/paystack?reference=${reference}`)
      .then((res) => {
        setStatus("success");
        const bookingId = res.data.data?.bookingId;
        if (bookingId) {
          setTimeout(() => navigate(`/bookings/${bookingId}`), 2500);
        }
      })
      .catch(() => setStatus("failed"));
  }, []);

  return (
    <div
      className={styles.page}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className={styles.verifyWrap}>
        {status === "verifying" && (
          <>
            <div className={styles.verifySpinner} />
            <h2 className={styles.verifyTitle}>Verifying Payment</h2>
            <p className={styles.verifyText}>
              Please wait while we confirm your payment...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={styles.successRing}>
              <span className={styles.successCheck}>✓</span>
            </div>
            <h2 className={styles.successTitle}>Payment Confirmed!</h2>
            <p className={styles.successText}>
              Your funds are safely held in escrow. The worker has been
              notified.
            </p>
            <p className={styles.successSub}>Redirecting to your booking...</p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className={styles.failRing}>
              <span className={styles.failIcon}>✕</span>
            </div>
            <h2 className={styles.failTitle}>Payment Failed</h2>
            <p className={styles.failText}>
              We couldn't verify your payment. Please try again or contact
              support.
            </p>
            <Link
              to="/bookings"
              className={styles.payBtn}
              style={{
                display: "inline-block",
                textAlign: "center",
                marginTop: "1.5rem",
              }}
            >
              Back to Bookings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
