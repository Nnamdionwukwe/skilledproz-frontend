// src/components/payment/ManualPaymentSuccess.jsx
import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

export default function ManualPaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { method, bookingId } = location.state || {};

  // If someone lands here without state, redirect to bookings
  useEffect(() => {
    if (!method || !bookingId) {
      navigate("/bookings", { replace: true });
    }
  }, [method, bookingId, navigate]);

  const isBank = method === "bank";
  const title = isBank
    ? "Bank Transfer Submitted"
    : "Crypto Transaction Submitted";
  const message = isBank
    ? "Your bank transfer details have been submitted. We'll verify and activate your booking within 1–2 hours."
    : "Your crypto transaction has been submitted. We'll verify on-chain within 30 minutes.";
  const subMessage = isBank
    ? "Please keep your proof of payment until the booking is activated."
    : "Check your wallet for the transaction confirmation.";

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          {/* Header with back link */}
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Booking
            </Link>
            <div className={`${styles.payBadge} ${styles.payBadgeGreen}`}>
              Submitted
            </div>
          </div>

          {/* Success content */}
          <div className={styles.successWrap}>
            <div className={styles.successRing}>
              <FaCheckCircle className={styles.successCheck} />
            </div>
            <h2 className={styles.successTitle}>{title}</h2>
            <p className={styles.successText}>{message}</p>
            <p className={styles.successSub}>{subMessage}</p>

            <button
              className={styles.payBtn}
              onClick={() => navigate(`/bookings/${bookingId}`)}
              style={{ marginTop: "1.5rem" }}
            >
              View Booking
            </button>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
