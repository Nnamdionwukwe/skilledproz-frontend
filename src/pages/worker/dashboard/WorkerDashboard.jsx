import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import styles from "./WorkerDashboard.module.css";
import ui from "../../../components/ui/ui.module.css";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/api";

function statusBadge(status) {
  const map = {
    PENDING: ui.badgePending,
    IN_PROGRESS: ui.badgeActive,
    COMPLETED: ui.badgeCompleted,
    CANCELLED: ui.badgeCancelled,
    DISPUTED: ui.badgeDisputed,
    ACCEPTED: ui.badgeAccepted,
    RELEASED: ui.badgeReleased,
  };
  return `${ui.badge} ${map[status] || ui.badgePending}`;
}

function fmt(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

function SkeletonCard() {
  return (
    <div className={ui.card}>
      <div
        className={ui.skeleton}
        style={{ height: 20, width: "60%", marginBottom: 12 }}
      />
      <div className={ui.skeleton} style={{ height: 40, width: "40%" }} />
    </div>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/workers/dashboard")
      .then((res) => setData(res.data.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <div className={styles.statsRow}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </WorkerLayout>
    );
  }

  if (error) {
    return (
      <WorkerLayout>
        <div className={ui.empty}>
          <div className={ui.emptyIcon}>⚠️</div>
          <div className={ui.emptyTitle}>Failed to load dashboard</div>
          <div className={ui.emptyDesc}>{error}</div>
        </div>
      </WorkerLayout>
    );
  }

  const {
    stats,
    recentBookings,
    upcomingBookings,
    recentReviews,
    monthlyTrend,
    profile,
  } = data;
  const { earnings, bookings, engagement } = stats;
  const maxEarning = Math.max(
    ...(monthlyTrend || []).map((m) => m.earnings),
    1,
  );

  const completion = profile?.profileCompletion || 0;

  return (
    <WorkerLayout unreadNotifications={engagement.unreadNotifications}>
      <div className={styles.page}>
        {/* ── Stats Row ── */}
        <div className={styles.statsRow}>
          {/* Earnings highlight */}
          <div className={styles.earningsCard}>
            <div>
              <div className={styles.earningsLabel}>This Month</div>
              <div className={styles.earningsValue}>
                {fmt(earnings.thisMonth, earnings.currency)}
              </div>
              <div className={styles.earningsMeta}>
                <span>
                  Last month: {fmt(earnings.lastMonth, earnings.currency)}
                </span>
              </div>
            </div>
            <div className={styles.earningsPending}>
              <div className={styles.pendingLabel}>In Escrow</div>
              <div className={styles.pendingValue}>
                {fmt(earnings.pendingPayout, earnings.currency)}
              </div>
              <div className={styles.pendingSub}>Awaiting release</div>
            </div>
          </div>

          {/* Booking stats */}
          <div className={ui.card}>
            <div className={ui.statCardLabel}>Active Jobs</div>
            <div className={ui.statCardValue}>{bookings.active}</div>
            <div className={ui.statCardSub}>
              {bookings.pending} pending requests
            </div>
          </div>

          <div className={ui.card}>
            <div className={ui.statCardLabel}>Rating</div>
            <div className={ui.statCardValue}>
              {engagement.avgRating?.toFixed(1) || "—"}
            </div>
            <div className={ui.statCardSub}>
              ★ from {engagement.totalReviews} reviews
            </div>
          </div>

          <div className={ui.card}>
            <div className={ui.statCardLabel}>Jobs Done</div>
            <div className={ui.statCardValue}>{engagement.completedJobs}</div>
            <div className={ui.statCardSub}>
              {engagement.responseRate}% response rate
            </div>
          </div>

          {/* Messages */}
          <div className={ui.card}>
            <div className={ui.statCardLabel}>Messages</div>
            <div className={ui.statCardValue}>{engagement.unreadMessages}</div>
            <div className={ui.statCardSub}>Unread conversations</div>
          </div>
        </div>

        {/* ── Monthly Chart + Profile Completion ── */}
        <div className={styles.row2}>
          <div className={ui.card}>
            <div className={ui.cardHeader}>
              <span className={ui.cardTitle}>Earnings trend</span>
              <Link to="/dashboard/worker/earnings" className={ui.cardLink}>
                Full report →
              </Link>
            </div>
            <div className={styles.barChart}>
              {(monthlyTrend || []).map((m) => (
                <div key={m.month} className={styles.barWrap}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${Math.max(4, (m.earnings / maxEarning) * 100)}%`,
                    }}
                    title={`${m.month}: ${fmt(m.earnings)}`}
                  />
                  <div className={styles.barLabel}>{m.month.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Profile completion */}
            <div className={styles.completionCard}>
              <div className={styles.completionHeader}>
                <span className={styles.completionLabel}>
                  Profile Completion
                </span>
                <span className={styles.completionPct}>{completion}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion < 100 && (
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--ink-4)",
                    marginTop: "0.625rem",
                  }}
                >
                  Complete your profile to attract more clients.{" "}
                  <Link
                    to="/dashboard/worker/profile"
                    style={{ color: "var(--brand)", fontWeight: 700 }}
                  >
                    Update now →
                  </Link>
                </p>
              )}
            </div>

            {/* Upcoming */}
            <div className={ui.card} style={{ flex: 1 }}>
              <div className={ui.cardHeader}>
                <span className={ui.cardTitle}>Upcoming jobs</span>
                <Link to="/dashboard/worker/bookings" className={ui.cardLink}>
                  See all →
                </Link>
              </div>
              {!upcomingBookings || upcomingBookings.length === 0 ? (
                <div className={ui.empty} style={{ padding: "1rem 0" }}>
                  <div className={ui.emptyDesc}>No upcoming jobs scheduled</div>
                </div>
              ) : (
                upcomingBookings.map((b) => {
                  const d = b.scheduledAt ? new Date(b.scheduledAt) : null;
                  return (
                    <div key={b.id} className={styles.upcomingItem}>
                      {d && (
                        <div className={styles.upcomingDate}>
                          <span className={styles.upcomingDay}>
                            {d.getDate()}
                          </span>
                          <span className={styles.upcomingMonth}>
                            {d.toLocaleString("default", { month: "short" })}
                          </span>
                        </div>
                      )}
                      <div className={styles.upcomingInfo}>
                        <div className={styles.upcomingTitle}>{b.title}</div>
                        <div className={styles.upcomingMeta}>
                          {b.hirer?.firstName} {b.hirer?.lastName} ·{" "}
                          {b.category?.name}
                        </div>
                      </div>
                      <span className={statusBadge(b.status)}>{b.status}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Bookings + Reviews ── */}
        <div className={styles.row2}>
          <div className={ui.card}>
            <div className={ui.cardHeader}>
              <span className={ui.cardTitle}>Recent bookings</span>
              <Link to="/dashboard/worker/bookings" className={ui.cardLink}>
                View all →
              </Link>
            </div>
            {!recentBookings || recentBookings.length === 0 ? (
              <div className={ui.empty} style={{ padding: "1rem 0" }}>
                <div className={ui.emptyDesc}>No bookings yet</div>
              </div>
            ) : (
              recentBookings.slice(0, 6).map((b) => (
                <div key={b.id} className={styles.bookingItem}>
                  <div className={styles.bookingAvatar}>
                    {initials(b.hirer)}
                  </div>
                  <div className={styles.bookingInfo}>
                    <div className={styles.bookingTitle}>{b.title}</div>
                    <div className={styles.bookingMeta}>
                      {b.hirer?.firstName} {b.hirer?.lastName} ·{" "}
                      {b.category?.name}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 4,
                    }}
                  >
                    <span className={statusBadge(b.status)}>{b.status}</span>
                    {b.payment && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--green)",
                        }}
                      >
                        {fmt(b.payment.workerPayout, b.payment.currency)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={ui.card}>
            <div className={ui.cardHeader}>
              <span className={ui.cardTitle}>Recent reviews</span>
              <Link to="/dashboard/worker/reviews" className={ui.cardLink}>
                See all →
              </Link>
            </div>
            {!recentReviews || recentReviews.length === 0 ? (
              <div className={ui.empty} style={{ padding: "1rem 0" }}>
                <div className={ui.emptyIcon}>⭐</div>
                <div className={ui.emptyDesc}>No reviews yet</div>
              </div>
            ) : (
              recentReviews.map((r) => (
                <div key={r.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewerName}>
                      {r.giver?.firstName} {r.giver?.lastName}
                    </span>
                    <span className={ui.stars}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  <div className={styles.reviewText}>{r.comment}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
