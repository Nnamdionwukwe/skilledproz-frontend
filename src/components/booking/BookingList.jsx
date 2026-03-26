import { useState, useEffect } from "react";
import styles from "./BookingList.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";

const STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow" },
  ACCEPTED: { label: "Accepted", color: "orange" },
  IN_PROGRESS: { label: "In Progress", color: "indigo" },
  COMPLETED: { label: "Completed", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
  DISPUTED: { label: "Disputed", color: "rose" },
};

export default function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (filter !== "ALL") params.status = filter;
    api.get("/bookings", { params }).then((res) => {
      setBookings(res.data.data.bookings);
      setPages(res.data.data.pages);
      setTotal(res.data.data.total);
      setLoading(false);
    });
  }, [filter, page]);

  return (
    <Layout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>My Jobs</p>
            <h1 className={styles.title}>
              Bookings
              {total > 0 && <span className={styles.count}>{total}</span>}
            </h1>
          </div>
          <a href="/bookings/new" className={styles.newBtn}>
            <span>+</span> New Booking
          </a>
        </div>

        {/* Filter tabs */}
        <div className={styles.filters}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.tab} ${filter === s ? styles.tabActive : ""}`}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
            >
              {s === "IN_PROGRESS"
                ? "In Progress"
                : s === "ALL"
                  ? "All"
                  : STATUS_META[s]?.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Empty filter={filter} />
        ) : (
          <div className={styles.grid}>
            {bookings.map((b, i) => (
              <BookingCard key={b.id} booking={b} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function BookingCard({ booking, index }) {
  const meta = STATUS_META[booking.status] || {};
  const other = booking.hirerId ? booking.worker : booking.hirer;
  const scheduled = new Date(booking.scheduledAt);
  const isPast = scheduled < new Date();

  return (
    <a
      href={`/bookings/${booking.id}`}
      className={styles.card}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Accent bar */}
      <div
        className={`${styles.accentBar} ${styles[`accent_${meta.color}`]}`}
      />

      {/* Top row */}
      <div className={styles.cardTop}>
        <div className={styles.avatar}>
          {other?.avatar ? (
            <img src={other.avatar} alt="" />
          ) : (
            <span>
              {other?.firstName?.[0]}
              {other?.lastName?.[0]}
            </span>
          )}
        </div>
        <span className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}>
          {meta.label}
        </span>
      </div>

      {/* Title */}
      <h3 className={styles.cardTitle}>{booking.title}</h3>
      <p className={styles.cardParty}>
        {other?.firstName} {other?.lastName}
        {booking.category && (
          <>
            {" "}
            · <span className={styles.cat}>{booking.category.name}</span>
          </>
        )}
      </p>

      {/* Details */}
      <div className={styles.details}>
        <Detail
          icon="📅"
          text={`${scheduled.toLocaleDateString()} · ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          faded={isPast}
        />
        <Detail icon="📍" text={booking.address} truncate />
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        <span className={styles.rate}>
          {booking.currency} {booking.agreedRate?.toLocaleString()}
        </span>
        {booking.payment && (
          <span
            className={`${styles.payTag} ${styles[`payTag_${booking.payment.status.toLowerCase()}`]}`}
          >
            {booking.payment.status}
          </span>
        )}
      </div>
    </a>
  );
}

function Detail({ icon, text, truncate, faded }) {
  return (
    <div className={`${styles.detail} ${faded ? styles.detailFaded : ""}`}>
      <span className={styles.detailIcon}>{icon}</span>
      <span
        className={`${styles.detailText} ${truncate ? styles.detailTruncate : ""}`}
      >
        {text}
      </span>
    </div>
  );
}

function Empty({ filter }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEmoji}>📋</span>
      <p className={styles.emptyTitle}>No bookings found</p>
      <p className={styles.emptyText}>
        {filter === "ALL"
          ? "You don't have any bookings yet."
          : `No ${filter.toLowerCase().replace("_", " ")} bookings.`}
      </p>
      <a href="/search" className={styles.emptyBtn}>
        Find a Worker
      </a>
    </div>
  );
}

function Skeleton() {
  return <div className={styles.skeleton} />;
}
