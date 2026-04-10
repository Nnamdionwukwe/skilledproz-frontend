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

export default function PaymentOptions({ booking, onSuccess }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("card"); // card | bank | crypto
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

  const platformFee = (booking.agreedRate * 0.1).toFixed(2);
  const total = (booking.agreedRate * 1.1).toFixed(2);

  async function handleCard() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${booking.id}`);
      //   const res = await api.post(`/bookings/${booking.id}/pay`);
      const { authorizationUrl, clientSecret } = res.data.data;
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else if (clientSecret) {
        sessionStorage.setItem("stripe_client_secret", clientSecret);
        navigate(`/bookings/${booking.id}/stripe-confirm`);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/payments/bank-transfer/${booking.id}`);
      setBankDetails(res.data.data.bankDetails);
      setStep("details");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to initiate bank transfer");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankConfirm() {
    if (!bankProof.trim() && !senderName.trim()) {
      setError("Please provide proof of payment or your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.patch(`/payments/bank-transfer/${booking.id}/confirm`, {
        proofUrl: bankProof,
        senderName,
        bankName: senderBank,
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
      await api.patch(`/payments/crypto/${booking.id}/confirm`, {
        txHash: cryptoTxHash,
        cryptoAmount,
        cryptoCurrency: cryptoAsset,
      });
      setStep("confirm");
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successRing}>✅</div>
        <h3 className={styles.successTitle}>Payment Submitted</h3>
        <p className={styles.successText}>
          {tab === "bank"
            ? "Your bank transfer details have been submitted. We'll confirm within 20–30 minutes."
            : "Your crypto transaction has been submitted. We'll verify on-chain within 30 minutes."}
        </p>
        <button
          className={styles.successBtn}
          onClick={() => navigate(`/bookings`)}
        >
          Back to Booking
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* ── Booking summary ── */}
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Agreed Rate</span>
          <span>
            {booking.currency} {Number(booking.agreedRate).toLocaleString()}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span>Platform Fee (10%)</span>
          <span>
            {booking.currency} {platformFee}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Total</span>
          <span>
            {booking.currency} {Number(total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Tab selector ── */}
      {step === "select" && (
        <>
          <div className={styles.tabs}>
            {/* <button
              className={`${styles.tab} ${tab === "card" ? styles.tabActive : ""}`}
              onClick={() => setTab("card")}
            >
              💳 Card
            </button> */}
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

          {/* Card tab */}
          {/* {tab === "card" && (
            <div className={styles.tabContent}>
              <p className={styles.tabDesc}>
                Pay securely with your debit or credit card via Paystack (NGN)
                or Stripe (international).
              </p>
              <button
                className={styles.payBtn}
                onClick={handleCard}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Processing…
                  </>
                ) : (
                  `💳 Pay ${booking.currency} ${Number(total).toLocaleString()} Now`
                )}
              </button>
            </div>
          )} */}

          {/* Bank transfer tab */}
          {tab === "bank" && (
            <div className={styles.tabContent}>
              <p className={styles.tabDesc}>
                Transfer directly to our bank account and upload your proof of
                payment. Funds are held in escrow until the job is complete.
              </p>
              <button
                className={styles.payBtn}
                onClick={handleBankInitiate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Loading bank details…
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
                Pay with cryptocurrency. Select your preferred asset and send to
                the wallet address provided.
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
              value={`${bankDetails.currency} ${Number(bankDetails.amount).toLocaleString()}`}
              accent
            />
            <BankRow label="Narration" value={bankDetails.narration} mono />
          </div>

          <div className={styles.bankWarn}>
            ⚠️ Include the exact narration in your transfer. Payments without
            the reference may be delayed.
          </div>

          <p className={styles.bankSubtitle}>Confirm your transfer</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Name *</label>
            <input
              className={styles.input}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name on the sending account"
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
              Proof of Payment URL (optional)
            </label>
            <input
              className={styles.input}
              value={bankProof}
              onChange={(e) => setBankProof(e.target.value)}
              placeholder="Link to screenshot or receipt"
            />
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
              value={`${cryptoDetails.amountFiat} ${cryptoDetails.currency} equivalent`}
              accent
            />
            <BankRow label="Memo" value={cryptoDetails.note} mono />
          </div>

          <div className={styles.bankWarn}>
            ⚠️ Only send {cryptoDetails.currency} on the {cryptoDetails.network}{" "}
            network. Sending on the wrong network may result in loss of funds.
          </div>

          <p className={styles.bankSubtitle}>Confirm your transaction</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Transaction Hash / TX ID *</label>
            <input
              className={styles.input}
              value={cryptoTxHash}
              onChange={(e) => setCryptoTxHash(e.target.value)}
              placeholder="0x... or transaction ID"
              style={{ fontFamily: "monospace" }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Amount Sent</label>
            <input
              className={styles.input}
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder="Amount in crypto"
            />
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
        All payments are held in escrow and only released after you confirm the
        job is complete.
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
