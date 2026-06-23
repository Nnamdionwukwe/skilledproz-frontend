import styles from "./BookingDetail.module.css";

export default function FeeBreakdown({
  feeBreakdown,
  referralDiscount,
  referralApplied,
  onReferralToggle,
  currency,
}) {
  const computeWithFee = (amount) => {
    const fee = amount * 0.05;
    return amount + fee;
  };

  const getDiscount = () => {
    if (referralApplied && referralDiscount && currency === "NGN") {
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
              {(feeBreakdown.total - feeBreakdown.platformFee).toLocaleString()}
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
            {feeBreakdown.currency} {feeBreakdown.workerPayout.toLocaleString()}
          </span>
        </div>
      )}

      {referralDiscount && referralApplied && currency === "NGN" && (
        <div className={`${styles.feeRow} ${styles.feeRowGreen}`}>
          <span>🎁 Referral bonus</span>
          <span>
            − {currency} {referralDiscount.discount.toLocaleString()}
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
          {currency !== "NGN" ? (
            <p>
              🎁 You have a referral bonus — only applicable to ₦ NGN payments.
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
                ✅ Referral bonus applied — saving {currency}{" "}
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
                🎁 You have a {currency}{" "}
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
}
