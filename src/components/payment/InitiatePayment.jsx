import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";
import {
  FaCreditCard,
  FaUniversity,
  FaBitcoin,
  FaEthereum,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaShieldAlt,
  FaLock,
  FaGift,
  FaUser,
  FaTag,
  FaFileAlt,
  FaGlobe,
  FaWallet,
  FaCopy,
  FaCheck,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClipboardList,
} from "react-icons/fa";
import CryptoRateConverter from "./CryptoRateConverter";

const HIRER_FEE_RATE = 0.05;

function formatPrice(amount, currency = "USD") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
    else if (unit === "days") qty = Math.round(hours / 8);
    else if (unit === "weeks") qty = Math.round(hours / 40);
    else if (unit === "months") qty = Math.round(hours / 160);
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

const METHODS = [
  {
    id: "card",
    icon: <FaCreditCard />,
    label: "Card / Mobile Money",
    desc: "Redirected to Flutterwave or Paystack",
  },
  {
    id: "bank_transfer",
    icon: <FaUniversity />,
    label: "Bank Transfer",
    desc: "Send to our escrow, we verify & activate",
  },
  {
    id: "crypto",
    icon: <FaBitcoin />,
    label: "Crypto",
    desc: "USDC · USDT · BTC · ETH",
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
  const [manualData, setManualData] = useState(null);
  const [selectedCryptoToken, setSelectedCryptoToken] = useState("USDC");
  const [confirmStep, setConfirmStep] = useState(null);
  const [confirmForm, setConfirmForm] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);

  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  const [convertedCryptoAmount, setConvertedCryptoAmount] = useState(null);

  const [copied, setCopied] = useState({});

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    }
  };

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

  useEffect(() => {
    if (booking) {
      api
        .get("/referral/wallet")
        .then((res) => {
          setWalletBalance(res.data.data.balance || 0);
        })
        .catch(() => {});
    }
  }, [booking]);

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

  const p = calcPricing(booking, referralApplied ? referralAmount : 0);

  const handlePercentChange = (pct) => {
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const amount = Math.round((pct / 100) * subtotal);
    const final = Math.min(amount, maxDiscount);

    setReferralPercent(pct);
    setReferralAmount(final);
    setReferralApplied(final > 0);
  };

  const handleReferralToggle = () => {
    if (referralAmount === 0) return;
    setReferralApplied((prev) => !prev);
  };

  async function handleCardPay() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/initiate/${bookingId}`, {
        referralAmount: referralApplied ? referralAmount : 0,
      });
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

  async function handleBankTransfer() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/bank-transfer/${bookingId}`, {
        amount: p.totalCharged,
        currency: p.currency,
        referralAmount: referralApplied ? referralAmount : 0,
      });
      setManualData(res.data.data);
      setConfirmStep("bank_transfer");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load bank details.");
    } finally {
      setPaying(false);
    }
  }

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

      navigate("/payments/manual-success", {
        state: { method: "bank", bookingId },
        replace: true,
      });
    } catch (e) {
      setError(e.response?.data?.message || "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCrypto() {
    setPaying(true);
    setError("");
    try {
      const res = await api.post(`/payments/crypto/${bookingId}`, {
        cryptoCurrency: selectedCryptoToken,
        amount: p.totalCharged,
        currency: p.currency,
        referralAmount: referralApplied ? referralAmount : 0,
      });
      setManualData(res.data.data);
      setConfirmStep("crypto");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load crypto details.");
    } finally {
      setPaying(false);
    }
  }

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
      fd.append("cryptoCurrency", selectedCryptoToken);
      if (confirmForm.cryptoAmount)
        fd.append("cryptoAmount", confirmForm.cryptoAmount);
      if (cryptoReceiptFile) fd.append("proof", cryptoReceiptFile);

      await api.patch(`/payments/crypto/${bookingId}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/payments/manual-success", {
        state: { method: "crypto", bookingId },
        replace: true,
      });
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

  function resetToMethodSelect() {
    setConfirmStep(null);
    setManualData(null);
    setBankReceiptFile(null);
    setCryptoReceiptFile(null);
    setConfirmForm({});
    setError("");
  }

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
            <FaExclamationTriangle className={styles.errorIcon} />
            <p>{error}</p>
            <Link to="/bookings" className={styles.backLink}>
              <FaArrowLeft style={{ marginRight: "4px" }} /> Back to Bookings
            </Link>
          </div>
        </div>
      </HirerLayout>
    );

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
                className={styles.changeMethodBtn}
                onClick={resetToMethodSelect}
              >
                <FaArrowLeft style={{ marginRight: "4px" }} /> Change method
              </button>
              <div className={styles.payBadge}>
                {isBankTx ? (
                  <>
                    <FaUniversity /> Bank Transfer
                  </>
                ) : (
                  <>
                    <FaBitcoin /> {selectedCryptoToken} Crypto
                  </>
                )}
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryIconWrap}>
                  <span className={styles.summaryIcon}>
                    {isBankTx ? <FaUniversity /> : <FaBitcoin />}
                  </span>
                </div>
                <div>
                  <p className={styles.summaryLabel}>Send exactly</p>
                  <h2 className={styles.summaryTitle}>
                    {!isBankTx && convertedCryptoAmount && selectedCryptoToken
                      ? `${convertedCryptoAmount.toFixed(6)} ${selectedCryptoToken}`
                      : formatPrice(p.totalCharged, p.currency)}
                    {!isBankTx && convertedCryptoAmount && (
                      <button
                        className={styles.copyFieldBtn}
                        onClick={() =>
                          handleCopy(
                            `${convertedCryptoAmount.toFixed(6)} ${selectedCryptoToken}`,
                            "cryptoAmount",
                          )
                        }
                        title="Copy amount"
                        style={{ marginLeft: "0.5rem" }}
                      >
                        {copied.cryptoAmount ? <FaCheck /> : <FaCopy />}
                      </button>
                    )}
                  </h2>
                  {referralApplied && referralAmount > 0 && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--green)",
                        marginTop: 2,
                      }}
                    >
                      <FaCheckCircle /> Includes{" "}
                      {formatPrice(referralAmount, "NGN")} referral discount
                    </p>
                  )}
                  <p className={styles.summaryCategory}>
                    Ref: {manualData.reference}
                  </p>
                </div>
              </div>

              {isBankTx && bd && (
                <div className={styles.summaryMeta}>
                  {[
                    [<FaUniversity />, "Bank", bd.bankName],
                    [<FaTag />, "Account", bd.accountNumber],
                    [<FaUser />, "Name", bd.accountName],
                    [<FaFileAlt />, "Narration", bd.narration],
                  ].map(([icon, k, v]) =>
                    v ? (
                      <div key={k} className={styles.metaItem}>
                        <span className={styles.metaIcon}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <div className={styles.metaRowLabel}>{k}</div>
                          <div className={styles.metaRowValue}>
                            {v}
                            {k === "Account" && (
                              <button
                                className={styles.copyFieldBtn}
                                onClick={() => handleCopy(v, "bankAcc")}
                                title="Copy account number"
                              >
                                {copied.bankAcc ? <FaCheck /> : <FaCopy />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              {!isBankTx && cd && (
                <div className={styles.summaryMeta}>
                  {[
                    [<FaGlobe />, "Network", cd.network],
                    [<FaWallet />, "Wallet", cd.wallet],
                    [<FaBitcoin />, "Token", cd.currency],
                    [<FaFileAlt />, "Memo", cd.note],
                  ].map(([icon, k, v]) =>
                    v ? (
                      <div key={k} className={styles.metaItem}>
                        <span className={styles.metaIcon}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <div className={styles.metaRowLabel}>{k}</div>
                          <div className={styles.metaRowValue}>
                            {v}
                            {k === "Wallet" && (
                              <button
                                className={styles.copyFieldBtn}
                                onClick={() => handleCopy(v, "cryptoWallet")}
                                title="Copy wallet address"
                              >
                                {copied.cryptoWallet ? <FaCheck /> : <FaCopy />}
                              </button>
                            )}
                            {k === "Token" && (
                              <button
                                className={styles.copyFieldBtn}
                                onClick={() => handleCopy(v, "cryptoToken")}
                                title="Copy token symbol"
                              >
                                {copied.cryptoToken ? <FaCheck /> : <FaCopy />}
                              </button>
                            )}
                            {k === "Memo" && (
                              <button
                                className={styles.copyFieldBtn}
                                onClick={() => handleCopy(v, "cryptoMemo")}
                                title="Copy memo"
                              >
                                {copied.cryptoMemo ? <FaCheck /> : <FaCopy />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>

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
                      placeholder={`Amount in ${selectedCryptoToken}`}
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
                <FaExclamationTriangle /> {error}
              </div>
            )}

            <button
              className={styles.payBtn}
              onClick={isBankTx ? confirmBankTransfer : confirmCrypto}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <FaSpinner className={styles.spinner} /> Submitting…
                </>
              ) : (
                <>
                  <FaCheckCircle /> I Have Transferred — Confirm
                </>
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

  if (bookingStatus === "PENDING") {
    const prev = p;

    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            <div className={styles.payHeader}>
              <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
                <FaArrowLeft style={{ marginRight: "4px" }} /> View Booking
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
                    {formatPrice(prev.agreedRate, prev.currency)}
                    {prev.unitSuffix}
                  </span>
                </div>
                {prev.hasQty && (
                  <>
                    <div className={styles.breakdownRow}>
                      <span className={styles.breakdownLabel}>Duration</span>
                      <span className={styles.breakdownVal}>
                        {prev.qty} {prev.unitLabel}
                        {prev.qty !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className={styles.breakdownRow}>
                      <span className={styles.breakdownLabel}>
                        Job Value ({prev.qty} ×{" "}
                        {formatPrice(prev.agreedRate, prev.currency)})
                      </span>
                      <span className={styles.breakdownVal}>
                        {formatPrice(prev.subtotal, prev.currency)}
                      </span>
                    </div>
                  </>
                )}
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Service Fee (5%)
                  </span>
                  <span className={styles.breakdownVal}>
                    + {formatPrice(prev.hirerFee, prev.currency)}
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span
                    className={styles.breakdownLabel}
                    style={{ fontSize: "0.78rem", color: "var(--green)" }}
                  >
                    <FaCheckCircle /> Worker receives (no fee)
                  </span>
                  <span
                    className={styles.breakdownVal}
                    style={{ color: "var(--green)" }}
                  >
                    {formatPrice(prev.workerPayout, prev.currency)}
                  </span>
                </div>

                {referralApplied && referralAmount > 0 && (
                  <div className={styles.breakdownRow}>
                    <span
                      className={styles.breakdownLabel}
                      style={{ color: "var(--green)" }}
                    >
                      <FaGift /> Referral bonus
                    </span>
                    <span
                      className={styles.breakdownVal}
                      style={{ color: "var(--green)" }}
                    >
                      − {formatPrice(referralAmount, prev.currency)}
                    </span>
                  </div>
                )}

                <div className={styles.breakdownDivider} />
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabelTotal}>
                    You Will Pay
                  </span>
                  <span className={styles.breakdownValTotal}>
                    {formatPrice(prev.totalCharged, prev.currency)}
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

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.payWrap}>
          <div className={styles.payHeader}>
            <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
              <FaArrowLeft style={{ marginRight: "4px" }} /> Back to Booking
            </Link>
            <div className={styles.payBadge}>
              <FaLock /> Secure Payment
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.summaryIconWrap}>
                <span className={styles.summaryIcon}>
                  <FaClipboardList />
                </span>
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
                <span className={styles.metaIcon}>
                  <FaUser />
                </span>
                <span className={styles.metaText}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>
                  <FaCalendarAlt />
                </span>
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
                  <span className={styles.metaIcon}>
                    <FaMapMarkerAlt />
                  </span>
                  <span className={styles.metaText}>{booking.address}</span>
                </div>
              )}
            </div>
          </div>

          {walletBalance > 0 && booking?.currency === "NGN" && (
            <div className={styles.referralSection}>
              <div className={styles.referralHeader}>
                <FaGift className={styles.referralIcon} />
                <span className={styles.referralTitle}>
                  Referral Wallet Balance: {formatPrice(walletBalance, "NGN")}
                </span>
              </div>
              <div className={styles.referralSliderWrap}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={referralPercent}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  className={styles.referralSlider}
                />
                <div className={styles.referralRow}>
                  <span className={styles.referralPercent}>
                    {referralPercent}%
                  </span>
                  <span className={styles.referralAmount}>
                    {formatPrice(referralAmount, "NGN")}
                  </span>
                  <button
                    className={`${styles.referralToggleBtn} ${referralApplied ? styles.referralToggleOn : ""}`}
                    onClick={handleReferralToggle}
                    disabled={referralAmount === 0}
                  >
                    {referralApplied ? "Remove" : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Payment Breakdown</p>
            <div className={styles.breakdownRows}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Agreed Rate</span>
                <span className={styles.breakdownVal}>
                  {formatPrice(p.agreedRate, p.currency)}
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
                      Job Value ({p.qty} ×{" "}
                      {formatPrice(p.agreedRate, p.currency)})
                    </span>
                    <span className={styles.breakdownVal}>
                      {formatPrice(p.subtotal, p.currency)}
                    </span>
                  </div>
                </>
              )}
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Service Fee (5%)</span>
                <span className={styles.breakdownVal}>
                  + {formatPrice(p.hirerFee, p.currency)}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span
                  className={styles.breakdownLabel}
                  style={{ fontSize: "0.78rem", color: "var(--green)" }}
                >
                  <FaCheckCircle /> Worker receives (no fee)
                </span>
                <span
                  className={styles.breakdownVal}
                  style={{ color: "var(--green)" }}
                >
                  {formatPrice(p.workerPayout, p.currency)}
                </span>
              </div>

              {referralApplied && referralAmount > 0 && (
                <div className={styles.breakdownRow}>
                  <span
                    className={styles.breakdownLabel}
                    style={{ color: "var(--green)" }}
                  >
                    <FaGift /> Referral bonus
                  </span>
                  <span
                    className={styles.breakdownVal}
                    style={{ color: "var(--green)" }}
                  >
                    − {formatPrice(referralAmount, p.currency)}
                  </span>
                </div>
              )}

              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabelTotal}>You Pay</span>
                <span className={styles.breakdownValTotal}>
                  {formatPrice(p.totalCharged, p.currency)}
                </span>
              </div>
            </div>
            <div className={styles.escrowNote}>
              <FaShieldAlt className={styles.escrowIcon} />
              <p>
                Funds are held in escrow and only released to the worker after
                you confirm the job is complete.
              </p>
            </div>
          </div>

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

            {method === "crypto" && (
              <CryptoRateConverter
                fiatAmount={p.totalCharged}
                fiatCurrency={p.currency || "NGN"}
                selectedToken={selectedCryptoToken}
                onAmountChange={(data) => {
                  setSelectedCryptoToken(data.token);
                  setConvertedCryptoAmount(data.amount);
                }}
              />
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
              <FaExclamationTriangle /> {error}
            </div>
          )}

          <button
            className={styles.payBtn}
            onClick={handlePrimary}
            disabled={paying}
          >
            {paying ? (
              <>
                <FaSpinner className={styles.spinner} /> Processing…
              </>
            ) : method === "card" ? (
              <>
                <FaCreditCard /> Pay {formatPrice(p.totalCharged, p.currency)}{" "}
                Securely
              </>
            ) : method === "bank_transfer" ? (
              <>
                <FaUniversity /> Get Bank Details —{" "}
                {formatPrice(p.totalCharged, p.currency)}
              </>
            ) : (
              <>
                <FaBitcoin /> Get {selectedCryptoToken} Wallet —{" "}
                {formatPrice(p.totalCharged, p.currency)}
              </>
            )}
          </button>

          <p className={styles.payDisclaimer}>
            Powered by Flutterwave &amp; Paystack · Escrow protected · Refund
            policy applies
          </p>

          <div className={styles.trustRow}>
            <span className={styles.trustItem}>
              <FaLock /> 256-bit SSL
            </span>
            <span className={styles.trustItem}>
              <FaShieldAlt /> Escrow protected
            </span>
            <span className={styles.trustItem}>🦋 Flutterwave</span>
            <span className={styles.trustItem}>💚 Paystack</span>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
