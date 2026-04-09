import {
  useCurrency,
  CURRENCY_META,
  ALL_CURRENCIES,
} from "../../context/CurrencyContext";
import styles from "./DashboardCurrencySwitch.module.css";

export default function DashboardCurrencySwitch() {
  const { dashboardCurrency, changeDashboardCurrency } = useCurrency();

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Viewing in</span>
      <select
        className={styles.select}
        value={dashboardCurrency}
        onChange={(e) => changeDashboardCurrency(e.target.value)}
        title="Change dashboard display currency"
      >
        {ALL_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {CURRENCY_META[c]?.symbol} {c}
          </option>
        ))}
      </select>
    </div>
  );
}
