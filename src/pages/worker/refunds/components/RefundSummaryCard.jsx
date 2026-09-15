// src/pages/worker/refunds/components/RefundSummaryCard.jsx
import styles from "../WorkerRefunds.module.css";
import { FiAlertTriangle, FiTrendingDown, FiDollarSign } from "react-icons/fi";

// Multi-currency safe formatter.
// Falls back gracefully if the currency code is unknown to Intl.
export function formatCurrency(amount, currency = "NGN") {
  const n = Number(amount ?? 0);
  const code = (currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "code", // shows "NGN 100.00", "USD 50.00", "USDC 25.00"
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Unknown code (crypto etc.) — fall back to code + number
    return `${code} ${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export default function RefundSummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <div className={styles.summaryGrid}>
        <div className={styles.skSummary} />
        <div className={styles.skSummary} />
        <div className={styles.skSummary} />
      </div>
    );
  }

  const lifetimeCount = summary?.lifetimeRefunds ?? 0;
  const totalDeducted = summary?.lifetimeDeductedFromEarnings ?? 0;
  const debtBalance = summary?.debtBalance ?? 0;

  // Detect the primary currency from the byType breakdown for display.
  // If multiple currencies were refunded, we'll show the code inline on each card
  // and skip the currency-specific fallback.
  const primaryCurrency = summary?.primaryCurrency || "NGN";

  return (
    <div className={styles.summaryGrid}>
      {/* Total refunds */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryLabel}>Lifetime Refunds</div>
        <div className={styles.summaryValue}>{lifetimeCount}</div>
        <div className={styles.summaryHint}>
          {lifetimeCount === 0
            ? "No refunds on your account"
            : `Across ${lifetimeCount} transaction${lifetimeCount === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Total deducted from earnings */}
      <div className={`${styles.summaryCard} ${styles.accentRed}`}>
        <div className={styles.summaryLabel}>Deducted From Earnings</div>
        <div className={`${styles.summaryValue} ${styles.small}`}>
          {formatCurrency(totalDeducted, primaryCurrency)}
        </div>
        <div className={styles.summaryHint}>
          <FiTrendingDown
            size={11}
            style={{ verticalAlign: "middle", marginRight: 4 }}
          />
          Total clawed back from completed jobs
        </div>
      </div>

      {/* Outstanding debt balance */}
      <div
        className={`${styles.summaryCard} ${
          debtBalance > 0 ? styles.accentRed : styles.accentGreen
        }`}
      >
        <div className={styles.summaryLabel}>Outstanding Balance</div>
        <div className={`${styles.summaryValue} ${styles.small}`}>
          {formatCurrency(debtBalance, primaryCurrency)}
        </div>
        <div className={styles.summaryHint}>
          {debtBalance > 0 ? (
            <>
              <FiAlertTriangle
                size={11}
                style={{ verticalAlign: "middle", marginRight: 4 }}
              />
              Will be deducted from your next withdrawal
            </>
          ) : (
            <>
              <FiDollarSign
                size={11}
                style={{ verticalAlign: "middle", marginRight: 4 }}
              />
              You're all settled up
            </>
          )}
        </div>
      </div>
    </div>
  );
}
