import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import styles from "./PaymentOptions.module.css";
import {
  FaCheckCircle,
  FaUniversity,
  FaExclamationTriangle,
  FaPaperclip,
  FaTimes,
  FaGift,
  FaMoneyBillWave,
  FaSpinner,
  FaBitcoin,
  FaEthereum,
} from "react-icons/fa";
import CryptoRateConverter from "./CryptoRateConverter";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcPricing(booking, referralAmount = 0, applyReferral = false) {
  const rate = booking.agreedRate || 0;
  const unit = booking.estimatedUnit || "hours";
  const hours = booking.estimatedHours;
  const value = booking.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking.currency || "USD";
  const PLATFORM_FEE_RATE = 0.05;

  let qty = 1;
  if (value && unit !== "custom") {
    qty = value;
  } else if (hours) {
    if (unit === "hours") qty = hours;
    if (unit === "days") qty = Math.round(hours / 8);
    if (unit === "weeks") qty = Math.round(hours / 40);
    if (unit === "months") qty = Math.round(hours / 160);
  }

  const unitSuffix =
    { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[unit] || "";
  const unitLabel =
    { hours: "hour", days: "day", weeks: "week", month: "month" }[unit] || unit;

  const subtotal = rate * qty;
  const platformFee = parseFloat((subtotal * PLATFORM_FEE_RATE).toFixed(2));
  const workerPayout = subtotal;
  const referralDeduct = applyReferral
    ? Math.min(referralAmount, subtotal + platformFee)
    : 0;
  const totalCharged = parseFloat(
    (subtotal + platformFee - referralDeduct).toFixed(2),
  );

  return {
    rate,
    qty,
    unit,
    unitSuffix,
    unitLabel,
    currency,
    subtotal,
    platformFee,
    workerPayout,
    totalCharged,
    hasQty: (value || hours) && unit !== "custom",
    referralDeduct,
  };
}

export default function PaymentOptions({
  booking,
  onSuccess,
  referralAmount = 0,
  referralApplied = false,
  onReferralToggle,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("crypto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("select");

  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [bankDetails, setBankDetails] = useState(null);

  const [cryptoAsset, setCryptoAsset] = useState("USDC");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoDetails, setCryptoDetails] = useState(null);

  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);

  const [convertedCryptoAmount, setConvertedCryptoAmount] = useState(null);

  const p = calcPricing(booking, referralAmount, referralApplied);

  async function handleBankInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/payments/bank-transfer/${booking.id}`, {
        amount: p.totalCharged,
        currency: p.currency,
        narration: `SkilledProz-${booking.id.slice(0, 8).toUpperCase()}`,
      });
      setBankDetails(res.data.data.bankDetails);
      setStep("details");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to initiate bank transfer");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankConfirm() {
    if (!senderName.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("senderName", senderName);
      if (senderBank) fd.append("bankName", senderBank);
      if (bankReceiptFile) fd.append("proof", bankReceiptFile);
      if (referralApplied && referralAmount > 0) {
        fd.append("referralAmount", String(referralAmount));
      }

      await api.patch(`/payments/bank-transfer/${booking.id}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/payments/manual-success", {
        state: { method: "bank", bookingId: booking.id },
        replace: true,
      });
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCryptoInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/payments/crypto/${booking.id}`, {
        cryptoCurrency: cryptoAsset,
      });
      setCryptoDetails(res.data.data.cryptoDetails);
      setStep("details");
    } catch (e) {
      setError(
        e.response?.data?.message || "Failed to initiate crypto payment",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCryptoConfirm() {
    if (!cryptoTxHash.trim()) {
      setError("Transaction hash is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("txHash", cryptoTxHash);
      fd.append("cryptoCurrency", cryptoAsset);
      if (cryptoAmount) fd.append("cryptoAmount", cryptoAmount);
      if (cryptoReceiptFile) fd.append("proof", cryptoReceiptFile);
      if (referralApplied && referralAmount > 0) {
        fd.append("referralAmount", String(referralAmount));
      }

      await api.patch(`/payments/crypto/${booking.id}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/payments/manual-success", {
        state: { method: "crypto", bookingId: booking.id },
        replace: true,
      });
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {/* ── Pricing breakdown ── */}
      <div className={styles.summary}>
        <p className={styles.summaryTitle}>
          <FaMoneyBillWave style={{ marginRight: "6px" }} /> Payment Breakdown
        </p>

        <div className={styles.summaryRow}>
          <span>Agreed Rate</span>
          <span>
            {formatPrice(p.rate, p.currency)}
            {p.unitSuffix}
          </span>
        </div>

        {p.hasQty && (
          <div className={styles.summaryRow}>
            <span>Duration</span>
            <span>
              {p.qty} {p.unitLabel}
              {p.qty !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {p.hasQty && (
          <div className={styles.summaryRow}>
            <span>
              Subtotal ({p.qty} × {formatPrice(p.rate, p.currency)})
            </span>
            <span>{formatPrice(p.subtotal, p.currency)}</span>
          </div>
        )}

        <div className={styles.summaryRow}>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Platform Fee (5%)
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            + {formatPrice(p.platformFee, p.currency)}
          </span>
        </div>

        {p.referralDeduct > 0 && (
          <div className={styles.summaryRow}>
            <span style={{ color: "var(--green)", fontSize: 12 }}>
              <FaGift style={{ marginRight: "4px" }} /> Referral bonus
            </span>
            <span style={{ color: "var(--green)", fontSize: 12 }}>
              − {formatPrice(p.referralDeduct, p.currency)}
            </span>
          </div>
        )}

        <div className={styles.summaryDivider} />

        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>You Pay</span>
          <span className={styles.summaryTotalAmt}>
            {formatPrice(p.totalCharged, p.currency)}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      {step === "select" && (
        <>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "bank" ? styles.tabActive : ""}`}
              onClick={() => setTab("bank")}
            >
              <FaUniversity style={{ marginRight: "6px" }} /> Bank Transfer
            </button>
            <button
              className={`${styles.tab} ${tab === "crypto" ? styles.tabActive : ""}`}
              onClick={() => setTab("crypto")}
            >
              <FaBitcoin style={{ marginRight: "6px" }} /> Crypto
            </button>
          </div>

          {tab === "bank" && (
            <div className={styles.tabContent}>
              <p className={styles.tabDesc}>
                Transfer directly to our escrow account. We'll confirm receipt
                within 1–2 minutes and notify the worker.
              </p>
              <button
                className={styles.payBtn}
                onClick={handleBankInitiate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Loading…
                  </>
                ) : (
                  <>
                    <FaUniversity style={{ marginRight: "6px" }} /> Get Bank
                    Details
                  </>
                )}
              </button>
            </div>
          )}

          {tab === "crypto" && (
            <div className={styles.tabContent}>
              <p className={styles.tabDesc}>
                Pay with cryptocurrency. Send to our wallet and submit your
                transaction hash.
              </p>

              {/* ── Live crypto rate converter ── */}
              <CryptoRateConverter
                fiatAmount={p.totalCharged}
                fiatCurrency={p.currency || "NGN"}
                selectedToken={cryptoAsset}
                onAmountChange={(data) => {
                  setCryptoAsset(data.token);
                  setConvertedCryptoAmount(data.amount);
                }}
              />

              {/* ── Pay button ── */}
              <button
                className={styles.payBtn}
                onClick={handleCryptoInitiate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Loading wallet…
                  </>
                ) : (
                  <>
                    <FaEthereum style={{ marginRight: "6px" }} /> Pay with{" "}
                    {cryptoAsset}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Bank details step ── */}
      {step === "details" && tab === "bank" && bankDetails && (
        <div className={styles.bankDetails}>
          <p className={styles.bankTitle}>Transfer to this account</p>
          <div className={styles.bankCard}>
            <BankRow label="Bank" value={bankDetails.bankName} />
            <BankRow
              label="Account Number"
              value={bankDetails.accountNumber}
              copyable
            />
            <BankRow label="Account Name" value={bankDetails.accountName} />
            <BankRow
              label="Amount"
              value={formatPrice(p.totalCharged, p.currency)}
              accent
            />
            <BankRow label="Narration" value={bankDetails.narration} mono />
          </div>
          <div className={styles.bankWarn}>
            <FaExclamationTriangle style={{ marginRight: "6px" }} />
            Include the exact proof of payment. Payments without the proof may
            be delayed.
          </div>
          <p className={styles.bankSubtitle}>Confirm your transfer</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Name *</label>
            <input
              className={styles.input}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name on sending account"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Bank</label>
            <input
              className={styles.input}
              value={senderBank}
              onChange={(e) => setSenderBank(e.target.value)}
              placeholder="e.g. GTBank, Access Bank"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Receipt / Proof of Payment (optional)
            </label>
            <label className={styles.fileLabel}>
              <input
                type="file"
                accept="image/*,application/pdf"
                className={styles.fileInput}
                onChange={(e) =>
                  setBankReceiptFile(e.target.files?.[0] || null)
                }
              />
              <span className={styles.fileBtn}>
                <FaPaperclip style={{ marginRight: "6px" }} />
                {bankReceiptFile
                  ? `✅ ${bankReceiptFile.name}`
                  : "Upload receipt (image or PDF)"}
              </span>
            </label>
            {bankReceiptFile && (
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setBankReceiptFile(null)}
              >
                <FaTimes />
              </button>
            )}
          </div>
          <div className={styles.bankBtns}>
            <button
              className={styles.backBtn}
              onClick={() => setStep("select")}
            >
              ← Back
            </button>
            <button
              className={styles.payBtn}
              onClick={handleBankConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className={styles.spinner} /> Submitting…
                </>
              ) : (
                <>
                  <FaCheckCircle style={{ marginRight: "6px" }} /> I Have
                  Transferred
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Crypto details step ── */}
      {step === "details" && tab === "crypto" && cryptoDetails && (
        <div className={styles.cryptoDetails}>
          <p className={styles.bankTitle}>Send to this wallet</p>
          <div className={styles.bankCard}>
            <BankRow label="Asset" value={cryptoDetails.currency} />
            <BankRow label="Network" value={cryptoDetails.network} />
            <BankRow
              label="Wallet"
              value={cryptoDetails.wallet}
              copyable
              mono
            />
            <BankRow
              label="Amount"
              value={
                convertedCryptoAmount
                  ? `${convertedCryptoAmount.toFixed(6)} ${cryptoAsset}`
                  : formatPrice(p.totalCharged, p.currency)
              }
              accent
            />
            <BankRow label="Memo" value={cryptoDetails.note} mono />
          </div>
          <div className={styles.bankWarn}>
            <FaExclamationTriangle style={{ marginRight: "6px" }} />
            Only send {cryptoDetails.currency} on the {cryptoDetails.network}{" "}
            network. Wrong network may result in permanent loss of funds.
          </div>
          <p className={styles.bankSubtitle}>Confirm your transaction</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Transaction Hash / TX ID *</label>
            <input
              className={`${styles.input} ${styles.inputMono}`}
              value={cryptoTxHash}
              onChange={(e) => setCryptoTxHash(e.target.value)}
              placeholder="0x... or transaction ID"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Amount Sent (optional)</label>
            <input
              className={styles.input}
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder="Amount in crypto"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Transaction Screenshot (optional)
            </label>
            <label className={styles.fileLabel}>
              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) =>
                  setCryptoReceiptFile(e.target.files?.[0] || null)
                }
              />
              <span className={styles.fileBtn}>
                <FaPaperclip style={{ marginRight: "6px" }} />
                {cryptoReceiptFile
                  ? `✅ ${cryptoReceiptFile.name}`
                  : "Upload screenshot"}
              </span>
            </label>
            {cryptoReceiptFile && (
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setCryptoReceiptFile(null)}
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className={styles.bankBtns}>
            <button
              className={styles.backBtn}
              onClick={() => setStep("select")}
            >
              ← Back
            </button>
            <button
              className={styles.payBtn}
              onClick={handleCryptoConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className={styles.spinner} /> Submitting…
                </>
              ) : (
                <>
                  <FaCheckCircle style={{ marginRight: "6px" }} /> Confirm
                  Transaction
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className={styles.error}>
          <FaExclamationTriangle style={{ marginRight: "6px" }} /> {error}
        </p>
      )}

      <p className={styles.disclaimer}>
        All payments are held in escrow and only released after you confirm job
        completion.
      </p>
    </div>
  );
}

function BankRow({ label, value, copyable, mono, accent }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className={styles.bankRow}>
      <span className={styles.bankLabel}>{label}</span>
      <div className={styles.bankValWrap}>
        <span
          className={`${styles.bankVal} ${mono ? styles.bankMono : ""} ${accent ? styles.bankAccent : ""}`}
        >
          {value}
        </span>
        {copyable && (
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? "✓" : "⎘"}
          </button>
        )}
      </div>
    </div>
  );
}
