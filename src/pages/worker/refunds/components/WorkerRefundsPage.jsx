// src/pages/worker/refunds/WorkerRefundsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRefreshCw,
  FiInbox,
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";
import styles from "../WorkerRefunds.module.css";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import api from "../../../../lib/api";
import RefundFilters from "./RefundFilters";
import RefundCard from "./RefundCard";
import RefundSummaryCard from "./RefundSummaryCard";

const LIMIT = 15;

export default function WorkerRefundsPage() {
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [refundType, setRefundType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Fetch summary once on mount ─────────────────────────────────────────
  useEffect(() => {
    setSummaryLoading(true);
    api
      .get("/worker/refunds/summary")
      .then((res) => setSummary(res.data.data))
      .catch(() => {
        // silent — summary is optional, list still works
      })
      .finally(() => setSummaryLoading(false));
  }, []);

  // ── Fetch list whenever filters/page change ─────────────────────────────
  const fetchList = () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", LIMIT);
    if (status !== "ALL") params.set("status", status);
    if (refundType !== "ALL") params.set("refundType", refundType);

    api
      .get(`/worker/refunds?${params.toString()}`)
      .then((res) => {
        const d = res.data.data;
        setRefunds(d.refunds || []);
        setTotal(d.total || 0);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            "Could not load your refunds. Please try again.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, refundType]);

  const handleFilterChange = ({ status: s, refundType: t }) => {
    // Reset to page 1 whenever filters change
    setPage(1);
    setStatus(s);
    setRefundType(t);
  };

  const handleRefresh = () => {
    setSummaryLoading(true);
    api
      .get("/worker/refunds/summary")
      .then((res) => setSummary(res.data.data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
    fetchList();
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header row */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Refund History</h1>
            <p className={styles.pageSub}>
              Every refund that has affected your earnings
            </p>
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh"
          >
            <FiRefreshCw
              size={16}
              style={{
                animation: loading ? "spin 0.9s linear infinite" : "none",
              }}
            />
          </button>
        </div>

        {/* Summary cards */}
        <RefundSummaryCard summary={summary} loading={summaryLoading} />

        {/* Filters */}
        <RefundFilters
          status={status}
          refundType={refundType}
          onChange={handleFilterChange}
        />

        {/* List */}
        {loading ? (
          <div className={styles.list}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <div
              className={styles.emptyIcon}
              style={{ background: "var(--red-dim)", color: "var(--red)" }}
            >
              ⚠
            </div>
            <p className={styles.emptyTitle}>Could not load refunds</p>
            <p className={styles.emptyText}>{error}</p>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={fetchList}
              style={{ marginTop: "0.5rem" }}
            >
              Try again
            </button>
          </div>
        ) : refunds.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FiInbox size={24} />
            </div>
            <p className={styles.emptyTitle}>
              {status !== "ALL" || refundType !== "ALL"
                ? "No refunds match these filters"
                : "No refunds on your account"}
            </p>
            <p className={styles.emptyText}>
              {status !== "ALL" || refundType !== "ALL"
                ? "Try clearing the filters to see everything."
                : "When a booking is refunded to a hirer, it will appear here with full details."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {refunds.map((r) => (
                <RefundCard key={r.id} refund={r} />
              ))}
            </div>

            {pages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <FiArrowLeft size={14} /> Prev
                </button>
                <span className={styles.pageInfo}>
                  {page} of {pages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page === pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next <FiArrowRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </WorkerLayout>
  );
}
