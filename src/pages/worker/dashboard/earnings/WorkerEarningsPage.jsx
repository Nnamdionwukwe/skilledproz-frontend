// src/pages/worker/dashboard/earnings/Earnings.jsx
// Updated for partial escrow release:
//   • Payments appear as soon as they have ANY released funds (partial or full)
//   • "You Earned" shows the amount actually released so far (releasedAmount)
//   • The full contract value is shown as "Agreed Rate"
//   • Any amount still in escrow is shown alongside the earned figure
//   • Worker fee is still 0% — worker keeps 100% of everything released
//
// Backend fields consumed (from GET /api/payments/earnings):
//   p.workerPayout      → full contract value (rate × duration)
//   p.earned            → releasedAmount (what the worker has received)
//   p.remaining         → still in escrow for this payment
//   p.isFullyReleased   → true when releasedAmount === workerPayout
//   p.releaseCount      → number of releases recorded
//   p.releases          → array of individual release rows
//   summary.totalEarned    → Σ releasedAmount
//   summary.totalPromised  → Σ workerPayout (full contract value)
//   summary.totalJobValue  → Σ amount (what hirers were charged)
//   summary.totalFees      → Σ platformFee (hirer-side service fee)

import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiClipboard,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import styles from "./Earnings.module.css";
import api from "../../../../lib/api";
import {
  useCurrency,
  CURRENCY_META,
} from "../../../../context/CurrencyContext";
import DashboardCurrencySwitch from "../../../../components/common/DashboardCurrencySwitch";
import tracker from "../../../../lib/analytics/tracker";
import { getHirerFeeRate } from "../../../../utils/pricing";

