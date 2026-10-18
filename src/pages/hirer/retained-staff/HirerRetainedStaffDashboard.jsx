import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import styles from "./HirerRetainedStaff.module.css";
import {
  FiUsers,
  FiDollarSign,
  FiClock,
  FiPlus,
  FiBriefcase,
  FiTrendingUp,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

export default function HirerRetainedStaffDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    retainedStaffApi
      .getDashboard()
      .then((res) => setData(res.data.data.dashboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <HirerLayout>
        <div className={styles.loading}>Loading dashboard...</div>
      </HirerLayout>
    );

  const currency = Object.keys(data?.monthlyBurnByCurrency || {})[0] || "NGN";
  const burn = data?.monthlyBurnByCurrency?.[currency] || 0;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Retained Staff</p>
            <h1 className={styles.title}>Payroll Dashboard</h1>
          </div>
          <Link
            to="/dashboard/hirer/retained-staff/new"
            className={styles.btnPrimary}
          >
            <FiPlus /> Add Staff Member
          </Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiUsers />
            </div>
            <div>
              <p className={styles.statLabel}>Active Staff</p>
              <p className={styles.statValue}>{data?.activeCount || 0}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orange}`}>
              <FiDollarSign />
            </div>
            <div>
              <p className={styles.statLabel}>Monthly Burn ({currency})</p>
              <p className={styles.statValue}>
                {currency} {burn.toLocaleString()}
              </p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <FiClock />
            </div>
            <div>
              <p className={styles.statLabel}>Pending Payments</p>
              <p className={styles.statValue}>{data?.pendingPayments || 0}</p>
            </div>
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Upcoming Cycles</h2>
            {data?.upcomingCycles?.length === 0 ? (
              <p className={styles.empty}>No upcoming cycles.</p>
            ) : (
              <div className={styles.list}>
                {data?.upcomingCycles?.map((c) => (
                  <div key={c.memberId} className={styles.listItem}>
                    <div>
                      <p className={styles.listName}>{c.workerName}</p>
                      <p className={styles.listSub}>{c.jobTitle}</p>
                    </div>
                    <div className={styles.listRight}>
                      <p className={styles.listAmount}>
                        {c.currency} {c.amount.toLocaleString()}
                      </p>
                      <p className={styles.listDate}>
                        {new Date(c.nextCycleAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/dashboard/hirer/retained-staff/staff"
              className={styles.btnGhost}
              style={{ marginTop: "1rem" }}
            >
              Manage All Staff
            </Link>
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Payroll Summary</h2>
            <div className={styles.summaryRow}>
              <span>Held in Escrow</span>
              <span>
                {currency} {data?.heldInEscrowByCycle?.toLocaleString() || 0}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Released this month</span>
              <span>
                {currency} {data?.releasedThisMonth?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}
