import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import styles from "./HirerCycleDetail.module.css";
import {
  FiX,
  FiCreditCard,
  FiBriefcase,
  FiCopy,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

const PROVIDERS = [
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    desc: "Manual transfer — admin verifies within 1–2 hours",
    icon: <FiBriefcase />,
  },
  {
    key: "crypto",
    label: "Crypto (USDT / USDC)",
    desc: "Send on BSC (BEP20) — verified within 30 minutes",
    icon: <FiCreditCard />,
  },
  {
    key: "wallet",
    label: "Hirer Wallet",
    desc: "Instant — deducts from your wallet balance",
    icon: <FiCreditCard />,
  },
];

export default function PayCycleModal({ isOpen, onClose, cycle, member }) {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("bank_transfer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cryptoCurrency, setCryptoCurrency] = useState("USDC");

  if (!isOpen) return null;

  const currency = cycle?.currency || member?.currency || "NGN";

  const handlePay = async () => {
    setError("");
    setLoading(true);
    try {
      // ── Step 1: Tell backend to create the Booking shell
      const payRes = await retainedStaffApi.payCycle(member.id, cycle.id, {
        paymentMethod: "ESCROW",
        provider,
        providerPayload: provider === "crypto" ? { cryptoCurrency } : {},
      });

      const bookingId = payRes.data.data.booking.id;
      const cycleId = payRes.data.data.cycleId;

      // ── Step 2: Redirect to the standard payment flow based on provider
      if (provider === "bank_transfer") {
        navigate(`/bookings/${bookingId}/pay`);
      } else if (provider === "crypto") {
        navigate(
          `/bookings/${bookingId}/pay?method=crypto&currency=${cryptoCurrency}`,
        );
      } else if (provider === "wallet") {
        // Wallet payments don't need a separate page — trigger them directly
        const walletRes = await api.post(`/payments/initiate/${bookingId}`, {
          method: "wallet",
        });
        if (walletRes.data?.success) {
          navigate(
            `/dashboard/hirer/retained-staff/${member.id}/cycles/${cycleId}`,
          );
        } else {
          throw new Error(walletRes.data?.message || "Wallet payment failed");
        }
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
          {/* Summary card */}
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

          {/* Provider picker */}
          <h3 className={styles.payProviderTitle}>Choose Payment Method</h3>
          <div className={styles.providerList}>
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`${styles.providerCard} ${
                  provider === p.key ? styles.providerActive : ""
                }`}
                onClick={() => setProvider(p.key)}
              >
                <div className={styles.providerIcon}>{p.icon}</div>
                <div className={styles.providerInfo}>
                  <p className={styles.providerLabel}>{p.label}</p>
                  <p className={styles.providerDesc}>{p.desc}</p>
                </div>
                <div
                  className={`${styles.providerRadio} ${
                    provider === p.key ? styles.providerRadioActive : ""
                  }`}
                >
                  {provider === p.key && <FiCheckCircle size={16} />}
                </div>
              </button>
            ))}
          </div>

          {/* Crypto currency picker */}
          {provider === "crypto" && (
            <div className={styles.cryptoPicker}>
              <label>Cryptocurrency</label>
              <div className={styles.cryptoButtons}>
                {["USDC", "USDT"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.cryptoBtn} ${
                      cryptoCurrency === c ? styles.cryptoBtnActive : ""
                    }`}
                    onClick={() => setCryptoCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            disabled={loading}
          >
            {loading ? <FiLoader className={styles.spin} /> : <FiCreditCard />}
            {loading ? "Processing…" : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
