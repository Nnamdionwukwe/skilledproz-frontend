import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminDashboard.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) {
    const formatted = (n / 1_000_000).toFixed(1);
    return currency ? `${currency} ${formatted}M` : `${formatted}M`;
  }
  if (n >= 1_000) {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(n);
    return currency ? `${currency} ${formatted}` : formatted;
  }
  return currency ? `${currency} ${n}` : String(n);
}

function fmtFull(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent, link, delta }) {
  const card = (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statBottom}>
        {sub && <span className={styles.statSub}>{sub}</span>}
        {delta != null && (
          <span
            className={`${styles.delta} ${delta > 0 ? styles.deltaUp : styles.deltaFlat}`}
          >
            {delta > 0 ? `↑ ${delta} today` : "—"}
          </span>
        )}
      </div>
    </div>
  );
  return link ? (
    <Link to={link} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  ) : (
    card
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function Badge({ status }) {
  const map = {
    PENDING: { cls: "pending", label: "Pending" },
    ACCEPTED: { cls: "accepted", label: "Accepted" },
    IN_PROGRESS: { cls: "active", label: "In Progress" },
    COMPLETED: { cls: "completed", label: "Completed" },
    CANCELLED: { cls: "cancelled", label: "Cancelled" },
    DISPUTED: { cls: "disputed", label: "Disputed" },
  };
  const s = map[status] || { cls: "pending", label: status };
  return <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 100 }) {
  return <div className={styles.skeleton} style={{ height: h }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [verifStats, setVerifStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/bookings?page=1&limit=5"),
      api.get("/admin/disputes?resolved=false"),
      api.get("/admin/verifications/stats"),
    ])
      .then(([statsRes, bookingsRes, disputesRes, verifRes]) => {
        setStats(statsRes.data.data);
        setRecentBookings(bookingsRes.data.data?.bookings || []);
        setDisputes(disputesRes.data.data?.disputes || []);
        setVerifStats(verifRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const o = stats?.overview;
  const top = stats?.topCategories || [];
  const tw = stats?.topWorkers || [];
  const th = stats?.topHirers || [];
  const funnel = stats?.bookingFunnel || [];

  // ── Revenue chart — monthlyRevenue is now { "YYYY-MM": { revenue, gmv } }
  const revenueEntries = Object.entries(stats?.monthlyRevenue || {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const maxRevenue = Math.max(
    ...revenueEntries.map(([, v]) => (typeof v === "object" ? v.revenue : v)),
    1,
  );

  // ── Signup chart — monthlySignups: { "YYYY-MM": { total, workers, hirers } }
  const signupEntries = Object.entries(stats?.monthlySignups || {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const maxSignups = Math.max(...signupEntries.map(([, v]) => v.total || 0), 1);

  // ── Funnel: derive % relative to first stage
  const funnelBase = funnel[0]?.count || 1;

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.page}>
          <div className={styles.statsGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} h={108} />
            ))}
          </div>
          <div className={styles.secondaryBar}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} h={58} />
            ))}
          </div>
          <div className={styles.twoCol}>
            <Skeleton h={220} />
            <Skeleton h={220} />
          </div>
          <div className={styles.twoCol}>
            <Skeleton h={260} />
            <Skeleton h={260} />
          </div>
          <div className={styles.twoCol}>
            <Skeleton h={240} />
            <Skeleton h={240} />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Alert Banners ── */}
        {o?.disputedBookings > 0 && (
          <Link
            to="/admin/disputes"
            className={`${styles.alertBanner} ${styles.alertRed}`}
          >
            <span>⚠️</span>
            <span>
              {o.disputedBookings} active dispute
              {o.disputedBookings !== 1 ? "s" : ""} require your attention
            </span>
            <span className={styles.alertArrow}>→</span>
          </Link>
        )}
        {verifStats?.pending > 0 && (
          <Link
            to="/admin/verifications"
            className={`${styles.alertBanner} ${styles.alertAmber}`}
          >
            <span>🪪</span>
            <span>
              {verifStats.pending} worker verification
              {verifStats.pending !== 1 ? "s" : ""} waiting for review
            </span>
            <span className={styles.alertArrow}>→</span>
          </Link>
        )}
        {o?.pendingPayoutCount > 0 && (
          <Link
            to="/admin/payments?tab=withdrawals"
            className={`${styles.alertBanner} ${styles.alertGreen}`}
          >
            <span>💸</span>
            <span>
              {o.pendingPayoutCount} withdrawal
              {o.pendingPayoutCount !== 1 ? "s" : ""} pending —{" "}
              {fmtFull(o.pendingPayouts, "₦")} total
            </span>
            <span className={styles.alertArrow}>→</span>
          </Link>
        )}

        {/* ── Primary Stat Cards ── */}
        <div className={styles.statsGrid}>
          <StatCard
            icon="👥"
            label="Total Users"
            value={fmt(o?.totalUsers)}
            accent="orange"
            link="/admin/users"
            delta={o?.newUsersToday}
          />
          <StatCard
            icon="🔨"
            label="Workers"
            value={fmt(o?.totalWorkers)}
            sub={`${verifStats?.verified || 0} verified`}
            link="/admin/users?role=WORKER"
          />
          <StatCard
            icon="🏢"
            label="Hirers"
            value={fmt(o?.totalHirers)}
            sub="Registered"
            link="/admin/users?role=HIRER"
          />
          <StatCard
            icon="📋"
            label="Total Bookings"
            value={fmt(o?.totalBookings)}
            sub={`${o?.activeBookings || 0} active`}
            link="/admin/bookings"
            delta={o?.newBookingsToday}
          />
          <StatCard
            icon="💰"
            label="Platform Revenue"
            value={fmt(o?.totalRevenue, "₦")}
            sub="Fees earned"
            accent="orange"
            link="/admin/payments"
          />
          <StatCard
            icon="💸"
            label="Pending Payouts"
            value={fmt(o?.pendingPayouts, "₦")}
            sub={`${o?.pendingPayoutCount || 0} requests`}
            accent={o?.pendingPayoutCount > 0 ? "amber" : undefined}
            link="/admin/payments?tab=withdrawals"
          />
        </div>

        {/* ── Secondary Quick-Stats Bar ── */}
        <div className={styles.secondaryBar}>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>✅</span>
            <div>
              <div className={styles.qsValue}>{fmt(o?.completedBookings)}</div>
              <div className={styles.qsLabel}>Completed</div>
            </div>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>💼</span>
            <div>
              <div className={styles.qsValue}>{fmt(o?.totalGMV, "₦")}</div>
              <div className={styles.qsLabel}>Gross Volume</div>
            </div>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>📝</span>
            <div>
              <div className={styles.qsValue}>
                {fmt(o?.openJobPosts)}
                <span className={styles.qsOf}>/{fmt(o?.totalJobPosts)}</span>
              </div>
              <div className={styles.qsLabel}>Open Jobs</div>
            </div>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>⭐</span>
            <div>
              <div className={styles.qsValue}>{fmt(o?.totalReviews)}</div>
              <div className={styles.qsLabel}>Reviews</div>
            </div>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>⚖️</span>
            <div>
              <div
                className={styles.qsValue}
                style={o?.disputedBookings > 0 ? { color: "var(--red)" } : {}}
              >
                {fmt(o?.disputedBookings)}
              </div>
              <div className={styles.qsLabel}>Disputes</div>
            </div>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.qsIcon}>🏷️</span>
            <div>
              <div className={styles.qsValue}>{fmt(o?.totalCategories)}</div>
              <div className={styles.qsLabel}>Categories</div>
            </div>
          </div>
        </div>

        {/* ── Charts Row: Revenue + Signups ── */}
        <div className={styles.twoCol}>
          {/* Revenue Chart */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Platform Revenue</h2>
                <p className={styles.panelSub}>
                  Fees collected vs gross volume · last 6 months
                </p>
              </div>
              <Link to="/admin/payments" className={styles.panelLink}>
                Details →
              </Link>
            </div>
            {revenueEntries.length === 0 ? (
              <div className={styles.empty}>
                <span>📊</span>
                <p>No revenue data yet</p>
              </div>
            ) : (
              <div className={styles.barChart}>
                {revenueEntries.map(([month, v]) => {
                  const rev = typeof v === "object" ? v.revenue || 0 : v || 0;
                  const gmv = typeof v === "object" ? v.gmv || 0 : 0;
                  return (
                    <div key={month} className={styles.barWrap}>
                      <div className={styles.barLabel}>{month.slice(5)}</div>
                      <div className={styles.barTrack}>
                        {gmv > 0 && (
                          <div
                            className={styles.barFillGmv}
                            style={{
                              height: `${(gmv / Math.max(...revenueEntries.map(([, x]) => (typeof x === "object" ? x.gmv : 0)), 1)) * 100}%`,
                            }}
                          />
                        )}
                        <div
                          className={styles.barFill}
                          style={{ height: `${(rev / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <div className={styles.barValue}>₦{fmt(rev)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={styles.chartLegend}>
              <span
                className={styles.legendDot}
                style={{ background: "var(--orange)" }}
              />{" "}
              Revenue
              <span
                className={styles.legendDot}
                style={{
                  background: "rgba(255,107,0,0.2)",
                  marginLeft: "1rem",
                }}
              />{" "}
              GMV
            </div>
          </div>

          {/* Signups Chart */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>User Signups</h2>
                <p className={styles.panelSub}>
                  Workers vs Hirers · last 6 months
                </p>
              </div>
              <Link to="/admin/users" className={styles.panelLink}>
                All Users →
              </Link>
            </div>
            {signupEntries.length === 0 ? (
              <div className={styles.empty}>
                <span>👥</span>
                <p>No signup data yet</p>
              </div>
            ) : (
              <div className={styles.barChart}>
                {signupEntries.map(([month, v]) => (
                  <div key={month} className={styles.barWrap}>
                    <div className={styles.barLabel}>{month.slice(5)}</div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillWorker}
                        style={{
                          height: `${((v.workers || 0) / maxSignups) * 100}%`,
                        }}
                      />
                      <div
                        className={styles.barFillHirer}
                        style={{
                          height: `${((v.hirers || 0) / maxSignups) * 100}%`,
                        }}
                      />
                    </div>
                    <div className={styles.barValue}>{v.total || 0}</div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.chartLegend}>
              <span
                className={styles.legendDot}
                style={{ background: "#60a5fa" }}
              />{" "}
              Workers
              <span
                className={styles.legendDot}
                style={{ background: "#a78bfa", marginLeft: "1rem" }}
              />{" "}
              Hirers
            </div>
          </div>
        </div>

        {/* ── Booking Funnel + Top Categories ── */}
        <div className={styles.twoCol}>
          {/* Booking Funnel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Booking Funnel</h2>
                <p className={styles.panelSub}>
                  Conversion through booking stages
                </p>
              </div>
            </div>
            <div className={styles.funnelWrap}>
              {funnel.map((step, i) => {
                const pct = Math.round((step.count / funnelBase) * 100);
                const colors = [
                  "var(--orange)",
                  "#60a5fa",
                  "#a78bfa",
                  "var(--green)",
                ];
                return (
                  <div key={step.stage} className={styles.funnelStep}>
                    <div className={styles.funnelMeta}>
                      <span className={styles.funnelLabel}>{step.stage}</span>
                      <span className={styles.funnelCount}>
                        {fmtFull(step.count)}
                      </span>
                    </div>
                    <div className={styles.funnelTrack}>
                      <div
                        className={styles.funnelBar}
                        style={{
                          width: `${pct}%`,
                          background: colors[i % colors.length],
                        }}
                      />
                    </div>
                    <span className={styles.funnelPct}>{pct}%</span>
                  </div>
                );
              })}
              {funnel.length === 0 && (
                <div className={styles.empty}>
                  <span>📊</span>
                  <p>No funnel data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Categories */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Top Categories</h2>
              <Link to="/admin/categories" className={styles.panelLink}>
                Manage →
              </Link>
            </div>
            {top.slice(0, 6).map((cat, i) => (
              <div key={cat.id} className={styles.catRow}>
                <span className={styles.catRank}>#{i + 1}</span>
                <span className={styles.catIcon}>{cat.icon || "🔧"}</span>
                <div className={styles.catInfo}>
                  <span className={styles.catName}>{cat.name}</span>
                  <div className={styles.catBar}>
                    <div
                      className={styles.catBarFill}
                      style={{
                        width: `${Math.min(
                          100,
                          ((cat._count?.bookings || 0) /
                            Math.max(top[0]?._count?.bookings || 1, 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className={styles.catStats}>
                  <span className={styles.catCount}>
                    {cat._count?.bookings || 0} bookings
                  </span>
                  <span className={styles.catWorkers}>
                    {cat._count?.workers || 0} workers
                  </span>
                </div>
              </div>
            ))}
            {top.length === 0 && (
              <div className={styles.empty}>
                <span>🏷️</span>
                <p>No categories yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Bookings + Active Disputes ── */}
        <div className={styles.twoCol}>
          {/* Recent Bookings */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recent Bookings</h2>
              <Link to="/admin/bookings" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {recentBookings.length === 0 ? (
              <div className={styles.empty}>
                <span>📋</span>
                <p>No bookings yet</p>
              </div>
            ) : (
              recentBookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/bookings`}
                  className={styles.bookingRow}
                >
                  <div className={styles.bookingInfo}>
                    <p className={styles.bookingTitle}>
                      {b.title || "Untitled Booking"}
                    </p>
                    <p className={styles.bookingMeta}>
                      {b.hirer?.firstName} → {b.worker?.firstName} ·{" "}
                      {b.category?.name}
                    </p>
                  </div>
                  <div className={styles.bookingRight}>
                    <Badge status={b.status} />
                    <span className={styles.bookingAmount}>
                      {fmtFull(b.agreedRate, "₦")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Active Disputes */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Active Disputes</h2>
              <Link to="/admin/disputes" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {disputes.length === 0 ? (
              <div className={styles.empty}>
                <span>⚖️</span>
                <p>No active disputes 🎉</p>
              </div>
            ) : (
              disputes.slice(0, 4).map((d) => (
                <Link
                  key={d.id}
                  to="/admin/disputes"
                  className={styles.disputeRow}
                >
                  <div className={styles.disputeAvatars}>
                    <div className={styles.miniAvatar}>
                      {d.hirer?.firstName?.[0] || "?"}
                    </div>
                    <div
                      className={`${styles.miniAvatar} ${styles.miniAvatarB}`}
                    >
                      {d.worker?.firstName?.[0] || "?"}
                    </div>
                  </div>
                  <div className={styles.disputeInfo}>
                    <p className={styles.disputeTitle}>
                      {d.title || "Unnamed Booking"}
                    </p>
                    <p className={styles.disputeMeta}>
                      {d.hirer?.firstName} vs {d.worker?.firstName}
                    </p>
                  </div>
                  <span className={styles.disputeAmount}>
                    {fmtFull(d.agreedRate, "₦")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Top Workers + Top Hirers ── */}
        <div className={styles.twoCol}>
          {/* Top Workers */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Top Workers</h2>
              <Link to="/admin/users?role=WORKER" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {tw.length === 0 ? (
              <div className={styles.empty}>
                <span>🔨</span>
                <p>No worker data yet</p>
              </div>
            ) : (
              tw.map((w, i) => (
                <div key={w.id} className={styles.leaderRow}>
                  <span
                    className={`${styles.leaderRank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : ""}`}
                  >
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </span>
                  <div className={styles.leaderAvatar}>
                    {w.avatar ? (
                      <img src={w.avatar} alt="" className={styles.laImg} />
                    ) : (
                      <span>
                        {w.firstName?.[0]}
                        {w.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.leaderInfo}>
                    <span className={styles.leaderName}>
                      {w.firstName} {w.lastName}
                    </span>
                    <span className={styles.leaderMeta}>
                      {w.workerProfile?.verificationStatus === "VERIFIED" && (
                        <span className={styles.verifiedBadge}>✓ Verified</span>
                      )}
                      {w.workerProfile?.hourlyRate
                        ? ` ₦${fmtFull(w.workerProfile.hourlyRate)}/hr`
                        : ""}
                    </span>
                  </div>
                  <span className={styles.leaderStat}>
                    {w._count?.bookingsAsWorker || 0}
                    <span className={styles.leaderStatLabel}> jobs</span>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Top Hirers */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Top Hirers</h2>
              <Link to="/admin/users?role=HIRER" className={styles.panelLink}>
                All →
              </Link>
            </div>
            {th.length === 0 ? (
              <div className={styles.empty}>
                <span>🏢</span>
                <p>No hirer data yet</p>
              </div>
            ) : (
              th.map((h, i) => (
                <div key={h.id} className={styles.leaderRow}>
                  <span
                    className={`${styles.leaderRank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : ""}`}
                  >
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </span>
                  <div className={styles.leaderAvatar}>
                    {h.avatar ? (
                      <img src={h.avatar} alt="" className={styles.laImg} />
                    ) : (
                      <span>
                        {h.firstName?.[0]}
                        {h.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.leaderInfo}>
                    <span className={styles.leaderName}>
                      {h.firstName} {h.lastName}
                    </span>
                    <span className={styles.leaderMeta}>
                      {h._count?.bookingsAsHirer || 0} bookings placed
                    </span>
                  </div>
                  <span className={styles.leaderStat}>
                    {fmt(h.hirerProfile?.totalSpent, "₦")}
                    <span className={styles.leaderStatLabel}> spent</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
