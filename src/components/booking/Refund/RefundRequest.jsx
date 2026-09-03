// src/components/booking/Refund/RefundRequest.jsx
import { useState } from "react";
import styles from "./Refund.module.css";
import {
  FaMoneyBillWave,
  FaClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaCalendarAlt,
  FaFileInvoice,
  FaUser,
  FaWallet,
  FaPercent,
} from "react-icons/fa";
import ConfirmationModal from "../../context/ConfirmationModal";
import { calcPricing } from "../../utils/pricing";

// ── Helper to format price ──────────────────────────────────────────────
const formatPrice = (amount, currency = "NGN") => {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const REFUND_TYPES = [
  { value: "FULL", label: "Full Refund", icon: FaMoneyBillWave },
  { value: "PARTIAL", label: "Partial Refund", icon: FaPercent },
  { value: "CUSTOM_AMOUNT", label: "Custom Amount", icon: FaFileInvoice },
];

export default function RefundRequest({
  booking,
  payment,
  onRequestRefund,
  isProcessing,
  isHirer,
}) {
  const [selectedType, setSelectedType] = useState("FULL");
  const [percentage, setPercentage] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  // Only hirers can request refunds
  if (!isHirer) {
    return null;
  }

  // Check if refund is eligible (within 48 hours of completion)
  const isEligible = () => {
    if (!booking.completedAt) return false;
    const completedAt = new Date(booking.completedAt);
    const hoursSinceCompletion =
      (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCompletion <= 48;
  };

  const getTimeRemaining = () => {
    if (!booking.completedAt) return null;
    const completedAt = new Date(booking.completedAt);
    const remainingMs =
      48 * 60 * 60 * 1000 - (Date.now() - completedAt.getTime());
    if (remainingMs <= 0) return null;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  const calculateRefundAmount = () => {
    const originalAmount = payment?.amount || booking.agreedRate || 0;

    if (selectedType === "FULL") {
      return originalAmount;
    } else if (selectedType === "PARTIAL") {
      return (originalAmount * percentage) / 100;
    } else if (selectedType === "CUSTOM_AMOUNT") {
      const amount = parseFloat(customAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  };

  const handleSubmit = () => {
    const newErrors = {};

    if (!reason.trim()) {
      newErrors.reason = "Please provide a reason for the refund";
    }

    if (
      selectedType === "CUSTOM_AMOUNT" &&
      (!customAmount || parseFloat(customAmount) <= 0)
    ) {
      newErrors.customAmount = "Please enter a valid amount";
    }

    if (
      selectedType === "CUSTOM_AMOUNT" &&
      parseFloat(customAmount) > (payment?.amount || 0)
    ) {
      newErrors.customAmount = "Amount cannot exceed the original payment";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const refundData = {
      bookingId: booking.id,
      paymentId: payment?.id,
      refundType: selectedType,
      reason: reason.trim(),
    };

    if (selectedType === "PARTIAL") {
      refundData.percentage = percentage;
    }

    if (selectedType === "CUSTOM_AMOUNT") {
      refundData.amount = parseFloat(customAmount);
    }

    onRequestRefund(refundData);
    setShowConfirm(false);
  };

  const refundAmount = calculateRefundAmount();
  const currency = payment?.currency || booking?.currency || "NGN";
  const timeRemaining = getTimeRemaining();

  if (!isEligible()) {
    return (
      <div className={styles.refundCard}>
        <div className={styles.refundHeader}>
          <FaClock className={styles.refundIcon} />
          <h3 className={styles.refundTitle}>Refund Unavailable</h3>
        </div>
        <p className={styles.refundMessage}>
          Refund requests must be made within 48 hours of booking completion.
        </p>
        {booking.completedAt && (
          <p className={styles.refundMeta}>
            Completed on: {new Date(booking.completedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.refundCard}>
        <div className={styles.refundHeader}>
          <FaMoneyBillWave className={styles.refundIcon} />
          <h3 className={styles.refundTitle}>Request Refund</h3>
          {timeRemaining && (
            <span className={styles.refundTimer}>
              <FaClock /> {timeRemaining} remaining
            </span>
          )}
        </div>

        <div className={styles.refundInfo}>
          <div className={styles.refundInfoRow}>
            <span className={styles.refundInfoLabel}>Booking</span>
            <span className={styles.refundInfoValue}>{booking.title}</span>
          </div>
          <div className={styles.refundInfoRow}>
            <span className={styles.refundInfoLabel}>Original Amount</span>
            <span className={styles.refundInfoValue}>
              {formatPrice(
                payment?.amount || booking.agreedRate || 0,
                currency,
              )}
            </span>
          </div>
          <div className={styles.refundInfoRow}>
            <span className={styles.refundInfoLabel}>Status</span>
            <span
              className={`${styles.refundStatus} ${styles.refundStatusEligible}`}
            >
              <FaCheckCircle /> Eligible
            </span>
          </div>
        </div>

        <div className={styles.refundTypeSection}>
          <label className={styles.refundLabel}>Refund Type</label>
          <div className={styles.refundTypeGrid}>
            {REFUND_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  className={`${styles.refundTypeBtn} ${isActive ? styles.refundTypeActive : ""}`}
                  onClick={() => setSelectedType(type.value)}
                >
                  <Icon className={styles.refundTypeIcon} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedType === "PARTIAL" && (
          <div className={styles.refundPartialSection}>
            <label className={styles.refundLabel}>
              Percentage: {percentage}%
            </label>
            <input
              type="range"
              min="1"
              max="99"
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className={styles.refundSlider}
            />
            <div className={styles.refundAmountPreview}>
              <span>Refund Amount:</span>
              <span className={styles.refundAmountValue}>
                {formatPrice(refundAmount, currency)}
              </span>
            </div>
          </div>
        )}

        {selectedType === "CUSTOM_AMOUNT" && (
          <div className={styles.refundCustomSection}>
            <label className={styles.refundLabel}>
              Enter Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={payment?.amount || booking.agreedRate || 0}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                if (errors.customAmount) {
                  setErrors({ ...errors, customAmount: null });
                }
              }}
              className={`${styles.refundInput} ${errors.customAmount ? styles.refundInputError : ""}`}
              placeholder="Enter amount"
            />
            {errors.customAmount && (
              <p className={styles.refundError}>{errors.customAmount}</p>
            )}
            <p className={styles.refundHint}>
              Maximum:{" "}
              {formatPrice(
                payment?.amount || booking.agreedRate || 0,
                currency,
              )}
            </p>
          </div>
        )}

        {selectedType === "FULL" && (
          <div className={styles.refundAmountPreview}>
            <span>Refund Amount:</span>
            <span className={styles.refundAmountValue}>
              {formatPrice(refundAmount, currency)}
            </span>
          </div>
        )}

        <div className={styles.refundReasonSection}>
          <label className={styles.refundLabel}>
            Reason <span className={styles.refundRequired}>*</span>
          </label>
          <textarea
            className={`${styles.refundTextarea} ${errors.reason ? styles.refundTextareaError : ""}`}
            placeholder="Please explain why you're requesting a refund..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) {
                setErrors({ ...errors, reason: null });
              }
            }}
            rows={3}
          />
          {errors.reason && (
            <p className={styles.refundError}>{errors.reason}</p>
          )}
        </div>

        <div className={styles.refundActions}>
          <button
            className={styles.refundSubmitBtn}
            onClick={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <FaSpinner className={styles.spinner} /> Processing...
              </>
            ) : (
              "Submit Refund Request"
            )}
          </button>
        </div>

        <div className={styles.refundNote}>
          <FaInfoCircle />
          <p>
            Refund requests are reviewed within 24-48 hours. You'll be notified
            once your request is processed.
          </p>
        </div>
      </div>

      {showConfirm && (
        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          title="Confirm Refund Request"
          message="Are you sure you want to request a refund for this booking? This action cannot be undone."
          confirmLabel="Yes, Request Refund"
          cancelLabel="Cancel"
          confirmVariant="warning"
        >
          <div className={styles.confirmDetails}>
            <div>
              <strong>Booking:</strong> {booking.title}
            </div>
            <div>
              <strong>Amount:</strong> {formatPrice(refundAmount, currency)}
            </div>
            <div>
              <strong>Type:</strong>{" "}
              {REFUND_TYPES.find((t) => t.value === selectedType)?.label}
            </div>
            <div>
              <strong>Reason:</strong> {reason}
            </div>
          </div>
          <div className={styles.confirmWarning}>
            <FaExclamationTriangle /> This action cannot be undone.
          </div>
        </ConfirmationModal>
      )}
    </>
  );
}
