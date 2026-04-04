import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

const STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_COLOR = {
  PENDING: "yellow",
  ACCEPTED: "orange",
  IN_PROGRESS: "indigo",
  COMPLETED: "green",
  CANCELLED: "red",
  DISPUTED: "rose",
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    load(1);
  }, [filter]);

  async function load(p) {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (filter !== "ALL") params.status = filter;
      const res = await api.get("/admin/bookings", { params });
      setBookings(res.data.data.bookings);
      setTotal(res.data.data.total);
      setPages(res.data.data.pages);
      setPage(p);
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
            <p className={styles.eyebrow}>Platform</p>
            <h1 className={styles.pageTitle}>
              All Bookings
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterBar}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ""}`}
              onClick={() => setFilter(s)}
            >
              {s === "ALL"
                ? "All"
                : s === "IN_PROGRESS"
                  ? "In Progress"
                  : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Job Title</span>
            <span>Hirer</span>
            <span>Worker</span>
            <span>Category</span>
            <span>Date</span>
            <span>Rate</span>
            <span>Status</span>
            <span>Payment</span>
          </div>

          <div className={styles.tableBody}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className={styles.skRow} />
              ))
            ) : bookings.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📋</span>
                <p className={styles.emptyTitle}>No bookings found</p>
              </div>
            ) : (
              bookings.map((b, i) => {
                const color = STATUS_COLOR[b.status] || "dim";
                return (
                  <Link
                    key={b.id}
                    to={`/bookings/${b.id}`}
                    className={styles.tableRow}
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <div className={styles.tdTitle}>{b.title}</div>
                    <div className={styles.tdMeta}>
                      {b.hirer?.firstName} {b.hirer?.lastName}
                    </div>
                    <div className={styles.tdMeta}>
                      {b.worker?.firstName} {b.worker?.lastName}
                    </div>
                    <div className={styles.tdMeta}>
                      {b.category?.name || "—"}
                    </div>
                    <div className={styles.tdMeta}>
                      {new Date(b.scheduledAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className={styles.tdMeta}>
                      {b.currency} {b.agreedRate?.toLocaleString()}
                    </div>
                    <div>
                      <span
                        className={`${styles.badge} ${styles[`badge_${color}`]}`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      {b.payment && (
                        <span
                          className={`${styles.badge} ${styles[`badge_${b.payment.status === "RELEASED" ? "green" : b.payment.status === "HELD" ? "indigo" : "dim"}`]}`}
                        >
                          {b.payment.status}
                        </span>
                      )}
                    </div>
                  </Link>
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
