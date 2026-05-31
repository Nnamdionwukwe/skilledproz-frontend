import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import styles from "./PaymentOptions.module.css";

const CRYPTO_OPTIONS = [
  { value: "USDC", label: "USDC", network: "Ethereum", icon: "💲" },
  { value: "USDT", label: "USDT", network: "Tron (TRC20)", icon: "💵" },
  { value: "BTC", label: "Bitcoin", network: "Bitcoin", icon: "₿" },
  { value: "ETH", label: "Ethereum", network: "Ethereum", icon: "⟠" },
];

// ── Pricing helper — matches BookingDetail sidebar exactly ────────────────────
// agreedRate = rate per unit (hr / day / week / month)
// estimatedUnit + estimatedHours → qty
// platformFeeRate = 0.1 (10%) matching payment.service.js
function calcPricing(booking, applyReferral = false, referralDiscount = null) {
  const rate = booking.agreedRate || 0;
  const unit = booking.estimatedUnit || "hours";
  const hours = booking.estimatedHours;
  const value = booking.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking.currency || "USD";
  const PLATFORM_FEE_RATE = 0.05; // Phase 1 — 5% // must match payment.service.js PLATFORM_FEE_PERCENT

  // Quantity of units
  let qty = 1;
  if (value && unit !== "custom") {
    qty = value;
  } else if (hours) {
    // Fall back: derive qty from estimatedHours
    if (unit === "hours") qty = hours;
    if (unit === "days") qty = Math.round(hours / 8);
    if (unit === "weeks") qty = Math.round(hours / 40);
    if (unit === "months") qty = Math.round(hours / 160);
  }

  const unitSuffix =
    { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[unit] || "";
  const unitLabel =
    { hours: "hour", days: "day", weeks: "week", months: "month" }[unit] ||
    unit;

  const subtotal = rate * qty;
  const platformFee = parseFloat((subtotal * PLATFORM_FEE_RATE).toFixed(2));
  const workerPayout = subtotal; // worker gets full agreed rate; fee is charged ON TOP
  const referralDeduct =
    applyReferral && referralDiscount
      ? Math.min(referralDiscount.discount, subtotal + platformFee)
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
  referralDiscount,
  referralApplied: referralAppliedProp,
  onReferralToggle,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("crypto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("select"); // select | details | confirm

  // Bank transfer state
  const [bankProof, setBankProof] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [bankDetails, setBankDetails] = useState(null);

  // Crypto state
  const [cryptoAsset, setCryptoAsset] = useState("USDC");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoDetails, setCryptoDetails] = useState(null);

  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);

  // ── Pricing ───────────────────────────────────────────────────────────────
  const applyReferral = referralAppliedProp ?? false;
  const p = calcPricing(booking, applyReferral, referralDiscount);

  // ── Handlers ──────────────────────────────────────────────────────────────
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

      await api.patch(`/payments/bank-transfer/${booking.id}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep("confirm");
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

      await api.patch(`/payments/crypto/${booking.id}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep("confirm");
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successRing}>✅</div>
        <h3 className={styles.successTitle}>Payment Submitted</h3>
        <p className={styles.successText}>
          {tab === "bank"
            ? "Bank transfer details submitted. We'll confirm within 1–2 hours."
            : "Crypto transaction submitted. We'll verify on-chain within 30 minutes."}
        </p>
        <button
          className={styles.successBtn}
          onClick={() => navigate("/bookings")}
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* ── Pricing breakdown — matches BookingDetail sidebar exactly ── */}
      <div className={styles.summary}>
        <p className={styles.summaryTitle}>💰 Payment Breakdown</p>

        <div className={styles.summaryRow}>
          <span>Agreed Rate</span>
          <span>
            {p.currency} {p.rate.toLocaleString()}
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
              Subtotal ({p.qty} × {p.currency} {p.rate.toLocaleString()})
            </span>
            <span>
              {p.currency} {p.subtotal.toLocaleString()}
            </span>
          </div>
        )}

        <div className={styles.summaryRow}>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Platform Fee (5%)
          </span>

          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            − {p.currency}{" "}
            {p.platformFee.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {p.referralDeduct > 0 && (
          <div className={styles.summaryRow}>
            <span style={{ color: "var(--green)", fontSize: 12 }}>
              🎁 Referral bonus
            </span>
            <span style={{ color: "var(--green)", fontSize: 12 }}>
              − {p.currency} {p.referralDeduct.toLocaleString()}
            </span>
          </div>
        )}

        <div className={styles.summaryDivider} />

        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>You Pay</span>
          <span className={styles.summaryTotalAmt}>
            {p.currency} {p.totalCharged.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Tab selector ── */}
      {step === "select" && (
        <>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "bank" ? styles.tabActive : ""}`}
              onClick={() => setTab("bank")}
            >
              🏦 Bank Transfer
            </button>
            <button
              className={`${styles.tab} ${tab === "crypto" ? styles.tabActive : ""}`}
              onClick={() => setTab("crypto")}
            >
              ₿ Crypto
            </button>
          </div>

          {/* Bank transfer tab */}
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
                    <span className={styles.spinner} /> Loading…
                  </>
                ) : (
                  "🏦 Get Bank Details"
                )}
              </button>
            </div>
          )}

          {/* Crypto tab */}
          {tab === "crypto" && (
            <div className={styles.tabContent}>
              <p className={styles.tabDesc}>
                Pay with cryptocurrency. Send to our wallet and submit your
                transaction hash.
              </p>
              <div className={styles.cryptoGrid}>
                {CRYPTO_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    className={`${styles.cryptoChip} ${cryptoAsset === c.value ? styles.cryptoChipActive : ""}`}
                    onClick={() => setCryptoAsset(c.value)}
                  >
                    <span className={styles.cryptoChipIcon}>{c.icon}</span>
                    <span className={styles.cryptoChipLabel}>{c.label}</span>
                    <span className={styles.cryptoChipNetwork}>
                      {c.network}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className={styles.payBtn}
                onClick={handleCryptoInitiate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Loading wallet…
                  </>
                ) : (
                  `⟠ Pay with ${cryptoAsset}`
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
              value={`${p.currency} ${p.totalCharged.toLocaleString()}`}
              accent
            />
            <BankRow label="Narration" value={bankDetails.narration} mono />
          </div>
          <div className={styles.bankWarn}>
            ⚠️ Include the exact proof of payment. Payments without the proof
            may be delayed.
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
                {bankReceiptFile
                  ? `✅ ${bankReceiptFile.name}`
                  : "📎 Upload receipt (image or PDF)"}
              </span>
            </label>
            {bankReceiptFile && (
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setBankReceiptFile(null)}
              >
                ✕ Remove
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
                  <span className={styles.spinner} /> Submitting…
                </>
              ) : (
                "✅ I Have Transferred"
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
              value={`${p.currency} ${p.totalCharged.toLocaleString()}`}
              accent
            />
            <BankRow label="Memo" value={cryptoDetails.note} mono />
          </div>
          <div className={styles.bankWarn}>
            ⚠️ Only send {cryptoDetails.currency} on the {cryptoDetails.network}{" "}
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
                {cryptoReceiptFile
                  ? `✅ ${cryptoReceiptFile.name}`
                  : "📎 Upload screenshot"}
              </span>
            </label>
            {cryptoReceiptFile && (
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setCryptoReceiptFile(null)}
              >
                ✕ Remove
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
                  <span className={styles.spinner} /> Submitting…
                </>
              ) : (
                "✅ Confirm Transaction"
              )}
            </button>
          </div>
        </div>
      )}

      {error && <p className={styles.error}>⚠️ {error}</p>}

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
