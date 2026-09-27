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
import tracker from "../../lib/analytics/tracker";

// ── Helper: format duration exactly like BookingDetailMain ──────────────
function formatDuration(booking) {
  if (!booking) return null;

  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue || null;
  const hours = booking.estimatedHours || null;
  const quantity = booking.quantity || 1;
  const customLabel = booking.customLabel || "Custom";
  const isNegotiated = booking.isNegotiated && booking.negotiatedRate;

  // If no duration data, return null
  if (!value && !hours) return null;

  // For custom bookings - show the number of customs
  if (unit === "custom") {
    const quantityNum = booking.quantity || 1;
    return { main: `${quantityNum} ${customLabel}`, sub: null };
  }

  // For negotiated bookings - show the duration from the estimated value
  // The estimatedValue for negotiated bookings should be the duration (e.g., 4 months)
  if (value) {
    const unitLabel =
      {
        hours: "hour",
        days: "day",
        weeks: "week",
        months: "month",
        years: "year",
      }[unit] || unit;

    // For negotiated bookings, parse the value as a number if it's a number string
    // If it's a string like "40000 months", we need to extract just the number
    let numValue = value;
    if (typeof value === "string" && !isNaN(parseFloat(value))) {
      numValue = parseFloat(value);
    }

    const num = typeof numValue === "number" ? numValue : parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return { main: value, sub: null };
    }

    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }

  // Fallback to hours
  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) {
      return { main: `${hours} hours`, sub: null };
    }
    return { main: `${num} hours`, sub: null };
  }

  return null;
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

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.bookingList.view", {
      role: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (filter !== "ALL") params.status = filter;
    api
      .get("/bookings", { params })
      .then((res) => {
        const data = res.data.data;
        setBookings(data.bookings);
        setPages(data.pages);
        setTotal(data.total);
        setLoading(false);

        // ── ANALYTICS: bookings list loaded ──────────────────────────────
        tracker.track("bookingList.loaded", {
          role: user?.role || "GUEST",
          filter,
          page,
          count: data.bookings?.length || 0,
          total: data.total || 0,
          pages: data.pages || 1,
        });
      })
      .catch((err) => {
        setLoading(false);
        // ── ANALYTICS: bookings list failed to load ──────────────────────
        tracker.track("bookingList.load.failed", {
          role: user?.role || "GUEST",
          filter,
          page,
          reason: err.response?.data?.message || "unknown",
        });
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
            <Link
              to="/bookings/create"
              className={styles.newBtn}
              data-track-id="bookingList.newBooking"
              onClick={() =>
                tracker.action("bookingList.newBooking.clicked", {
                  role: user?.role,
                })
              }
            >
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
                // ── ANALYTICS: filter applied ────────────────────────────
                tracker.track("bookingList.filter.changed", {
                  role: user?.role || "GUEST",
                  from: filter,
                  to: s,
                });
              }}
              data-track-id={`bookingList.filter.${s.toLowerCase()}`}
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
              onClick={() => {
                setPage((p) => p - 1);
                // ── ANALYTICS: pagination prev ───────────────────────────
                tracker.track("bookingList.pagination.prev", {
                  fromPage: page,
                  toPage: page - 1,
                });
              }}
              data-track-id="bookingList.pagination.prev"
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => {
                setPage((p) => p + 1);
                // ── ANALYTICS: pagination next ───────────────────────────
                tracker.track("bookingList.pagination.next", {
                  fromPage: page,
                  toPage: page + 1,
                });
              }}
              data-track-id="bookingList.pagination.next"
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
      onClick={() =>
        tracker.action("bookingList.booking.clicked", {
          bookingId: booking.id,
          status: booking.status,
          amount: booking.agreedRate,
          currency: booking.currency,
          jobType: booking.jobType || null,
          locationType: booking.locationType || null,
          hasPayment: !!booking.payments?.[0],
          paymentStatus: booking.payments?.[0]?.status || null,
          isNegotiated: !!booking.isNegotiated,
          categoryId: booking.category?.id || null,
        })
      }
      data-track-id={`bookingList.booking.${booking.id}`}
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
        data-track-id="bookingList.empty.primaryCta"
        onClick={() =>
          tracker.action("bookingList.empty.cta.clicked", {
            role: isHirer ? "HIRER" : "WORKER",
            filter,
            cta: isHirer ? "post_job" : "find_hirer",
          })
        }
      >
        {isHirer ? "Post a Job" : "Find a Hirer"}
      </Link>
      <Link
        to={isHirer && "/search"}
        className={styles.emptyBtn}
        data-track-id="bookingList.empty.secondaryCta"
        onClick={() =>
          tracker.action("bookingList.empty.cta.clicked", {
            role: isHirer ? "HIRER" : "WORKER",
            filter,
            cta: "find_worker",
          })
        }
      >
        {isHirer ? "Find a Worker" : ""}
      </Link>
    </div>
  );
}

function Skeleton() {
  return <div className={styles.skeleton} />;
}
