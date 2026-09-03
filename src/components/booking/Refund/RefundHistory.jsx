// src/pages/refund/RefundHistory.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Refund.module.css";
import HirerLayout from "../../layout/HirerLayout";
import {
  FaHistory,
  FaMoneyBillWave,
  FaChevronRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
} from "react-icons/fa";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { calcPricing } from "../../utils/pricing";

const STATUS_CONFIG = {
  PENDING: { icon: FaClock, color: "#fbbf24", label: "Pending Review" },
  APPROVED: { icon: FaCheckCircle, color: "#22c55e", label: "Approved" },
  PROCESSING: { icon: FaSpinner, color: "#818cf8", label: "Processing" },
  COMPLETED: { icon: FaCheckCircle, color: "#22c55e", label: "Completed" },
  FAILED: { icon: FaTimesCircle, color: "#ef4444", label: "Failed" },
  REJECTED: { icon: FaTimesCircle, color: "#ef4444", label: "Rejected" },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
  },
};

// ── Helper to format price ──────────────────────────────────────────────
const formatPrice = (amount, currency = "NGN") => {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ── Skeleton Loader ──────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className={styles.skeletonContainer}>
      {/* Stats skeletons */}
      <div className={styles.statsGrid}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`${styles.statsCard} ${styles.skeleton}`}>
            <div
              className={styles.skeletonLine}
              style={{ width: "40%", margin: "0 auto" }}
            />
            <div
              className={styles.skeletonLine}
              style={{ width: "60%", margin: "8px auto 0" }}
            />
          </div>
        ))}
      </div>

      {/* Filter skeletons */}
      <div className={styles.filters}>
        <div className={styles.filterTabs}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`${styles.filterTab} ${styles.skeleton}`}>
              <div className={styles.skeletonLine} style={{ width: "40px" }} />
            </div>
          ))}
        </div>
        <div className={`${styles.searchBox} ${styles.skeleton}`}>
          <div
            className={styles.skeletonLine}
            style={{ width: "100%", height: "20px" }}
          />
        </div>
      </div>

      {/* Refund list skeletons */}
      <div className={styles.refundList}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.refundItem} ${styles.skeleton}`}>
            <div className={styles.refundItemMain}>
              <div
                className={styles.skeletonCircle}
                style={{ width: 40, height: 40, borderRadius: "50%" }}
              />
              <div className={styles.refundItemInfo}>
                <div className={styles.refundItemTop}>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "200px" }}
                  />
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "100px" }}
                  />
                </div>
                <div className={styles.refundItemMeta}>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "80px" }}
                  />
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "60px" }}
                  />
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "90px" }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.refundItemRight}>
              <div className={styles.skeletonLine} style={{ width: "80px" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RefundHistory() {
  const { user } = useAuthStore();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);

      const response = await api.get(`/refunds/my?${params.toString()}`);
      const data = response.data.data;
      setRefunds(data.refunds || []);

      // Calculate stats
      const allRefunds = data.refunds || [];
      const totalAmount = allRefunds.reduce((sum, r) => sum + r.amount, 0);
      const pendingCount = allRefunds.filter(
        (r) => r.status === "PENDING",
      ).length;
      const completedCount = allRefunds.filter(
        (r) => r.status === "COMPLETED",
      ).length;
      const rejectedCount = allRefunds.filter(
        (r) => r.status === "REJECTED" || r.status === "FAILED",
      ).length;

      setStats({
        total: allRefunds.length,
        totalAmount,
        pending: pendingCount,
        completed: completedCount,
        rejected: rejectedCount,
      });
    } catch (error) {
      console.error("Failed to fetch refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      refund.reference?.toLowerCase().includes(search) ||
      refund.booking?.title?.toLowerCase().includes(search) ||
      refund.currency?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <FaHistory className={styles.headerIcon} />
              <h1 className={styles.headerTitle}>Refund History</h1>
            </div>
          </div>
          <SkeletonLoader />
        </div>
      </HirerLayout>
    );
  }

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FaHistory className={styles.headerIcon} />
            <h1 className={styles.headerTitle}>Refund History</h1>
            {stats && (
              <span className={styles.headerCount}>{stats.total} requests</span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statsCard}>
              <div className={styles.statsCardValue}>{stats.total}</div>
              <div className={styles.statsCardLabel}>Total Requests</div>
            </div>
            <div className={styles.statsCard}>
              <div
                className={styles.statsCardValue}
                style={{ color: "#fbbf24" }}
              >
                {stats.pending}
              </div>
              <div className={styles.statsCardLabel}>Pending</div>
            </div>
            <div className={styles.statsCard}>
              <div
                className={styles.statsCardValue}
                style={{ color: "#22c55e" }}
              >
                {stats.completed}
              </div>
              <div className={styles.statsCardLabel}>Completed</div>
            </div>
            <div className={styles.statsCard}>
              <div
                className={styles.statsCardValue}
                style={{ color: "#ef4444" }}
              >
                {stats.rejected}
              </div>
              <div className={styles.statsCardLabel}>Rejected</div>
            </div>
            <div className={styles.statsCard}>
              <div
                className={styles.statsCardValue}
                style={{ color: "#f59e0b" }}
              >
                {formatPrice(stats.totalAmount, "NGN")}
              </div>
              <div className={styles.statsCardLabel}>Total Refunded</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${filter === "all" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`${styles.filterTab} ${filter === "PENDING" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("PENDING")}
            >
              Pending
            </button>
            <button
              className={`${styles.filterTab} ${filter === "APPROVED" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("APPROVED")}
            >
              Approved
            </button>
            <button
              className={`${styles.filterTab} ${filter === "PROCESSING" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("PROCESSING")}
            >
              Processing
            </button>
            <button
              className={`${styles.filterTab} ${filter === "COMPLETED" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("COMPLETED")}
            >
              Completed
            </button>
            <button
              className={`${styles.filterTab} ${filter === "REJECTED" ? styles.filterTabActive : ""}`}
              onClick={() => setFilter("REJECTED")}
            >
              Rejected
            </button>
          </div>

          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by reference or booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Refund List */}
        {filteredRefunds.length === 0 ? (
          <div className={styles.emptyState}>
            <FaHistory className={styles.emptyIcon} />
            <h3>No refund requests found</h3>
            <p>
              {filter !== "all"
                ? `You have no ${filter.toLowerCase()} refund requests.`
                : "You haven't requested any refunds yet."}
            </p>
            <Link to="/bookings" className={styles.emptyAction}>
              View Bookings
            </Link>
          </div>
        ) : (
          <div className={styles.refundList}>
            {filteredRefunds.map((refund) => {
              const statusConfig = STATUS_CONFIG[refund.status];
              const StatusIcon = statusConfig?.icon || FaClock;

              return (
                <Link
                  key={refund.id}
                  to={`/refunds/${refund.id}`}
                  className={styles.refundItem}
                >
                  <div className={styles.refundItemMain}>
                    <div className={styles.refundItemIcon}>
                      <FaMoneyBillWave />
                    </div>
                    <div className={styles.refundItemInfo}>
                      <div className={styles.refundItemTop}>
                        <span className={styles.refundItemTitle}>
                          {refund.booking?.title || "Booking Refund"}
                        </span>
                        <span className={styles.refundItemReference}>
                          {refund.reference}
                        </span>
                      </div>
                      <div className={styles.refundItemMeta}>
                        <span className={styles.refundItemAmount}>
                          {refund.currency} {refund.amount.toLocaleString()}
                        </span>
                        <span className={styles.refundItemType}>
                          {refund.refundType?.replace("_", " ") || "Refund"}
                        </span>
                        <span className={styles.refundItemDate}>
                          <FaCalendarAlt size={12} />
                          {new Date(refund.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.refundItemRight}>
                    <span
                      className={styles.statusBadge}
                      style={{ color: statusConfig?.color }}
                    >
                      <StatusIcon size={12} />
                      {statusConfig?.label || refund.status}
                    </span>
                    <FaChevronRight className={styles.refundItemArrow} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
