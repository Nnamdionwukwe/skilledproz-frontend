import { useState, useEffect, useRef } from "react";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import api from "../../../../lib/api";
import styles from "./WorkerWithdrawals.module.css";

// ── Payout methods ─────────────────────────────────────────────────────────────
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
    regions: "SE Asia",
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
  swiftBic: "SWIFT / BIC",
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
  bankName: "e.g. First Bank, Barclays",
  accountNumber: "0123456789",
  accountName: "As on your account",
  swiftBic: "e.g. FBNINGLA",
  routingNumber: "9-digit routing",
  bankCountry: "e.g. Nigeria, UK",
  paystackEmail: "your@email.com",
  paypalEmail: "your@paypal.com",
  wiseEmail: "email or +1234567890",
  mobileNumber: "+234 800 000 0000",
  mobileProvider: "OPay / PalmPay...",
  mobileCountry: "Kenya / Tanzania...",
  walletAddress: "0x... or TRC20...",
  cryptoNetwork: "Ethereum / Tron",
};

const STATUS_META = {
  PENDING: { label: "Pending", cls: "pending" },
  PROCESSING: { label: "Processing", cls: "processing" },
  COMPLETED: { label: "Paid Out", cls: "paid" },
  FAILED: { label: "Failed", cls: "failed" },
  CANCELLED: { label: "Cancelled", cls: "cancelled" },
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

// ── Receipt modal ──────────────────────────────────────────────────────────────
function ReceiptModal({ withdrawal, currency, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  if (!withdrawal) return null;
  const sm = STATUS_META[withdrawal.status] || {
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
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.receiptTitle}>
          <h2 className={styles.receiptHeading}>Withdrawal Receipt</h2>
          <span className={`${styles.pill} ${styles[sm.cls]}`}>{sm.label}</span>
        </div>

        <div className={styles.receiptGrid}>
          <MetaItem label="Reference" value={`#${withdrawal.reference}`} />
          <MetaItem
            label="Requested"
            value={new Date(withdrawal.createdAt).toLocaleString("en-GB")}
          />
          {withdrawal.completedAt && (
            <MetaItem
              label="Completed"
              value={new Date(withdrawal.completedAt).toLocaleString("en-GB")}
            />
          )}
          <MetaItem
            label="Method"
            value={withdrawal.method?.replace(/_/g, " ")}
          />
        </div>

        <div className={styles.receiptDivider} />
        <div className={styles.receiptDest}>
          <span className={styles.metaLabel}>Paid to</span>
          <span className={styles.receiptDestVal}>
            {withdrawal.destination}
          </span>
        </div>
        <div className={styles.receiptDivider} />

        <div className={styles.receiptBreakdown}>
          <div className={styles.breakRow}>
            <span>Withdrawal amount</span>
            <span>{fmt(withdrawal.amount, withdrawal.currency)}</span>
          </div>
          <div className={styles.breakRow}>
            <span>Processing fee (1%)</span>
            <span className={styles.feeText}>
              − {fmt(withdrawal.amount * 0.01, withdrawal.currency)}
            </span>
          </div>
          <div className={`${styles.breakRow} ${styles.breakTotal}`}>
            <span>Net payout</span>
            <span className={styles.breakTotalAmt}>
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

function MetaItem({ label, value }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorkerWithdrawals() {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState(PAYOUT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  async function loadData(p = 1) {
    setLoading(true);
    try {
      const res = await api.get(`/payments/withdrawals?page=${p}&limit=15`);
      setHistory(res.data.data.withdrawals);
      setBalance(res.data.data.balance);
      setPages(res.data.data.pages);
      setPage(p);
    } catch {
      setError("Failed to load withdrawal data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function setField(k, v) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt < 500) return setError("Minimum withdrawal is 500.");
    if (amt > (balance?.available || 0))
      return setError("Amount exceeds available balance.");

    // Build destination label from fields
    const dest = fields[method.fields[0]] || "—";

    setSubmitting(true);
    try {
      await api.post("/payments/withdraw", {
        amount: amt,
        currency: "NGN",
        method: method.id,
        destination: dest,
        details: fields,
      });
      setSuccess(
        `Withdrawal of ${fmt(amt)} submitted. Processing within 1–3 business days.`,
      );
      setAmount("");
      setFields({});
      loadData(1); // refresh history
    } catch (e) {
      setError(
        e.response?.data?.message || "Withdrawal failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const available = balance?.available || 0;

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Earnings & Payouts</div>
            <h1 className={styles.title}>Your Wallet</h1>
            <p className={styles.sub}>
              Track earnings, escrows, and withdraw funds
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
            ↑ Withdraw Funds
          </button>
        </div>

        {/* Summary cards */}
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
              {loading ? "—" : fmt(balance?.inEscrow || 0)}
            </span>
            <span className={styles.summarySub}>Awaiting completion</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Withdrawn</span>
            <span className={styles.summaryValue}>
              {loading ? "—" : fmt(balance?.totalWithdrawn || 0)}
            </span>
            <span className={styles.summarySub}>All time</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Pending Payouts</span>
            <span className={styles.summaryValue}>
              {loading ? "—" : fmt(balance?.pendingPayout || 0)}
            </span>
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

        {/* History table */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Withdrawal History</h2>
            <span className={styles.tableCount}>{history.length} records</span>
          </div>

          {/* Desktop head */}
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
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className={styles.skRow} />
              ))
            ) : history.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>💸</span>
                <p className={styles.emptyTitle}>No withdrawals yet</p>
                <p className={styles.emptySub}>
                  Request your first payout when you have available balance.
                </p>
              </div>
            ) : (
              history.map((w, i) => {
                const sm = STATUS_META[w.status] || {
                  label: w.status,
                  cls: "pending",
                };
                const methodMeta = PAYOUT_METHODS.find(
                  (m) => m.id === w.method,
                );
                return (
                  <div
                    key={w.id}
                    className={styles.tableRow}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    {/* Mobile: stacked layout */}
                    <div className={styles.rowMobileTop}>
                      <div className={styles.refCell}>
                        <span className={styles.refText}>#{w.reference}</span>
                        <span className={styles.dateCell}>
                          {timeAgo(w.createdAt)}
                        </span>
                      </div>
                      <span className={`${styles.pill} ${styles[sm.cls]}`}>
                        {sm.label}
                      </span>
                    </div>

                    {/* Desktop cells */}
                    <div className={styles.methodCell}>
                      <span className={styles.methodIcon}>
                        {methodMeta?.icon || "💳"}
                      </span>
                      <span className={styles.methodName}>
                        {methodMeta?.label || w.method}
                      </span>
                    </div>
                    <div className={styles.destCell}>{w.destination}</div>
                    <div className={styles.dateCellDesktop}>
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
                    <div className={styles.statusCellDesktop}>
                      <span className={`${styles.pill} ${styles[sm.cls]}`}>
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

          {/* Pagination */}
          {pages > 1 && (
            <div className={styles.pager}>
              <button
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => loadData(page - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                {page} / {pages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page === pages}
                onClick={() => loadData(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Payout request modal */}
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
                  className={styles.modalClose}
                  onClick={() => setShowForm(false)}
                >
                  ✕
                </button>
              </div>

              {/* Balance bar */}
              <div className={styles.balanceBar}>
                <div>
                  <p className={styles.balanceLabel}>Available</p>
                  <p className={styles.balanceValue}>{fmt(available)}</p>
                </div>
                <div>
                  <p className={styles.balanceLabel}>In Escrow</p>
                  <p className={styles.balanceEscrow}>
                    {fmt(balance?.inEscrow || 0)}
                  </p>
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
                  {/* Method selector */}
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

                  {/* Amount */}
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

                  {/* Method fields */}
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
                      Payouts processed within 1–3 business days. 1% processing
                      fee applies. Crypto payouts are USDC/USDT equivalent.
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

        {receipt && (
          <ReceiptModal withdrawal={receipt} onClose={() => setReceipt(null)} />
        )}
      </div>
    </WorkerLayout>
  );
}
