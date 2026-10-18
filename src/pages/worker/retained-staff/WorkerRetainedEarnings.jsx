import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import Skeleton from "../../../components/common/Skeleton";
import styles from "./WorkerRetainedStaff.module.css";
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiChevronRight,
  FiAlertCircle,
  FiBriefcase,
  FiTrendingUp,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function WorkerRetainedEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    retainedStaffApi
      .getMyEarnings()
      .then((res) => setData(res.data.data.earnings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <Skeleton width="40%" height={28} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={14} />
          </div>
          <Skeleton.KpiRow count={3} />
          <div style={{ marginTop: "1.5rem" }}>
            <Skeleton.Card height={200} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Skeleton.Table rows={4} cols={3} />
          </div>
        </div>
      </WorkerLayout>
    );
  }

  if (!data) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <h3>Could not load earnings</h3>
            <p>Please try refreshing the page.</p>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  // Determine primary currency from the breakdown
  const primaryCurrency = data.byEmployer?.[0]?.currency || "NGN";

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Retained Earnings</h1>
          <p className={styles.subtitle}>
            Lifetime and pending earnings from your retained employers
          </p>
        </div>

        {/* KPI cards */}
        <div className={styles.earningsGrid}>
          <div className={styles.earningCard}>
            <div className={styles.earningIcon}>
              <FiCheckCircle />
            </div>
            <p className={styles.earningLabel}>Lifetime Received</p>
            <p className={`${styles.earningValue} ${styles.green}`}>
              {formatMoney(data.lifetime, primaryCurrency)}
            </p>
          </div>
          <div className={styles.earningCard}>
            <div className={`${styles.earningIcon} ${styles.orangeIcon}`}>
              <FiClock />
            </div>
            <p className={styles.earningLabel}>Pending Release</p>
            <p className={`${styles.earningValue} ${styles.orange}`}>
              {formatMoney(data.pending, primaryCurrency)}
            </p>
          </div>
          <div className={styles.earningCard}>
            <div className={styles.earningIcon}>
              <FiBriefcase />
            </div>
            <p className={styles.earningLabel}>Employers</p>
            <p className={styles.earningValue}>
              {data.byEmployer?.length || 0}
            </p>
          </div>
        </div>

        {/* By-status breakdown */}
        {data.byStatus?.length > 0 && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>By Status</h2>
            <div className={styles.statusBreakdown}>
              {data.byStatus.map((item) => (
                <div key={item.status} className={styles.statusBreakdownItem}>
                  <span
                    className={`${styles.badge} ${styles[item.status.toLowerCase()] || ""}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                  <div className={styles.statusBreakdownCounts}>
                    <span className={styles.statusCount}>{item._count}</span>
                    <span className={styles.statusAmount}>
                      {formatMoney(item._sum?.netAmount || 0, primaryCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-employer breakdown */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <FiTrendingUp style={{ marginRight: 6 }} /> By Employer
          </h2>

          {!data.byEmployer || data.byEmployer.length === 0 ? (
            <div className={styles.emptyPanel}>
              <FiBriefcase size={32} />
              <p>No retained employment yet.</p>
            </div>
          ) : (
            <div className={styles.employerBreakdown}>
              {data.byEmployer.map((item) => {
                const released =
                  item.byStatus?.find((s) => s.status === "RELEASED")?._sum
                    ?.netAmount || 0;
                const pending =
                  (item.byStatus?.find((s) => s.status === "HELD")?._sum
                    ?.netAmount || 0) +
                  (item.byStatus?.find((s) => s.status === "PARTIALLY_RELEASED")
                    ?._sum?.netAmount || 0);
                const totalCycles =
                  item.byStatus?.reduce((s, b) => s + b._count, 0) || 0;

                return (
                  <Link
                    key={item.memberId}
                    to={`/dashboard/worker/employers/${item.memberId}`}
                    className={styles.employerRow}
                  >
                    <div className={styles.employerAvatar}>
                      {item.hirer?.avatar ? (
                        <img src={item.hirer.avatar} alt="" />
                      ) : (
                        item.hirer?.firstName?.[0] || "?"
                      )}
                    </div>
                    <div className={styles.employerInfo}>
                      <p className={styles.employerName}>
                        {item.hirer?.firstName} {item.hirer?.lastName}
                      </p>
                      <p className={styles.employerRole}>{item.jobTitle}</p>
                    </div>
                    <div className={styles.employerStats}>
                      <div className={styles.employerStatItem}>
                        <span className={styles.employerStatLabel}>
                          Released
                        </span>
                        <span className={styles.employerStatValue}>
                          {formatMoney(released, item.currency)}
                        </span>
                      </div>
                      <div className={styles.employerStatItem}>
                        <span className={styles.employerStatLabel}>
                          Pending
                        </span>
                        <span
                          className={styles.employerStatValue}
                          style={{ color: "var(--orange)" }}
                        >
                          {formatMoney(pending, item.currency)}
                        </span>
                      </div>
                      <div className={styles.employerStatItem}>
                        <span className={styles.employerStatLabel}>Cycles</span>
                        <span className={styles.employerStatValue}>
                          {totalCycles}
                        </span>
                      </div>
                    </div>
                    <FiChevronRight className={styles.employerArrow} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
