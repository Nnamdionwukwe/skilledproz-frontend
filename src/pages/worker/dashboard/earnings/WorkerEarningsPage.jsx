// src/pages/worker/dashboard/earnings/Earnings.jsx
// Updated to reflect FEE_CONFIG Phase 1:
//   Worker keeps 100% of agreedRate (workerPayout = agreedRate)
//   Hirer pays 5% service fee on top — worker is never charged
//   Zero withdrawal fees in Phase 1

import { useEffect, useState } from "react";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import styles from "./Earnings.module.css";
import api from "../../../../lib/api";
import {
  useCurrency,
  CURRENCY_META,
} from "../../../../context/CurrencyContext";
import DashboardCurrencySwitch from "../../../../components/common/DashboardCurrencySwitch";

const CRYPTO = ["USDC", "USDT"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

// Worker earned = workerPayout = 100% of agreed rate in Phase 1
// platformFee   = hirer's 5% service fee (not deducted from worker)
// amount        = workerPayout + platformFee = total hirer was charged

export default function WorkerEarningsPage() {
  const { dashboardCurrency, fmt: ctxFmt } = useCurrency();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("ALL");
  const [page, setPage] = useState(1);

  // Resolved display currency for amounts
  function fmtAmt(amount, payCurrency) {
    const display =
      activeCurrency !== "ALL"
        ? activeCurrency
        : payCurrency || dashboardCurrency;
    return ctxFmt(amount, display);
  }

  function load() {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: 20 });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (activeCurrency !== "ALL") q.set("currency", activeCurrency);

    api;
    api
      .get(`/payments/earnings?${q}`)
      .then((r) => setData(r.data.data))
      .catch((e) =>
        setError(e.response?.data?.message ?? "Failed to load earnings"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
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

  // Derived: worker fee rate is always 0 in Phase 1
  // These are just for the banner copy
  const HIRER_FEE_DISPLAY = "5%";
  const WORKER_FEE_DISPLAY = "0%";

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Earnings</h1>
            <p className={styles.pageSub}>Your completed payment history</p>
          </div>
          <DashboardCurrencySwitch />
        </div>

        {/* ── Phase 1 fee banner ── */}
        <div className={styles.feeBanner}>
          <span className={styles.feeBannerIcon}>🎉</span>
          <div className={styles.feeBannerBody}>
            <span className={styles.feeBannerTitle}>
              You keep 100% of every job
            </span>
            <span className={styles.feeBannerSub}>
              SkilledProz charges hirers a {HIRER_FEE_DISPLAY} service fee on
              top of your rate. Zero fees are deducted from your earnings. Zero
              withdrawal fees.
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
              {ctxFmt(summary.totalEarned, displayCurrency)}
            </div>
            <span className={styles.sumNote}>
              {activeCurrency !== "ALL"
                ? `filtered · ${activeCurrency}`
                : `in ${dashboardCurrency}`}
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

          <div className={styles.sumDivider} />

          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Service Fees Collected</div>
            <div className={`${styles.sumValue} ${styles.dimVal}`}>
              {ctxFmt(summary.totalFees, displayCurrency)}
            </div>
            <span className={styles.sumNote}>
              from hirers only — not from you
            </span>
          </div>

          <div className={styles.sumDivider} />

          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Transactions</div>
            <div className={styles.sumValue}>{total}</div>
            <span className={styles.sumNote}>completed jobs</span>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className={styles.filtersRow}>
          <div className={styles.currencyTabsRow}>
            <span className={styles.filterLabel}>Currency:</span>
            <button
              className={`${styles.currencyTab} ${activeCurrency === "ALL" ? styles.currencyTabActive : ""}`}
              onClick={() => {
                setActiveCurrency("ALL");
                setPage(1);
              }}
            >
              All
            </button>
            {availableCurrencies.map((c) => (
              <button
                key={c}
                className={`${styles.currencyTab} ${activeCurrency === c ? styles.currencyTabActive : ""}`}
                onClick={() => {
                  setActiveCurrency(c);
                  setPage(1);
                }}
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
            />
          </div>
          {(from || to || activeCurrency !== "ALL") && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setFrom("");
                setTo("");
                setActiveCurrency("ALL");
                setPage(1);
              }}
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
            <div className={styles.errorState}>⚠️ {error}</div>
          ) : payments.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>₦</div>
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
                <span>Hirer's Fee</span>
              </div>

              {payments.map((p, idx) => {
                // workerPayout = agreedRate (100% in Phase 1)
                // platformFee  = hirer's 5% — NOT deducted from worker
                // amount       = workerPayout + platformFee (total hirer paid)
                const agreedRate = p.workerPayout; // what the job was worth
                const youEarned = p.workerPayout; // worker keeps it all
                const hirerFee = p.platformFee; // hirer paid this extra
                const workerFee = 0; // always 0 in Phase 1

                return (
                  <div
                    key={p.id}
                    className={styles.tableRow}
                    style={{ animationDelay: `${idx * 35}ms` }}
                  >
                    {/* Job */}
                    <div className={styles.jobCell}>
                      <div className={styles.jobTitle}>
                        {p.booking?.title ?? "—"}
                      </div>
                      <div className={styles.jobCat}>
                        {p.booking?.category?.icon} {p.booking?.category?.name}
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

                    {/* Agreed Rate (= workerPayout = what worker agreed to do job for) */}
                    <div className={styles.amountRate}>
                      {ctxFmt(agreedRate, p.currency)}
                    </div>

                    {/* You Earned — green, 100% badge */}
                    <div className={styles.earnedCell}>
                      <span className={styles.amountEarned}>
                        {ctxFmt(youEarned, p.currency)}
                      </span>
                      <span className={styles.earnedBadge}>100%</span>
                    </div>

                    {/* Hirer's fee — dimmed, clearly labelled as hirer's cost */}
                    <div className={styles.hirerFeeCell}>
                      <span className={styles.hirerFeeAmt}>
                        {ctxFmt(hirerFee, p.currency)}
                      </span>
                      <span className={styles.hirerFeeLabel}>hirer paid</span>
                    </div>
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
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
