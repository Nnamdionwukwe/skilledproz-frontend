// src/components/payment/CryptoRateConverter.jsx
import { useState, useEffect, useCallback } from "react";
import {
  FaBitcoin,
  FaEthereum,
  FaDollarSign,
  FaMoneyBill,
  FaSync,
  FaExclamationTriangle,
  FaSpinner,
  FaCopy,
} from "react-icons/fa";
import styles from "./CryptoRateConverter.module.css";

const CRYPTO_TOKENS = [
  { id: "USDC", label: "USDC", icon: FaDollarSign, coingeckoId: "usd-coin" },
  { id: "USDT", label: "USDT", icon: FaMoneyBill, coingeckoId: "tether" },
  { id: "BTC", label: "Bitcoin", icon: FaBitcoin, coingeckoId: "bitcoin" },
  { id: "ETH", label: "Ethereum", icon: FaEthereum, coingeckoId: "ethereum" },
];

const COINGECKO_IDS = CRYPTO_TOKENS.map((t) => t.coingeckoId).join(",");

export default function CryptoRateConverter({
  fiatAmount,
  fiatCurrency = "NGN",
  onAmountChange,
  selectedToken: initialToken = "USDC",
  refreshInterval = 30000, // 30 seconds
}) {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(initialToken);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=${fiatCurrency.toLowerCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newRates = {};
      CRYPTO_TOKENS.forEach((token) => {
        const price = data[token.coingeckoId]?.[fiatCurrency.toLowerCase()];
        newRates[token.id] = price || null;
      });
      setRates(newRates);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fiatCurrency]);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchRates, refreshInterval]);

  const selectedRate = rates?.[selectedToken];
  const cryptoAmount =
    selectedRate && fiatAmount > 0 ? fiatAmount / selectedRate : 0;

  // Notify parent when amount changes
  useEffect(() => {
    if (onAmountChange && cryptoAmount > 0) {
      onAmountChange({
        token: selectedToken,
        amount: cryptoAmount,
        rate: selectedRate,
        fiatAmount,
        fiatCurrency,
      });
    }
  }, [
    cryptoAmount,
    selectedToken,
    selectedRate,
    fiatAmount,
    fiatCurrency,
    onAmountChange,
  ]);

  const handleCopy = async () => {
    if (!cryptoAmount || !selectedToken) return;
    const text = `${cryptoAmount.toFixed(6)} ${selectedToken}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !rates) {
    return (
      <div className={styles.converter}>
        <div className={styles.loading}>
          <FaSpinner className={styles.spinner} />
          <p>Loading live exchange rates…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.converter}>
        <div className={styles.error}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <p>Could not load rates: {error}</p>
          <button className={styles.retryBtn} onClick={fetchRates}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.converter}>
      <div className={styles.header}>
        <span className={styles.title}>Live Crypto Rates</span>
        <div className={styles.headerRight}>
          <span className={styles.lastUpdated}>
            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "—"}
          </span>
          <button
            className={styles.refreshBtn}
            onClick={fetchRates}
            disabled={loading}
          >
            <FaSync className={loading ? styles.spin : ""} />
          </button>
        </div>
      </div>

      <div className={styles.amountDisplay}>
        <span className={styles.fiatLabel}>You pay:</span>
        <span className={styles.fiatAmount}>
          {fiatCurrency} {fiatAmount.toFixed(2)}
        </span>
      </div>

      <div className={styles.tokenGrid}>
        {CRYPTO_TOKENS.map((token) => {
          const Icon = token.icon;
          const rate = rates?.[token.id];
          const isSelected = selectedToken === token.id;
          const isZero = rate === null || rate === 0;
          const tokenAmount = rate ? fiatAmount / rate : 0;

          return (
            <button
              key={token.id}
              className={`${styles.tokenCard} ${isSelected ? styles.selected : ""} ${isZero ? styles.unavailable : ""}`}
              onClick={() => {
                if (!isZero && rate) setSelectedToken(token.id);
              }}
              disabled={isZero || !rate}
            >
              <div className={styles.tokenIcon}>
                <Icon />
              </div>
              <div className={styles.tokenInfo}>
                <span className={styles.tokenLabel}>{token.label}</span>
                <span className={styles.tokenRate}>
                  {rate
                    ? `1 ${token.label} = ${fiatCurrency} ${rate.toFixed(4)}`
                    : "No rate"}
                </span>
                <span className={styles.tokenAmount}>
                  {isSelected && rate ? (
                    <strong>
                      {tokenAmount.toFixed(6)} {token.label}
                    </strong>
                  ) : rate ? (
                    `${tokenAmount.toFixed(6)} ${token.label}`
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              {isSelected && <span className={styles.checkmark}>✓</span>}
            </button>
          );
        })}
      </div>

      {selectedRate && cryptoAmount > 0 && (
        <div className={styles.resultBox}>
          <div className={styles.resultRow}>
            <p className={styles.resultText}>
              You need to send{" "}
              <strong>
                {cryptoAmount.toFixed(6)} {selectedToken}
              </strong>
            </p>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
              onClick={handleCopy}
              title="Copy amount"
              aria-label="Copy amount to clipboard"
            >
              <FaCopy />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <p className={styles.note}>
            Rates are live and may change. The exact amount may vary slightly
            when you complete the transfer.
          </p>
        </div>
      )}
    </div>
  );
}
