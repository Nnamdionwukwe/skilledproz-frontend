// src/pages/hirer/retained-staff/PaymentSuccessModal.jsx
import { useEffect } from "react";
import { FiCheckCircle, FiArrowRight } from "react-icons/fi";
import styles from "./HirerCycleDetail.module.css";

export default function PaymentSuccessModal({ isOpen, onClose, onViewCycle }) {
  useEffect(() => {
    if (!isOpen) return;
    // Prevent background scroll while modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400 }}
      >
        <div
          className={styles.modalBody}
          style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--green-dim)",
              color: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <FiCheckCircle size={36} />
          </div>

          <h2
            className={styles.modalTitle}
            style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}
          >
            Payment Successful
          </h2>
          <p
            className={styles.modalSubtitle}
            style={{ marginBottom: "2rem", lineHeight: 1.5 }}
          >
            The funds have been successfully deducted from your wallet and are
            now securely held in escrow.
          </p>

          <button
            className={styles.payBtn}
            onClick={onViewCycle || onClose}
            style={{ width: "100%", justifyContent: "center" }}
          >
            View Cycle Details <FiArrowRight style={{ marginLeft: 6 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
