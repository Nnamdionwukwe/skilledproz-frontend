// src/components/booking/InitiatePayment.jsx
// Updated for Flutterwave + Paystack — no Stripe.
// Fee logic matches backend FEE_CONFIG Phase 1:
//   Hirer pays agreedRate + 5% service fee
//   Worker keeps 100% of agreedRate
//
// Routes:
//   POST /api/payments/initiate/:bookingId    → { provider, paymentUrl, ... }
//   POST /api/payments/bank-transfer/:bookingId → bank details
//   POST /api/payments/crypto/:bookingId        → crypto wallet details

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

// ── Fee config — mirrors backend FEE_CONFIG Phase 1 ──────────────────────────
const HIRER_FEE_RATE = 0.05; // 5% on top of agreedRate
const WORKER_FEE_RATE = 0.0; // 0% from worker

function calcPricing(booking) {
  const agreedRate = booking.agreedRate || 0;
  const unit = booking.estimatedUnit || "hours";
  const hours = booking.estimatedHours;
  const value = booking.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking.currency || "USD";

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

  // Correct fee model:
  //   subtotal   = agreedRate * qty  (what the job is worth / worker receives)
  //   hirerFee   = subtotal * 5%     (platform charge on top — hirer pays this)
  //   totalCharged = subtotal + hirerFee  (what hirer actually pays)
  //   workerPayout = subtotal             (worker keeps 100%)
  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const workerPayout = subtotal;
  const totalCharged = parseFloat((subtotal + hirerFee).toFixed(2));

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
    totalCharged,
    hasQty: !!(value || hours) && unit !== "custom",
  };
}

// ── Provider display meta ─────────────────────────────────────────────────────
const PROVIDER_META = {
  flutterwave: { label: "Flutterwave", icon: "🦋", badge: "🌍 International" },
  paystack: { label: "Paystack", icon: "💚", badge: "🇳🇬 Nigeria / Africa" },
};

// ── Payment method tabs ───────────────────────────────────────────────────────
const METHODS = [
  {
    id: "card",
    icon: "💳",
    label: "Card / Mobile Money",
    desc: "Auto-routed via Flutterwave or Paystack",
  },
  {
    id: "bank_transfer",
    icon: "🏦",
    label: "Bank Transfer",
    desc: "Send to our account, we verify & activate",
  },
  {
    id: "crypto",
    icon: "₿",
    label: "USDC / USDT Crypto",
    desc: "Send stablecoin to our wallet address",
  },
];

