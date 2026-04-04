import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

const STATUSES = ["ALL", "PENDING", "HELD", "RELEASED", "REFUNDED", "FAILED"];
const PROVIDERS = ["ALL", "stripe", "paystack"];

const STATUS_COLOR = {
  PENDING: "yellow",
  HELD: "indigo",
  RELEASED: "green",
  REFUNDED: "dim",
  FAILED: "red",
};

function fmt(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [provider, setProvider] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    load(1);
  }, [status, provider]);

  async function load(p) {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (status !== "ALL") params.status = status;
      if (provider !== "ALL") params.provider = provider;
      const res = await api.get("/payments", { params });
      setPayments(res.data.data);
      setTotal(res.data.pagination.total);
      setPages(res.data.pagination.pages);
      setPage(p);

      // Quick summary from first load
      if (p === 1 && status === "ALL" && provider === "ALL") {
        const released = res.data.data
          .filter((p) => p.status === "RELEASED")
          .reduce((s, p) => s + p.platformFee, 0);
        setSummary({ totalFees: released, count: res.data.pagination.total });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Finance</p>
            <h1 className={styles.pageTitle}>
              Payments
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className={styles.miniSummary}>
            <div className={styles.miniCard}>
              <span className={styles.miniIcon}>💰</span>
              <div>
                <p className={styles.miniVal}>
                  $
                  {summary.totalFees.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className={styles.miniLabel}>Platform fees collected</p>
              </div>
            </div>
            <div className={styles.miniCard}>
              <span className={styles.miniIcon}>📊</span>
              <div>
                <p className={styles.miniVal}>{summary.count}</p>
                <p className={styles.miniLabel}>Total transactions</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filterRow}>
          <div className={styles.filterBar}>
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
                onClick={() => setStatus(s)}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <select
            className={styles.providerSelect}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p === "ALL"
                  ? "All Providers"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Booking</span>
            <span>Hirer</span>
            <span>Worker</span>
            <span>Amount</span>
            <span>Platform Fee</span>
            <span>Provider</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          <div className={styles.tableBody}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className={styles.skRow} />
              ))
            ) : payments.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>💳</span>
                <p className={styles.emptyTitle}>No payments found</p>
              </div>
            ) : (
              payments.map((p, i) => {
                const color = STATUS_COLOR[p.status] || "dim";
                return (
                  <div
                    key={p.id}
                    className={styles.tableRow}
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <div className={styles.tdTitle}>
                      {p.booking?.title || p.bookingId?.slice(0, 8)}
                    </div>
                    <div className={styles.tdMeta}>
                      {p.booking?.hirer?.firstName} {p.booking?.hirer?.lastName}
                    </div>
                    <div className={styles.tdMeta}>
                      {p.booking?.worker?.firstName}{" "}
                      {p.booking?.worker?.lastName}
                    </div>
                    <div className={styles.tdBold}>
                      {fmt(p.amount, p.currency)}
                    </div>
                    <div className={styles.tdMeta}>
                      {fmt(p.platformFee, p.currency)}
                    </div>
                    <div>
                      <span className={styles.providerTag}>{p.provider}</span>
                    </div>
                    <div>
                      <span
                        className={`${styles.badge} ${styles[`badge_${color}`]}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className={styles.tdMeta}>
                      {new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} / {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
