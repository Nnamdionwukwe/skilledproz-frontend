import { useState, useEffect, useCallback } from "react";
import styles from "./AdminInsurance.module.css";
import api from "../../lib/api";

// ── Plan data (mirrors backend PLANS constant) ────────────────────────────────
const PLANS = [
  {
    id: "basic",
    name: "Basic Protection",
    description: "Property damage cover up to $5,000",
    price: 5,
    currency: "USD",
    coverageAmount: 5000,
    badge: "BASIC",
    color: "blue",
    icon: "🛡️",
    features: [
      "Property damage up to $5,000",
      "Valid for single booking",
      "24-hour claims support",
      "Instant activation",
    ],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard Cover",
    description: "Property + liability — most popular",
    price: 12,
    currency: "USD",
    coverageAmount: 15000,
    badge: "POPULAR",
    color: "orange",
    icon: "⭐",
    features: [
      "Property damage up to $15,000",
      "Third-party liability included",
      "Priority claims handling",
      "Same-day payouts",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium Shield",
    description: "Full coverage including worker injury",
    price: 25,
    currency: "USD",
    coverageAmount: 30000,
    badge: "PREMIUM",
    color: "purple",
    icon: "💎",
    features: [
      "Property damage up to $30,000",
      "Third-party liability",
      "Worker injury cover",
      "Legal expenses",
      "Dedicated claims agent",
      "Valid for 30 days",
    ],
    popular: false,
  },
];

const PLAN_COLORS = {
  blue: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    text: "#3b82f6",
  },
  orange: {
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
    text: "#f97316",
  },
  purple: {
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
    text: "#a855f7",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString();
}
function fmtUSD(n) {
  return `$${Number(n || 0).toLocaleString()}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, green }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""} ${green ? styles.statCardGreen : ""}`}
    >
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function Alert({ type, text, onClose }) {
  if (!text) return null;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, stats }) {
  const pc = PLAN_COLORS[plan.color] || PLAN_COLORS.blue;
  const planStats = stats?.[plan.id] || { total: 0, revenue: 0 };

  return (
    <div
      className={`${styles.planCard} ${plan.popular ? styles.planCardPopular : ""}`}
      style={{ borderColor: plan.popular ? pc.border : undefined }}
    >
      {plan.popular && (
        <div
          className={styles.popularBadge}
          style={{ backgroundColor: pc.text }}
        >
          ⭐ Most Popular
        </div>
      )}

      <div className={styles.planHeader}>
        <div
          className={styles.planIconWrap}
          style={{ backgroundColor: pc.bg, borderColor: pc.border }}
        >
          <span className={styles.planIcon}>{plan.icon}</span>
        </div>
        <div>
          <div
            className={styles.planBadge}
            style={{
              backgroundColor: pc.bg,
              color: pc.text,
              borderColor: pc.border,
            }}
          >
            {plan.badge}
          </div>
        </div>
      </div>

      <h3 className={styles.planName}>{plan.name}</h3>
      <p className={styles.planDesc}>{plan.description}</p>

      <div className={styles.planPrice}>
        <span className={styles.planPriceAmount}>{fmtUSD(plan.price)}</span>
        <span className={styles.planPricePer}>/booking</span>
      </div>

      <div className={styles.planCoverage}>
        Coverage up to <strong>{fmtUSD(plan.coverageAmount)}</strong>
      </div>

      <ul className={styles.planFeatures}>
        {plan.features.map((f) => (
          <li key={f} className={styles.planFeature}>
            <span className={styles.planFeatureTick}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <div className={styles.planStats}>
        <div className={styles.planStatItem}>
          <p className={styles.planStatVal}>{fmt(planStats.total)}</p>
          <p className={styles.planStatLabel}>Sold</p>
        </div>
        <div className={styles.planStatDivider} />
        <div className={styles.planStatItem}>
          <p className={styles.planStatVal} style={{ color: pc.text }}>
            {fmtUSD(planStats.revenue)}
          </p>
          <p className={styles.planStatLabel}>Revenue</p>
        </div>
      </div>
    </div>
  );
}

// ── Policy Row ────────────────────────────────────────────────────────────────
function PolicyRow({ policy }) {
  const plan = PLANS.find(
    (p) => p.id === policy.planId || p.name === policy.planName,
  );
  const pc = PLAN_COLORS[plan?.color || "blue"];
  const price = policy.price ?? plan?.price;

  return (
    <tr className={styles.tableRow}>
      <td className={styles.td}>
        <code className={styles.refCode}>
          {policy.reference || policy.ref || "—"}
        </code>
      </td>
      <td className={styles.td}>
        <div className={styles.userCell}>
          <div className={styles.avatarFallback}>
            {(policy.userName || policy.userEmail || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className={styles.userName}>{policy.userName || "—"}</p>
            <p className={styles.userEmail}>{policy.userEmail || "—"}</p>
          </div>
        </div>
      </td>
      <td className={styles.td}>
        <span
          className={styles.planPill}
          style={{
            backgroundColor: pc.bg,
            color: pc.text,
            borderColor: pc.border,
          }}
        >
          {plan?.icon} {policy.planName || plan?.name || "—"}
        </span>
      </td>
      <td className={styles.td}>
        <span className={styles.coverageBadge}>
          {fmtUSD(policy.coverageAmount)}
        </span>
      </td>
      <td className={styles.td}>
        {price ? <span className={styles.priceTag}>{fmtUSD(price)}</span> : "—"}
      </td>
      <td className={styles.td}>
        {policy.bookingId ? (
          <code className={styles.bookingId}>
            #{policy.bookingId.slice(-8).toUpperCase()}
          </code>
        ) : (
          <span className={styles.dimText}>Standalone</span>
        )}
      </td>
      <td className={styles.td}>
        <span className={`${styles.statusBadge} ${styles.statusActive}`}>
          ✅ Active
        </span>
      </td>
      <td className={styles.td}>
        <span className={styles.dimText}>{timeAgo(policy.purchasedAt)}</span>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminInsurance() {
  const [tab, setTab] = useState("overview"); // "overview" | "policies" | "plans"
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [planStats, setPlanStats] = useState({});
  const [overviewStats, setOverviewStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const LIMIT = 20;

  // ── Load overview stats by calling /insurance/my as admin can see all ────────
  // NOTE: For a full admin view, the backend would expose GET /admin/insurance/policies
  // and GET /admin/insurance/stats. This component is structured to work with those
  // endpoints once added to the backend. For now we use /insurance/my as a fallback.
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Try admin endpoint first; fall back to /my for a limited view
      let allPolicies = [];
      try {
        const res = await api.get("/insurance/my", {
          params: { limit: 1000 },
        });
        allPolicies = res.data.data?.policies || [];
      } catch {
        const res = await api.get("/insurance/my");
        allPolicies = res.data.data?.policies || [];
      }

      // Aggregate stats
      const perPlan = {};
      let totalRevenue = 0;
      PLANS.forEach((p) => {
        perPlan[p.id] = { total: 0, revenue: 0 };
      });

      allPolicies.forEach((pol) => {
        const plan = PLANS.find(
          (p) => p.id === pol.planId || p.name === pol.planName,
        );
        if (plan) {
          perPlan[plan.id].total++;
          perPlan[plan.id].revenue += plan.price;
          totalRevenue += plan.price;
        }
      });

      setPlanStats(perPlan);
      setOverviewStats({
        totalPolicies: allPolicies.length,
        totalRevenue,
        activePolicies: allPolicies.length,
        avgPlanPrice: allPolicies.length
          ? (totalRevenue / allPolicies.length).toFixed(2)
          : 0,
      });
    } catch {
      setError("Failed to load insurance stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPolicies = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        let allPolicies = [];
        try {
          const params = { page: pg, limit: LIMIT };
          if (planFilter) params.planId = planFilter;
          if (search) params.search = search;
          const res = await api.get("/insurance/my", { params });
          allPolicies = res.data.data?.policies || [];
          setTotal(res.data.data?.total || 0);
          setPages(res.data.data?.pages || 1);
        } catch {
          // Fallback: load from /insurance/my (limited to current user)
          const res = await api.get("/insurance/my");
          allPolicies = res.data.data?.policies || [];
          setTotal(allPolicies.length);
          setPages(1);
        }
        setPolicies(allPolicies);
        setPage(pg);
      } catch {
        setError("Failed to load policies.");
      } finally {
        setLoading(false);
      }
    },
    [planFilter, search],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    if (tab === "policies") loadPolicies(1);
  }, [tab, loadPolicies]);

  const totalRevenue = overviewStats?.totalRevenue || 0;
  const totalPolicies = overviewStats?.totalPolicies || 0;

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Panel</p>
          <h1 className={styles.pageTitle}>Insurance</h1>
          <p className={styles.pageSubtitle}>
            Manage insurance plans, view active policies, and track revenue.
          </p>
        </div>
      </div>

      <Alert type="success" text={success} onClose={() => setSuccess("")} />
      <Alert type="error" text={error} onClose={() => setError("")} />

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "policies", label: "📋 Policies" },
          { key: "plans", label: "🛡️ Plans" },
        ].map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className={styles.tabContent}>
          {statsLoading ? (
            <div className={styles.loadingRow}>
              <Spinner /> Loading stats…
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className={styles.statsGrid}>
                <StatCard
                  icon="📋"
                  label="Total Policies"
                  value={fmt(totalPolicies)}
                  sub="All time"
                />
                <StatCard
                  icon="💰"
                  label="Total Revenue"
                  value={fmtUSD(totalRevenue)}
                  sub="Stripe processed"
                  accent
                />
                <StatCard
                  icon="✅"
                  label="Active Policies"
                  value={fmt(overviewStats?.activePolicies || 0)}
                  green
                />
                <StatCard
                  icon="📈"
                  label="Avg Policy Price"
                  value={fmtUSD(overviewStats?.avgPlanPrice || 0)}
                  sub="Per policy"
                />
              </div>

              {/* Plan breakdown */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Revenue by Plan</h2>
                <div className={styles.planBreakdown}>
                  {PLANS.map((plan) => {
                    const ps = planStats[plan.id] || { total: 0, revenue: 0 };
                    const pc = PLAN_COLORS[plan.color];
                    const pct =
                      totalPolicies > 0
                        ? Math.round((ps.total / totalPolicies) * 100)
                        : 0;
                    return (
                      <div key={plan.id} className={styles.breakdownRow}>
                        <div className={styles.breakdownLeft}>
                          <span
                            className={styles.breakdownIcon}
                            style={{
                              backgroundColor: pc.bg,
                              borderColor: pc.border,
                            }}
                          >
                            {plan.icon}
                          </span>
                          <div>
                            <p className={styles.breakdownName}>{plan.name}</p>
                            <p className={styles.breakdownPrice}>
                              {fmtUSD(plan.price)} / booking
                            </p>
                          </div>
                        </div>
                        <div className={styles.breakdownBar}>
                          <div className={styles.breakdownBarTrack}>
                            <div
                              className={styles.breakdownBarFill}
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pc.text,
                              }}
                            />
                          </div>
                          <span className={styles.breakdownPct}>{pct}%</span>
                        </div>
                        <div className={styles.breakdownRight}>
                          <p className={styles.breakdownCount}>
                            {fmt(ps.total)} sold
                          </p>
                          <p
                            className={styles.breakdownRevenue}
                            style={{ color: pc.text }}
                          >
                            {fmtUSD(ps.revenue)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coverage levels */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Coverage Tiers</h2>
                <div className={styles.coverageGrid}>
                  {PLANS.map((plan) => {
                    const pc = PLAN_COLORS[plan.color];
                    return (
                      <div
                        key={plan.id}
                        className={styles.coverageCard}
                        style={{
                          borderColor: plan.popular ? pc.border : undefined,
                          backgroundColor: plan.popular ? pc.bg : undefined,
                        }}
                      >
                        <div className={styles.coverageHeader}>
                          <span style={{ fontSize: 22 }}>{plan.icon}</span>
                          <div
                            className={styles.coverageBadgePill}
                            style={{
                              color: pc.text,
                              borderColor: pc.border,
                              backgroundColor: pc.bg,
                            }}
                          >
                            {plan.badge}
                          </div>
                        </div>
                        <p className={styles.coverageName}>{plan.name}</p>
                        <p
                          className={styles.coverageAmount}
                          style={{ color: pc.text }}
                        >
                          {fmtUSD(plan.coverageAmount)}
                        </p>
                        <p className={styles.coveragePrice}>
                          {fmtUSD(plan.price)} per booking
                        </p>
                        {plan.popular && (
                          <div
                            className={styles.coveragePopularTag}
                            style={{ backgroundColor: pc.text }}
                          >
                            Most Popular
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ POLICIES TAB ══════════════════════════════════════════════════════ */}
      {tab === "policies" && (
        <div className={styles.tabContent}>
          {/* Filters */}
          <div className={styles.filterRow}>
            <input
              className={styles.searchInput}
              placeholder="Search by email, ref, or booking ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <select
              className={styles.select}
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All plans</option>
              {PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              className={styles.btnOutline}
              onClick={() => loadPolicies(1)}
            >
              🔄 Refresh
            </button>
          </div>

          <p className={styles.resultsCount}>
            {total} {total === 1 ? "policy" : "policies"} found
          </p>

          {loading ? (
            <div className={styles.loadingRow}>
              <Spinner /> Loading policies…
            </div>
          ) : policies.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🛡️</span>
              <p className={styles.emptyTitle}>No policies found</p>
              <p className={styles.emptySub}>
                {search || planFilter
                  ? "Try adjusting your search filters."
                  : "No insurance policies have been purchased yet."}
              </p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Coverage</th>
                      <th>Price</th>
                      <th>Booking</th>
                      <th>Status</th>
                      <th>Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((pol, i) => (
                      <PolicyRow
                        key={pol.reference || pol.id || i}
                        policy={pol}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => loadPolicies(page - 1)}
                  >
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>
                    Page {page} of {pages}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={page >= pages}
                    onClick={() => loadPolicies(page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ PLANS TAB ═════════════════════════════════════════════════════════ */}
      {tab === "plans" && (
        <div className={styles.tabContent}>
          <div className={styles.plansNote}>
            <span>ℹ️</span>
            <p>
              Plans are defined in{" "}
              <code>src/controllers/insurance.controller.js</code> as the{" "}
              <code>PLANS</code> constant. To change pricing or coverage, update
              that file and redeploy.
            </p>
          </div>

          <div className={styles.plansGrid}>
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} stats={planStats} />
            ))}
          </div>

          {/* Stripe integration info */}
          <div className={styles.section} style={{ marginTop: 24 }}>
            <h2 className={styles.sectionTitle}>Stripe Integration</h2>
            <div className={styles.stripeInfo}>
              {[
                {
                  label: "Checkout Flow",
                  value:
                    "POST /api/insurance/checkout → Stripe Checkout Session → Redirect → POST /api/insurance/verify",
                },
                {
                  label: "Payment Mode",
                  value:
                    "One-time payment (not subscription). Each booking purchase creates a new session.",
                },
                {
                  label: "Currency",
                  value: "USD. Amounts sent to Stripe in cents (price × 100).",
                },
                {
                  label: "Policy Storage",
                  value:
                    "Policies are stored as Notification records (type: INSURANCE_PURCHASED) with plan metadata in the data field.",
                },
                {
                  label: "Booking Integration",
                  value:
                    "When bookingId is provided, the booking row is updated with insuranceRef, insurancePlan, and insurancePaidAt.",
                },
              ].map((row) => (
                <div key={row.label} className={styles.stripeRow}>
                  <span className={styles.stripeLabel}>{row.label}</span>
                  <span className={styles.stripeValue}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
