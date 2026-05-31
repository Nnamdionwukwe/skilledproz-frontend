// src/components/booking/InitiatePayment.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

const HIRER_FEE_RATE = 0.05;

function calcPricing(booking, referralDiscount = 0) {
  const agreedRate = booking?.agreedRate || 0;
  const unit = booking?.estimatedUnit || "hours";
  const hours = booking?.estimatedHours;
  const value = booking?.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking?.currency || "USD";

  let qty = 1;
  if (value && unit !== "custom") qty = value;
  else if (hours) {
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
  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const workerPayout = subtotal;
  const grossTotal = parseFloat((subtotal + hirerFee).toFixed(2));
  const referralSaving = currency === "NGN" ? referralDiscount : 0;
  const totalCharged = parseFloat(
    Math.max(0, grossTotal - referralSaving).toFixed(2),
  );

  return {
    agreedRate,
    qty,
    unit,
    unitSuffix,
    unitLabel,
    currency,
    subtotal,
    hirerFee,
    workerPayout,
    grossTotal,
    totalCharged,
    referralSaving,
    hasQty: !!(value || hours) && unit !== "custom",
  };
}

// All supported crypto tokens
const CRYPTO_TOKENS = [
  { id: "USDC", label: "USDC", icon: "💲", network: "BSC (BEP20)" },
  { id: "USDT", label: "USDT", icon: "💵", network: "Tron (TRC20)" },
  { id: "BTC", label: "Bitcoin", icon: "₿", network: "Bitcoin" },
  { id: "ETH", label: "Ethereum", icon: "⟠", network: "Ethereum" },
];

const METHODS = [
  {
    id: "card",
    icon: "💳",
    label: "Card / Mobile Money",
    desc: "Redirected to Flutterwave or Paystack",
  },
  {
    id: "bank_transfer",
    icon: "🏦",
    label: "Bank Transfer",
    desc: "Send to our escrow, we verify & activate",
  },
  { id: "crypto", icon: "₿", label: "Crypto", desc: "USDC · USDT · BTC · ETH" },
];

export default function InitiatePayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("card");
  const [manualData, setManualData] = useState(null);
  const [cryptoToken, setCryptoToken] = useState("USDC");
  const [confirmStep, setConfirmStep] = useState(null);
  const [confirmForm, setConfirmForm] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);

  // Receipt file uploads
  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);

  // Referral discount
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  // ── Load booking ─────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);
        setBookingStatus(b.status);
        if (b.currency === "NGN") {
          api
            .get("/referral/dashboard")
            .then((rd) => {
              const data = rd.data.data;
              if (data?.code) {
                const raw = (b.agreedRate || 0) * 0.05;
                setReferralDiscount(Math.min(raw, 2500));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Auto-poll while PENDING
  useEffect(() => {
    if (bookingStatus !== "PENDING") return;
    const timer = setInterval(() => {
      api
        .get(`/bookings/${bookingId}`)
        .then((res) => {
          const b = res.data.data.booking;
          setBooking(b);
          setBookingStatus(b.status);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [bookingId, bookingStatus]);

  const p = calcPricing(booking, referralApplied ? referralDiscount : 0);

  // ── Card payment ──────────────────────────────────────────────────────────
  async function handleCardPay() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${bookingId}`);
      const { paymentUrl } = res.data.data;
      if (!paymentUrl) {
        setError("Payment URL not received. Try again.");
        return;
      }
      window.location.href = paymentUrl;
    } catch (e) {
      setError(e.response?.data?.message || "Payment initiation failed.");
    } finally {
      setPaying(false);
    }
  }

  // ── Bank transfer — get escrow details ───────────────────────────────────
  async function handleBankTransfer() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/bank-transfer/${bookingId}`, {
        amount: p.totalCharged,
        currency: p.currency,
      });
      setManualData(res.data.data);
      setConfirmStep("bank_transfer");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load bank details.");
    } finally {
      setPaying(false);
    }
  }

  // ── Crypto — get wallet details ───────────────────────────────────────────
  async function handleCrypto() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/crypto/${bookingId}`, {
        cryptoCurrency: cryptoToken,
        amount: p.totalCharged,
        currency: p.currency,
      });
      setManualData(res.data.data);
      setConfirmStep("crypto");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load crypto details.");
    } finally {
      setPaying(false);
    }
  }

  function handlePrimary() {
    if (method === "card") return handleCardPay();
    if (method === "bank_transfer") return handleBankTransfer();
    if (method === "crypto") return handleCrypto();
  }

  // ── Confirm bank transfer ─────────────────────────────────────────────────
  async function confirmBankTransfer() {
    setConfirming(true);
    setError("");
    try {
      const fd = new FormData();
      if (confirmForm.senderName)
        fd.append("senderName", confirmForm.senderName);
      if (confirmForm.bankName) fd.append("bankName", confirmForm.bankName);
      if (bankReceiptFile) fd.append("proof", bankReceiptFile);

      await api.patch(`/payments/bank-transfer/${bookingId}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/bookings/${bookingId}?payment=bank_submitted`);
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }

  // ── Confirm crypto ────────────────────────────────────────────────────────
  async function confirmCrypto() {
    if (!confirmForm.txHash) {
      setError("Transaction hash is required.");
      return;
    }
    setConfirming(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("txHash", confirmForm.txHash);
      fd.append("cryptoCurrency", cryptoToken);
      if (confirmForm.cryptoAmount)
        fd.append("cryptoAmount", confirmForm.cryptoAmount);
      if (cryptoReceiptFile) fd.append("proof", cryptoReceiptFile);

      await api.patch(`/payments/crypto/${bookingId}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/bookings/${bookingId}?payment=crypto_submitted`);
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }

  function resetToMethodSelect() {
    setConfirmStep(null);
    setManualData(null);
    setBankReceiptFile(null);
    setCryptoReceiptFile(null);
    setConfirmForm({});
    setError("");
  }

  // ── Loading / error guards ────────────────────────────────────────────────
  if (loading)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skCard} />
        </div>
      </HirerLayout>
    );

  if (error && !booking)
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <Link to="/bookings" className={styles.backLink}>
              ← Back to Bookings
            </Link>
          </div>
        </div>
      </HirerLayout>
    );

  // ── Manual confirmation step ──────────────────────────────────────────────
  if (confirmStep && manualData) {
    const isBankTx = confirmStep === "bank_transfer";
    const bd = manualData.bankDetails;
    const cd = manualData.cryptoDetails;

    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            {/* Header */}
            <div className={styles.payHeader}>
              <button
                className={styles.changeMethodBtn}
                onClick={resetToMethodSelect}
              >
                ← Change method
              </button>
              <div className={styles.payBadge}>
                {isBankTx ? "🏦 Bank Transfer" : `₿ ${cryptoToken} Crypto`}
              </div>
            </div>

            {/* Transfer details card */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryIconWrap}>
                  <span className={styles.summaryIcon}>
                    {isBankTx ? "🏦" : "₿"}
                  </span>
                </div>
                <div>
                  <p className={styles.summaryLabel}>Send exactly</p>
                  {/* ↓ Use p.totalCharged so referral discount is reflected */}
                  <h2 className={styles.summaryTitle}>
                    {p.currency} {p.totalCharged.toLocaleString()}
                  </h2>
                  {referralApplied &&
                    referralDiscount > 0 &&
                    p.currency === "NGN" && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--green)",
                          marginTop: 2,
                        }}
                      >
                        🎁 Includes ₦{referralDiscount.toLocaleString()}{" "}
                        referral discount
                      </p>
                    )}
                  <p className={styles.summaryCategory}>
                    Ref: {manualData.reference}
                  </p>
                </div>
              </div>

              {/* Bank details rows */}
              {isBankTx && bd && (
                <div className={styles.summaryMeta}>
                  {[
                    ["🏦", "Bank", bd.bankName],
                    ["#", "Account", bd.accountNumber],
                    ["👤", "Name", bd.accountName],
                    ["📝", "Narration", bd.narration],
                  ].map(
                    ([icon, k, v]) =>
                      v && (
                        <div key={k} className={styles.metaItem}>
                          <span className={styles.metaIcon}>{icon}</span>
                          <div style={{ flex: 1 }}>
                            <div className={styles.metaRowLabel}>{k}</div>
                            <div className={styles.metaRowValue}>{v}</div>
                          </div>
                        </div>
                      ),
                  )}
                </div>
              )}

              {/* Crypto details rows */}
              {!isBankTx && cd && (
                <div className={styles.summaryMeta}>
                  {[
                    ["🌐", "Network", cd.network],
                    ["📋", "Wallet", cd.wallet],
                    ["₿", "Token", cd.currency],
                    ["📝", "Memo", cd.note],
                  ].map(
                    ([icon, k, v]) =>
                      v && (
                        <div key={k} className={styles.metaItem}>
                          <span className={styles.metaIcon}>{icon}</span>
                          <div style={{ flex: 1 }}>
                            <div className={styles.metaRowLabel}>{k}</div>
                            <div className={styles.metaRowValue}>{v}</div>
                          </div>
                        </div>
                      ),
                  )}
                </div>
              )}
            </div>

            {/* Confirm form */}
            <div className={styles.breakdownCard}>
              <p className={styles.breakdownTitle}>Confirm Your Transfer</p>

              {isBankTx ? (
                <div className={styles.manualFields}>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>Your Name</label>
                    <input
                      className={styles.manualInput}
                      placeholder="As it appears on your bank"
                      value={confirmForm.senderName || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          senderName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>Your Bank Name</label>
                    <input
                      className={styles.manualInput}
                      placeholder="e.g. GTBank, Zenith, Access"
                      value={confirmForm.bankName || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          bankName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>
                      Receipt / Proof of Transfer (optional)
                    </label>
                    <label className={styles.fileUploadLabel}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className={styles.fileUploadInput}
                        onChange={(e) =>
                          setBankReceiptFile(e.target.files?.[0] || null)
                        }
                      />
                      <span className={styles.fileUploadBtn}>
                        {bankReceiptFile
                          ? `✅ ${bankReceiptFile.name}`
                          : "📎 Upload receipt (image or PDF)"}
                      </span>
                    </label>
                    {bankReceiptFile && (
                      <button
                        type="button"
                        className={styles.fileRemoveBtn}
                        onClick={() => setBankReceiptFile(null)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.manualFields}>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>
                      Transaction Hash *
                    </label>
                    <input
                      className={styles.manualInput}
                      style={{ fontFamily: "monospace" }}
                      placeholder="0x... or TRC20 / BTC tx hash"
                      value={confirmForm.txHash || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          txHash: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>
                      Amount Sent (optional)
                    </label>
                    <input
                      className={styles.manualInput}
                      type="number"
                      step="0.0001"
                      placeholder={`Amount in ${cryptoToken}`}
                      value={confirmForm.cryptoAmount || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          cryptoAmount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.manualField}>
                    <label className={styles.manualLabel}>
                      Transaction Screenshot (optional)
                    </label>
                    <label className={styles.fileUploadLabel}>
                      <input
                        type="file"
                        accept="image/*"
                        className={styles.fileUploadInput}
                        onChange={(e) =>
                          setCryptoReceiptFile(e.target.files?.[0] || null)
                        }
                      />
                      <span className={styles.fileUploadBtn}>
                        {cryptoReceiptFile
                          ? `✅ ${cryptoReceiptFile.name}`
                          : "📎 Upload screenshot"}
                      </span>
                    </label>
                    {cryptoReceiptFile && (
                      <button
                        type="button"
                        className={styles.fileRemoveBtn}
                        onClick={() => setCryptoReceiptFile(null)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className={styles.inlineError}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              className={styles.payBtn}
              onClick={isBankTx ? confirmBankTransfer : confirmCrypto}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <span className={styles.spinner} /> Submitting…
                </>
              ) : (
                "✅ I Have Transferred — Confirm"
              )}
            </button>

            <p className={styles.payDisclaimer}>
              {isBankTx
                ? "We'll verify your transfer within 1–2 hours and activate your booking."
                : "We'll verify on-chain within 30 minutes."}
            </p>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── PENDING state ─────────────────────────────────────────────────────────
  if (bookingStatus === "PENDING") {
    const prev = calcPricing(booking);
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            <div className={styles.payHeader}>
              <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
                ← View Booking
              </Link>
              <div className={styles.payBadge}>⏳ Pending Acceptance</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryIconWrap}>
                  <span className={styles.summaryIcon}>📋</span>
                </div>
                <div>
                  <p className={styles.summaryLabel}>Booking created</p>
                  <h2 className={styles.summaryTitle}>{booking?.title}</h2>
                  <p className={styles.summaryCategory}>
                    {booking?.worker?.firstName} {booking?.worker?.lastName} ·{" "}
                    {booking?.category?.name}
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.breakdownCard}>
              <p className={styles.breakdownTitle}>Payment Preview</p>
              <div className={styles.breakdownRows}>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Agreed Rate</span>
                  <span className={styles.breakdownVal}>
                    {prev.currency} {prev.agreedRate.toLocaleString()}
                    {prev.unitSuffix}
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Service Fee (5%)
                  </span>
                  <span className={styles.breakdownVal}>
                    + {prev.currency}{" "}
                    {prev.hirerFee.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className={styles.breakdownDivider} />
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabelTotal}>
                    You Will Pay
                  </span>
                  <span className={styles.breakdownValTotal}>
                    {prev.currency} {prev.totalCharged.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.verifyWrap}>
              <div
                className={styles.verifySpinner}
                style={{ borderTopColor: "#eab308" }}
              />
              <h2 className={styles.verifyTitle} style={{ color: "#eab308" }}>
                Waiting for Worker
              </h2>
              <p className={styles.verifyText}>
                Once they accept, you'll be able to complete payment here. This
                page checks every 8 seconds.
              </p>
            </div>
            <button
              className={styles.payBtn}
              style={{
                background: "var(--bg-card)",
                color: "var(--text-dim)",
                border: "1px solid var(--border)",
                boxShadow: "none",
              }}
              onClick={() =>
                api
                  .get(`/bookings/${bookingId}`)
                  .then((r) => {
                    setBooking(r.data.data.booking);
                    setBookingStatus(r.data.data.booking.status);
                  })
                  .catch(() => {})
              }
            >
              🔄 Check for Updates
            </button>
            <Link
              to={`/bookings/${bookingId}`}
              style={{
                textAlign: "center",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                textDecoration: "underline",
              }}
            >
              View booking details while you wait →
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── Main payment page ─────────────────────────────────────────────────────
  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              ← Back to Booking
            </Link>
            <div className={styles.payBadge}>🔒 Secure Payment</div>
          </div>

          {/* Booking summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.summaryIconWrap}>
                <span className={styles.summaryIcon}>📋</span>
              </div>
              <div>
                <p className={styles.summaryLabel}>You're paying for</p>
                <h2 className={styles.summaryTitle}>{booking?.title}</h2>
                <p className={styles.summaryCategory}>
                  {booking?.category?.name}
                </p>
              </div>
            </div>
            <div className={styles.summaryMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>👷</span>
                <span className={styles.metaText}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📅</span>
                <span className={styles.metaText}>
                  {new Date(booking?.scheduledAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {booking?.address && (
                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>📍</span>
                  <span className={styles.metaText}>{booking.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fee breakdown */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Payment Breakdown</p>
            <div className={styles.breakdownRows}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Agreed Rate</span>
                <span className={styles.breakdownVal}>
                  {p.currency} {p.agreedRate.toLocaleString()}
                  {p.unitSuffix}
                </span>
              </div>
              {p.hasQty && (
                <>
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>Duration</span>
                    <span className={styles.breakdownVal}>
                      {p.qty} {p.unitLabel}
                      {p.qty !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>
                      Job Value ({p.qty} × {p.currency}{" "}
                      {p.agreedRate.toLocaleString()})
                    </span>
                    <span className={styles.breakdownVal}>
                      {p.currency} {p.subtotal.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Service Fee (5%)</span>
                <span className={styles.breakdownVal}>
                  + {p.currency}{" "}
                  {p.hirerFee.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span
                  className={styles.breakdownLabel}
                  style={{ fontSize: "0.78rem", color: "var(--green)" }}
                >
                  🎉 Worker receives (no fee)
                </span>
                <span
                  className={styles.breakdownVal}
                  style={{ color: "var(--green)" }}
                >
                  {p.currency} {p.workerPayout.toLocaleString()}
                </span>
              </div>

              {/* Referral bonus */}
              {referralDiscount > 0 &&
                booking?.currency === "NGN" &&
                (referralApplied ? (
                  <div className={styles.breakdownRow}>
                    <span
                      className={styles.breakdownLabel}
                      style={{ color: "var(--green)" }}
                    >
                      🎁 Referral bonus
                      <button
                        onClick={() => setReferralApplied(false)}
                        className={styles.referralInlineBtn}
                      >
                        Remove
                      </button>
                    </span>
                    <span
                      className={styles.breakdownVal}
                      style={{ color: "var(--green)" }}
                    >
                      − ₦{referralDiscount.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className={styles.breakdownRow}>
                    <span
                      className={styles.breakdownLabel}
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                      }}
                    >
                      🎁 ₦{referralDiscount.toLocaleString()} referral bonus
                      available
                    </span>
                    <button
                      onClick={() => setReferralApplied(true)}
                      className={styles.referralApplyBtn}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              {booking?.currency !== "NGN" && referralDiscount > 0 && (
                <div className={styles.breakdownRow}>
                  <span
                    className={styles.breakdownLabel}
                    style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}
                  >
                    ℹ️ Referral bonus only applies to ₦ NGN payments
                  </span>
                </div>
              )}

              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabelTotal}>You Pay</span>
                <span className={styles.breakdownValTotal}>
                  {p.currency} {p.totalCharged.toLocaleString()}
                </span>
              </div>
            </div>
            <div className={styles.escrowNote}>
              <span className={styles.escrowIcon}>🔒</span>
              <p>
                Funds are held in escrow and only released to the worker after
                you confirm the job is complete.
              </p>
            </div>
          </div>

          {/* Payment method */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Payment Method</p>
            <div className={styles.methodGrid}>
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.methodCard} ${method === m.id ? styles.methodCardActive : ""}`}
                  onClick={() => {
                    setMethod(m.id);
                    setError("");
                  }}
                >
                  <span className={styles.methodCardIcon}>{m.icon}</span>
                  <div>
                    <span className={styles.methodCardLabel}>{m.label}</span>
                    <span className={styles.methodCardDesc}>{m.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Crypto token selector — all 4 */}
            {method === "crypto" && (
              <div className={styles.cryptoTokens}>
                {CRYPTO_TOKENS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.tokenBtn} ${cryptoToken === t.id ? styles.tokenBtnActive : ""}`}
                    onClick={() => setCryptoToken(t.id)}
                  >
                    <span className={styles.tokenBtnIcon}>{t.icon}</span>
                    <span>{t.label}</span>
                    <span className={styles.tokenBtnNetwork}>{t.network}</span>
                  </button>
                ))}
              </div>
            )}

            {method === "card" && (
              <div className={styles.providerNote}>
                {booking?.currency === "NGN"
                  ? "💚 You'll be redirected to Paystack to pay securely in NGN."
                  : "🦋 You'll be redirected to Flutterwave to pay securely."}
              </div>
            )}
          </div>

          {error && (
            <div className={styles.inlineError}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className={styles.payBtn}
            onClick={handlePrimary}
            disabled={paying}
          >
            {paying ? (
              <>
                <span className={styles.spinner} /> Processing…
              </>
            ) : method === "card" ? (
              <>
                💳 Pay {p.currency} {p.totalCharged.toLocaleString()} Securely
              </>
            ) : method === "bank_transfer" ? (
              <>
                🏦 Get Bank Details — {p.currency}{" "}
                {p.totalCharged.toLocaleString()}
              </>
            ) : (
              <>
                ₿ Get {cryptoToken} Wallet — {p.currency}{" "}
                {p.totalCharged.toLocaleString()}
              </>
            )}
          </button>

          <p className={styles.payDisclaimer}>
            Powered by Flutterwave &amp; Paystack · Escrow protected · Refund
            policy applies
          </p>

          <div className={styles.trustRow}>
            <span className={styles.trustItem}>🔐 256-bit SSL</span>
            <span className={styles.trustItem}>🛡️ Escrow protected</span>
            <span className={styles.trustItem}>🦋 Flutterwave</span>
            <span className={styles.trustItem}>💚 Paystack</span>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
