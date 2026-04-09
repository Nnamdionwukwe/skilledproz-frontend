import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

const CurrencyContext = createContext(null);

// All supported currencies with symbols
export const CURRENCY_META = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { symbol: "R", name: "South African Rand" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  CAD: { symbol: "CA$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling" },
  UGX: { symbol: "USh", name: "Ugandan Shilling" },
  RWF: { symbol: "RF", name: "Rwandan Franc" },
  XOF: { symbol: "CFA", name: "West African CFA" },
  MAD: { symbol: "DH", name: "Moroccan Dirham" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  THB: { symbol: "฿", name: "Thai Baht" },
  BDT: { symbol: "৳", name: "Bangladeshi Taka" },
  PKR: { symbol: "₨", name: "Pakistani Rupee" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
  QAR: { symbol: "QR", name: "Qatari Riyal" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  USDC: { symbol: "USDC", name: "USD Coin" },
  USDT: { symbol: "USDT", name: "Tether" },
};

export const ALL_CURRENCIES = Object.keys(CURRENCY_META);

export function CurrencyProvider({ children }) {
  const { user, updateUser } = useAuthStore();

  // Dashboard display currency — what stats are shown in
  const [dashboardCurrency, setDashboardCurrency] = useState(
    () =>
      localStorage.getItem("sp_dash_currency") ||
      user?.dashboardCurrency ||
      "USD",
  );

  // Payment currency — what transactions use
  const [paymentCurrency, setPaymentCurrency] = useState(
    () => user?.paymentCurrency || "USD",
  );

  // Sync from user store on login
  useEffect(() => {
    if (user?.dashboardCurrency) setDashboardCurrency(user.dashboardCurrency);
    if (user?.paymentCurrency) setPaymentCurrency(user.paymentCurrency);
  }, [user?.dashboardCurrency, user?.paymentCurrency]);

  const changeDashboardCurrency = useCallback(
    async (currency) => {
      setDashboardCurrency(currency);
      localStorage.setItem("sp_dash_currency", currency);
      if (user) {
        try {
          await api.patch("/settings/profile", { dashboardCurrency: currency });
          updateUser?.({ dashboardCurrency: currency });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const changePaymentCurrency = useCallback(
    async (currency) => {
      setPaymentCurrency(currency);
      if (user) {
        try {
          await api.patch("/settings/profile", { paymentCurrency: currency });
          updateUser?.({ paymentCurrency: currency });
        } catch {}
      }
    },
    [user, updateUser],
  );

  // Format amount in a given currency
  const fmt = useCallback(
    (amount, currency) => {
      const cur = currency || dashboardCurrency;
      const isCrypto = ["USDC", "USDT"].includes(cur);
      try {
        if (isCrypto)
          return `${CURRENCY_META[cur]?.symbol || cur} ${Number(amount || 0).toFixed(2)}`;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: cur,
          maximumFractionDigits: [
            "JPY",
            "KES",
            "TZS",
            "UGX",
            "RWF",
            "XOF",
            "NGN",
            "GHS",
          ].includes(cur)
            ? 0
            : 2,
        }).format(amount || 0);
      } catch {
        return `${CURRENCY_META[cur]?.symbol || cur} ${Number(amount || 0).toFixed(2)}`;
      }
    },
    [dashboardCurrency],
  );

  return (
    <CurrencyContext.Provider
      value={{
        dashboardCurrency,
        paymentCurrency,
        changeDashboardCurrency,
        changePaymentCurrency,
        fmt,
        CURRENCY_META,
        ALL_CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
