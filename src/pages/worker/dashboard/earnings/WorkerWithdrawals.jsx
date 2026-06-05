// src/pages/worker/dashboard/withdrawals/WorkerWithdrawals.jsx
// Updated for Flutterwave + Paystack multi-currency wallet system.
// Features:
//   - Per-currency balance cards (only currencies with a balance are shown)
//   - Nigerian + African + International bank list from API
//   - Live bank account name resolution before submit
//   - Method options filtered by selected currency
//   - Mobile money, bank transfer, crypto all unified
//   - 4-digit withdrawal PIN verification before every payout

import { useState, useEffect, useCallback, useRef } from "react";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import api from "../../../../lib/api";
import s from "./WorkerWithdrawals.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// NIGERIAN BANKS — complete static list (50+ institutions)
// ─────────────────────────────────────────────────────────────────────────────
export const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", type: "commercial" },
  { name: "Ecobank Nigeria", code: "050", type: "commercial" },
  { name: "Fidelity Bank", code: "070", type: "commercial" },
  { name: "First Bank of Nigeria", code: "011", type: "commercial" },
  { name: "First City Monument Bank (FCMB)", code: "214", type: "commercial" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058", type: "commercial" },
  { name: "Stanbic IBTC Bank", code: "221", type: "commercial" },
  { name: "Sterling Bank", code: "232", type: "commercial" },
  { name: "United Bank for Africa (UBA)", code: "033", type: "commercial" },
  { name: "Union Bank of Nigeria", code: "032", type: "commercial" },
  { name: "Unity Bank", code: "215", type: "commercial" },
  { name: "Wema Bank / ALAT", code: "035", type: "commercial" },
  { name: "Zenith Bank", code: "057", type: "commercial" },
  { name: "Citibank Nigeria", code: "023", type: "commercial" },
  { name: "Coronation Merchant Bank", code: "559", type: "merchant" },
  { name: "FBNQuest Merchant Bank", code: "060002", type: "merchant" },
  { name: "FSDH Merchant Bank", code: "501", type: "merchant" },
  { name: "Greenwich Merchant Bank", code: "562", type: "merchant" },
  { name: "Heritage Bank", code: "030", type: "commercial" },
  { name: "Jaiz Bank", code: "301", type: "commercial" },
  { name: "Keystone Bank", code: "082", type: "commercial" },
  { name: "Lotus Bank", code: "303", type: "commercial" },
  { name: "Nova Merchant Bank", code: "561", type: "merchant" },
  { name: "Optimus Bank", code: "070026", type: "commercial" },
  { name: "Parallex Bank", code: "526", type: "commercial" },
  { name: "Polaris Bank", code: "076", type: "commercial" },
  { name: "Providus Bank", code: "101", type: "commercial" },
  { name: "Rand Merchant Bank", code: "502", type: "merchant" },
  { name: "Standard Chartered Bank", code: "068", type: "commercial" },
  { name: "Suntrust Bank", code: "100", type: "commercial" },
  { name: "TAJ Bank", code: "302", type: "commercial" },
  { name: "Titan Trust Bank", code: "102", type: "commercial" },
  { name: "9PSB (9 Payment Service Bank)", code: "120001", type: "digital" },
  { name: "Carbon (Paylater)", code: "565", type: "digital" },
  { name: "Eyowo", code: "50126", type: "digital" },
  { name: "FairMoney MFB", code: "51318", type: "digital" },
  { name: "HabariPay (Sterling Alt)", code: "50737", type: "digital" },
  { name: "Kuda Bank", code: "090267", type: "digital" },
  { name: "Moniepoint MFB", code: "50515", type: "digital" },
  { name: "MoMo PSB (MTN Nigeria)", code: "120003", type: "digital" },
  { name: "OPay Digital Services", code: "100004", type: "digital" },
  { name: "PalmPay", code: "100033", type: "digital" },
  { name: "Paga", code: "327", type: "digital" },
  { name: "Rubies Bank (MFB)", code: "125", type: "digital" },
  { name: "SafeHaven MFB", code: "090286", type: "digital" },
  { name: "Sparkle MFB", code: "090325", type: "digital" },
  { name: "VBank (VFD Microfinance Bank)", code: "090110", type: "digital" },
  { name: "Airtel Smartcash PSB", code: "120004", type: "digital" },
  { name: "AB Microfinance Bank", code: "090270", type: "microfinance" },
  { name: "Accion Microfinance Bank", code: "090134", type: "microfinance" },
  { name: "Baobab Microfinance Bank", code: "070012", type: "microfinance" },
  { name: "Bowen Microfinance Bank", code: "090129", type: "microfinance" },
  { name: "CEMCS Microfinance Bank", code: "562", type: "microfinance" },
  { name: "Empire Trust MFB", code: "090114", type: "microfinance" },
  {
    name: "Fina Trust Microfinance Bank",
    code: "090306",
    type: "microfinance",
  },
  { name: "Fortis Microfinance Bank", code: "070012", type: "microfinance" },
  { name: "Hasal Microfinance Bank", code: "090121", type: "microfinance" },
  { name: "Ibile Microfinance Bank", code: "090115", type: "microfinance" },
  { name: "Infinity Microfinance Bank", code: "090136", type: "microfinance" },
  { name: "LAPO Microfinance Bank", code: "090177", type: "microfinance" },
  { name: "Links Microfinance Bank", code: "090326", type: "microfinance" },
  { name: "Living Trust Mortgage Bank", code: "090129", type: "microfinance" },
  { name: "MKOBO Microfinance Bank", code: "090455", type: "microfinance" },
  {
    name: "Mutual Benefits Microfinance",
    code: "090190",
    type: "microfinance",
  },
  { name: "NIRSAL Microfinance Bank", code: "090194", type: "microfinance" },
  { name: "NPF Microfinance Bank", code: "090131", type: "microfinance" },
  { name: "Pennywise Microfinance Bank", code: "090196", type: "microfinance" },
  {
    name: "Personal Trust Savings & Loans",
    code: "090135",
    type: "microfinance",
  },
  { name: "Petra Microfinance Bank", code: "090165", type: "microfinance" },
  { name: "Prestige Microfinance Bank", code: "090274", type: "microfinance" },
  { name: "Quickfund Microfinance Bank", code: "090261", type: "microfinance" },
  { name: "RenMoney Microfinance Bank", code: "090198", type: "microfinance" },
  { name: "Royal Exchange Microfinance", code: "090138", type: "microfinance" },
  { name: "Summit Microfinance Bank", code: "090309", type: "microfinance" },
  { name: "TCF Microfinance Bank", code: "090115", type: "microfinance" },
  { name: "Tower Microfinance Bank", code: "090133", type: "microfinance" },
  { name: "Trident Microfinance Bank", code: "090164", type: "microfinance" },
  { name: "UNAAB Microfinance Bank", code: "090191", type: "microfinance" },
  { name: "Unical Microfinance Bank", code: "090193", type: "microfinance" },
  { name: "YCT Microfinance Bank", code: "090143", type: "microfinance" },
].sort((a, b) => a.name.localeCompare(b.name));

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCY_METHODS = {
  NGN: [
    {
      key: "ng_bank",
      method: "bank_transfer",
      label: "Nigerian Bank / Fintech",
      icon: "🏦",
      desc: "GTBank, Kuda, OPay, Access, Zenith, UBA, PalmPay +70 more",
      country: "NG",
      hasBankList: true,
    },
    {
      key: "ng_mtn",
      method: "mobile_money",
      label: "MTN MoMo Nigeria",
      icon: "📡",
      desc: "MTN mobile money",
      country: "NG",
      provider: "MTN",
    },
    {
      key: "ng_airtel",
      method: "mobile_money",
      label: "Airtel Money Nigeria",
      icon: "📲",
      desc: "Airtel mobile money",
      country: "NG",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
  GHS: [
    {
      key: "gh_bank",
      method: "bank_transfer",
      label: "Ghana Bank",
      icon: "🏦",
      desc: "GCB, Ecobank, Fidelity, ADB +more",
      country: "GH",
      hasBankList: true,
    },
    {
      key: "gh_mtn",
      method: "mobile_money",
      label: "MTN MoMo Ghana",
      icon: "📱",
      desc: "MTN Mobile Money",
      country: "GH",
      provider: "MTN",
    },
    {
      key: "gh_voda",
      method: "mobile_money",
      label: "Vodafone Cash",
      icon: "📱",
      desc: "Vodafone Cash Ghana",
      country: "GH",
      provider: "Vodafone",
    },
    {
      key: "gh_airtel",
      method: "mobile_money",
      label: "AirtelTigo",
      icon: "📱",
      desc: "AirtelTigo Money Ghana",
      country: "GH",
      provider: "AirtelTigo",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
  KES: [
    {
      key: "ke_mpesa",
      method: "mobile_money",
      label: "M-Pesa Kenya",
      icon: "📱",
      desc: "Safaricom M-Pesa",
      country: "KE",
      provider: "mpesa",
    },
    {
      key: "ke_bank",
      method: "bank_transfer",
      label: "Kenya Bank",
      icon: "🏦",
      desc: "Equity, KCB, Co-op +more",
      country: "KE",
      hasBankList: true,
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
  ZAR: [
    {
      key: "za_bank",
      method: "bank_transfer",
      label: "South Africa Bank",
      icon: "🏦",
      desc: "FNB, Absa, Standard Bank +more",
      country: "ZA",
      hasBankList: true,
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
  TZS: [
    {
      key: "tz_vodacom",
      method: "mobile_money",
      label: "Vodacom M-Pesa TZ",
      icon: "📱",
      desc: "M-Pesa Tanzania",
      country: "TZ",
      provider: "Vodacom",
    },
    {
      key: "tz_airtel",
      method: "mobile_money",
      label: "Airtel Money TZ",
      icon: "📡",
      desc: "Airtel Tanzania",
      country: "TZ",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
  UGX: [
    {
      key: "ug_mtn",
      method: "mobile_money",
      label: "MTN MoMo Uganda",
      icon: "📡",
      desc: "MTN Uganda",
      country: "UG",
      provider: "MTN",
    },
    {
      key: "ug_airtel",
      method: "mobile_money",
      label: "Airtel Money Uganda",
      icon: "📲",
      desc: "Airtel Uganda",
      country: "UG",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "₿",
      desc: "Stablecoin — any country",
    },
  ],
};

const INTL_METHODS = [
  {
    key: "intl_bank",
    method: "bank_transfer",
    label: "International Wire",
    icon: "🌐",
    desc: "SWIFT / IBAN — 150+ countries",
    isInternational: true,
  },
  {
    key: "crypto",
    method: "crypto",
    label: "USDC / USDT",
    icon: "₿",
    desc: "Stablecoin — any country",
  },
];

const CRYPTO_NETWORKS = [
  { value: "BSC", label: "BNB Smart Chain (BSC)" },
  { value: "ETH", label: "Ethereum (ERC-20)" },
  { value: "TRC20", label: "Tron (TRC-20)" },
  { value: "POLYGON", label: "Polygon (MATIC)" },
  { value: "SOLANA", label: "Solana (SOL)" },
  { value: "AVALANCHE", label: "Avalanche (AVAX)" },
];

const CRYPTO_TOKENS = ["USDC", "USDT", "BTC", "ETH"];

const STATUS_META = {
  PENDING: { label: "Pending", cls: "pending" },
  PROCESSING: { label: "Processing", cls: "processing" },
  COMPLETED: { label: "Paid Out", cls: "paid" },
  FAILED: { label: "Failed", cls: "failed" },
  CANCELLED: { label: "Cancelled", cls: "cancelled" },
};

const CURRENCY_META = {
  NGN: { flag: "🇳🇬", symbol: "₦", name: "Naira" },
  GHS: { flag: "🇬🇭", symbol: "₵", name: "Cedi" },
  KES: { flag: "🇰🇪", symbol: "KSh", name: "Shilling" },
  ZAR: { flag: "🇿🇦", symbol: "R", name: "Rand" },
  TZS: { flag: "🇹🇿", symbol: "TSh", name: "Shilling" },
  UGX: { flag: "🇺🇬", symbol: "USh", name: "Shilling" },
  USD: { flag: "🇺🇸", symbol: "$", name: "Dollar" },
  EUR: { flag: "🇪🇺", symbol: "€", name: "Euro" },
  GBP: { flag: "🇬🇧", symbol: "£", name: "Pound" },
  CAD: { flag: "🇨🇦", symbol: "C$", name: "Dollar" },
  AUD: { flag: "🇦🇺", symbol: "A$", name: "Dollar" },
  INR: { flag: "🇮🇳", symbol: "₹", name: "Rupee" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmt(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMethodsForCurrency(currency) {
  return CURRENCY_METHODS[currency?.toUpperCase()] ?? INTL_METHODS;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN INPUT — 4 individual digit boxes, backed by a hidden input
// ─────────────────────────────────────────────────────────────────────────────
function PinInput({ value, onChange, disabled, label, error }) {
  const hiddenRef = useRef();

  return (
    <div className={s.pinField}>
      {label && <label className={s.pinLabel}>{label}</label>}
      <div
        className={`${s.pinBoxes} ${disabled ? s.pinBoxesDisabled : ""}`}
        onClick={() => !disabled && hiddenRef.current?.focus()}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={[
              s.pinBox,
              value.length > i ? s.pinBoxFilled : "",
              value.length === i ? s.pinBoxActive : "",
              error ? s.pinBoxError : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {value.length > i ? "●" : ""}
          </div>
        ))}
        {/* Hidden actual input */}
        <input
          ref={hiddenRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            onChange(v);
          }}
          disabled={disabled}
          className={s.pinHiddenInput}
        />
      </div>
      {error && <p className={s.pinError}>{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN SETUP SCREEN — shown inside the modal when worker hasn't set a PIN yet
// ─────────────────────────────────────────────────────────────────────────────
function PinSetupScreen({ onDone }) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSetPin() {
    setError("");
    if (newPin.length < 4) return setError("Enter a 4-digit PIN.");
    if (newPin !== confirmPin) return setError("PINs don't match.");
    setLoading(true);
    try {
      await api.post("/payments/pin/set", { pin: newPin });
      setSuccess(true);
      setTimeout(onDone, 1200); // brief success flash then back to form
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to set PIN.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={s.pinSetupBox}>
        <span className={s.pinSetupIcon}>✅</span>
        <h3 className={s.pinSetupTitle}>PIN Set!</h3>
        <p className={s.pinSetupSub}>Returning to withdrawal form…</p>
      </div>
    );
  }

  return (
    <div className={s.pinSetupBox}>
      <span className={s.pinSetupIcon}>🔐</span>
      <h3 className={s.pinSetupTitle}>Set a Withdrawal PIN</h3>
      <p className={s.pinSetupSub}>
        You need a 4-digit PIN to authorise withdrawals. Set it once — you'll
        use it every time you request a payout.
      </p>

      <PinInput
        label="Choose 4-digit PIN"
        value={newPin}
        onChange={setNewPin}
        disabled={loading}
      />
      <PinInput
        label="Confirm PIN"
        value={confirmPin}
        onChange={setConfirmPin}
        disabled={loading}
        error={error}
      />

      <button
        className={s.pinSetupBtn}
        onClick={handleSetPin}
        disabled={loading || newPin.length < 4 || confirmPin.length < 4}
      >
        {loading ? <span className={s.spinnerSm} /> : "Set PIN & Continue"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const BANK_TYPE_LABELS = {
  commercial: { label: "Commercial", color: "#818cf8" },
  digital: { label: "Digital/Fintech", color: "#f97316" },
  microfinance: { label: "Microfinance", color: "#22c55e" },
  merchant: { label: "Merchant", color: "#a78bfa" },
};

function BankDropdown({ banks, value, onChange, loading, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  const filtered = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.includes(search),
  );
  const selected = banks.find((b) => b.code === value);

  const grouped = search.trim()
    ? null
    : ["digital", "commercial", "microfinance", "merchant"].reduce(
        (acc, type) => {
          const items = filtered.filter(
            (b) => (b.type ?? "commercial") === type,
          );
          if (items.length) acc.push({ type, items });
          return acc;
        },
        [],
      );

  useEffect(() => {
    const fn = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className={s.bankDropdown} ref={ref}>
      <button
        type="button"
        className={`${s.bankDropdownBtn} ${open ? s.bankDropdownBtnOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <div className={s.bankDropdownBtnInner}>
          {loading ? (
            <span className={s.bankDropdownLoading}>Loading banks…</span>
          ) : selected ? (
            <>
              <span className={s.bankDropdownSelected}>{selected.name}</span>
              {selected.type && BANK_TYPE_LABELS[selected.type] && (
                <span
                  className={s.bankTypeChip}
                  style={{ color: BANK_TYPE_LABELS[selected.type].color }}
                >
                  {BANK_TYPE_LABELS[selected.type].label}
                </span>
              )}
            </>
          ) : (
            <span className={s.bankDropdownPlaceholder}>
              {placeholder ?? "Select bank"}
            </span>
          )}
        </div>
        <span className={s.bankDropdownChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={s.bankDropdownMenu}>
          <div className={s.bankSearchWrap}>
            <span className={s.bankSearchIcon}>🔍</span>
            <input
              className={s.bankSearchInput}
              placeholder={`Search ${banks.length} banks…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                className={s.bankSearchClear}
                onClick={() => setSearch("")}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
          {search && (
            <div className={s.bankResultCount}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "
              {search}"
            </div>
          )}
          <div className={s.bankList}>
            {filtered.length === 0 ? (
              <div className={s.bankNoResults}>
                <span>🔍</span>
                <p>No bank found for "{search}"</p>
                <p className={s.bankNoResultsSub}>
                  Try a shorter name or bank code
                </p>
              </div>
            ) : search.trim() ? (
              filtered.map((b) => (
                <BankOption
                  key={b.code}
                  bank={b}
                  selected={value === b.code}
                  onSelect={(b) => {
                    onChange(b);
                    setOpen(false);
                    setSearch("");
                  }}
                />
              ))
            ) : (
              grouped?.map(({ type, items }) => (
                <div key={type} className={s.bankGroup}>
                  <div
                    className={s.bankGroupHeader}
                    style={{ color: BANK_TYPE_LABELS[type]?.color }}
                  >
                    {BANK_TYPE_LABELS[type]?.label ?? type} ({items.length})
                  </div>
                  {items.map((b) => (
                    <BankOption
                      key={b.code}
                      bank={b}
                      selected={value === b.code}
                      onSelect={(b) => {
                        onChange(b);
                        setOpen(false);
                        setSearch("");
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BankOption({ bank, selected, onSelect }) {
  const typeMeta = BANK_TYPE_LABELS[bank.type ?? "commercial"];
  return (
    <button
      type="button"
      className={`${s.bankOption} ${selected ? s.bankOptionSelected : ""}`}
      onClick={() => onSelect(bank)}
    >
      <span className={s.bankOptionName}>{bank.name}</span>
      <div className={s.bankOptionRight}>
        {typeMeta && (
          <span className={s.bankOptionType} style={{ color: typeMeta.color }}>
            {typeMeta.label}
          </span>
        )}
        <span className={s.bankOptionCode}>{bank.code}</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptModal({ withdrawal, feeConfig, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!withdrawal) return null;
  const sm = STATUS_META[withdrawal.status] ?? {
    label: withdrawal.status,
    cls: "pending",
  };
  const feeRate = feeConfig?.withdrawalFeeRate ?? 0;
  const feeAmt = parseFloat((withdrawal.amount * feeRate).toFixed(2));
  const netAmt = parseFloat((withdrawal.amount - feeAmt).toFixed(2));
  const isFree = feeRate === 0;

  return (
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        if (!ref.current?.contains(e.target)) onClose();
      }}
    >
      <div className={s.receiptModal} ref={ref}>
        <div className={s.receiptHeader}>
          <div className={s.receiptLogo}>
            <span className={s.receiptLogoMark}>SP</span>
            <span className={s.receiptLogoText}>SkilledProz</span>
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.receiptTitle}>
          <h2 className={s.receiptHeading}>Withdrawal Receipt</h2>
          <span className={`${s.pill} ${s[sm.cls]}`}>{sm.label}</span>
        </div>
        <div className={s.receiptGrid}>
          <MetaItem label="Reference" value={`#${withdrawal.reference}`} />
          <MetaItem
            label="Method"
            value={withdrawal.method?.replace(/_/g, " ")}
          />
          <MetaItem
            label="Requested"
            value={new Date(withdrawal.createdAt).toLocaleString("en-GB")}
          />
          {withdrawal.processedAt && (
            <MetaItem
              label="Processed"
              value={new Date(withdrawal.processedAt).toLocaleString("en-GB")}
            />
          )}
          {withdrawal.completedAt && (
            <MetaItem
              label="Completed"
              value={new Date(withdrawal.completedAt).toLocaleString("en-GB")}
            />
          )}
          <MetaItem label="Currency" value={withdrawal.currency} />
        </div>
        <div className={s.receiptDivider} />
        <div className={s.receiptDest}>
          <span className={s.metaLabel}>Paid to</span>
          <span className={s.receiptDestVal}>{withdrawal.destination}</span>
        </div>
        <div className={s.receiptDivider} />
        <div className={s.receiptBreakdown}>
          <div className={s.breakRow}>
            <span>Withdrawal amount</span>
            <span>{fmt(withdrawal.amount, withdrawal.currency)}</span>
          </div>
          <div className={s.breakRow}>
            <span>Withdrawal fee</span>
            {isFree ? (
              <span className={s.feeZero}>Free 🎉</span>
            ) : (
              <span className={s.feeText}>
                − {fmt(feeAmt, withdrawal.currency)} (
                {(feeRate * 100).toFixed(0)}%)
              </span>
            )}
          </div>
          <div className={`${s.breakRow} ${s.breakTotal}`}>
            <span>You receive</span>
            <span className={s.breakTotalAmt}>
              {fmt(netAmt, withdrawal.currency)}
            </span>
          </div>
        </div>
        <div className={s.receiptFooter}>
          <span>SkilledProz · Global Skills Marketplace</span>
          <button className={s.printBtn} onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className={s.metaItem}>
      <span className={s.metaLabel}>{label}</span>
      <span className={s.metaValue}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAWAL FORM MODAL — with PIN gate
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawalModal({
  onClose,
  balance,
  currencyBalances,
  defaultCurrency,
  feeConfig,
  onSuccess,
}) {
  const [currency, setCurrency] = useState(
    defaultCurrency ?? Object.keys(currencyBalances)[0] ?? "NGN",
  );
  const [selMethod, setSelMethod] = useState(null);
  const [form, setForm] = useState({});
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── PIN state ─────────────────────────────────────────────────────────────
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinStatus, setPinStatus] = useState(null); // { pinSet, isLocked, attemptsRemaining }
  const [pinStatusLoading, setPinStatusLoading] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);

  // Load pin status once on mount
  useEffect(() => {
    api
      .get("/payments/pin/status")
      .then((r) => {
        const data = r.data.data;
        setPinStatus(data);
        if (!data.pinSet) setShowPinSetup(true);
      })
      .catch(() =>
        setPinStatus({ pinSet: true, isLocked: false, attemptsRemaining: 3 }),
      )
      .finally(() => setPinStatusLoading(false));
  }, []);

  const methods = getMethodsForCurrency(currency);

  useEffect(() => {
    setSelMethod(methods[0]);
    setForm({});
    setVerifiedName(null);
    setVerifyErr("");
  }, [currency]);

  useEffect(() => {
    if (!selMethod?.hasBankList) {
      setBanks([]);
      return;
    }
    const country = selMethod.country ?? "NG";
    if (country === "NG") {
      setBanks(NIGERIAN_BANKS);
      setBanksLoading(false);
      api
        .get("/payments/banks?country=NG")
        .then((r) => {
          const apibanks = r.data.data?.banks ?? [];
          if (!apibanks.length) return;
          const merged = new Map(NIGERIAN_BANKS.map((b) => [b.code, b]));
          apibanks.forEach((b) =>
            merged.set(b.code, {
              name: b.name,
              code: b.code,
              type: b.type ?? "commercial",
            }),
          );
          setBanks(
            [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
          );
        })
        .catch(() => {});
      return;
    }
    setBanksLoading(true);
    api
      .get(`/payments/banks?country=${country}`)
      .then((r) => setBanks(r.data.data?.banks ?? []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, [selMethod]);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyErr("");
  }, [form.accountNumber, form.bankCode]);

  function setF(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function verifyAccount() {
    if (!form.accountNumber || !form.bankCode) {
      setVerifyErr("Enter account number and select a bank first.");
      return;
    }
    setVerifying(true);
    setVerifyErr("");
    setVerifiedName(null);
    try {
      const res = await api.post("/payments/verify-account", {
        accountNumber: form.accountNumber,
        bankCode: form.bankCode,
        country: selMethod?.country ?? "NG",
      });
      setVerifiedName(res.data.data.accountName);
    } catch (e) {
      setVerifyErr(
        e.response?.data?.message ?? "Account not found. Check details.",
      );
    } finally {
      setVerifying(false);
    }
  }

  const availableForCurrency =
    currencyBalances[currency] ?? balance?.available ?? 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPinError("");

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt < 1) return setError("Minimum withdrawal is 1 unit.");
    if (amt > availableForCurrency)
      return setError(
        `Exceeds available balance (${fmt(availableForCurrency, currency)}).`,
      );
    if (!selMethod) return setError("Select a payout method.");

    // ── PIN validation ─────────────────────────────────────────────────────
    if (!pin || pin.length < 4)
      return setPinError("Enter your 4-digit withdrawal PIN.");
    if (pinStatus?.isLocked)
      return setPinError(
        "Too many wrong attempts. Please wait before trying again.",
      );

    const m = selMethod.method;
    if (m === "bank_transfer" && !selMethod.isInternational) {
      if (!form.bankCode) return setError("Select a bank.");
      if (!form.accountNumber) return setError("Enter account number.");
      if (!verifiedName)
        return setError("Verify your account name before proceeding.");
    }
    if (m === "bank_transfer" && selMethod.isInternational) {
      if (!form.accountNumber) return setError("Enter account / IBAN number.");
      if (!form.swiftBic) return setError("Enter SWIFT / BIC code.");
      if (!form.accountName) return setError("Enter account holder name.");
    }
    if (m === "mobile_money") {
      if (!form.mobileNumber) return setError("Enter mobile number.");
    }
    if (m === "crypto") {
      if (!form.cryptoAddress) return setError("Enter wallet address.");
      if (!form.cryptoToken) return setError("Select crypto token.");
      if (!form.cryptoNetwork) return setError("Select network.");
    }

    const payload = {
      pin, // ← PIN included
      amount: amt,
      currency: currency.toUpperCase(),
      method: m,
      country: selMethod.country ?? "INTL",
    };

    if (m === "bank_transfer" && !selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: verifiedName ?? form.accountName,
      });
    } else if (m === "bank_transfer" && selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.swiftBic,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        swiftBic: form.swiftBic,
        routingNumber: form.routingNumber ?? "",
      });
    } else if (m === "mobile_money") {
      Object.assign(payload, {
        mobileNumber: form.mobileNumber,
        mobileName: form.mobileName ?? "",
        mobileProvider: selMethod.provider ?? form.mobileProvider ?? "",
      });
    } else if (m === "crypto") {
      Object.assign(payload, {
        cryptoAddress: form.cryptoAddress,
        cryptoCurrency: form.cryptoToken ?? "USDT",
        cryptoNetwork: form.cryptoNetwork ?? "BSC",
      });
    }

    setSubmitting(true);
    try {
      await api.post("/payments/withdraw", payload);
      setSuccess(
        `Withdrawal of ${fmt(amt, currency)} submitted. Processing within 1–3 business days.`,
      );
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ?? "Withdrawal failed. Please try again.";
      // If wrong PIN, show in pin error slot and update attempts remaining
      if (err.response?.status === 401 || msg.toLowerCase().includes("pin")) {
        setPinError(msg);
        setPin("");
        // Refresh lock status
        api
          .get("/payments/pin/status")
          .then((r) => setPinStatus(r.data.data))
          .catch(() => {});
      } else if (err.response?.status === 429) {
        setPinError(msg);
        setPinStatus((prev) => ({ ...prev, isLocked: true }));
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const withdrawableCurrencies = Object.entries(currencyBalances)
    .filter(([, bal]) => bal > 0)
    .map(([cur]) => cur);
  const currMeta = CURRENCY_META[currency] ?? {
    flag: "💱",
    symbol: currency,
    name: currency,
  };

  return (
    <div
      className={s.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={s.formModal}>
        <div className={s.formModalHeader}>
          <h2 className={s.formModalTitle}>Request Payout</h2>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* PIN status loading */}
        {pinStatusLoading && (
          <div className={s.pinStatusLoading}>
            <span className={s.spinnerSm} /> Checking PIN status…
          </div>
        )}

        {/* PIN setup screen */}
        {!pinStatusLoading && showPinSetup && (
          <PinSetupScreen
            onDone={() => {
              setShowPinSetup(false);
              setPinStatus((p) => ({ ...p, pinSet: true }));
            }}
          />
        )}

        {/* Locked screen */}
        {!pinStatusLoading && !showPinSetup && pinStatus?.isLocked && (
          <div className={s.pinLockedBox}>
            <span className={s.pinLockedIcon}>🔒</span>
            <h3 className={s.pinLockedTitle}>PIN Locked</h3>
            <p className={s.pinLockedSub}>
              Too many wrong PIN attempts. Your withdrawal PIN is temporarily
              locked for 30 minutes. Please try again later.
            </p>
            <button
              className={s.modalClose}
              style={{
                alignSelf: "center",
                padding: "8px 24px",
                width: "auto",
              }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {/* Normal form */}
        {!pinStatusLoading &&
          !showPinSetup &&
          !pinStatus?.isLocked &&
          (success ? (
            <div className={s.successBox}>
              <span className={s.successIcon}>🎉</span>
              <h3 className={s.successTitle}>Withdrawal Submitted!</h3>
              <p className={s.successMsg}>{success}</p>
              <button className={s.doneBtn} onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <form className={s.payoutForm} onSubmit={handleSubmit}>
              {/* Currency selector */}
              <div className={s.formSection}>
                <p className={s.formSectionLabel}>Withdraw from Wallet</p>
                <div className={s.currencyTabs}>
                  {withdrawableCurrencies.map((cur) => {
                    const cm = CURRENCY_META[cur] ?? {
                      flag: "💱",
                      symbol: cur,
                      name: cur,
                    };
                    const bal = currencyBalances[cur] ?? 0;
                    return (
                      <button
                        key={cur}
                        type="button"
                        className={`${s.currencyTab} ${currency === cur ? s.currencyTabActive : ""}`}
                        onClick={() => setCurrency(cur)}
                      >
                        <span className={s.currencyTabFlag}>{cm.flag}</span>
                        <div className={s.currencyTabInfo}>
                          <span className={s.currencyTabCode}>{cur}</span>
                          <span className={s.currencyTabBal}>
                            {fmt(bal, cur)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className={s.selectedCurrencyBar}>
                  <div className={s.selectedCurrencyLeft}>
                    <span className={s.selectedCurrencyFlag}>
                      {currMeta.flag}
                    </span>
                    <div>
                      <span className={s.selectedCurrencyName}>
                        {currMeta.name} Wallet
                      </span>
                      <span className={s.selectedCurrencyCode}>{currency}</span>
                    </div>
                  </div>
                  <div className={s.selectedCurrencyBalance}>
                    <span className={s.selectedCurrencyBalLabel}>
                      Available
                    </span>
                    <span className={s.selectedCurrencyBalAmt}>
                      {fmt(availableForCurrency, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Method selector */}
              <div className={s.formSection}>
                <p className={s.formSectionLabel}>Payout Method</p>
                <div className={s.methodGrid}>
                  {methods.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={`${s.methodCard} ${selMethod?.key === m.key ? s.methodCardActive : ""}`}
                      onClick={() => {
                        setSelMethod(m);
                        setForm({});
                        setVerifiedName(null);
                      }}
                    >
                      <span className={s.methodCardIcon}>{m.icon}</span>
                      <span className={s.methodCardLabel}>{m.label}</span>
                      <span className={s.methodCardDesc}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic fields */}
              {selMethod && (
                <div className={s.formSection}>
                  <p className={s.formSectionLabel}>Payout Details</p>

                  {selMethod.method === "bank_transfer" &&
                    !selMethod.isInternational && (
                      <div className={s.fieldsStack}>
                        <div className={s.formField}>
                          <label className={s.formLabel}>
                            Bank / Fintech *
                          </label>
                          <BankDropdown
                            banks={banks}
                            loading={banksLoading}
                            value={form.bankCode}
                            onChange={(b) => {
                              setF("bankCode", b.code);
                              setF("bankName", b.name);
                            }}
                            placeholder="Select bank, Kuda, OPay…"
                          />
                        </div>
                        <div className={s.formField}>
                          <label className={s.formLabel}>
                            Account Number *
                          </label>
                          <input
                            className={s.formInput}
                            placeholder="0123456789"
                            value={form.accountNumber ?? ""}
                            onChange={(e) =>
                              setF("accountNumber", e.target.value)
                            }
                            maxLength={12}
                            required
                          />
                        </div>
                        <div className={s.verifyRow}>
                          <div className={s.verifyStatus}>
                            {verifiedName ? (
                              <div className={s.verifiedTag}>
                                ✅ {verifiedName}
                              </div>
                            ) : verifyErr ? (
                              <div className={s.verifyErrTag}>
                                ❌ {verifyErr}
                              </div>
                            ) : (
                              <span className={s.verifyHint}>
                                Verify to confirm account holder name
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={s.verifyBtn}
                            onClick={verifyAccount}
                            disabled={
                              verifying || !form.accountNumber || !form.bankCode
                            }
                          >
                            {verifying ? (
                              <span className={s.spinnerSm} />
                            ) : (
                              "Verify"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  {selMethod.method === "bank_transfer" &&
                    selMethod.isInternational && (
                      <div className={s.fieldsGrid}>
                        {[
                          {
                            key: "bankName",
                            label: "Bank Name *",
                            placeholder: "e.g. Bank of America",
                          },
                          {
                            key: "accountNumber",
                            label: "Account / IBAN *",
                            placeholder: "IBAN or account number",
                          },
                          {
                            key: "swiftBic",
                            label: "SWIFT / BIC *",
                            placeholder: "e.g. BOFAUS3N",
                          },
                          {
                            key: "routingNumber",
                            label: "Routing (US/CA)",
                            placeholder: "9-digit routing",
                          },
                          {
                            key: "accountName",
                            label: "Account Holder Name *",
                            placeholder: "Full name on account",
                          },
                          {
                            key: "bankCountry",
                            label: "Bank Country *",
                            placeholder: "e.g. United States",
                          },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key} className={s.formField}>
                            <label className={s.formLabel}>{label}</label>
                            <input
                              className={s.formInput}
                              placeholder={placeholder}
                              value={form[key] ?? ""}
                              onChange={(e) => setF(key, e.target.value)}
                              required={label.includes("*")}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  {selMethod.method === "mobile_money" && (
                    <div className={s.fieldsStack}>
                      <div className={s.formField}>
                        <label className={s.formLabel}>Mobile Number *</label>
                        <input
                          className={s.formInput}
                          placeholder="+234 800 000 0000"
                          value={form.mobileNumber ?? ""}
                          onChange={(e) => setF("mobileNumber", e.target.value)}
                          required
                        />
                      </div>
                      <div className={s.formField}>
                        <label className={s.formLabel}>
                          Account Name (optional)
                        </label>
                        <input
                          className={s.formInput}
                          placeholder="Name on mobile account"
                          value={form.mobileName ?? ""}
                          onChange={(e) => setF("mobileName", e.target.value)}
                        />
                      </div>
                      {selMethod.provider && (
                        <div className={s.providerChip}>
                          <span>{selMethod.icon}</span>
                          <span>
                            Provider: <strong>{selMethod.provider}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selMethod.method === "crypto" && (
                    <div className={s.fieldsStack}>
                      <div className={s.formField}>
                        <label className={s.formLabel}>Token *</label>
                        <div className={s.tokenGrid}>
                          {CRYPTO_TOKENS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={`${s.tokenBtn} ${form.cryptoToken === t ? s.tokenBtnActive : ""}`}
                              onClick={() => setF("cryptoToken", t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={s.formField}>
                        <label className={s.formLabel}>Network *</label>
                        <div className={s.networkGrid}>
                          {CRYPTO_NETWORKS.map((n) => (
                            <button
                              key={n.value}
                              type="button"
                              className={`${s.networkBtn} ${form.cryptoNetwork === n.value ? s.networkBtnActive : ""}`}
                              onClick={() => setF("cryptoNetwork", n.value)}
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={s.formField}>
                        <label className={s.formLabel}>Wallet Address *</label>
                        <input
                          className={`${s.formInput} ${s.monoInput}`}
                          placeholder="0x… or TRC20 address"
                          value={form.cryptoAddress ?? ""}
                          onChange={(e) =>
                            setF("cryptoAddress", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className={s.cryptoWarning}>
                        <span>⚠️</span>
                        <p>
                          Double-check the network matches your wallet. Sending
                          to the wrong network will result in permanent loss of
                          funds.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className={s.formSection}>
                <p className={s.formSectionLabel}>Amount ({currency})</p>
                <div className={s.amountWrap}>
                  <span className={s.amountCurrency}>{currMeta.symbol}</span>
                  <input
                    className={s.amountInput}
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    max={availableForCurrency}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className={s.quickAmounts}>
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={s.quickBtn}
                      onClick={() =>
                        setAmount((availableForCurrency * f).toFixed(2))
                      }
                    >
                      {f === 1 ? "Max" : `${f * 100}%`}
                    </button>
                  ))}
                </div>
                {amount &&
                  parseFloat(amount) > 0 &&
                  (() => {
                    const feeRate = feeConfig?.withdrawalFeeRate ?? 0;
                    const feeAmt = parseFloat(amount) * feeRate;
                    const netAmt = parseFloat(amount) - feeAmt;
                    const isFree = feeRate === 0;
                    return (
                      <div className={s.amountPreview}>
                        {isFree ? (
                          <>
                            You receive{" "}
                            <strong className={s.amountPreviewFull}>
                              {fmt(netAmt, currency)} — no fee 🎉
                            </strong>
                          </>
                        ) : (
                          <>
                            You receive approx.{" "}
                            <strong>{fmt(netAmt, currency)}</strong> after{" "}
                            {(feeRate * 100).toFixed(0)}% fee
                          </>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {/* ── 4-DIGIT PIN SECTION ──────────────────────────────────── */}
              <div className={s.formSection}>
                <p className={s.formSectionLabel}>
                  Withdrawal PIN
                  {pinStatus && !pinStatus.isLocked && (
                    <span className={s.pinAttemptsHint}>
                      {pinStatus.attemptsRemaining} attempt
                      {pinStatus.attemptsRemaining !== 1 ? "s" : ""} remaining
                    </span>
                  )}
                </p>
                <PinInput
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    if (pinError) setPinError("");
                  }}
                  disabled={submitting}
                  error={pinError}
                />
                <button
                  type="button"
                  className={s.pinForgotBtn}
                  onClick={() => setShowPinSetup(true)}
                >
                  Forgot PIN? Reset it
                </button>
              </div>
              {/* ── END PIN SECTION ───────────────────────────────────────── */}

              {error && <div className={s.errorBox}>⚠️ {error}</div>}

              <div className={s.formInfo}>
                <span>ℹ️</span>
                <p>
                  Payouts processed within 1–3 business days ·{" "}
                  {(feeConfig?.withdrawalFeeRate ?? 0) === 0 ? (
                    <strong>
                      No withdrawal fee — you keep 100% of your earnings 🎉
                    </strong>
                  ) : (
                    `${((feeConfig?.withdrawalFeeRate ?? 0) * 100).toFixed(0)}% withdrawal fee applies`
                  )}{" "}
                  · Crypto is USDC/USDT equivalent · Minimum: 1 {currency}
                </p>
              </div>

              <button
                type="submit"
                className={s.submitBtn}
                disabled={submitting || !amount || !selMethod || pin.length < 4}
              >
                {submitting ? (
                  <>
                    <span className={s.spinner} /> Processing…
                  </>
                ) : (
                  `↑ Withdraw ${amount ? fmt(parseFloat(amount) || 0, currency) : ""}`
                )}
              </button>
            </form>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — unchanged except passing pinStatus awareness down
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerWithdrawals() {
  const [balance, setBalance] = useState(null);
  const [currencyBalances, setCurrencyBalances] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const wdRes = await api.get(`/payments/withdrawals?page=${p}&limit=15`);
      setHistory(wdRes.data.data.withdrawals);
      setBalance(wdRes.data.data.balance);
      setPages(wdRes.data.data.pages);
      setPage(p);

      const earnRes = await api.get("/payments/earnings?limit=1");
      const currencies = earnRes.data.data.availableCurrencies ?? ["NGN"];

      const balMap = {};
      await Promise.all(
        currencies.map(async (cur) => {
          try {
            const r = await api.get(
              `/payments/earnings?currency=${cur}&limit=1`,
            );
            const earned = r.data.data.summary?.totalEarned ?? 0;
            const pending = wdRes.data.data.withdrawals
              .filter(
                (w) =>
                  w.currency === cur &&
                  ["PENDING", "PROCESSING"].includes(w.status),
              )
              .reduce((sum, w) => sum + (w.amount || 0), 0);
            balMap[cur] = Math.max(0, earned - pending);
          } catch {
            balMap[cur] = 0;
          }
        }),
      );

      setCurrencyBalances(balMap);
      const topCur = Object.entries(balMap).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0];
      if (topCur) setSelectedCurrency(topCur);
    } catch {
      setToast({ type: "error", msg: "Failed to load wallet data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const currenciesWithBalance = Object.entries(currencyBalances)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <WorkerLayout>
      <div className={s.page}>
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}

        <div className={s.header}>
          <div>
            <div className={s.eyebrow}>Earnings & Payouts</div>
            <h1 className={s.title}>Your Wallet</h1>
            <p className={s.sub}>
              Multi-currency earnings, withdrawals, and payout history
            </p>
          </div>
          <button
            className={s.withdrawBtn}
            onClick={() => setShowForm(true)}
            disabled={currenciesWithBalance.length === 0 || loading}
          >
            ↑ Withdraw Funds
          </button>
        </div>

        {!loading && currenciesWithBalance.length > 0 && (
          <div className={s.currencyWallets}>
            <p className={s.walletSectionLabel}>💳 Your Currency Wallets</p>
            <div className={s.currencyWalletGrid}>
              {currenciesWithBalance.map(([cur, bal]) => {
                const cm = CURRENCY_META[cur] ?? {
                  flag: "💱",
                  symbol: cur,
                  name: cur,
                };
                return (
                  <div
                    key={cur}
                    className={`${s.currencyWalletCard} ${selectedCurrency === cur ? s.currencyWalletCardActive : ""}`}
                    onClick={() => setSelectedCurrency(cur)}
                  >
                    <div className={s.walletCardTop}>
                      <span className={s.walletFlag}>{cm.flag}</span>
                      <span className={s.walletCode}>{cur}</span>
                    </div>
                    <div className={s.walletAmount}>{fmt(bal, cur)}</div>
                    <div className={s.walletName}>{cm.name}</div>
                    <button
                      className={s.walletWithdrawBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCurrency(cur);
                        setShowForm(true);
                      }}
                    >
                      Withdraw
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={s.summaryGrid}>
          <div className={`${s.summaryCard} ${s.summaryAccent}`}>
            <span className={s.summaryLabel}>Total Available</span>
            <span className={s.summaryValue}>
              {loading ? "—" : fmt(balance?.available ?? 0)}
            </span>
            <span className={s.summarySub}>Across all currencies</span>
          </div>
          <div className={s.summaryCard}>
            <span className={s.summaryLabel}>In Escrow</span>
            <span className={s.summaryValue}>
              {loading ? "—" : fmt(balance?.inEscrow ?? 0)}
            </span>
            <span className={s.summarySub}>Awaiting completion</span>
          </div>
          <div className={s.summaryCard}>
            <span className={s.summaryLabel}>Pending Payouts</span>
            <span className={s.summaryValue}>
              {loading ? "—" : fmt(balance?.pendingPayout ?? 0)}
            </span>
            <span className={s.summarySub}>
              {
                history.filter((w) =>
                  ["PENDING", "PROCESSING"].includes(w.status),
                ).length
              }{" "}
              request(s)
            </span>
          </div>
          <div className={s.summaryCard}>
            <span className={s.summaryLabel}>Wallets</span>
            <span className={s.summaryValue}>
              {loading ? "—" : currenciesWithBalance.length}
            </span>
            <span className={s.summarySub}>Active currencies</span>
          </div>
        </div>

        <div className={s.tableWrap}>
          <div className={s.tableHeader}>
            <h2 className={s.tableTitle}>Withdrawal History</h2>
            <span className={s.tableCount}>{history.length} records</span>
          </div>
          <div className={s.tableHead}>
            <span>Reference</span>
            <span>Method</span>
            <span>Destination</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>
          <div className={s.tableBody}>
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className={s.skRow} />)
            ) : history.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>💸</span>
                <p className={s.emptyTitle}>No withdrawals yet</p>
                <p className={s.emptySub}>
                  Request your first payout when you have available balance.
                </p>
              </div>
            ) : (
              history.map((w, i) => {
                const sm = STATUS_META[w.status] ?? {
                  label: w.status,
                  cls: "pending",
                };
                const cm = CURRENCY_META[w.currency] ?? { flag: "💱" };
                return (
                  <div
                    key={w.id}
                    className={s.tableRow}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <div className={s.rowMobileTop}>
                      <div className={s.refCell}>
                        <span className={s.refText}>
                          #{w.reference?.slice(-8)}
                        </span>
                        <span className={s.dateCell}>
                          {timeAgo(w.createdAt)}
                        </span>
                      </div>
                      <span className={`${s.pill} ${s[sm.cls]}`}>
                        {sm.label}
                      </span>
                    </div>
                    <div className={s.methodCell}>
                      <span className={s.methodName}>
                        {cm.flag} {w.method?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className={s.destCell}>{w.destination}</div>
                    <div className={s.dateCellDesktop}>
                      {timeAgo(w.createdAt)}
                    </div>
                    <div className={s.amountCell}>
                      <span className={s.amountVal}>
                        {fmt(w.amount, w.currency)}
                      </span>
                      {w.status === "COMPLETED" &&
                        (() => {
                          const feeRate = balance?.withdrawalFeeRate ?? 0;
                          const net = parseFloat(
                            (w.amount * (1 - feeRate)).toFixed(2),
                          );
                          return feeRate > 0 ? (
                            <span className={s.amountNet}>
                              Net {fmt(net, w.currency)}
                            </span>
                          ) : (
                            <span className={s.amountNetFree}>
                              Full amount sent ✓
                            </span>
                          );
                        })()}
                    </div>
                    <div className={s.statusCellDesktop}>
                      <span className={`${s.pill} ${s[sm.cls]}`}>
                        {sm.label}
                      </span>
                    </div>
                    <div className={s.actionsCell}>
                      <button
                        className={s.receiptBtn}
                        onClick={() => setReceipt(w)}
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {pages > 1 && (
            <div className={s.pager}>
              <button
                className={s.pageBtn}
                disabled={page === 1}
                onClick={() => loadData(page - 1)}
              >
                ← Prev
              </button>
              <span className={s.pageInfo}>
                {page} / {pages}
              </span>
              <button
                className={s.pageBtn}
                disabled={page === pages}
                onClick={() => loadData(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <WithdrawalModal
          onClose={() => setShowForm(false)}
          balance={balance}
          currencyBalances={currencyBalances}
          defaultCurrency={selectedCurrency}
          feeConfig={balance}
          onSuccess={() => {
            setShowForm(false);
            loadData(1);
            showToast("success", "Withdrawal submitted!");
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          withdrawal={receipt}
          feeConfig={balance}
          onClose={() => setReceipt(null)}
        />
      )}
    </WorkerLayout>
  );
}
