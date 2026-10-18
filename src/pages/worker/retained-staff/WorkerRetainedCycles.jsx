import { useState, useEffect, useCallback } from "react";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import Skeleton from "../../../components/common/Skeleton";
import styles from "./WorkerRetainedStaff.module.css";
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiDollarSign,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "AWAITING_PAYMENT", label: "Awaiting Payment" },
  { value: "HELD", label: "In Escrow" },
  { value: "PARTIALLY_RELEASED", label: "Partially Released" },
  { value: "RELEASED", label: "Released" },
  { value: "CANCELLED", label: "Cancelled" },
];

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

export default function WorkerRetainedCycles() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadCycles = useCallback(() => {
    setLoading(true);
    retainedStaffApi
      .listMyCycles({ page, limit: 20, status: status || undefined })
      .then((res) => {
        setCycles(res.data.data.cycles);
        setTotal(res.data.data.meta.total);
        setTotalPages(res.data.data.meta.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Payment History</h1>
          <p className={styles.subtitle}>
            Every payroll cycle you've received from retained employers
          </p>
        </div>

        {/* Filter tabs */}
        <div className={styles.tabs}>
          {STATUS_FILTERS.map((t) => (
            <button
              key={t.value}
              className={`${styles.tab} ${
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

        {/* Table */}
        <div className={styles.panel}>
          {loading ? (
            <Skeleton.Table rows={8} cols={5} />
          ) : cycles.length === 0 ? (
            <div className={styles.emptyPanel}>
              <FiClock size={40} />
              <p>
                No {status ? status.toLowerCase().replace("_", " ") : ""} cycles
                yet.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employer</th>
                    <th>Cycle</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => (
                    <tr key={cycle.id}>
                      <td>
                        <div className={styles.tableUser}>
                          <div className={styles.tableAvatar}>
                            {cycle.member?.hirer?.avatar ? (
                              <img src={cycle.member.hirer.avatar} alt="" />
                            ) : (
                              cycle.member?.hirer?.firstName?.[0] || "?"
                            )}
                          </div>
                          <div>
                            <p className={styles.tableName}>
                              {cycle.member?.hirer?.firstName}{" "}
                              {cycle.member?.hirer?.lastName}
                            </p>
                            <p className={styles.tableSub}>
                              {cycle.member?.jobTitle}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className={styles.tableName}>
                          {cycle.label || cycle.type.replace("_", " ")}
                        </p>
                        <p className={styles.tableSub}>
                          Pay date: {formatDate(cycle.payDate)}
                        </p>
                      </td>
                      <td>
                        <p className={styles.tableSub}>
                          {formatDate(cycle.periodStart)} —{" "}
                          {formatDate(cycle.periodEnd)}
                        </p>
                      </td>
                      <td>
                        <p className={styles.amountCell}>
                          {formatMoney(cycle.netAmount, cycle.currency)}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            styles[cycle.status.toLowerCase()] || ""
                          }`}
                        >
                          {cycle.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages} · {total} total
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
    </WorkerLayout>
  );
}
