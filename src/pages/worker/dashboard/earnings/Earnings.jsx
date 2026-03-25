import { useState } from "react";
import { useFetch } from "../../../../hooks/useFetch";
import { workerAPI } from "../../../../services/api";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import styles from "./Earnings.module.css";
import ui from "../../../../components/ui/ui.module.css";

function fmt(n, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EarningsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useFetch(
    () =>
      workerAPI.getEarnings({
        from: from || undefined,
        to: to || undefined,
        page,
      }),
    [from, to, page],
  );

  const { payments = [], total = 0, pages = 1, summary = {} } = data || {};

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Summary */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryHighlight}>
            <div>
              <div className={styles.sumLabel}>Total Earned</div>
              <div className={styles.sumValue}>{fmt(summary.totalEarned)}</div>
            </div>
            <div className={styles.sumDivider} />
            <div>
              <div className={styles.sumLabel}>Total Job Value</div>
              <div className={styles.sumValue}>
                {fmt(summary.totalJobValue)}
              </div>
            </div>
            <div className={styles.sumDivider} />
            <div>
              <div className={styles.sumLabel}>Platform Fees</div>
              <div
                className={styles.sumValue}
                style={{ color: "var(--brand)" }}
              >
                {fmt(summary.totalFees)}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`${ui.card}`}>
          <div className={ui.cardHeader}>
            <span className={ui.cardTitle}>Payment History</span>
            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>From</span>
                <input
                  type="date"
                  className={ui.input}
                  style={{ padding: "0.4rem 0.75rem" }}
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
                  className={ui.input}
                  style={{ padding: "0.4rem 0.75rem" }}
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {(from || to) && (
                <button
                  className={`${ui.btn} ${ui.btnOutline} ${ui.btnSm}`}
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "2rem 0" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={ui.skeleton}
                  style={{ height: 48, marginBottom: 8 }}
                />
              ))}
            </div>
          ) : error ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>⚠️</div>
              <div className={ui.emptyDesc}>{error}</div>
            </div>
          ) : payments.length === 0 ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>₦</div>
              <div className={ui.emptyTitle}>No payments found</div>
              <div className={ui.emptyDesc}>Complete jobs to start earning</div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Job Value</th>
                    <th>You Earned</th>
                    <th>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {p.booking?.title}
                        </div>
                        <div
                          style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}
                        >
                          {p.booking?.category?.name}
                        </div>
                      </td>
                      <td>
                        <div className={styles.hirerCell}>
                          <div
                            className={ui.avatar}
                            style={{
                              width: 28,
                              height: 28,
                              fontSize: "0.625rem",
                              background: "var(--surface-3)",
                              color: "var(--ink-3)",
                            }}
                          >
                            {p.booking?.hirer?.firstName?.[0]}
                            {p.booking?.hirer?.lastName?.[0]}
                          </div>
                          {p.booking?.hirer?.firstName}{" "}
                          {p.booking?.hirer?.lastName}
                        </div>
                      </td>
                      <td style={{ color: "var(--ink-4)" }}>
                        {fmtDate(p.createdAt)}
                      </td>
                      <td>{fmt(p.amount, p.currency)}</td>
                      <td>
                        <span className={styles.payAmount}>
                          {fmt(p.workerPayout, p.currency)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.feeAmount}>
                          {fmt(p.platformFee, p.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className={ui.pagination}>
              <button
                className={`${ui.pageBtn}`}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${ui.pageBtn} ${p === page ? ui.active : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={`${ui.pageBtn}`}
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
