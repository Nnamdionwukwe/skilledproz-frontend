// src/pages/hirer/retained-staff/PayCycleModal.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import styles from "./HirerCycleDetail.module.css";
import {
  FiX,
  FiCreditCard,
  FiBriefcase,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiDollarSign,
} from "react-icons/fi";
import PaymentSuccessModal from "./PaymentSuccessModal"; // ✅ Import the new modal
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

export default function PayCycleModal({ isOpen, onClose, cycle, member }) {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Add state for the success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidCycleId, setPaidCycleId] = useState(null);

  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const currency = cycle?.currency || member?.currency || "NGN";

  useEffect(() => {
    if (!isOpen) return;

    setLoadingWallet(true);
    api
      .get(`/wallet/balance`, { params: { currency } })
      .then((res) => {
        setWalletBalance(res.data.data?.balance ?? 0);
      })
      .catch((err) => {
        console.error("Failed to fetch wallet balance:", err);
        setWalletBalance(0);
      })
      .finally(() => setLoadingWallet(false));
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const totalToPay = cycle?.netAmount || 0;
  const hasEnoughBalance =
    walletBalance !== null && walletBalance >= totalToPay;

  const PROVIDERS = [
    {
      key: "card",
      label: "Card / Instant Payment",
      desc: "Pay with Paystack (NGN) or Flutterwave",
      icon: <FiCreditCard />,
    },
    {
      key: "wallet",
      label: "Hirer Wallet",
      desc: loadingWallet
        ? "Loading balance..."
        : walletBalance === null
          ? "Wallet unavailable"
          : hasEnoughBalance
            ? `Available: ${currency} ${walletBalance.toLocaleString()}`
            : `Insufficient balance (${currency} ${walletBalance?.toLocaleString() || 0})`,
      icon: <FiDollarSign />,
      disabled: !hasEnoughBalance && !loadingWallet,
    },
  ];

  const handlePay = async () => {
    setError("");
    if (provider === "wallet" && !hasEnoughBalance) {
      setError(
        `Your ${currency} wallet balance is insufficient for this payment.`,
      );
      return;
    }

    setLoading(true);
    try {
      const payRes = await retainedStaffApi.payCycle(member.id, cycle.id, {
        paymentMethod: "ESCROW",
        provider,
      });

      const bookingId = payRes.data.data.booking.id;
      const cycleId = payRes.data.data.cycleId;

      if (provider === "wallet") {
        await api.post(`/payments/wallet/${bookingId}`);

        // ✅ Instead of navigating, show the success modal
        setPaidCycleId(cycleId);
        setShowSuccess(true);
      } else {
        navigate(`/bookings/${bookingId}/pay?method=${provider}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not initiate payment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ If the success modal is open, render it instead (or on top) of the pay modal
  if (showSuccess) {
    return (
      <PaymentSuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onClose(); // Close the pay modal too
        }}
        onViewCycle={() => {
          setShowSuccess(false);
          onClose();
          navigate(
            `/dashboard/hirer/retained-staff/${member.id}/cycles/${paidCycleId}?payment=success`,
          );
        }}
      />
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Pay Cycle</h2>
            <p className={styles.modalSubtitle}>
              {cycle?.label} · {member?.worker?.firstName}{" "}
              {member?.worker?.lastName}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <div className={styles.modalBody}>
          <div className={styles.paySummary}>
            <div className={styles.paySummaryRow}>
              <span>Base Amount</span>
              <span>
                {currency} {cycle?.baseAmount?.toLocaleString()}
              </span>
            </div>
            {cycle?.bonusAmount > 0 && (
              <div className={styles.paySummaryRow}>
                <span>Bonus</span>
                <span>
                  + {currency} {cycle.bonusAmount.toLocaleString()}
                </span>
              </div>
            )}
            {cycle?.deductionAmount > 0 && (
              <div className={styles.paySummaryRow}>
                <span>Deductions</span>
                <span>
                  − {currency} {cycle.deductionAmount.toLocaleString()}
                </span>
              </div>
            )}
            <div className={styles.paySummaryRow}>
              <span>Platform Fee</span>
              <span>
                − {currency} {cycle?.platformFee?.toLocaleString()}
              </span>
            </div>
            <div className={styles.paySummaryTotal}>
              <span>Total to Pay</span>
              <span>
                {currency} {cycle?.netAmount?.toLocaleString()}
              </span>
            </div>
          </div>

          <h3 className={styles.payProviderTitle}>Choose Payment Method</h3>
          <div className={styles.providerList}>
            {PROVIDERS.map((p) => {
              const isDisabled = p.disabled;
              const isSelected = provider === p.key;

              return (
                <button
                  key={p.key}
                  type="button"
                  className={`${styles.providerCard} ${isSelected ? styles.providerActive : ""}`}
                  onClick={() => !isDisabled && setProvider(p.key)}
                  disabled={isDisabled || loadingWallet}
                  style={{
                    opacity: isDisabled ? 0.6 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <div className={styles.providerIcon}>{p.icon}</div>
                  <div className={styles.providerInfo}>
                    <p className={styles.providerLabel}>{p.label}</p>
                    <p
                      className={styles.providerDesc}
                      style={{
                        color:
                          p.key === "wallet" &&
                          !hasEnoughBalance &&
                          !loadingWallet
                            ? "var(--red)"
                            : "inherit",
                      }}
                    >
                      {p.desc}
                    </p>
                  </div>
                  <div
                    className={`${styles.providerRadio} ${isSelected ? styles.providerRadioActive : ""}`}
                  >
                    {isSelected && <FiCheckCircle size={16} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={
              loading ||
              (provider === "wallet" && !hasEnoughBalance) ||
              loadingWallet
            }
          >
            {loading ? <FiLoader className={styles.spin} /> : <FiCreditCard />}
            {loading ? "Processing…" : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
