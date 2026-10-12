import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaSpinner,
  FaHistory,
  FaLock,
} from "react-icons/fa";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import styles from "./Payment.module.css";

const PRESET_PERCENTAGES = [25, 50, 75, 100];

function formatMoney(amount, currency = "NGN") {
  if (amount == null || isNaN(amount)) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReleasePayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null); // { amount, isFinal }
  const [note, setNote] = useState("");

  // ── Selection state ──
  // mode: "percent" | "custom"
  const [mode, setMode] = useState("percent");
  const [selectedPct, setSelectedPct] = useState(100);
  const [customAmount, setCustomAmount] = useState("");

  // ── Confirmation modal state ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${bookingId}`),
      api.get(`/payments/${bookingId}`),
    ])
      .then(([bookingRes, paymentRes]) => {
        setBooking(bookingRes.data.data.booking);
        setPayment(paymentRes.data.data);
      })
      .catch(() => setError("Could not load booking or payment details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const pay = payment || booking?.payment;

  // ── Derived money values ─────────────────────────────────────────────
  const currency = pay?.currency || booking?.currency || "NGN";
  const workerPayout = Number(pay?.workerPayout) || 0;
  const releasedAmount = Number(pay?.releasedAmount) || 0;
  const remaining = useMemo(
    () => parseFloat(Math.max(0, workerPayout - releasedAmount).toFixed(2)),
    [workerPayout, releasedAmount],
  );
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;

  const history = Array.isArray(pay?.releases) ? pay.releases : [];
  const hasHistory = history.length > 0;

  // ── Resolve the amount the hirer wants to release right now ──────────
  const resolvedAmount = useMemo(() => {
    if (remaining <= 0) return 0;

    if (mode === "percent") {
      const raw = (workerPayout * selectedPct) / 100;
      // A 100% preset on a partially-released payment should not exceed
      // the remaining balance — clamp so we never send more than held.
      return parseFloat(Math.min(raw, remaining).toFixed(2));
    }

    const parsed = parseFloat(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parseFloat(Math.min(parsed, remaining).toFixed(2));
  }, [mode, selectedPct, customAmount, workerPayout, remaining]);

  // Reset the acknowledgment checkbox whenever the resolved amount changes,
  // so the hirer must re-affirm each distinct release.
  useEffect(() => {
    setAckChecked(false);
  }, [resolvedAmount]);

  const willBeFinal =
    resolvedAmount > 0 &&
    parseFloat((remaining - resolvedAmount).toFixed(2)) === 0;

  const customInvalid =
    mode === "custom" &&
    customAmount !== "" &&
    (isNaN(parseFloat(customAmount)) || parseFloat(customAmount) <= 0);

  const customExceeds =
    mode === "custom" &&
    customAmount !== "" &&
    parseFloat(customAmount) > remaining;

  const canSubmit =
    !releasing &&
    remaining > 0 &&
    resolvedAmount > 0 &&
    resolvedAmount <= remaining &&
    !customInvalid &&
    !customExceeds;

  async function handleRelease() {
    if (!canSubmit) return;
    setReleasing(true);
    setError("");
    try {
      const payload = { amount: resolvedAmount };
      if (note.trim()) payload.note = note.trim();

      const res = await api.post(`/payments/release/${bookingId}`, payload);
      const data = res.data?.data || {};
      setConfirmed({
        amount: data.release?.amount ?? resolvedAmount,
        isFinal: !!data.isFinal,
      });
      setShowConfirmModal(false);
      setTimeout(() => navigate(`/bookings/${bookingId}`), 2600);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to release payment.");
    } finally {
      setReleasing(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skCard} />
        </div>
      </HirerLayout>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successWrap}>
            <div className={styles.successRing}>
              <FaCheckCircle className={styles.successCheck} />
            </div>
            <h2 className={styles.successTitle}>
              {confirmed.isFinal
                ? "Payment Fully Released!"
                : "Partial Payment Released!"}
            </h2>
            <p className={styles.successText}>
              {formatMoney(confirmed.amount, currency)} has been released to{" "}
              {booking?.worker?.firstName}.
              {!confirmed.isFinal && (
                <> The remaining balance is still safely held in escrow.</>
              )}
            </p>
            <p className={styles.successSub}>Redirecting you back...</p>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── Guard: nothing left to release ───────────────────────────────────
  if (remaining <= 0) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.payWrap}>
            <div className={styles.payHeader}>
              <Link to={`/bookings/${bookingId}`} className={styles.backLink}>
                <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Booking
              </Link>
            </div>
            <div className={styles.breakdownCard}>
              <p className={styles.breakdownTitle}>Nothing to Release</p>
              <p style={{ color: "var(--text-dim)", marginTop: 6 }}>
                This payment has already been fully released to the worker.
              </p>
            </div>
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
              <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Booking
            </Link>
            <div className={`${styles.payBadge} ${styles.payBadgeGreen}`}>
              Release Escrow
            </div>
          </div>

          {/* Worker card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.workerAvatar}>
                {booking?.worker?.avatar ? (
                  <img src={booking.worker.avatar} alt="" />
                ) : (
                  <span>
                    {booking?.worker?.firstName?.[0]}
                    {booking?.worker?.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className={styles.summaryLabel}>Releasing payment to</p>
                <h2 className={styles.summaryTitle}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </h2>
                <p className={styles.summaryCategory}>{booking?.title}</p>
              </div>
            </div>
          </div>

          {/* Release history — only if there is any */}
          {hasHistory && (
            <div className={styles.breakdownCard}>
              <p className={styles.breakdownTitle}>
                <FaHistory style={{ marginRight: "6px" }} />
                Release History
              </p>
              <div className={styles.breakdownRows}>
                {history.map((r) => (
                  <div key={r.id} className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {new Date(r.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.note ? ` · ${r.note}` : ""}
                    </span>
                    <span className={styles.breakdownVal}>
                      {formatMoney(r.amount, currency)}
                    </span>
                  </div>
                ))}
                <div className={styles.breakdownDivider} />
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Already released
                  </span>
                  <span className={styles.breakdownVal}>
                    {formatMoney(releasedAmount, currency)} ({releasedPct}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Escrow summary */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Escrow Summary</p>
            <div className={styles.breakdownRows}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Total Paid</span>
                <span className={styles.breakdownVal}>
                  {formatMoney(pay?.amount, currency)}
                </span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Platform Fee</span>
                <span className={styles.breakdownVal}>
                  {formatMoney(pay?.platformFee, currency)}
                </span>
              </div>
              {pay?.referralDeduct > 0 && (
                <div className={styles.breakdownRow}>
                  <span
                    className={styles.breakdownLabel}
                    style={{ color: "var(--green)" }}
                  >
                    Referral Discount
                  </span>
                  <span
                    className={styles.breakdownVal}
                    style={{ color: "var(--green)" }}
                  >
                    - {formatMoney(pay.referralDeduct, currency)}
                  </span>
                </div>
              )}

              {releasedAmount > 0 && (
                <div className={styles.breakdownRow}>
                  <span
                    className={styles.breakdownLabel}
                    style={{ color: "var(--orange)" }}
                  >
                    Already released
                  </span>
                  <span
                    className={styles.breakdownVal}
                    style={{ color: "var(--orange)" }}
                  >
                    - {formatMoney(releasedAmount, currency)}
                  </span>
                </div>
              )}

              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabelTotal}>
                  Remaining in Escrow
                </span>
                <span
                  className={styles.breakdownValTotal}
                  style={{ color: "var(--green)" }}
                >
                  {formatMoney(remaining, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Release amount picker */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Choose Release Amount</p>

            {/* Preset percentage pills */}
            <div className={styles.presetRow}>
              {PRESET_PERCENTAGES.map((pct) => {
                const pctAmount = parseFloat(
                  Math.min((workerPayout * pct) / 100, remaining).toFixed(2),
                );
                const isActive = mode === "percent" && selectedPct === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    className={`${styles.presetPill} ${
                      isActive ? styles.presetPillActive : ""
                    }`}
                    onClick={() => {
                      setMode("percent");
                      setSelectedPct(pct);
                    }}
                  >
                    <span className={styles.presetPct}>{pct}%</span>
                    <span className={styles.presetAmt}>
                      {formatMoney(pctAmount, currency)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom amount input */}
            <div className={styles.customRow}>
              <span className={styles.customDivider}>
                or enter a custom amount
              </span>
              <div className={styles.customInputWrap}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={`e.g. 5000`}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setMode("custom");
                  }}
                  onFocus={() => setMode("custom")}
                  className={`${styles.customInput} ${
                    customInvalid || customExceeds
                      ? styles.customInputError
                      : ""
                  }`}
                />
                <span className={styles.customCurrency}>{currency}</span>
              </div>
              {customExceeds && (
                <p className={styles.customHint + " " + styles.customHintError}>
                  Amount exceeds the remaining escrow (
                  {formatMoney(remaining, currency)}).
                </p>
              )}
              {customInvalid && (
                <p className={styles.customHint + " " + styles.customHintError}>
                  Enter a positive amount.
                </p>
              )}
              {!customExceeds && !customInvalid && mode === "custom" && (
                <p className={styles.customHint}>
                  Must not exceed {formatMoney(remaining, currency)}.
                </p>
              )}
            </div>

            {/* Live preview */}
            <div className={styles.releasePreview}>
              <div className={styles.releasePreviewRow}>
                <span className={styles.releasePreviewLabel}>
                  Releasing now
                </span>
                <span className={styles.releasePreviewValue}>
                  {resolvedAmount > 0
                    ? formatMoney(resolvedAmount, currency)
                    : "—"}
                </span>
              </div>
              <div className={styles.releasePreviewRow}>
                <span className={styles.releasePreviewLabel}>
                  Remaining after this release
                </span>
                <span className={styles.releasePreviewValue}>
                  {formatMoney(
                    Math.max(0, remaining - resolvedAmount),
                    currency,
                  )}
                </span>
              </div>
              {willBeFinal && (
                <p className={styles.releaseFinalNote}>
                  <FaCheckCircle style={{ marginRight: "6px" }} />
                  This will complete the payment in full.
                </p>
              )}
            </div>
          </div>

          {/* Optional note */}
          <div className={styles.breakdownCard}>
            <p className={styles.breakdownTitle}>Note (optional)</p>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Emergency medical"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.customInput}
              style={{ width: "100%" }}
            />
          </div>

          {/* Pre-release disclaimer */}
          <div className={styles.disclaimerCard}>
            <div className={styles.disclaimerHeader}>
              <FaLock className={styles.disclaimerIcon} />
              <h3 className={styles.disclaimerTitle}>
                Before you release any funds
              </h3>
            </div>

            <div className={styles.disclaimerBody}>
              <div className={styles.disclaimerItem}>
                <span className={styles.disclaimerBullet}>1</span>
                <div>
                  <p className={styles.disclaimerItemTitle}>
                    Released money is final.
                  </p>
                  <p className={styles.disclaimerItemText}>
                    Once a release is made, that amount goes to{" "}
                    <strong>
                      {booking?.worker?.firstName} {booking?.worker?.lastName}
                    </strong>{" "}
                    immediately. It cannot be reversed, clawed back, or refunded
                    — not by you, not by support, not by dispute.
                  </p>
                </div>
              </div>

              <div className={styles.disclaimerItem}>
                <span className={styles.disclaimerBullet}>2</span>
                <div>
                  <p className={styles.disclaimerItemTitle}>
                    Refunds only cover what is still in escrow.
                  </p>
                  <p className={styles.disclaimerItemText}>
                    If you open a dispute later, you can only be refunded from
                    the portion still held. Any amount you have already released
                    is permanently out of escrow and cannot be refunded.
                  </p>
                </div>
              </div>

              <div className={styles.disclaimerItem}>
                <span className={styles.disclaimerBullet}>3</span>
                <div>
                  <p className={styles.disclaimerItemTitle}>
                    Partial releases are allowed — use them.
                  </p>
                  <p className={styles.disclaimerItemText}>
                    If you're unsure the work is complete, release only a
                    portion now. You can release the rest later once you're
                    satisfied.
                  </p>
                </div>
              </div>

              <div className={styles.disclaimerItem}>
                <span className={styles.disclaimerBullet}>4</span>
                <div>
                  <p className={styles.disclaimerItemTitle}>
                    Only release for work you have received.
                  </p>
                  <p className={styles.disclaimerItemText}>
                    Releasing is you confirming you've seen the work or agreed
                    to the arrangement. SkilledProz does not arbitrate
                    already-released funds.
                  </p>
                </div>
              </div>

              <div className={styles.disclaimerItem}>
                <span className={styles.disclaimerBullet}>5</span>
                <div>
                  <p className={styles.disclaimerItemTitle}>
                    Final release closes the booking.
                  </p>
                  <p className={styles.disclaimerItemText}>
                    When the remaining balance reaches zero, the payment is
                    marked complete and review prompts are sent to both parties.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.inlineError}>
              <FaExclamationTriangle style={{ marginRight: "6px" }} /> {error}
            </div>
          )}

          <button
            className={`${styles.payBtn} ${styles.payBtnGreen}`}
            onClick={() => setShowConfirmModal(true)}
            disabled={!canSubmit}
          >
            {releasing ? (
              <>
                <FaSpinner className={styles.spinner} /> Releasing...
              </>
            ) : (
              <>
                <FaMoneyBillWave style={{ marginRight: "8px" }} />
                {resolvedAmount > 0
                  ? `Release ${formatMoney(resolvedAmount, currency)} to ${
                      booking?.worker?.firstName || "worker"
                    }`
                  : "Release Payment to Worker"}
              </>
            )}
          </button>

          <p className={styles.payDisclaimer}>
            {willBeFinal
              ? "This is the final release — the worker receives the full remaining escrow."
              : "Partial releases let you send an advance while keeping the rest in escrow."}
          </p>
        </div>
      </div>

      {/* ── Confirmation modal ──────────────────────────────────────── */}
      {showConfirmModal && (
        <div
          className={styles.confirmOverlay}
          onClick={() => !releasing && setShowConfirmModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm release"
        >
          <div
            className={styles.confirmBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmIconGreen}>
              <FaMoneyBillWave size={26} />
            </div>

            <h3 className={styles.confirmTitle}>
              {willBeFinal
                ? "Release the full remaining balance?"
                : "Release this amount?"}
            </h3>

            <div className={styles.confirmAmountBlock}>
              <p className={styles.confirmAmountLabel}>You are releasing</p>
              <p className={styles.confirmAmountValue}>
                {formatMoney(resolvedAmount, currency)}
              </p>
              <p className={styles.confirmAmountSub}>
                to {booking?.worker?.firstName} {booking?.worker?.lastName}
              </p>
              {note.trim() && (
                <p className={styles.confirmAmountNote}>
                  Note: “{note.trim()}”
                </p>
              )}
            </div>

            <div className={styles.confirmAfterBlock}>
              <div className={styles.confirmAfterRow}>
                <span>Remaining in escrow after this release</span>
                <span className={styles.confirmAfterValue}>
                  {formatMoney(
                    Math.max(0, remaining - resolvedAmount),
                    currency,
                  )}
                </span>
              </div>
            </div>

            <p className={styles.confirmWarning}>
              <FaExclamationTriangle
                style={{ marginRight: "6px", flexShrink: 0 }}
              />
              <span>
                Released funds are <strong>non-refundable</strong>. If you
                dispute this booking later, only what is still in escrow can be
                recovered.
              </span>
            </p>

            <label className={styles.confirmAck}>
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
              />
              <span>
                I understand this release is final and non-refundable.
              </span>
            </label>

            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setShowConfirmModal(false)}
                disabled={releasing}
              >
                Cancel
              </button>
              <button
                className={`${styles.confirmDangerBtn} ${styles.confirmDangerBtnGreen}`}
                onClick={handleRelease}
                disabled={!ackChecked || releasing}
              >
                {releasing ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Releasing...
                  </>
                ) : (
                  <>
                    <FaMoneyBillWave size={13} /> Release{" "}
                    {formatMoney(resolvedAmount, currency)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </HirerLayout>
  );
}
