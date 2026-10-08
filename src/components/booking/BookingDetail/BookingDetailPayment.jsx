import { Link } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import PaymentOptions from "../../payment/PaymentOptions";
import {
  FaCreditCard,
  FaGift,
  FaBolt,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronUp,
  FaClock,
} from "react-icons/fa";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PayRow({ label, value, muted, green, capitalize, mono, extra }) {
  return (
    <div className={styles.paymentRow}>
      <span className={styles.payLabel}>{label}</span>
      {extra || (
        <span
          className={[
            styles.payValue,
            muted && styles.payMuted,
            green && styles.payGreen,
            capitalize && styles.payCapitalize,
            mono && styles.payRef,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export default function BookingDetailPayment({
  booking,
  payment,
  feeBreakdown,
  walletBalance,
  referralAmount,
  referralApplied,
  referralPercent,
  onPercentChange,
  onReferralToggle,
  showPayOptions,
  onTogglePayOptions,
  paymentRequired,
  refetch,
  onSuccess,
  isHirer,
  isWorker,
}) {
  const isJobPostBooking = booking?.source === "JOB_POST";

  // ── Real duration of the job-post booking (used instead of `qty`) ──
  const realDurationText =
    booking?.estimatedValue && booking?.estimatedUnit
      ? `${booking.estimatedValue} ${
          {
            hours: booking.estimatedValue == 1 ? "hour" : "hours",
            days: booking.estimatedValue == 1 ? "day" : "days",
            weeks: booking.estimatedValue == 1 ? "week" : "weeks",
            months: booking.estimatedValue == 1 ? "month" : "months",
            years: booking.estimatedValue == 1 ? "year" : "years",
            custom: "",
          }[booking.estimatedUnit] || booking.estimatedUnit
        }`
      : null;

  // ── Render fee breakdown ──────────────────────────────────────────────
  const renderFeeBreakdown = () => {
    if (!feeBreakdown) return null;

    const isNegotiated = booking.isNegotiated && booking.negotiatedRate;
    const isFixedTotalView = isNegotiated || isJobPostBooking;

    // Workers see a simplified view
    if (isWorker) {
      const cur = feeBreakdown.currency || "NGN";
      const workerPayout = feeBreakdown.workerPayout || 0;
      const agreedRate = feeBreakdown.agreedRate || 0;

      return (
        <div className={styles.feeBreakdown}>
          <p className={styles.feeBreakdownLabel}>
            {isNegotiated
              ? "Agreed Total (Negotiated)"
              : isJobPostBooking
                ? "Your Earnings (From Job Post)"
                : "Your Earnings"}
          </p>

          {isFixedTotalView ? (
            <>
              <div className={styles.feeRow}>
                <span>{isNegotiated ? "Agreed Total" : "Selected Amount"}</span>
                <span>{formatPrice(agreedRate, cur)}</span>
              </div>

              {isJobPostBooking && realDurationText && (
                <div className={styles.feeRow}>
                  <span>Duration</span>
                  <span>
                    {realDurationText}
                    {booking.estimatedHours && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        (≈ {booking.estimatedHours}h)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className={styles.feeRow}>
                <span>Platform Fee (5%)</span>
                <span>+ {formatPrice(feeBreakdown.platformFee || 0, cur)}</span>
              </div>

              <div className={styles.feeTotal}>
                <span>You Earn</span>
                <span className={styles.feeTotalAmount}>
                  {formatPrice(workerPayout, cur)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.feeRow}>
                <span>Agreed Rate</span>
                <span>
                  {formatPrice(agreedRate, cur)}
                  {{
                    hours: "/hr",
                    days: "/day",
                    weeks: "/wk",
                    months: "/mo",
                  }[feeBreakdown.estimatedUnit] || ""}
                </span>
              </div>

              {feeBreakdown.hasQty && (
                <div className={styles.feeRow}>
                  <span>Duration</span>
                  <span>
                    {feeBreakdown.qty} {feeBreakdown.unitLabel}
                    {feeBreakdown.qty !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {feeBreakdown.hasQty && (
                <div className={styles.feeRow}>
                  <span>
                    Subtotal ({feeBreakdown.qty} ×{" "}
                    {formatPrice(agreedRate, cur)})
                  </span>
                  <span>{formatPrice(feeBreakdown.subtotal || 0, cur)}</span>
                </div>
              )}

              <div className={styles.feeRow}>
                <span>Platform Fee (5%)</span>
                <span>+ {formatPrice(feeBreakdown.platformFee || 0, cur)}</span>
              </div>

              <div className={styles.feeTotal}>
                <span>You Earn</span>
                <span className={styles.feeTotalAmount}>
                  {formatPrice(workerPayout, cur)}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    // Hirer view
    const cur = feeBreakdown.currency || "NGN";
    const agreedRate = feeBreakdown.agreedRate || 0;
    const subtotal = feeBreakdown.subtotal || 0;
    const platformFee = feeBreakdown.platformFee || 0;
    const workerPayout = feeBreakdown.workerPayout || subtotal;
    const grossTotal = feeBreakdown.total || 0;

    const discount =
      referralApplied && booking.currency === "NGN" ? referralAmount : 0;
    const finalTotal = Math.max(0, grossTotal - discount);

    const isCustom = feeBreakdown.estimatedUnit === "custom";

    return (
      <div className={styles.feeBreakdown}>
        <p className={styles.feeBreakdownLabel}>
          {isNegotiated
            ? "Agreed Total (Negotiated)"
            : isJobPostBooking
              ? "Payment Breakdown (From Job Post)"
              : "Payment Breakdown"}
        </p>

        {isFixedTotalView ? (
          <>
            <div className={styles.feeRow}>
              <span>{isNegotiated ? "Agreed Total" : "Selected Amount"}</span>
              <span>{formatPrice(agreedRate, cur)}</span>
            </div>

            {isJobPostBooking && realDurationText && (
              <div className={styles.feeRow}>
                <span>Duration</span>
                <span>
                  {realDurationText}
                  {booking.estimatedHours && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        marginLeft: 4,
                      }}
                    >
                      (≈ {booking.estimatedHours}h)
                    </span>
                  )}
                </span>
              </div>
            )}

            {isNegotiated && (feeBreakdown.hasQty || isCustom) && (
              <div className={styles.feeRow}>
                <span>Duration</span>
                <span>
                  {feeBreakdown.qty} {feeBreakdown.unitLabel}
                  {feeBreakdown.qty !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <div className={styles.feeRow}>
              <span>Platform Fee (5%)</span>
              <span>+ {formatPrice(platformFee, cur)}</span>
            </div>

            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
                <span>
                  <FaGift style={{ marginRight: "4px" }} /> Referral bonus
                </span>
                <span>− {formatPrice(discount, booking.currency)}</span>
              </div>
            )}

            <div className={styles.feeTotal}>
              <span>You Pay</span>
              <span className={styles.feeTotalAmount}>
                {formatPrice(finalTotal, cur)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.feeRow}>
              <span>Agreed Rate</span>
              <span>
                {formatPrice(agreedRate, cur)}
                {{
                  hours: "/hr",
                  days: "/day",
                  weeks: "/wk",
                  months: "/mo",
                }[feeBreakdown.estimatedUnit] || ""}
              </span>
            </div>

            {(feeBreakdown.hasQty || isCustom) && (
              <div className={styles.feeRow}>
                <span>Duration</span>
                <span>
                  {feeBreakdown.qty} {feeBreakdown.unitLabel}
                  {feeBreakdown.qty !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {(feeBreakdown.hasQty || isCustom) && (
              <div className={styles.feeRow}>
                <span>
                  Subtotal ({feeBreakdown.qty} × {formatPrice(agreedRate, cur)})
                </span>
                <span>{formatPrice(subtotal, cur)}</span>
              </div>
            )}

            <div className={styles.feeRow}>
              <span>Platform Fee (5%)</span>
              <span>+ {formatPrice(platformFee, cur)}</span>
            </div>

            {feeBreakdown.isActual && feeBreakdown.workerPayout != null && (
              <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
                <span>Worker payout</span>
                <span>{formatPrice(workerPayout, cur)}</span>
              </div>
            )}

            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
                <span>
                  <FaGift style={{ marginRight: "4px" }} /> Referral bonus
                </span>
                <span>− {formatPrice(discount, booking.currency)}</span>
              </div>
            )}

            <div className={styles.feeTotal}>
              <span>{feeBreakdown.isActual ? "Total Paid" : "You Pay"}</span>
              <span className={styles.feeTotalAmount}>
                {formatPrice(finalTotal, cur)}
              </span>
            </div>
          </>
        )}

        {/* ── Referral slider (Hirer only) ── */}
        {!feeBreakdown.isActual &&
          isHirer &&
          walletBalance > 0 &&
          booking.currency === "NGN" && (
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
                  onChange={(e) => onPercentChange(Number(e.target.value))}
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
                    onClick={onReferralToggle}
                    disabled={referralAmount === 0}
                  >
                    {referralApplied ? "Remove" : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {!feeBreakdown.isActual && isHirer && walletBalance === 0 && (
          <div className={styles.referralPerk}>
            <p>
              <FaInfoCircle style={{ marginRight: "6px" }} />
              You don't have any referral bonus yet. Invite friends to earn!
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Render payment card ──────────────────────────────────────────────
  const renderPaymentCard = () => {
    if (!payment) return null;

    const useBreakdown = feeBreakdown && !feeBreakdown.isActual;
    const cur =
      (useBreakdown ? feeBreakdown.currency : payment.currency) || "NGN";

    let total = useBreakdown ? feeBreakdown.total : payment.amount;
    let platformFee = useBreakdown
      ? feeBreakdown.platformFee
      : payment.platformFee;
    let workerPayout = useBreakdown
      ? feeBreakdown.workerPayout
      : payment.workerPayout;

    if (useBreakdown && referralApplied && booking.currency === "NGN") {
      total = Math.max(0, total - referralAmount);
    }

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payment</h2>
        <div className={styles.paymentCard}>
          <PayRow label="Total" value={formatPrice(total, cur)} />
          <PayRow
            label="Platform Fee"
            value={formatPrice(platformFee, cur)}
            muted
          />
          <PayRow
            label="Worker Payout"
            value={formatPrice(workerPayout, cur)}
            green
          />
          <div className={styles.paymentDivider} />
          <PayRow label="Provider" value={payment.provider} capitalize />
          <PayRow
            label="Status"
            extra={
              <span
                className={`${styles.payStatus} ${styles[`payStatus_${payment.status?.toLowerCase()}`]}`}
              >
                {payment.status}
              </span>
            }
          />
          {payment.providerRef && (
            <PayRow label="Ref" value={payment.providerRef} mono />
          )}
        </div>
      </section>
    );
  };

  // ── Render payment banner ──────────────────────────────────────────────
  const renderPaymentBanner = () => {
    if (!isHirer) return null;
    if (!paymentRequired) return null;

    const cur = feeBreakdown?.currency || booking.currency || "NGN";
    const grossTotal = feeBreakdown?.total || payment?.amount || 0;
    const discount =
      referralApplied && booking.currency === "NGN" ? referralAmount : 0;
    const finalTotal = Math.max(0, grossTotal - discount);

    const isPaymentPending = payment?.status === "PENDING";
    const isBookingAccepted = booking?.status === "ACCEPTED";

    return (
      <div className={styles.paymentBanner}>
        <div className={styles.paymentBannerHeader}>
          <span className={styles.paymentBannerIcon}>
            <FaCreditCard size={18} />
          </span>
          <div>
            <p className={styles.paymentBannerTitle}>
              {isPaymentPending ? "Payment Pending" : "Payment Required"}
            </p>
            <p className={styles.paymentBannerDesc}>
              {isPaymentPending
                ? "Your previous payment is still processing. Try a different method below."
                : isJobPostBooking
                  ? "Pay the rate you agreed on the job post — the amount below is final."
                  : "Secure the worker's slot — pay now to confirm."}
            </p>
          </div>
        </div>

        {isPaymentPending && isBookingAccepted && (
          <div
            className={styles.paymentBannerPerk}
            style={{
              borderColor: "var(--orange)",
              background: "var(--orange-dim)",
              color: "var(--text)",
            }}
          >
            <FaClock style={{ marginRight: "6px" }} />
            <strong>Worker is waiting for you to complete payment.</strong> Once
            confirmed, the job will start.
          </div>
        )}

        {walletBalance > 0 && booking.currency === "NGN" && (
          <>
            <div className={styles.paymentBannerPerk}>
              <FaGift style={{ marginRight: "6px" }} />
              <strong>Referral perk:</strong>{" "}
              {formatPrice(referralAmount, booking.currency)} off your first
              booking
            </div>
            <div className={styles.paymentBannerPerk}>
              {referralApplied ? (
                <>
                  <FaCheckCircle
                    style={{ marginRight: "6px", color: "var(--green)" }}
                  />
                  Referral bonus of{" "}
                  {formatPrice(referralAmount, booking.currency)} will be
                  deducted at checkout
                </>
              ) : (
                <>
                  <FaGift style={{ marginRight: "6px" }} />
                  Apply your {formatPrice(
                    referralAmount,
                    booking.currency,
                  )}{" "}
                  referral bonus using the slider above
                </>
              )}
            </div>
          </>
        )}
        {walletBalance > 0 && booking.currency !== "NGN" && (
          <div
            className={styles.paymentBannerPerk}
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <FaInfoCircle style={{ marginRight: "6px" }} />
            Referral bonus only applies to ₦ NGN payments
          </div>
        )}

        <button
          className={`${styles.payNowBtn} ${showPayOptions ? styles.payNowBtnActive : ""}`}
          onClick={onTogglePayOptions}
        >
          {showPayOptions ? (
            <>
              <FaChevronUp style={{ marginRight: "6px" }} /> Hide Payment
              Options
            </>
          ) : isPaymentPending ? (
            <>
              <FaBolt style={{ marginRight: "6px" }} /> Choose a Different
              Method
            </>
          ) : (
            <>
              <FaCreditCard style={{ marginRight: "6px" }} /> Pay Now
            </>
          )}
        </button>

        {showPayOptions && (
          <div className={styles.paymentOptionsWrap}>
            <Link
              to={`/bookings/${booking.id}/pay`}
              className={`${styles.actionBtn} ${styles.actionBtn_orange}`}
            >
              <FaCreditCard style={{ marginRight: "6px" }} /> Pay by Card
            </Link>
            <PaymentOptions
              booking={booking}
              referralAmount={referralApplied ? referralAmount : 0}
              referralApplied={referralApplied}
              onReferralToggle={onReferralToggle}
              onSuccess={() => {
                onSuccess("Payment submitted successfully.");
                onTogglePayOptions();
                refetch();
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderFeeBreakdown()}
      {renderPaymentCard()}
      {renderPaymentBanner()}
    </>
  );
}