export default function InitiatePayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("card");
  const [manualData, setManualData] = useState(null); // bank or crypto details
  const [cryptoToken, setCryptoToken] = useState("USDC");
  const [confirmStep, setConfirmStep] = useState(null); // bank_transfer | crypto
  const [confirmForm, setConfirmForm] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null); // track booking acceptance

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        const b = res.data.data.booking;
        setBooking(b);
        setBookingStatus(b.status);
      })
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Auto-poll while booking is PENDING — worker may accept within seconds
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
    }, 8000); // poll every 8s
    return () => clearInterval(timer);
  }, [bookingId, bookingStatus]);

  // ── Card payment — Flutterwave / Paystack redirect ────────────────────────
  async function handleCardPay() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${bookingId}`);
      const { paymentUrl } = res.data.data;
      if (!paymentUrl) {
        setError("Payment URL not received. Please try again.");
        return;
      }
      window.location.href = paymentUrl; // redirect to Flutterwave or Paystack
    } catch (e) {
      setError(e.response?.data?.message || "Payment initiation failed.");
    } finally {
      setPaying(false);
    }
  }

  // ── Bank transfer — fetch our bank details ────────────────────────────────
  async function handleBankTransfer() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/bank-transfer/${bookingId}`);
      setManualData(res.data.data);
      setConfirmStep("bank_transfer");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load bank details.");
    } finally {
      setPaying(false);
    }
  }

  // ── Crypto — fetch wallet details ─────────────────────────────────────────
  async function handleCrypto() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/crypto/${bookingId}`, {
        cryptoCurrency: cryptoToken,
      });
      setManualData(res.data.data);
      setConfirmStep("crypto");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load crypto details.");
    } finally {
      setPaying(false);
    }
  }

  // ── Confirm bank transfer ─────────────────────────────────────────────────
  async function confirmBankTransfer() {
    if (!confirmForm.reference) {
      setError("Reference is required.");
      return;
    }
    setConfirming(true);
    setError("");
    try {
      await api.patch(`/payments/bank-transfer/${bookingId}/confirm`, {
        reference: manualData.reference,
        proofUrl: confirmForm.proofUrl || undefined,
        senderName: confirmForm.senderName || undefined,
        bankName: confirmForm.bankName || undefined,
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
      await api.patch(`/payments/crypto/${bookingId}/confirm`, {
        txHash: confirmForm.txHash,
        cryptoAmount: confirmForm.cryptoAmount || undefined,
        cryptoCurrency: cryptoToken,
        reference: manualData.reference,
      });
      navigate(`/bookings/${bookingId}?payment=crypto_submitted`);
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }

  function handlePrimary() {
    if (method === "card") return handleCardPay();
    if (method === "bank_transfer") return handleBankTransfer();
    if (method === "crypto") return handleCrypto();
  }

  // ── Render states ─────────────────────────────────────────────────────────
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

  const p = calcPricing(booking);

  // ── Manual confirmation step ───────────────────────────────────────────────
  if (confirmStep && manualData) {
    const isBankTx = confirmStep === "bank_transfer";
    const bd = manualData.bankDetails;
    const cd = manualData.cryptoDetails;

    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            <div className={styles.payHeader}>
              <button
                onClick={() => {
                  setConfirmStep(null);
                  setManualData(null);
                  setError("");
                }}
                className={styles.backLink}
              >
                ← Change method
              </button>
              <div className={styles.payBadge}>
                {isBankTx ? "🏦 Bank Transfer" : "₿ Crypto"}
              </div>
            </div>

            {/* Transfer instructions */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryIconWrap}>
                  <span className={styles.summaryIcon}>
                    {isBankTx ? "🏦" : "₿"}
                  </span>
                </div>
                <div>
                  <p className={styles.summaryLabel}>Send exactly</p>
                  <h2 className={styles.summaryTitle}>
                    {p.currency} {manualData.totalToSend?.toLocaleString()}
                  </h2>
                  <p className={styles.summaryCategory}>
                    Ref: {manualData.reference}
                  </p>
                </div>
              </div>

              {isBankTx && bd && (
                <div className={styles.summaryMeta}>
                  {[
                    ["Bank", bd.bankName],
                    ["Account", bd.accountNumber],
                    ["Name", bd.accountName],
                    ["Narration", bd.narration],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.metaItem}>
                      <span className={styles.metaIcon}>
                        {k === "Bank"
                          ? "🏦"
                          : k === "Account"
                            ? "#"
                            : k === "Name"
                              ? "👤"
                              : "📝"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "var(--text)",
                            wordBreak: "break-all",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isBankTx && cd && (
                <div className={styles.summaryMeta}>
                  {[
                    ["Network", cd.network],
                    ["Wallet", cd.wallet],
                    ["Token", cd.currency],
                    ["Memo", cd.note],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.metaItem}>
                      <span className={styles.metaIcon}>
                        {k === "Wallet"
                          ? "📋"
                          : k === "Network"
                            ? "🌐"
                            : k === "Token"
                              ? "₿"
                              : "📝"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "var(--text)",
                            wordBreak: "break-all",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    </div>
                  ))}
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
                      placeholder="e.g. GTBank, Zenith"
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
                      Transfer Proof URL (optional)
                    </label>
                    <input
                      className={styles.manualInput}
                      placeholder="Screenshot upload URL"
                      value={confirmForm.proofUrl || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          proofUrl: e.target.value,
                        }))
                      }
                    />
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
                      placeholder="0x... or TRC20 tx hash"
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
                      step="0.01"
                      placeholder={`In ${cryptoToken}`}
                      value={confirmForm.cryptoAmount || ""}
                      onChange={(e) =>
                        setConfirmForm((f) => ({
                          ...f,
                          cryptoAmount: e.target.value,
                        }))
                      }
                    />
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

  // ── PENDING state — booking not yet accepted by worker ──────────────────────
  if (bookingStatus === "PENDING" && !confirmStep) {
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

            {/* Fee preview — so hirer knows what they'll pay */}
            {(() => {
              const p = calcPricing(booking);
              return (
                <div className={styles.breakdownCard}>
                  <p className={styles.breakdownTitle}>Payment Preview</p>
                  <div className={styles.breakdownRows}>
                    <div className={styles.breakdownRow}>
                      <span className={styles.breakdownLabel}>Agreed Rate</span>
                      <span className={styles.breakdownVal}>
                        {p.currency} {p.agreedRate.toLocaleString()}
                        {p.unitSuffix}
                      </span>
                    </div>
                    <div className={styles.breakdownRow}>
                      <span className={styles.breakdownLabel}>
                        Service Fee (5%)
                      </span>
                      <span className={styles.breakdownVal}>
                        + {p.currency}{" "}
                        {p.hirerFee.toLocaleString(undefined, {
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
                        {p.currency} {p.totalCharged.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Waiting state */}
            <div className={styles.verifyWrap}>
              <div
                className={styles.verifySpinner}
                style={{ borderTopColor: "#eab308" }}
              />
              <h2 className={styles.verifyTitle} style={{ color: "#eab308" }}>
                Waiting for Worker
              </h2>
              <p className={styles.verifyText}>
                Your booking has been sent to the worker. Once they accept,
                you'll be able to complete payment here.
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                This page checks for updates automatically every 8 seconds.
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
              onClick={() => {
                api
                  .get(`/bookings/${bookingId}`)
                  .then((r) => {
                    setBooking(r.data.data.booking);
                    setBookingStatus(r.data.data.booking.status);
                  })
                  .catch(() => {});
              }}
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
          {/* Header */}
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
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📍</span>
                <span className={styles.metaText}>{booking?.address}</span>
              </div>
            </div>
          </div>

          {/* Fee breakdown — 5% hirer fee, worker keeps 100% */}
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
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Duration</span>
                  <span className={styles.breakdownVal}>
                    {p.qty} {p.unitLabel}
                    {p.qty !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {p.hasQty && (
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Job Value ({p.qty} × {p.currency}{" "}
                    {p.agreedRate.toLocaleString()})
                  </span>
                  <span className={styles.breakdownVal}>
                    {p.currency} {p.subtotal.toLocaleString()}
                  </span>
                </div>
              )}
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>
                  Service Fee (5%) — hirer only
                </span>
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
                  🎉 Worker receives (0% fee)
                </span>
                <span
                  className={styles.breakdownVal}
                  style={{ color: "var(--green)" }}
                >
                  {p.currency} {p.workerPayout.toLocaleString()}
                </span>
              </div>
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

          {/* Payment method selector */}
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
                  <span className={styles.methodCardLabel}>{m.label}</span>
                  <span className={styles.methodCardDesc}>{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Crypto token selector */}
            {method === "crypto" && (
              <div className={styles.cryptoTokens}>
                {["USDC", "USDT"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.tokenBtn} ${cryptoToken === t ? styles.tokenBtnActive : ""}`}
                    onClick={() => setCryptoToken(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Provider note for card */}
            {method === "card" && (
              <div className={styles.providerNote}>
                <span>
                  {booking?.currency === "NGN"
                    ? "💚 You'll be redirected to Paystack to pay securely in NGN."
                    : "🦋 You'll be redirected to Flutterwave to pay securely."}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.inlineError}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* CTA */}
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
                ₿ Get Crypto Wallet — {p.currency}{" "}
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
