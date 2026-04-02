import { useState, useEffect } from "react";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import api from "../../../../lib/api";
import styles from "./WorkerPayouts.module.css";

function fmt(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function StatusBadge({ status }) {
  const map = {
    RELEASED: { label: "Paid", cls: "paid" },
    HELD: { label: "In Escrow", cls: "escrow" },
    PENDING: { label: "Pending", cls: "pending" },
    REFUNDED: { label: "Refunded", cls: "refunded" },
    FAILED: { label: "Failed", cls: "failed" },
  };
  const s = map[status] || { label: status, cls: "pending" };
  return (
    <span className={`${styles.statusBadge} ${styles[s.cls]}`}>{s.label}</span>
  );
}

function StatCard({ label, value, sub, icon, accent, delay }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`stat_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function WorkerPayouts() {
  const [earnings, setEarnings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Withdrawal modal
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState("bank");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountDetails, setAccountDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    mobileNumber: "",
    mobileProvider: "",
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  const limit = 10;
  const pages = Math.ceil(total / limit);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [earningsRes, paymentsRes] = await Promise.all([
          api.get("/payments/earnings"),
          api.get(`/workers/dashboard/earnings?page=1&limit=${limit}`),
        ]);
        setEarnings(earningsRes.data.data);
        setPayments(paymentsRes.data.data.payments || []);
        setTotal(paymentsRes.data.data.total || 0);
      } catch {
        setError("Failed to load earnings data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadPage = async (p) => {
    setLoadingMore(true);
    try {
      const res = await api.get(
        `/workers/dashboard/earnings?page=${p}&limit=${limit}`,
      );
      setPayments(res.data.data.payments || []);
      setPage(p);
    } catch {}
    setLoadingMore(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError("Please enter a valid amount.");
      return;
    }
    if (parseFloat(withdrawAmount) > (earnings?.totalEarned || 0)) {
      setWithdrawError("Amount exceeds your available balance.");
      return;
    }
    setWithdrawing(true);
    // Simulate withdrawal request (real implementation would call a payout endpoint)
    await new Promise((r) => setTimeout(r, 1800));
    setWithdrawing(false);
    setWithdrawSuccess(
      `Withdrawal request of ${fmt(parseFloat(withdrawAmount))} submitted. Processing within 1–3 business days.`,
    );
    setWithdrawAmount("");
  };

  const available = earnings?.totalEarned || 0;
  const inEscrow = earnings?.pendingEscrow || 0;

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Earnings & Payouts</div>
            <h1 className={styles.title}>Your Wallet</h1>
            <p className={styles.sub}>
              Track earnings, escrow, and withdraw your funds
            </p>
          </div>
          <button
            className={styles.withdrawTrigger}
            onClick={() => {
              setShowWithdraw(true);
              setWithdrawSuccess("");
              setWithdrawError("");
            }}
            disabled={available <= 0}
          >
            <span className={styles.withdrawIcon}>↑</span>
            Withdraw Funds
          </button>
        </div>

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ height: 110 }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className={styles.statsGrid}>
              <StatCard
                label="Available Balance"
                value={fmt(available)}
                sub="Ready to withdraw"
                icon="💰"
                accent="orange"
                delay={0}
              />
              <StatCard
                label="In Escrow"
                value={fmt(inEscrow)}
                sub="Awaiting job completion"
                icon="🔒"
                delay={0.05}
              />
              <StatCard
                label="Total Earned"
                value={fmt(available + inEscrow)}
                sub="All time"
                icon="📈"
                accent="green"
                delay={0.1}
              />
              <StatCard
                label="Transactions"
                value={total}
                sub="Payment records"
                icon="🧾"
                delay={0.15}
              />
            </div>

            {/* Escrow info banner */}
            {inEscrow > 0 && (
              <div className={styles.escrowBanner}>
                <span className={styles.escrowBannerIcon}>🔒</span>
                <div>
                  <p className={styles.escrowBannerTitle}>
                    {fmt(inEscrow)} is held in escrow
                  </p>
                  <p className={styles.escrowBannerSub}>
                    Funds are released automatically once the hirer confirms job
                    completion.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Transaction history */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Transaction History</h2>
            {total > 0 && (
              <span className={styles.sectionCount}>{total} total</span>
            )}
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          {loading ? (
            <div className={styles.txList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={styles.skeleton}
                  style={{ height: 76 }}
                />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🧾</span>
              <p className={styles.emptyTitle}>No transactions yet</p>
              <p className={styles.emptySub}>
                Completed jobs with released payments will appear here.
              </p>
            </div>
          ) : (
            <div className={styles.txList}>
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className={styles.txRow}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className={styles.txLeft}>
                    <div
                      className={`${styles.txIcon} ${p.status === "RELEASED" ? styles.txIconPaid : p.status === "HELD" ? styles.txIconEscrow : styles.txIconDefault}`}
                    >
                      {p.status === "RELEASED"
                        ? "✓"
                        : p.status === "HELD"
                          ? "🔒"
                          : "·"}
                    </div>
                    <div>
                      <p className={styles.txTitle}>
                        {p.booking?.title || "Booking payment"}
                      </p>
                      <p className={styles.txMeta}>
                        {p.booking?.category?.name}
                        {p.booking?.hirer && (
                          <>
                            {" "}
                            · {p.booking.hirer.firstName}{" "}
                            {p.booking.hirer.lastName}
                          </>
                        )}
                      </p>
                      <p className={styles.txDate}>
                        {new Date(p.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(p.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className={styles.txRight}>
                    <p
                      className={`${styles.txAmount} ${p.status === "RELEASED" ? styles.txAmountPaid : ""}`}
                    >
                      {p.status === "RELEASED" ? "+" : ""}
                      {fmt(p.workerPayout, p.currency)}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page === 1 || loadingMore}
                onClick={() => loadPage(page - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                {page} of {pages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page === pages || loadingMore}
                onClick={() => loadPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowWithdraw(false);
            }}
          >
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Withdraw Funds</h2>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowWithdraw(false)}
                >
                  ×
                </button>
              </div>

              {/* Balance display */}
              <div className={styles.balanceBar}>
                <div>
                  <p className={styles.balanceLabel}>Available Balance</p>
                  <p className={styles.balanceValue}>{fmt(available)}</p>
                </div>
                <div>
                  <p className={styles.balanceLabel}>In Escrow</p>
                  <p className={styles.balanceEscrow}>{fmt(inEscrow)}</p>
                </div>
              </div>

              {withdrawSuccess ? (
                <div className={styles.withdrawSuccessBox}>
                  <span className={styles.successIcon}>✅</span>
                  <p className={styles.successMsg}>{withdrawSuccess}</p>
                  <button
                    className={styles.doneBtn}
                    onClick={() => {
                      setShowWithdraw(false);
                      setWithdrawSuccess("");
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form className={styles.withdrawForm} onSubmit={handleWithdraw}>
                  {/* Method selector */}
                  <div className={styles.methodSelector}>
                    <button
                      type="button"
                      className={`${styles.methodBtn} ${withdrawMethod === "bank" ? styles.methodBtnActive : ""}`}
                      onClick={() => setWithdrawMethod("bank")}
                    >
                      <span>🏦</span>
                      <span>Bank Transfer</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.methodBtn} ${withdrawMethod === "mobile" ? styles.methodBtnActive : ""}`}
                      onClick={() => setWithdrawMethod("mobile")}
                    >
                      <span>📱</span>
                      <span>Mobile Money</span>
                    </button>
                  </div>

                  {/* Amount */}
                  <div className={styles.field}>
                    <label className={styles.label}>Amount *</label>
                    <div className={styles.amountWrap}>
                      <span className={styles.amountPrefix}>NGN</span>
                      <input
                        className={styles.amountInput}
                        type="number"
                        placeholder="0.00"
                        min="100"
                        max={available}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                    </div>
                    <div className={styles.quickAmounts}>
                      {[0.25, 0.5, 0.75, 1].map((frac) => (
                        <button
                          key={frac}
                          type="button"
                          className={styles.quickBtn}
                          onClick={() =>
                            setWithdrawAmount(
                              Math.floor(available * frac).toString(),
                            )
                          }
                        >
                          {frac === 1 ? "Max" : `${frac * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bank fields */}
                  {withdrawMethod === "bank" && (
                    <>
                      <div className={styles.field}>
                        <label className={styles.label}>Bank Name *</label>
                        <input
                          className={styles.input}
                          placeholder="e.g. First Bank, GTBank, Zenith"
                          value={accountDetails.bankName}
                          onChange={(e) =>
                            setAccountDetails((p) => ({
                              ...p,
                              bankName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className={styles.fieldGrid}>
                        <div className={styles.field}>
                          <label className={styles.label}>
                            Account Number *
                          </label>
                          <input
                            className={styles.input}
                            placeholder="0123456789"
                            value={accountDetails.accountNumber}
                            onChange={(e) =>
                              setAccountDetails((p) => ({
                                ...p,
                                accountNumber: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label}>Account Name *</label>
                          <input
                            className={styles.input}
                            placeholder="As on bank account"
                            value={accountDetails.accountName}
                            onChange={(e) =>
                              setAccountDetails((p) => ({
                                ...p,
                                accountName: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Mobile money fields */}
                  {withdrawMethod === "mobile" && (
                    <>
                      <div className={styles.field}>
                        <label className={styles.label}>Provider *</label>
                        <select
                          className={styles.input}
                          value={accountDetails.mobileProvider}
                          onChange={(e) =>
                            setAccountDetails((p) => ({
                              ...p,
                              mobileProvider: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select provider</option>
                          <option value="OPAY">OPay</option>
                          <option value="PALMPAY">PalmPay</option>
                          <option value="MPESA">M-Pesa</option>
                          <option value="MOMO">MTN MoMo</option>
                          <option value="AIRTEL_MONEY">Airtel Money</option>
                          <option value="WAVE">Wave</option>
                          <option value="BKASH">bKash</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Mobile Number *</label>
                        <input
                          className={styles.input}
                          placeholder="+234 800 000 0000"
                          type="tel"
                          value={accountDetails.mobileNumber}
                          onChange={(e) =>
                            setAccountDetails((p) => ({
                              ...p,
                              mobileNumber: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {withdrawError && (
                    <div className={styles.withdrawErrorBox}>
                      <span>⚠️</span> {withdrawError}
                    </div>
                  )}

                  <div className={styles.withdrawInfo}>
                    <span>ℹ️</span>
                    <p>
                      Withdrawals are processed within 1–3 business days. A
                      processing fee of 1% may apply depending on your region.
                    </p>
                  </div>

                  <button
                    className={styles.withdrawSubmit}
                    type="submit"
                    disabled={withdrawing || !withdrawAmount}
                  >
                    {withdrawing ? (
                      <>
                        <span className={styles.spinner} /> Processing...
                      </>
                    ) : (
                      <>
                        ↑ Request Withdrawal{" "}
                        {withdrawAmount
                          ? `of ${fmt(parseFloat(withdrawAmount) || 0)}`
                          : ""}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
