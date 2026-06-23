import { Link } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import PaymentOptions from "../../payment/PaymentOptions";

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
                {feeBreakdown.currency}{" "}
                {(
                  feeBreakdown.total - feeBreakdown.platformFee
                ).toLocaleString()}
              </span>
            </div>
            <div className={styles.feeRow}>
              <span>Platform fee (5%)</span>
              <span>
                {feeBreakdown.currency}{" "}
                {feeBreakdown.platformFee.toLocaleString()}
              </span>
            </div>
          </>
        ) : !feeBreakdown.isActual ? (
          <>
            <div className={styles.feeRow}>
              <span>
                Agreed rate {feeBreakdown.noDuration ? "" : "(job value)"}
              </span>
              <span>
                {feeBreakdown.currency} {feeBreakdown.subtotal.toLocaleString()}
              </span>
            </div>
            <div className={styles.feeRow}>
              <span>Platform fee (5%)</span>
              <span>
                {feeBreakdown.currency}{" "}
                {(feeBreakdown.total * 0.05).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </>
        ) : null}

        {feeBreakdown.workerPayout != null && (
          <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
            <span>Worker payout</span>
            <span>
              {feeBreakdown.currency}{" "}
              {feeBreakdown.workerPayout.toLocaleString()}
            </span>
          </div>
        )}

        {referralDiscount && referralApplied && booking.currency === "NGN" && (
          <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
            <span>🎁 Referral bonus</span>
            <span>
              − {booking.currency} {referralDiscount.discount.toLocaleString()}
            </span>
          </div>
        )}

        <div className={styles.feeTotal}>
          <span>{feeBreakdown.isActual ? "Total Paid" : "Est. Total"}</span>
          <span className={styles.feeTotalAmount}>
            {feeBreakdown.currency}{" "}
            {finalTotal().toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {referralDiscount && !feeBreakdown.isActual && (
          <div className={styles.referralPerk}>
            {booking.currency !== "NGN" ? (
              <p>
                🎁 You have a referral bonus — only applicable to ₦ NGN
                payments.
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
                  ✅ Referral bonus applied — saving {booking.currency}{" "}
                  {referralDiscount.discount.toLocaleString()}
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
                  🎁 You have a {booking.currency}{" "}
                  {referralDiscount.discount.toLocaleString()} referral bonus
                  available
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
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payment</h2>
        <div className={styles.paymentCard}>
          <PayRow
            label="Total"
            value={`${payment.currency} ${payment.amount?.toLocaleString()}`}
          />
          <PayRow
            label="Platform Fee"
            value={`${payment.currency} ${payment.platformFee?.toLocaleString()}`}
            muted
          />
          <PayRow
            label="Worker Payout"
            value={`${payment.currency} ${payment.workerPayout?.toLocaleString()}`}
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
          <span className={styles.paymentBannerIcon}>💳</span>
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
            🎁 <strong>Referral perk:</strong> {booking.currency}{" "}
            {referralDiscount.discount.toLocaleString()} off your first booking
          </div>
        )}

        {referralDiscount && booking.currency === "NGN" && (
          <div className={styles.paymentBannerPerk}>
            {referralApplied ? (
              <>
                ✅ Referral bonus of {booking.currency}{" "}
                {referralDiscount.discount.toLocaleString()} will be deducted at
                checkout
              </>
            ) : (
              <>
                🎁 Apply your {booking.currency}{" "}
                {referralDiscount.discount.toLocaleString()} referral bonus in
                the fee breakdown above
              </>
            )}
          </div>
        )}
        {referralDiscount && booking.currency !== "NGN" && (
          <div
            className={styles.paymentBannerPerk}
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ℹ️ Referral bonus only applies to ₦ NGN payments
          </div>
        )}

        <button
          className={`${styles.payNowBtn} ${showPayOptions ? styles.payNowBtnActive : ""}`}
          onClick={onTogglePayOptions}
        >
          {showPayOptions
            ? "▲ Hide Payment Options"
            : payment?.status === "PENDING"
              ? "⚡ Choose a Different Method"
              : "💳 Pay Now"}
        </button>

        {showPayOptions && (
          <div className={styles.paymentOptionsWrap}>
            <Link
              to={`/bookings/${booking.id}/pay`}
              className={`${styles.actionBtn} ${styles.actionBtn_orange}`}
            >
              💳 Pay by Card
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
