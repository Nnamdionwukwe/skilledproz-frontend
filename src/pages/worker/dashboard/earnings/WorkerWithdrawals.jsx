import { useState, useEffect, useRef } from "react";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import api from "../../../../lib/api";
import styles from "./WorkerWithdrawals.module.css";

// ── Payout methods by region ──────────────────────────────────────────────────
const PAYOUT_METHODS = [
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: "🏦",
    desc: "SWIFT / local wire",
    regions: "Global",
    fields: [
      "bankName",
      "accountNumber",
      "accountName",
      "swiftBic",
      "routingNumber",
      "bankCountry",
    ],
  },
  {
    id: "paystack",
    label: "Paystack",
    icon: "🇳🇬",
    desc: "Nigeria, Ghana, Kenya, SA",
    regions: "Africa",
    fields: ["paystackEmail"],
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: "🅿️",
    desc: "200+ countries",
    regions: "Global",
    fields: ["paypalEmail"],
  },
  {
    id: "wise",
    label: "Wise",
    icon: "💸",
    desc: "40+ currencies",
    regions: "Global",
    fields: ["wiseEmail"],
  },
  {
    id: "mpesa",
    label: "M-Pesa",
    icon: "📱",
    desc: "Kenya, Tanzania, Uganda",
    regions: "East Africa",
    fields: ["mobileNumber"],
  },
  {
    id: "opay",
    label: "OPay / PalmPay",
    icon: "📲",
    desc: "Nigeria",
    regions: "West Africa",
    fields: ["mobileNumber", "mobileProvider"],
  },
  {
    id: "mtn_momo",
    label: "MTN MoMo",
    icon: "📡",
    desc: "19 African countries",
    regions: "Africa",
    fields: ["mobileNumber", "mobileCountry"],
  },
  {
    id: "gcash",
    label: "GCash / Maya",
    icon: "🇵🇭",
    desc: "Philippines",
    regions: "Southeast Asia",
    fields: ["mobileNumber"],
  },
  {
    id: "bkash",
    label: "bKash / Nagad",
    icon: "🇧🇩",
    desc: "Bangladesh",
    regions: "South Asia",
    fields: ["mobileNumber"],
  },
  {
    id: "crypto",
    label: "USDC / USDT",
    icon: "₿",
    desc: "Any country — stablecoin",
    regions: "Global",
    fields: ["walletAddress", "cryptoNetwork"],
  },
];

const FIELD_LABELS = {
  bankName: "Bank Name",
  accountNumber: "Account Number",
  accountName: "Account Name",
  swiftBic: "SWIFT / BIC Code",
  routingNumber: "Routing Number (US/CA)",
  bankCountry: "Bank Country",
  paystackEmail: "Paystack Email",
  paypalEmail: "PayPal Email",
  wiseEmail: "Wise Email / Phone",
  mobileNumber: "Mobile Number",
  mobileProvider: "Provider",
  mobileCountry: "Country",
  walletAddress: "Wallet Address",
  cryptoNetwork: "Network",
};

const FIELD_PLACEHOLDERS = {
  bankName: "e.g. First Bank, Barclays, Chase",
  accountNumber: "0123456789",
  accountName: "As it appears on your account",
  swiftBic: "e.g. FBNINGLA",
  routingNumber: "9-digit routing number",
  bankCountry: "e.g. Nigeria, UK, USA",
  paystackEmail: "your@email.com",
  paypalEmail: "your@paypal.com",
  wiseEmail: "email or +1234567890",
  mobileNumber: "+234 800 000 0000",
  mobileProvider: "OPay / PalmPay / Kuda...",
  mobileCountry: "Kenya / Tanzania...",
  walletAddress: "0x... or TRC20...",
  cryptoNetwork: "Ethereum / Tron / Polygon",
};

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

const WITHDRAWAL_STATUS = {
  PENDING: { label: "Pending", cls: "pending" },
  PROCESSING: { label: "Processing", cls: "processing" },
  COMPLETED: { label: "Paid Out", cls: "paid" },
  FAILED: { label: "Failed", cls: "failed" },
  CANCELLED: { label: "Cancelled", cls: "cancelled" },
};

