import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminAnalytics.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000)
    return `${currency ? currency + " " : ""}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)
    return `${currency ? currency + " " : ""}${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${currency ? currency + " " : ""}${n}`;
}
function fmtFull(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = Number(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}
function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent, delay = 0 }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        {sub && <span className={styles.statSub}>{sub}</span>}
      </div>
      <div className={styles.statValue}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

// ─── Revenue Bar Chart (dual: GMV + Revenue) ──────────────────────────────────

function RevenueChart({ monthly }) {
  if (!monthly?.length)
    return <div className={styles.noData}>No revenue data yet</div>;

  const maxGMV = Math.max(...monthly.map((m) => m.gmv || 0), 1);
  const maxRev = Math.max(...monthly.map((m) => m.revenue || 0), 1);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.barChart}>
        {monthly.map((m) => (
          <div key={m.month} className={styles.barGroup}>
            <div className={styles.barWrap}>
              {/* GMV — background dim bar */}
              <div
                className={styles.barGmv}
                style={{ height: `${Math.max(3, (m.gmv / maxGMV) * 120)}px` }}
                title={`GMV: ₦${fmtFull(m.gmv)}`}
              />
              {/* Revenue — foreground solid bar */}
              <div
                className={styles.bar}
                style={{
                  height: `${Math.max(3, (m.revenue / maxRev) * 120)}px`,
                }}
                title={`Revenue: ₦${fmtFull(m.revenue)}`}
              />
            </div>
            <div className={styles.barLabel}>{m.month?.slice(5)}</div>
            <div className={styles.barVal}>₦{fmt(m.revenue)}</div>
          </div>
        ))}
      </div>
      <div className={styles.chartLegend}>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: "var(--orange)" }}
          />{" "}
          Revenue
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: "rgba(255,107,0,0.2)" }}
          />{" "}
          GMV
        </span>
      </div>
    </div>
  );
}

// ─── Signup Bar Chart (workers vs hirers) ─────────────────────────────────────

function SignupChart({ growth }) {
  if (!growth?.length)
    return <div className={styles.noData}>No signup data yet</div>;

  const maxTotal = Math.max(...growth.map((m) => m.total || 0), 1);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.barChart}>
        {growth.map((m) => (
          <div key={m.month} className={styles.barGroup}>
            <div className={styles.barWrap}>
              <div
                className={styles.barWorker}
                style={{
                  height: `${Math.max(3, ((m.workers || 0) / maxTotal) * 120)}px`,
                }}
                title={`Workers: ${m.workers}`}
              />
              <div
                className={styles.barHirer}
                style={{
                  height: `${Math.max(3, ((m.hirers || 0) / maxTotal) * 120)}px`,
                }}
                title={`Hirers: ${m.hirers}`}
              />
            </div>
            <div className={styles.barLabel}>{m.month?.slice(5)}</div>
            <div className={styles.barVal}>{m.total || 0}</div>
          </div>
        ))}
      </div>
      <div className={styles.chartLegend}>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: "#60a5fa" }}
          />{" "}
          Workers
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: "#a78bfa" }}
          />{" "}
          Hirers
        </span>
      </div>
    </div>
  );
}

// ─── Booking Funnel ───────────────────────────────────────────────────────────

function FunnelChart({ funnel }) {
  if (!funnel?.length)
    return <div className={styles.noData}>No funnel data yet</div>;

  const base = funnel[0]?.count || 1;
  const colors = ["var(--orange)", "#60a5fa", "#a78bfa", "var(--green)"];

  return (
    <div className={styles.funnelWrap}>
      {funnel.map((step, i) => {
        const p = pct(step.count, base);
        return (
          <div key={step.stage} className={styles.funnelStep}>
            <div className={styles.funnelMeta}>
              <span className={styles.funnelLabel}>{step.stage}</span>
              <span className={styles.funnelCount}>{fmtFull(step.count)}</span>
            </div>
            <div className={styles.funnelTrack}>
              <div
                className={styles.funnelBar}
                style={{
                  width: `${Math.max(p, 2)}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
            <span className={styles.funnelPct}>{p}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Provider Breakdown ───────────────────────────────────────────────────────

function ProviderChart({ byProvider }) {
  if (!byProvider || !Object.keys(byProvider).length)
    return <div className={styles.noData}>No provider data yet</div>;

  const entries = Object.entries(byProvider).sort(([, a], [, b]) => b - a);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const colors = [
    "var(--orange)",
    "#60a5fa",
    "#a78bfa",
    "var(--green)",
    "#fb7185",
  ];

  return (
    <div className={styles.providerWrap}>
      {entries.map(([name, val], i) => (
        <div key={name} className={styles.providerRow}>
          <span className={styles.providerName}>{name || "unknown"}</span>
          <div className={styles.providerTrack}>
            <div
              className={styles.providerBar}
              style={{
                width: `${(val / maxVal) * 100}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
          <span className={styles.providerVal}>₦{fmt(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard({ rows, type }) {
  if (!rows?.length) return <div className={styles.noData}>No data yet</div>;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className={styles.leaderList}>
      {rows.map((u, i) => {
        const bookingCount =
          type === "worker"
            ? u._count?.bookingsAsWorker
            : u._count?.bookingsAsHirer;
        const subValue =
          type === "worker"
            ? u.workerProfile?.hourlyRate
              ? `₦${fmtFull(u.workerProfile.hourlyRate)}/hr`
              : ""
            : u.hirerProfile?.totalSpent
              ? `₦${fmt(u.hirerProfile.totalSpent)} spent`
              : "";

        return (
          <div key={u.id} className={styles.leaderRow}>
            <span className={styles.leaderMedal}>
              {medals[i] || `#${i + 1}`}
            </span>
            <div className={styles.leaderAvatar}>
              {u.avatar ? (
                <img src={u.avatar} alt="" />
              ) : (
                `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`
              )}
            </div>
            <div className={styles.leaderInfo}>
              <span className={styles.leaderName}>
                {u.firstName} {u.lastName}
              </span>
              {subValue && <span className={styles.leaderSub}>{subValue}</span>}
              {type === "worker" &&
                u.workerProfile?.verificationStatus === "VERIFIED" && (
                  <span className={styles.verifiedPill}>✓ Verified</span>
                )}
            </div>
            <span className={styles.leaderStat}>
              {fmtFull(bookingCount || 0)}
              <span className={styles.leaderStatLabel}>
                {type === "worker" ? " jobs" : " hires"}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Category Table ───────────────────────────────────────────────────────────

function CategoryTable({ categories }) {
  if (!categories?.length)
    return <div className={styles.noData}>No categories</div>;

  const maxBookings = Math.max(
    ...categories.map((c) => c._count?.bookings || 0),
    1,
  );

  return (
    <div className={styles.catTable}>
      {categories.map((c, i) => (
        <div
          key={c.id}
          className={styles.catRow}
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className={styles.catRank}>#{i + 1}</div>
          <div className={styles.catInfo}>
            <span className={styles.catIcon}>{c.icon || "🔧"}</span>
            <div className={styles.catDetails}>
              <span className={styles.catName}>{c.name}</span>
              <div className={styles.catBar}>
                <div
                  className={styles.catBarFill}
                  style={{
                    width: `${((c._count?.bookings || 0) / maxBookings) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className={styles.catStats}>
            <span className={styles.catBadge}>
              {c._count?.bookings || 0} bookings
            </span>
            <span className={styles.catBadgeDim}>
              {c._count?.workers || 0} workers
            </span>
            {(c._count?.jobPosts ?? 0) > 0 && (
              <span className={styles.catBadgeDim}>
                {c._count.jobPosts} jobs
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────

function Panel({ title, sub, children, accent }) {
  return (
    <div
      className={`${styles.panel} ${accent ? styles[`panelAccent_${accent}`] : ""}`}
    >
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>{title}</h3>
          {sub && <p className={styles.panelSub}>{sub}</p>}
        </div>
      </div>
      <div className={styles.panelBody}>{children}</div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ count = 4, h = 100 }) {
  return (
    <div
      className={styles.skGrid}
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
    >
      {Array.from({ length: count * 3 }).map((_, i) => (
        <div key={i} className={styles.skCard} style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "12M" },
];

export default function AdminAnalytics() {
  const [months, setMonths] = useState(6);
  const [statsData, setStatsData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/stats"),
      api.get(`/admin/analytics/revenue?months=${months}`),
      api.get(`/admin/analytics/users?months=${months}`),
    ])
      .then(([statsRes, revRes, usersRes]) => {
        setStatsData(statsRes.data.data);
        setRevenueData(revRes.data.data);
        setUsersData(usersRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [months, refreshKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const ov = statsData?.overview || {};
  const funnel = statsData?.bookingFunnel || [];
  const topCats = statsData?.topCategories || [];
  const topW = statsData?.topWorkers || [];
  const topH = statsData?.topHirers || [];

  // Revenue from detailed endpoint (array); fallback to stats monthlyRevenue
  const revenueMonthly = revenueData?.monthly || [];
  const byProvider = revenueData?.byProvider || {};

  // User growth from detailed endpoint
  const usersGrowth = usersData?.growth || [];

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Platform</p>
            <h1 className={styles.pageTitle}>Analytics</h1>
          </div>
          <div className={styles.headerRight}>
            {/* Date range selector — drives all three endpoints */}
            <div className={styles.rangeGroup}>
              {MONTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.rangeBtn} ${months === opt.value ? styles.rangeBtnActive : ""}`}
                  onClick={() => setMonths(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              className={styles.refreshBtn}
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Refresh data"
            >
              ↻
            </button>
            <div className={styles.liveTag}>● Live</div>
          </div>
        </div>

        {loading ? (
          <Skeleton count={4} h={96} />
        ) : (
          <>
            {/* ── Overview Stats ── */}
            <div className={styles.statsGrid}>
              {/* Row 1 — Users */}
              <StatCard
                icon="👥"
                label="Total Users"
                value={fmtFull(ov.totalUsers)}
                delay={0}
              />
              <StatCard
                icon="🔨"
                label="Workers"
                value={fmtFull(ov.totalWorkers)}
                delay={0.03}
              />
              <StatCard
                icon="🏢"
                label="Hirers"
                value={fmtFull(ov.totalHirers)}
                delay={0.06}
              />
              <StatCard
                icon="🆕"
                label="New Today"
                value={ov.newUsersToday}
                delay={0.09}
                sub={`+${ov.newBookingsToday ?? 0} bookings`}
              />

              {/* Row 2 — Bookings */}
              <StatCard
                icon="📋"
                label="Total Bookings"
                value={fmtFull(ov.totalBookings)}
                delay={0.12}
              />
              <StatCard
                icon="⚡"
                label="Active"
                value={fmtFull(ov.activeBookings)}
                delay={0.15}
                accent="orange"
              />
              <StatCard
                icon="✅"
                label="Completed"
                value={fmtFull(ov.completedBookings)}
                delay={0.18}
                accent="green"
              />
              <StatCard
                icon="❌"
                label="Cancelled"
                value={fmtFull(ov.cancelledBookings)}
                delay={0.21}
              />

              {/* Row 3 — Money */}
              <StatCard
                icon="💰"
                label="Platform Revenue"
                value={fmt(ov.totalRevenue, "₦")}
                delay={0.24}
                accent="orange"
                sub="Fees earned"
              />
              <StatCard
                icon="📈"
                label="Gross Volume"
                value={fmt(ov.totalGMV, "₦")}
                delay={0.27}
                sub="Total transacted"
              />
              <StatCard
                icon="💸"
                label="Pending Payouts"
                value={fmt(ov.pendingPayouts, "₦")}
                delay={0.3}
                accent={ov.pendingPayoutCount > 0 ? "amber" : undefined}
                sub={`${ov.pendingPayoutCount ?? 0} requests`}
              />
              <StatCard
                icon="⚖️"
                label="Disputes"
                value={fmtFull(ov.disputedBookings)}
                delay={0.33}
                accent={ov.disputedBookings > 0 ? "red" : undefined}
              />

              {/* Row 4 — Platform */}
              <StatCard
                icon="📝"
                label="Total Job Posts"
                value={fmtFull(ov.totalJobPosts)}
                delay={0.36}
              />
              <StatCard
                icon="🟢"
                label="Open Jobs"
                value={fmtFull(ov.openJobPosts)}
                delay={0.39}
              />
              <StatCard
                icon="⭐"
                label="Reviews"
                value={fmtFull(ov.totalReviews)}
                delay={0.42}
              />
              <StatCard
                icon="🏷️"
                label="Categories"
                value={fmtFull(ov.totalCategories)}
                delay={0.45}
              />
            </div>

            {/* ── Revenue + Provider ── */}
            <div className={styles.twoCol}>
              <Panel
                title="Revenue Over Time"
                sub={`Platform fees vs gross volume · last ${months} months`}
              >
                <RevenueChart monthly={revenueMonthly} />
              </Panel>

              <Panel
                title="By Payment Provider"
                sub="GMV split across payment methods"
              >
                <ProviderChart byProvider={byProvider} />
              </Panel>
            </div>

            {/* ── User Growth + Booking Funnel ── */}
            <div className={styles.twoCol}>
              <Panel
                title="User Signups"
                sub={`Workers vs hirers · last ${months} months`}
              >
                <SignupChart growth={usersGrowth} />
              </Panel>

              <Panel
                title="Booking Funnel"
                sub="Conversion through booking stages · all time"
              >
                <FunnelChart funnel={funnel} />
              </Panel>
            </div>

            {/* ── Top Workers + Top Hirers ── */}
            <div className={styles.twoCol}>
              <Panel title="Top Workers" sub="By total bookings completed">
                <Leaderboard rows={topW} type="worker" />
              </Panel>

              <Panel title="Top Hirers" sub="By total bookings placed">
                <Leaderboard rows={topH} type="hirer" />
              </Panel>
            </div>

            {/* ── Top Categories — full width ── */}
            <Panel
              title="Top Categories"
              sub="Ranked by bookings · includes worker and job counts"
            >
              <CategoryTable categories={topCats} />
            </Panel>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
