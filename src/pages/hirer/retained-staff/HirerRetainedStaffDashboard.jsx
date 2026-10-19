// src/pages/hirer/retained-staff/HirerRetainedStaffDashboard.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import Skeleton from "../../../components/common/Skeleton";
import styles from "./HirerRetainedStaff.module.css";
import {
  FiUsers,
  FiDollarSign,
  FiClock,
  FiPlus,
  FiChevronRight,
  FiBriefcase,
  FiCheckCircle,
} from "react-icons/fi";
import AddStaffModal from "./AddStaffModal";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

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

export default function HirerRetainedStaffDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");

  const loadDashboard = () => {
    setLoading(true);
    retainedStaffApi
      .getDashboard()
      .then((res) => {
        const dashboard = res.data.data.dashboard;
        setData(dashboard);

        // If NGN is not in the active currencies, switch to the first available one
        if (
          dashboard.activeCurrencies?.length > 0 &&
          !dashboard.activeCurrencies.includes("NGN")
        ) {
          setSelectedCurrency(dashboard.activeCurrencies[0]);
        } else if (dashboard.activeCurrencies?.length > 0) {
          setSelectedCurrency("NGN");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <div>
              <Skeleton width={140} height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="50%" height={30} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={160} height={40} radius={8} />
          </div>
          <Skeleton.KpiRow count={4} />
          <div style={{ marginTop: "1.5rem" }}>
            <Skeleton.Card height={200} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Skeleton.Table rows={4} cols={3} />
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ✅ Use the selected currency for the dashboard stats
  const currency = selectedCurrency;
  const burn = data?.monthlyBurnByCurrency?.[currency] || 0;
  const activeCount = data?.activeCount || 0;
  const pendingPayments = data?.pendingPayments || 0;
  const heldInEscrow = data?.heldInEscrowByCurrency?.[currency] || 0;
  const releasedThisMonth = data?.releasedThisMonthByCurrency?.[currency] || 0;

  // Filter upcoming cycles by the selected currency
  const upcoming = (data?.upcomingCycles || []).filter(
    (c) => c.currency === currency,
  );
  const activeCurrencies = data?.activeCurrencies || ["NGN"];

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Retained Staff</p>
            <h1 className={styles.title}>Payroll Dashboard</h1>
            <p className={styles.subtitle}>
              Manage your standing employees and their monthly payouts
            </p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowAdd(true)}
          >
            <FiPlus /> Add Staff Member
          </button>
        </div>

        {/* ✅ Currency Filter */}
        {activeCurrencies.length > 1 && (
          <div
            className={styles.toolbar}
            style={{ marginBottom: "1.5rem", paddingBottom: "0" }}
          >
            <div className={styles.filterTabs}>
              {activeCurrencies.map((cur) => (
                <button
                  key={cur}
                  className={`${styles.filterTab} ${
                    selectedCurrency === cur ? styles.filterTabActive : ""
                  }`}
                  onClick={() => setSelectedCurrency(cur)}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiUsers />
            </div>
            <div>
              <p className={styles.statLabel}>Active Staff</p>
              <p className={styles.statValue}>{activeCount}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orange}`}>
              <FiDollarSign />
            </div>
            <div>
              <p className={styles.statLabel}>Monthly Burn</p>
              <p className={styles.statValue}>{formatMoney(burn, currency)}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.yellow}`}>
              <FiClock />
            </div>
            <div>
              <p className={styles.statLabel}>Pending Payments</p>
              <p className={styles.statValue}>{pendingPayments}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <FiCheckCircle />
            </div>
            <div>
              <p className={styles.statLabel}>Released This Month</p>
              <p className={styles.statValue}>
                {formatMoney(releasedThisMonth, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.twoCol}>
          {/* Upcoming cycles */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                Upcoming Cycles ({currency})
              </h2>
              <Link
                to="/dashboard/hirer/retained-staff/staff"
                className={styles.panelLink}
              >
                Manage Staff <FiChevronRight size={12} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className={styles.emptyPanel}>
                <FiClock size={32} />
                <p>
                  No upcoming cycles in {currency}. Add a staff member or create
                  a manual cycle to get started.
                </p>
              </div>
            ) : (
              <div className={styles.upcomingList}>
                {upcoming.map((c) => (
                  <Link
                    key={c.memberId}
                    to={`/dashboard/hirer/retained-staff/${c.memberId}`}
                    className={styles.upcomingItem}
                  >
                    <div className={styles.upcomingAvatar}>
                      {c.workerName?.[0] || "?"}
                    </div>
                    <div className={styles.upcomingInfo}>
                      <p className={styles.upcomingName}>{c.workerName}</p>
                      <p className={styles.upcomingRole}>{c.jobTitle}</p>
                    </div>
                    <div className={styles.upcomingMeta}>
                      <p className={styles.upcomingAmount}>
                        {formatMoney(c.amount, c.currency)}
                      </p>
                      <p className={styles.upcomingDate}>
                        {formatDate(c.nextCycleAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Payroll summary */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Payroll Summary ({currency})</h2>

            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Held in Escrow</span>
              <span className={styles.summaryValue}>
                {formatMoney(heldInEscrow, currency)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Released This Month</span>
              <span className={styles.summaryValue}>
                {formatMoney(releasedThisMonth, currency)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Monthly Burn</span>
              <span className={styles.summaryValue}>
                {formatMoney(burn, currency)}
              </span>
            </div>

            <div className={styles.summaryActions}>
              <Link
                to="/dashboard/hirer/retained-staff/staff"
                className={styles.btnGhost}
              >
                View All Staff
              </Link>
            </div>
          </div>
        </div>

        {/* Getting started hint if no staff */}
        {activeCount === 0 && (
          <div className={styles.hintCard}>
            <div className={styles.hintIcon}>
              <FiBriefcase size={20} />
            </div>
            <div>
              <h3 className={styles.hintTitle}>
                Get started with Retained Staff
              </h3>
              <p className={styles.hintDesc}>
                Add a worker to your payroll once, then pay them on a recurring
                schedule (weekly, monthly, or on-demand) — no re-booking
                required.
              </p>
              <button
                className={styles.btnPrimary}
                onClick={() => setShowAdd(true)}
                style={{ marginTop: "0.75rem" }}
              >
                <FiPlus /> Add Your First Staff Member
              </button>
            </div>
          </div>
        )}
      </div>

      <AddStaffModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(member) => {
          loadDashboard();
          navigate(`/dashboard/hirer/retained-staff/${member.id}`);
        }}
      />
    </HirerLayout>
  );
}
