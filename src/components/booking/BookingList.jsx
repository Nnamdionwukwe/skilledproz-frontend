import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaClock,
  FaHandshake,
  FaCalendarAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import styles from "./BookingList.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";

// ── Helper: format duration exactly like BookingDetailMain ──────────────
function formatDuration(booking) {
  if (!booking) return null;
  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue || null;
  const hours = booking.estimatedHours || null;
  if (!value && !hours) return null;
  if (value) {
    if (unit === "custom") return { main: value, sub: null };
    const unitLabel = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
    }[unit];
    const num = parseFloat(value);
    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }
  return hours ? { main: `${hours} hours`, sub: null } : null;
}

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
  const navigate = useNavigate();

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const isHirer = user?.role === "HIRER";

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
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>My Jobs</p>
            <h1 className={styles.title}>
              Bookings
              {total > 0 && <span className={styles.count}>{total}</span>}
            </h1>
          </div>
          {isHirer && (
            <Link to="/bookings/create" className={styles.newBtn}>
              <span>+</span> New Booking
            </Link>
          )}
        </div>

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

        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Empty filter={filter} isHirer={isHirer} />
        ) : (
          <div className={styles.grid}>
            {bookings.map((b, i) => (
              <BookingCard key={b.id} booking={b} index={i} />
            ))}
          </div>
        )}

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

  // Format duration using the shared helper
  const dur = formatDuration(booking);

  // Helper to format job type
  const jobTypeLabel = (type) => {
    if (!type) return null;
    return type
      .toLowerCase()
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Link
      to={`/bookings/${booking.id}`}
      className={styles.card}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div
        className={`${styles.accentBar} ${styles[`accent_${meta.color}`]}`}
      />

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

      {/* ── Additional details (updated duration chip) ── */}
      <div className={styles.metaGrid}>
        {booking.jobType && (
          <span className={styles.metaChip}>
            <FaBriefcase className={styles.metaIcon} />
            {jobTypeLabel(booking.jobType)}
          </span>
        )}
        {booking.locationType && (
          <span className={styles.metaChip}>
            <FaMapMarkerAlt className={styles.metaIcon} />
            {booking.locationType.replace("_", " ").toUpperCase()}
          </span>
        )}
        {dur && (
          <span className={styles.metaChip}>
            <FaClock className={styles.metaIcon} />
            {dur.main}
            {dur.sub && (
              <span style={{ fontSize: "0.7rem", marginLeft: 4 }}>
                {dur.sub}
              </span>
            )}
          </span>
        )}
        {booking.isNegotiated && booking.negotiatedRate && (
          <span className={`${styles.metaChip} ${styles.metaChipNegotiated}`}>
            <FaHandshake className={styles.metaIcon} />
            Negotiated
          </span>
        )}
      </div>

      <div className={styles.details}>
        <Detail
          icon={<FaCalendarAlt />}
          text={`${scheduled.toLocaleDateString()} · ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          faded={isPast}
        />
        <Detail icon={<FaMapMarkerAlt />} text={booking.address} truncate />
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.rate}>
          <FaMoneyBillWave className={styles.rateIcon} />
          {booking.currency} {booking.agreedRate?.toLocaleString()}
        </span>
        {booking.payments?.[0] && (
          <span
            className={`${styles.payTag} ${styles[`payTag_${booking.payments[0].status.toLowerCase()}`]}`}
          >
            {booking.payments[0].status}
          </span>
        )}
      </div>
    </Link>
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

function Empty({ filter, isHirer }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEmoji}>📋</span>
      <p className={styles.emptyTitle}>No bookings found</p>
      <p className={styles.emptyText}>
        {filter === "ALL"
          ? isHirer
            ? "You haven't posted any jobs yet."
            : "You don't have any bookings yet."
          : `No ${filter.toLowerCase().replace("_", " ")} bookings.`}
      </p>
      <Link
        to={isHirer ? "/dashboard/hirer/post-job" : "/search"}
        className={styles.emptyBtn}
      >
        {isHirer ? "Post a Job" : "Find a Hirer"}
      </Link>
      <Link to={isHirer && "/search"} className={styles.emptyBtn}>
        {isHirer ? "Find a Worker" : ""}
      </Link>
    </div>
  );
}

function Skeleton() {
  return <div className={styles.skeleton} />;
}
