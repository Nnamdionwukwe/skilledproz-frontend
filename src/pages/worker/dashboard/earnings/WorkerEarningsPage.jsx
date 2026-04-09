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

function fmt(n, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: CRYPTO.includes(currency) ? 2 : 0,
    }).format(n || 0);
  } catch {
    return `${currency} ${Number(n || 0).toFixed(2)}`;
  }
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CurrencyPill({ currency }) {
  const isCrypto = CRYPTO.includes(currency);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: isCrypto ? "rgba(139,92,246,0.12)" : "var(--orange-dim)",
        border: `1px solid ${isCrypto ? "rgba(139,92,246,0.25)" : "var(--orange-glow)"}`,
        color: isCrypto ? "#a78bfa" : "var(--orange)",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: "0.7rem",
        fontWeight: 700,
      }}
    >
      {isCrypto ? "₿" : "💱"} {currency}
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

  // Local fmt — uses filter currency if set, else dashboard currency
  function fmt(amount, currency) {
    const display =
      activeCurrency !== "ALL" ? activeCurrency : currency || dashboardCurrency;
    return ctxFmt(amount, display);
  }

  function load() {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: 20 });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (activeCurrency !== "ALL") q.set("currency", activeCurrency);

    api
      .get(`/workers/dashboard/earnings?${q}`)
      .then((r) => setData(r.data.data))
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to load earnings"),
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
  } = data || {};

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header with dashboard currency switch ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Earnings
            </h1>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-dim)",
                marginTop: 2,
              }}
            >
              Your completed payment history
            </p>
          </div>
          <DashboardCurrencySwitch />
        </div>

        {/* ── Summary strip ── */}
        <div className={styles.summaryStrip}>
          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Total Earned</div>
            <div className={`${styles.sumValue} ${styles.orange}`}>
              {ctxFmt(
                summary.totalEarned,
                activeCurrency !== "ALL" ? activeCurrency : dashboardCurrency,
              )}
            </div>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {activeCurrency !== "ALL"
                ? `filtered to ${activeCurrency}`
                : `displayed in ${dashboardCurrency}`}
            </span>
          </div>
          <div className={styles.sumDivider} />
          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Job Value</div>
            <div className={styles.sumValue}>
              {ctxFmt(
                summary.totalJobValue,
                activeCurrency !== "ALL" ? activeCurrency : dashboardCurrency,
              )}
            </div>
          </div>
          <div className={styles.sumDivider} />
          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Platform Fees</div>
            <div className={styles.sumValue}>
              {ctxFmt(
                summary.totalFees,
                activeCurrency !== "ALL" ? activeCurrency : dashboardCurrency,
              )}
            </div>
          </div>
          <div className={styles.sumDivider} />
          <div className={styles.sumItem}>
            <div className={styles.sumLabel}>Transactions</div>
            <div className={styles.sumValue}>{total}</div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className={styles.filtersRow}>
          {/* Currency tabs — show actual currencies transacted in */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Currency:
            </span>
            {/* ALL tab */}
            <button
              className={`${styles.currencyTab} ${activeCurrency === "ALL" ? styles.currencyTabActive : ""}`}
              onClick={() => {
                setActiveCurrency("ALL");
                setPage(1);
              }}
            >
              All
            </button>
            {/* One tab per currency the worker has earned in */}
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

          {/* Date range */}
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

        {/* ── Table (rest is unchanged) ── */}
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
                  ? `No ${activeCurrency} transactions.`
                  : "Complete jobs to start earning."}
              </p>
            </div>
          ) : (
            <>
              <div className={styles.tableHead}>
                <span>Job</span>
                <span>Client</span>
                <span>Date</span>
                <span>Currency</span>
                <span>Job Value</span>
                <span>You Earned</span>
                <span>Fee</span>
              </div>
              {payments.map((p, idx) => (
                <div
                  key={p.id}
                  className={styles.tableRow}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <div className={styles.jobCell}>
                    <div className={styles.jobTitle}>
                      {p.booking?.title ?? "—"}
                    </div>
                    <div className={styles.jobCat}>
                      {p.booking?.category?.icon} {p.booking?.category?.name}
                    </div>
                  </div>
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
                      {p.booking?.hirer?.firstName} {p.booking?.hirer?.lastName}
                    </span>
                  </div>
                  <div className={styles.dateCell}>{fmtDate(p.createdAt)}</div>
                  <div className={styles.currencyCell}>
                    <span
                      style={{
                        background: ["USDC", "USDT"].includes(p.currency)
                          ? "rgba(139,92,246,0.12)"
                          : "var(--orange-dim)",
                        border: `1px solid ${["USDC", "USDT"].includes(p.currency) ? "rgba(139,92,246,0.25)" : "var(--orange-glow)"}`,
                        color: ["USDC", "USDT"].includes(p.currency)
                          ? "#a78bfa"
                          : "var(--orange)",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                      }}
                    >
                      {CURRENCY_META[p.currency]?.symbol || ""} {p.currency}
                    </span>
                  </div>
                  <div className={styles.amountTotal}>
                    {ctxFmt(p.amount, p.currency)}
                  </div>
                  <div className={styles.amountEarned}>
                    {ctxFmt(p.workerPayout, p.currency)}
                  </div>
                  <div className={styles.amountFee}>
                    {ctxFmt(p.platformFee, p.currency)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
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