const CRYPTO = ["USDC", "USDT"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Currency pill
function CurrencyPill({ currency }) {
  const isCrypto = CRYPTO.includes(currency);
  const meta = CURRENCY_META[currency];
  return (
    <span className={isCrypto ? styles.cryptoPill : styles.currencyPill}>
      {isCrypto ? "₿" : (meta?.symbol ?? "💱")} {currency}
    </span>
  );
}

export default function WorkerEarningsPage() {
  const { dashboardCurrency, fmt: ctxFmt } = useCurrency();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.workerEarnings.view", {
      dashboardCurrency,
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: 20 });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (activeCurrency !== "ALL") q.set("currency", activeCurrency);

    api
      .get(`/payments/earnings?${q}`)
      .then((r) => {
        setData(r.data.data);
        tracker.track("workerEarnings.loaded", {
          page,
          activeCurrency,
          hasDateFilter: !!(from || to),
          transactionCount: r.data.data?.payments?.length || 0,
          totalTransactions: r.data.data?.total || 0,
          currenciesAvailable: r.data.data?.availableCurrencies?.length || 0,
        });
      })
      .catch((e) => {
        setError(e.response?.data?.message ?? "Failed to load earnings");
        tracker.track("workerEarnings.load.failed", {
          page,
          activeCurrency,
          reason: e.response?.data?.message ?? "unknown",
        });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, activeCurrency, page]);

  const {
    payments = [],
    total = 0,
    pages = 1,
    summary = {},
    availableCurrencies = [],
  } = data ?? {};

  const displayCurrency =
    activeCurrency !== "ALL" ? activeCurrency : dashboardCurrency;

  // ✅ Currency-aware fee percent for the banner.
  // If a specific currency is selected → that currency's rate.
  // If "ALL" is selected → show a two-tier label ("2% – 5%") because the
  // worker may have earnings in both NGN and foreign currencies.
  const ngnFeePercent = Math.round(getHirerFeeRate("NGN") * 100);
  const foreignFeePercent = Math.round(getHirerFeeRate("USD") * 100);

  const isSingleCurrency = activeCurrency !== "ALL";
  const singleCurrencyFeePercent = isSingleCurrency
    ? Math.round(getHirerFeeRate(activeCurrency) * 100)
    : null;

  const HIRER_FEE_DISPLAY = isSingleCurrency
    ? `${singleCurrencyFeePercent}%`
    : ngnFeePercent === foreignFeePercent
      ? `${ngnFeePercent}%`
      : `${ngnFeePercent}% – ${foreignFeePercent}%`;

  const WORKER_FEE_DISPLAY = "0%";

  // Totals across the whole filtered set
  const totalEarned = Number(summary.totalEarned) || 0;
  const totalPromised = Number(summary.totalPromised) || 0;
  const stillInEscrow = Math.max(0, totalPromised - totalEarned);

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Earnings</h1>
            <p className={styles.pageSub}>Your payment history</p>
          </div>
          <DashboardCurrencySwitch />
        </div>

        {/* ── Phase 1 fee banner ── */}
        <div className={styles.feeBanner}>
          <span className={styles.feeBannerIcon}>
            <FiCheckCircle size={22} />
          </span>
          <div className={styles.feeBannerBody}>
            <span className={styles.feeBannerTitle}>
              You keep 100% of every job
            </span>
            <span className={styles.feeBannerSub}>
              SkilledProz charges hirers a {HIRER_FEE_DISPLAY} service fee on
              top of your rate (NGN: {ngnFeePercent}%, other currencies:{" "}
              {foreignFeePercent}%). Zero fees are deducted from your earnings.
              Zero withdrawal fees. Partial releases credit your wallet
              immediately.
            </span>
          </div>
          <div className={styles.feeBannerPills}>
            <span className={styles.feePillGreen}>
              Worker fee: {WORKER_FEE_DISPLAY}
            </span>
            <span className={styles.feePillOrange}>
              Hirer fee: {HIRER_FEE_DISPLAY}
            </span>
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div className={styles.summaryStrip}>
          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>You Earned</div>
            <div className={`${styles.sumValue} ${styles.orange}`}>
              {ctxFmt(totalEarned, displayCurrency)}
            </div>
            <span className={styles.sumNote}>
              {activeCurrency !== "ALL"
                ? `filtered · ${activeCurrency}`
                : `in ${dashboardCurrency}`}
            </span>
          </div>

          <div className={styles.sumDivider} />

          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Still in Escrow</div>
            <div className={styles.sumValue}>
              {ctxFmt(stillInEscrow, displayCurrency)}
            </div>
            <span className={styles.sumNote}>awaiting hirer release</span>
          </div>

          <div className={styles.sumDivider} />

          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Total Contract Value</div>
            <div className={`${styles.sumValue} ${styles.dimVal}`}>
              {ctxFmt(totalPromised, displayCurrency)}
            </div>
            <span className={styles.sumNote}>
              across {total} payment{total === 1 ? "" : "s"}
            </span>
          </div>

          <div className={styles.sumDivider} />

          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Hirers Paid Total</div>
            <div className={styles.sumValue}>
              {ctxFmt(summary.totalJobValue, displayCurrency)}
            </div>
            <span className={styles.sumNote}>
              incl. {HIRER_FEE_DISPLAY} service fee
            </span>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className={styles.filtersRow}>
          <div className={styles.currencyTabsRow}>
            <span className={styles.filterLabel}>Currency:</span>
            <button
              className={`${styles.currencyTab} ${
                activeCurrency === "ALL" ? styles.currencyTabActive : ""
              }`}
              onClick={() => {
                setActiveCurrency("ALL");
                setPage(1);
                tracker.track("workerEarnings.currency.filter", {
                  currency: "ALL",
                });
              }}
              data-track-id="workerEarnings.currency.ALL"
            >
              All
            </button>
            {availableCurrencies.map((c) => (
              <button
                key={c}
                className={`${styles.currencyTab} ${
                  activeCurrency === c ? styles.currencyTabActive : ""
                }`}
                onClick={() => {
                  setActiveCurrency(c);
                  setPage(1);
                  tracker.track("workerEarnings.currency.filter", {
                    currency: c,
                  });
                }}
                data-track-id={`workerEarnings.currency.${c}`}
              >
                {CURRENCY_META[c]?.symbol || ""} {c}
              </button>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>From</span>
            <input
              type="date"
              className={styles.filterInput}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              data-track-id="workerEarnings.date.from"
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>To</span>
            <input
              type="date"
              className={styles.filterInput}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              data-track-id="workerEarnings.date.to"
            />
          </div>
          {(from || to || activeCurrency !== "ALL") && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                tracker.track("workerEarnings.filters.cleared", {
                  hadFrom: !!from,
                  hadTo: !!to,
                  currency: activeCurrency,
                });
                setFrom("");
                setTo("");
                setActiveCurrency("ALL");
                setPage(1);
              }}
              data-track-id="workerEarnings.filters.clear"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className={styles.tableCard}>
          {loading ? (
            <div className={styles.skeletonWrap}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skRow} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <FiAlertTriangle size={20} />
              <span>{error}</span>
            </div>
          ) : payments.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FiDollarSign size={40} />
              </div>
              <p className={styles.emptyTitle}>No payments found</p>
              <p className={styles.emptyText}>
                {activeCurrency !== "ALL"
                  ? `No ${activeCurrency} transactions in this period.`
                  : "Complete jobs to start earning."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop column headers */}
              <div className={styles.tableHead}>
                <span>Job</span>
                <span>Client</span>
                <span>Date</span>
                <span>Currency</span>
                <span>Agreed Rate</span>
                <span>You Earned ✓</span>
                <span>In Escrow</span>
              </div>

              {payments.map((p, idx) => {
                const agreedRate = Number(p.workerPayout) || 0;
                const youEarned = Number(p.earned) || 0;
                const inEscrow = Number(p.remaining) || 0;
                const hirerFee = Number(p.platformFee) || 0;
                const releaseCount = Number(p.releaseCount) || 0;
                const isFullyReleased = !!p.isFullyReleased;
                const hasPartial = !isFullyReleased && youEarned > 0;
                const isExpanded = expandedRow === p.id;
                const releaseRows = Array.isArray(p.releases) ? p.releases : [];

                return (
                  <div
                    key={p.id}
                    className={`${styles.tableRow} ${
                      releaseRows.length > 0 ? styles.tableRowExpandable : ""
                    }`}
                    style={{ animationDelay: `${idx * 35}ms` }}
                  >
                    <div className={styles.rowMain}>
                      {/* Job */}
                      <div className={styles.jobCell}>
                        <div className={styles.jobTitle}>
                          {p.booking?.title ?? "—"}
                        </div>
                        <div className={styles.jobCat}>
                          {p.booking?.category?.icon}{" "}
                          {p.booking?.category?.name}
                          {releaseCount > 1 && <> · {releaseCount} releases</>}
                        </div>
                      </div>

                      {/* Client */}
                      <div className={styles.hirerCell}>
                        <div className={styles.hirerAvatar}>
                          {p.booking?.hirer?.avatar ? (
                            <img src={p.booking.hirer.avatar} alt="" />
                          ) : (
                            <span>
                              {p.booking?.hirer?.firstName?.[0]}
                              {p.booking?.hirer?.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        <span>
                          {p.booking?.hirer?.firstName}{" "}
                          {p.booking?.hirer?.lastName}
                        </span>
                      </div>

                      {/* Date */}
                      <div className={styles.dateCell}>
                        {fmtDate(p.createdAt)}
                      </div>

                      {/* Currency */}
                      <div className={styles.currencyCell}>
                        <CurrencyPill currency={p.currency} />
                      </div>

                      {/* Agreed Rate */}
                      <div className={styles.amountRate}>
                        {ctxFmt(agreedRate, p.currency)}
                      </div>

                      {/* You Earned — with a badge that reflects the state */}
                      <div className={styles.earnedCell}>
                        <span className={styles.amountEarned}>
                          {ctxFmt(youEarned, p.currency)}
                        </span>
                        {isFullyReleased ? (
                          <span className={styles.earnedBadge}>
                            Paid in full
                          </span>
                        ) : hasPartial ? (
                          <span className={styles.earnedBadgePartial}>
                            Released so far
                          </span>
                        ) : null}
                      </div>

                      {/* In Escrow — shows remaining; if fully released,
                          shows hirer fee as a secondary line */}
                      <div className={styles.hirerFeeCell}>
                        {inEscrow > 0 ? (
                          <>
                            <span className={styles.hirerFeeAmt}>
                              {ctxFmt(inEscrow, p.currency)}
                            </span>
                            <span className={styles.hirerFeeLabel}>
                              in escrow
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={styles.hirerFeeAmt}>
                              {ctxFmt(hirerFee, p.currency)}
                            </span>
                            <span className={styles.hirerFeeLabel}>
                              hirer paid
                            </span>
                          </>
                        )}
                      </div>

                      {/* Expand toggle — only when there are releases to show */}
                      {releaseRows.length > 0 && (
                        <button
                          type="button"
                          className={styles.expandBtn}
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : p.id)
                          }
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? "Hide release history"
                              : "Show release history"
                          }
                        >
                          {isExpanded ? (
                            <FiChevronUp size={14} />
                          ) : (
                            <FiChevronDown size={14} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded release history */}
                    {isExpanded && releaseRows.length > 0 && (
                      <div className={styles.releaseHistory}>
                        <p className={styles.releaseHistoryTitle}>
                          Release history
                        </p>
                        <div className={styles.releaseHistoryList}>
                          {releaseRows.map((r) => (
                            <div key={r.id} className={styles.releaseRow}>
                              <span className={styles.releaseAmount}>
                                {ctxFmt(
                                  Number(r.amount) || 0,
                                  r.currency || p.currency,
                                )}
                              </span>
                              <span className={styles.releaseMeta}>
                                {fmtDateTime(r.createdAt)}
                                {r.note ? ` · ${r.note}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                tracker.track("workerEarnings.pagination.prev", {
                  fromPage: page,
                  toPage: page - 1,
                });
              }}
              data-track-id="workerEarnings.pagination.prev"
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => {
                setPage((p) => p + 1);
                tracker.track("workerEarnings.pagination.next", {
                  fromPage: page,
                  toPage: page + 1,
                });
              }}
              data-track-id="workerEarnings.pagination.next"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
