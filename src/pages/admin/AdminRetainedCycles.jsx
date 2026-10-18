import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { retainedStaffApi } from "../../lib/retainedStaffApi";
import Skeleton from "../../components/common/Skeleton";
import styles from "./AdminRetainedCycles.module.css";
import {
  FiRefreshCw,
  FiSearch,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronRight,
  FiPlay,
} from "react-icons/fi";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "AWAITING_PAYMENT", label: "Awaiting Payment" },
  { value: "HELD", label: "In Escrow" },
  { value: "PARTIALLY_RELEASED", label: "Partially Released" },
  { value: "RELEASED", label: "Released" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_META = {
  AWAITING_PAYMENT: { color: "yellow", icon: FiClock },
  HELD: { color: "orange", icon: FiDollarSign },
  PARTIALLY_RELEASED: { color: "orange", icon: FiPlay },
  RELEASED: { color: "green", icon: FiCheckCircle },
  CANCELLED: { color: "red", icon: FiAlertCircle },
  FAILED: { color: "red", icon: FiAlertCircle },
};

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminRetainedCycles() {
  const [cycles, setCycles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cronLoading, setCronLoading] = useState(false);

  const loadCycles = useCallback(() => {
    setLoading(true);
    retainedStaffApi
      .adminListCycles({ page, limit: 20, status: status || undefined })
      .then((res) => {
        setCycles(res.data.data.cycles);
        setTotal(res.data.data.meta.total);
        setTotalPages(res.data.data.meta.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    // Reuse list endpoint with limit=1 to fetch status counts from meta
    retainedStaffApi
      .adminListStaff({ limit: 1 })
      .then(() => {
        // Fallback — compute from current cycles page
        setStats({});
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadCycles();
  };

  const handleRunCron = async () => {
    setCronLoading(true);
    try {
      const res = await retainedStaffApi.adminListCycles({});
      // The admin trigger uses a dedicated endpoint on your routes:
      // POST /api/admin/retained-cycles/run-cron
      await fetch("/api/admin/retained-cycles/run-cron", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      loadCycles();
    } catch {
      // ignore
    } finally {
      setCronLoading(false);
    }
  };

  // Derived counts from current page
  const statusCounts = cycles.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Retained Payroll Cycles</h1>
            <p className={styles.subtitle}>
              Global ledger of all payroll cycles across the platform
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.cronBtn}
              onClick={handleRunCron}
              disabled={cronLoading}
            >
              {cronLoading ? (
                <FiRefreshCw className={styles.spin} />
              ) : (
                <FiPlay />
              )}
              {cronLoading ? "Running…" : "Run Cron Now"}
            </button>
            <button
              className={styles.refreshBtn}
              onClick={loadCycles}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? styles.spin : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI row */}
        {statsLoading ? (
          <Skeleton.KpiRow count={4} className={styles.kpiRow} />
        ) : (
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.yellow}`}>
                <FiClock />
              </div>
              <div>
                <p className={styles.kpiLabel}>Awaiting Payment</p>
                <p className={styles.kpiValue}>
                  {statusCounts.AWAITING_PAYMENT || 0}
                </p>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.orange}`}>
                <FiDollarSign />
              </div>
              <div>
                <p className={styles.kpiLabel}>In Escrow</p>
                <p className={styles.kpiValue}>{statusCounts.HELD || 0}</p>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.green}`}>
                <FiCheckCircle />
              </div>
              <div>
                <p className={styles.kpiLabel}>Released</p>
                <p className={styles.kpiValue}>{statusCounts.RELEASED || 0}</p>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.dim}`}>
                <FiAlertCircle />
              </div>
              <div>
                <p className={styles.kpiLabel}>Total</p>
                <p className={styles.kpiValue}>{total}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.statusTabs}>
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                className={`${styles.tabBtn} ${
                  status === t.value ? styles.tabActive : ""
                }`}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by worker, hirer, or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {loading ? (
            <Skeleton.Table rows={8} cols={6} />
          ) : cycles.length === 0 ? (
            <div className={styles.empty}>
              <FiDollarSign size={48} />
              <h3>No cycles found</h3>
              <p>Payroll cycles will appear here when hirers create them.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Hirer</th>
                  <th>Label</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => {
                  const meta =
                    STATUS_META[cycle.status] || STATUS_META.AWAITING_PAYMENT;
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={cycle.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {cycle.member?.worker?.firstName?.[0] || "?"}
                          </div>
                          <div>
                            <p className={styles.name}>
                              {cycle.member?.worker?.firstName}{" "}
                              {cycle.member?.worker?.lastName}
                            </p>
                            <p className={styles.email}>
                              {cycle.member?.jobTitle}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {cycle.member?.hirer?.firstName?.[0] || "?"}
                          </div>
                          <div>
                            <p className={styles.name}>
                              {cycle.member?.hirer?.firstName}{" "}
                              {cycle.member?.hirer?.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className={styles.label}>{cycle.label || "—"}</p>
                      </td>
                      <td>
                        <p className={styles.period}>
                          {formatDate(cycle.periodStart)} —{" "}
                          {formatDate(cycle.periodEnd)}
                        </p>
                      </td>
                      <td>
                        <p className={styles.amount}>
                          {formatMoney(cycle.netAmount, cycle.currency)}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[meta.color]}`}
                        >
                          <StatusIcon size={10} />
                          {cycle.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/retained-cycles/${cycle.id}`}
                          className={styles.viewBtn}
                        >
                          <FiChevronRight />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