// ── Mock withdrawal history (replace with real API when payout endpoint exists) ──
const MOCK_HISTORY = [
  {
    id: "wd-001",
    amount: 45000,
    currency: "NGN",
    method: "Bank Transfer",
    destination: "First Bank ••• 4521",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    reference: "WD-2024-001",
  },
  {
    id: "wd-002",
    amount: 22500,
    currency: "NGN",
    method: "OPay / PalmPay",
    destination: "+234 812 345 6789",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    reference: "WD-2024-002",
  },
  {
    id: "wd-003",
    amount: 15000,
    currency: "NGN",
    method: "Bank Transfer",
    destination: "GTBank ••• 7890",
    status: "PROCESSING",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: null,
    reference: "WD-2024-003",
  },
];

// ── Receipt modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ withdrawal, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!withdrawal) return null;
  const sm = WITHDRAWAL_STATUS[withdrawal.status] || {
    label: withdrawal.status,
    cls: "pending",
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (!ref.current?.contains(e.target)) onClose();
      }}
    >
      <div className={styles.receiptModal} ref={ref}>
        <div className={styles.receiptHeader}>
          <div className={styles.receiptLogo}>
            <span className={styles.receiptLogoMark}>SP</span>
            <span className={styles.receiptLogoText}>SkilledProz</span>
          </div>
          <button className={styles.receiptClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.receiptTitle}>
          <h2 className={styles.receiptHeading}>Withdrawal Receipt</h2>
          <span className={`${styles.receiptStatusPill} ${styles[sm.cls]}`}>
            {sm.label}
          </span>
        </div>

        <div className={styles.receiptGrid}>
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Reference</span>
            <span className={styles.receiptMetaValue}>
              #{withdrawal.reference}
            </span>
          </div>
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Requested</span>
            <span className={styles.receiptMetaValue}>
              {new Date(withdrawal.createdAt).toLocaleString("en-GB")}
            </span>
          </div>
          {withdrawal.completedAt && (
            <div className={styles.receiptMetaItem}>
              <span className={styles.receiptMetaLabel}>Completed</span>
              <span className={styles.receiptMetaValue}>
                {new Date(withdrawal.completedAt).toLocaleString("en-GB")}
              </span>
            </div>
          )}
          <div className={styles.receiptMetaItem}>
            <span className={styles.receiptMetaLabel}>Method</span>
            <span className={styles.receiptMetaValue}>{withdrawal.method}</span>
          </div>
        </div>

        <div className={styles.receiptDivider} />

        <div className={styles.receiptDestination}>
          <span className={styles.receiptMetaLabel}>Paid to</span>
          <span className={styles.receiptDestValue}>
            {withdrawal.destination}
          </span>
        </div>

        <div className={styles.receiptDivider} />

        <div className={styles.receiptBreakdown}>
          <div className={styles.receiptBreakdownRow}>
            <span>Withdrawal amount</span>
            <span>{fmt(withdrawal.amount, withdrawal.currency)}</span>
          </div>
          <div className={styles.receiptBreakdownRow}>
            <span>Processing fee</span>
            <span className={styles.feeText}>
              — {fmt(withdrawal.amount * 0.01, withdrawal.currency)}
            </span>
          </div>
          <div
            className={`${styles.receiptBreakdownRow} ${styles.receiptTotal}`}
          >
            <span>Net payout</span>
            <span className={styles.receiptTotalAmount}>
              {fmt(withdrawal.amount * 0.99, withdrawal.currency)}
            </span>
          </div>
        </div>

        <div className={styles.receiptFooter}>
          <span>SkilledProz · Global Skills Marketplace</span>
          <button className={styles.printBtn} onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorkerWithdrawals() {
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);

  // Withdraw form state
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState(PAYOUT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/payments/earnings")
      .then((r) => setEarnings(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const available = earnings?.totalEarned || 0;
  const inEscrow = earnings?.pendingEscrow || 0;

  function setField(k, v) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt > available) return setError("Amount exceeds available balance.");
    if (amt < 500) return setError("Minimum withdrawal is 500.");

    setSubmitting(true);
    // Simulate API call — replace with real payout endpoint
    await new Promise((r) => setTimeout(r, 2000));

    const newWithdrawal = {
      id: `wd-${Date.now()}`,
      amount: amt,
      currency: "NGN",
      method: method.label,
      destination: fields[method.fields[0]] || "—",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      completedAt: null,
      reference: `WD-${Date.now()}`,
    };

    setHistory((prev) => [newWithdrawal, ...prev]);
    setSuccess(
      `Withdrawal request of ${fmt(amt)} submitted. Processing within 1–3 business days.`,
    );
    setAmount("");
    setFields({});
    setSubmitting(false);
  }

  const totalWithdrawn = history
    .filter((w) => w.status === "COMPLETED")
    .reduce((s, w) => s + w.amount, 0);
  const pending = history
    .filter((w) => ["PENDING", "PROCESSING"].includes(w.status))
    .reduce((s, w) => s + w.amount, 0);

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Payouts</div>
            <h1 className={styles.title}>Withdrawal History</h1>
            <p className={styles.sub}>
              Request payouts and view your full withdrawal history
            </p>
          </div>
          <button
            className={styles.withdrawBtn}
            onClick={() => {
              setShowForm(true);
              setSuccess("");
              setError("");
            }}
            disabled={available <= 0}
          >
            ↑ Request Payout
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryAccent}`}>
            <span className={styles.summaryLabel}>Available to Withdraw</span>
            <span className={styles.summaryValue}>
              {loading ? "—" : fmt(available)}
            </span>
            <span className={styles.summarySub}>Ready now</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>In Escrow</span>
            <span className={styles.summaryValue}>
              {loading ? "—" : fmt(inEscrow)}
            </span>
            <span className={styles.summarySub}>Awaiting job completion</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Withdrawn</span>
            <span className={styles.summaryValue}>{fmt(totalWithdrawn)}</span>
            <span className={styles.summarySub}>All time</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Pending Payouts</span>
            <span className={styles.summaryValue}>{fmt(pending)}</span>
            <span className={styles.summarySub}>
              {
                history.filter((w) =>
                  ["PENDING", "PROCESSING"].includes(w.status),
                ).length
              }{" "}
              request(s)
            </span>
          </div>
        </div>

        {/* ── Withdrawal history table ── */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Withdrawal History</h2>
            <span className={styles.tableCount}>{history.length} records</span>
          </div>

          <div className={styles.tableHead}>
            <span>Reference</span>
            <span>Method</span>
            <span>Destination</span>
            <span>Requested</span>
            <span>Amount</span>
            <span>Status</span>
            <span></span>
          </div>

          <div className={styles.tableBody}>
            {history.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>💸</span>
                <p className={styles.emptyTitle}>No withdrawals yet</p>
                <p className={styles.emptySub}>
                  Request your first payout when you have available balance.
                </p>
              </div>
            ) : (
              history.map((w, i) => {
                const sm = WITHDRAWAL_STATUS[w.status] || {
                  label: w.status,
                  cls: "pending",
                };
                return (
                  <div
                    key={w.id}
                    className={styles.tableRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.refCell}>
                      <span className={styles.refText}>#{w.reference}</span>
                    </div>
                    <div className={styles.methodCell}>
                      <span className={styles.methodIcon}>
                        {PAYOUT_METHODS.find((m) => m.label === w.method)
                          ?.icon || "💳"}
                      </span>
                      <span className={styles.methodName}>{w.method}</span>
                    </div>
                    <div className={styles.destCell}>{w.destination}</div>
                    <div className={styles.dateCell}>
                      {timeAgo(w.createdAt)}
                    </div>
                    <div className={styles.amountCell}>
                      <span className={styles.amountVal}>
                        {fmt(w.amount, w.currency)}
                      </span>
                      {w.status === "COMPLETED" && (
                        <span className={styles.amountNet}>
                          Net {fmt(w.amount * 0.99, w.currency)}
                        </span>
                      )}
                    </div>
                    <div className={styles.statusCell}>
                      <span
                        className={`${styles.statusPill} ${styles[sm.cls]}`}
                      >
                        {sm.label}
                      </span>
                    </div>
                    <div className={styles.actionsCell}>
                      <button
                        className={styles.receiptBtn}
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
        </div>

        {/* ── Payout request modal ── */}
        {showForm && (
          <div
            className={styles.backdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <div className={styles.formModal}>
              <div className={styles.formModalHeader}>
                <h2 className={styles.formModalTitle}>Request Payout</h2>
                <button
                  className={styles.receiptClose}
                  onClick={() => setShowForm(false)}
                >
                  ✕
                </button>
              </div>

              {/* Balance */}
              <div className={styles.balanceBar}>
                <div>
                  <p className={styles.balanceLabel}>Available</p>
                  <p className={styles.balanceValue}>{fmt(available)}</p>
                </div>
                <div>
                  <p className={styles.balanceLabel}>In Escrow</p>
                  <p className={styles.balanceEscrow}>{fmt(inEscrow)}</p>
                </div>
                <div>
                  <p className={styles.balanceLabel}>Min. Withdrawal</p>
                  <p className={styles.balanceMin}>NGN 500</p>
                </div>
              </div>

              {success ? (
                <div className={styles.successBox}>
                  <span className={styles.successIcon}>✅</span>
                  <p className={styles.successMsg}>{success}</p>
                  <button
                    className={styles.doneBtn}
                    onClick={() => {
                      setShowForm(false);
                      setSuccess("");
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form className={styles.payoutForm} onSubmit={handleSubmit}>
                  {/* ── Payout method selector ── */}
                  <div className={styles.formSection}>
                    <p className={styles.formSectionLabel}>Payout Method</p>
                    <div className={styles.methodGrid}>
                      {PAYOUT_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`${styles.methodCard} ${method.id === m.id ? styles.methodCardActive : ""}`}
                          onClick={() => {
                            setMethod(m);
                            setFields({});
                          }}
                        >
                          <span className={styles.methodCardIcon}>
                            {m.icon}
                          </span>
                          <span className={styles.methodCardLabel}>
                            {m.label}
                          </span>
                          <span className={styles.methodCardRegion}>
                            {m.regions}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className={styles.methodDesc}>{method.desc}</p>
                  </div>

                  {/* ── Amount ── */}
                  <div className={styles.formSection}>
                    <p className={styles.formSectionLabel}>Amount</p>
                    <div className={styles.amountWrap}>
                      <span className={styles.amountCurrency}>NGN</span>
                      <input
                        className={styles.amountInput}
                        type="number"
                        placeholder="0.00"
                        min="500"
                        max={available}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.quickAmounts}>
                      {[0.25, 0.5, 0.75, 1].map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={styles.quickBtn}
                          onClick={() =>
                            setAmount(Math.floor(available * f).toString())
                          }
                        >
                          {f === 1 ? "Max" : `${f * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Method-specific fields ── */}
                  <div className={styles.formSection}>
                    <p className={styles.formSectionLabel}>Payout Details</p>
                    <div className={styles.fieldsGrid}>
                      {method.fields.map((f) => (
                        <div key={f} className={styles.formField}>
                          <label className={styles.formLabel}>
                            {FIELD_LABELS[f] || f} *
                          </label>
                          <input
                            className={styles.formInput}
                            placeholder={FIELD_PLACEHOLDERS[f] || ""}
                            value={fields[f] || ""}
                            onChange={(e) => setField(f, e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <div className={styles.errorBox}>⚠️ {error}</div>}

                  <div className={styles.formInfo}>
                    <span>ℹ️</span>
                    <p>
                      Payouts are processed within 1–3 business days. A 1%
                      processing fee applies. Crypto withdrawals are in
                      USDC/USDT equivalent.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={submitting || !amount}
                  >
                    {submitting ? (
                      <>
                        <span className={styles.spinner} /> Processing...
                      </>
                    ) : (
                      `↑ Request ${amount ? fmt(parseFloat(amount) || 0) : ""} Payout`
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── Receipt modal ── */}
        {receipt && (
          <ReceiptModal withdrawal={receipt} onClose={() => setReceipt(null)} />
        )}
      </div>
    </WorkerLayout>
  );
}
