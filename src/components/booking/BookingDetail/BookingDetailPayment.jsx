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
} from "react-icons/fa";

// ── Helper: format price with 2 decimals and thousands separator ──
function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Inline helper ──────────────────────────────────────────────────────────
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
  referralDiscount,
  referralApplied,
  onReferralToggle,
  showPayOptions,
  onTogglePayOptions,
  paymentRequired,
  refetch,
  onSuccess,
}) {
  // ── Render fee breakdown ──────────────────────────────────────────────
  const renderFeeBreakdown = () => {
    if (!feeBreakdown) return null;
    const computeWithFee = (amount) => amount + amount * 0.05;
    const getDiscount = () => {
      if (referralApplied && referralDiscount && booking.currency === "NGN") {
        return referralDiscount.discount;
      }
      return 0;
    };
    const finalTotal = () => {
      let base = feeBreakdown.isActual
        ? feeBreakdown.total
        : computeWithFee(feeBreakdown.total);
      const disc = getDiscount();
      return Math.max(0, base - disc);
    };
    const cur = feeBreakdown.currency || "NGN";

    return (
      <div className={styles.feeBreakdown}>
        <p className={styles.feeBreakdownLabel}>
          {feeBreakdown.isActual
            ? "Payment breakdown"
            : feeBreakdown.noDuration
              ? "Est. Total"
              : feeBreakdown.label}
        </p>

        {feeBreakdown.platformFee != null ? (
          <>
            <div className={styles.feeRow}>
              <span>Subtotal</span>
              <span>
                {formatPrice(
                  feeBreakdown.total - feeBreakdown.platformFee,
                  cur,
                )}
              </span>
            </div>
            <div className={styles.feeRow}>
              <span>Platform fee (5%)</span>
              <span>{formatPrice(feeBreakdown.platformFee, cur)}</span>
            </div>
          </>
        ) : !feeBreakdown.isActual ? (
          <>
            <div className={styles.feeRow}>
              <span>
                Agreed rate {feeBreakdown.noDuration ? "" : "(job value)"}
              </span>
              <span>{formatPrice(feeBreakdown.subtotal, cur)}</span>
            </div>
            <div className={styles.feeRow}>
              <span>Platform fee (5%)</span>
              <span>{formatPrice(feeBreakdown.total * 0.05, cur)}</span>
            </div>
          </>
        ) : null}

        {feeBreakdown.workerPayout != null && (
          <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
            <span>Worker payout</span>
            <span>{formatPrice(feeBreakdown.workerPayout, cur)}</span>
          </div>
        )}

        {referralDiscount && referralApplied && booking.currency === "NGN" && (
          <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
            <span>
              <FaGift style={{ marginRight: "4px" }} /> Referral bonus
            </span>
            <span>
              − {formatPrice(referralDiscount.discount, booking.currency)}
            </span>
          </div>
        )}

        <div className={styles.feeTotal}>
          <span>{feeBreakdown.isActual ? "Total Paid" : "Est. Total"}</span>
          <span className={styles.feeTotalAmount}>
            {formatPrice(finalTotal(), cur)}
          </span>
        </div>

        {referralDiscount && !feeBreakdown.isActual && (
          <div className={styles.referralPerk}>
            {booking.currency !== "NGN" ? (
              <p>
                <FaInfoCircle style={{ marginRight: "6px" }} />
                You have a referral bonus — only applicable to ₦ NGN payments.
              </p>
            ) : referralApplied ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  <FaCheckCircle
                    style={{ marginRight: "6px", color: "var(--green)" }}
                  />
                  Referral bonus applied — saving{" "}
                  {formatPrice(referralDiscount.discount, booking.currency)}
                </span>
                <button
                  onClick={onReferralToggle}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--green)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  <FaGift style={{ marginRight: "6px" }} />
                  You have a{" "}
                  {formatPrice(
                    referralDiscount.discount,
                    booking.currency,
                  )}{" "}
                  referral bonus available
                </span>
                <button
                  onClick={onReferralToggle}
                  style={{
                    flexShrink: 0,
                    background: "var(--green)",
                    color: "#000",
                    border: "none",
                    borderRadius: 8,
                    padding: "5px 14px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render payment card ──────────────────────────────────────────────
  const renderPaymentCard = () => {
    if (!payment) return null;
    const cur = payment.currency || "NGN";
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payment</h2>
        <div className={styles.paymentCard}>
          <PayRow label="Total" value={formatPrice(payment.amount, cur)} />
          <PayRow
            label="Platform Fee"
            value={formatPrice(payment.platformFee, cur)}
            muted
          />
          <PayRow
            label="Worker Payout"
            value={formatPrice(payment.workerPayout, cur)}
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

  // ── Render payment banner ────────────────────────────────────────────
  const renderPaymentBanner = () => {
    if (!paymentRequired) return null;
    return (
      <div className={styles.paymentBanner}>
        <div className={styles.paymentBannerHeader}>
          <span className={styles.paymentBannerIcon}>
            <FaCreditCard size={18} />
          </span>
          <div>
            <p className={styles.paymentBannerTitle}>
              {payment?.status === "PENDING"
                ? "Payment Pending"
                : "Payment Required"}
            </p>
            <p className={styles.paymentBannerDesc}>
              {payment?.status === "PENDING"
                ? "Your previous payment is still processing. Try a different method below."
                : "Secure the worker's slot — pay now to confirm."}
            </p>
          </div>
        </div>

        {referralDiscount && (
          <div className={styles.paymentBannerPerk}>
            <FaGift style={{ marginRight: "6px" }} />
            <strong>Referral perk:</strong>{" "}
            {formatPrice(referralDiscount.discount, booking.currency)} off your
            first booking
          </div>
        )}

        {referralDiscount && booking.currency === "NGN" && (
          <div className={styles.paymentBannerPerk}>
            {referralApplied ? (
              <>
                <FaCheckCircle
                  style={{ marginRight: "6px", color: "var(--green)" }}
                />
                Referral bonus of{" "}
                {formatPrice(referralDiscount.discount, booking.currency)} will
                be deducted at checkout
              </>
            ) : (
              <>
                <FaGift style={{ marginRight: "6px" }} />
                Apply your{" "}
                {formatPrice(referralDiscount.discount, booking.currency)}{" "}
                referral bonus in the fee breakdown above
              </>
            )}
          </div>
        )}
        {referralDiscount && booking.currency !== "NGN" && (
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
          ) : payment?.status === "PENDING" ? (
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
              referralDiscount={referralDiscount}
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
