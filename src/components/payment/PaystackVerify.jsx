import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import styles from "./Payment.module.css";

export default function PaystackVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      setErrorMsg("No payment reference found.");
      return;
    }

    api
      .get(`/payments/verify/paystack?reference=${reference}`)
      .then((res) => {
        setStatus("success");
        const bookingId = res.data.data?.bookingId;
        if (bookingId) {
          // Force a hard navigation to clear any cached state
          setTimeout(() => {
            navigate(`/bookings/${bookingId}?payment=success&t=${Date.now()}`);
          }, 2000);
        } else {
          // Fallback: go to bookings list
          setTimeout(() => navigate("/bookings"), 2000);
        }
      })
      .catch((err) => {
        setStatus("failed");
        setErrorMsg(
          err.response?.data?.message ||
            "Verification failed. Please contact support.",
        );
      });
  }, [searchParams, navigate]);

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
            <h2 className={styles.failTitle}>Payment Verification Failed</h2>
            <p className={styles.failText}>
              {errorMsg ||
                "We couldn't verify your payment. Please try again or contact support."}
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
