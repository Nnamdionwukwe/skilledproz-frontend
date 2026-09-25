// src/pages/admin/AdminInsurance.jsx
// Full admin insurance oversight.
//
// Endpoints used:
//   GET  /api/admin/insurance/stats       → KPIs + per-plan breakdown
//   GET  /api/admin/insurance/policies    → paginated policy list (search, filter, date range)
//   GET  /api/insurance/plans             → canonical PLANS (used for cards + plan meta)
//
// Renders every field the backend sends:
//   • Policy core: id, planId, planName, reference, bookingId, coverageAmount,
//                   coverageCurrency, price, currency, flwTransactionId,
//                   status, purchasedAt
//   • Notification shell: id, type, title, body, isRead, createdAt, updatedAt
//   • Owner user: id, firstName, lastName, email, avatar, role, country, city
//   • Linked booking (if any): id, title, status, currency, scheduledAt,
//                               hirer, worker
//   • Per-plan revenue breakdown

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Star,
  Gem,
  BarChart2,
  ClipboardList,
  Wallet,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Info,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import styles from "./AdminInsurance.module.css";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";

// ── Fallback plan meta (used if /insurance/plans fails, and for icon colours) ──
// Plan `icon` is now a Lucide component reference instead of an emoji string.
const PLAN_META_FALLBACK = [
  {
    id: "basic",
    name: "Basic Protection",
    description: "Property damage cover up to $5,000",
    price: 5,
    currency: "USD",
    coverageAmount: 5000,
    coverageCurrency: "USD",
    badge: "BASIC",
    color: "blue",
    Icon: Shield,
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
    coverageCurrency: "USD",
    badge: "POPULAR",
    color: "orange",
    Icon: Star,
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
    coverageCurrency: "USD",
    badge: "PREMIUM",
    color: "purple",
    Icon: Gem,
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

// Look up a Lucide icon for a plan id (returns the component, not an element)
function iconForPlan(plan) {
  if (plan?.Icon) return plan.Icon;
  const fb = PLAN_META_FALLBACK.find((p) => p.id === plan?.id);
  return fb?.Icon || Shield;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString();
}
function fmtMoney(n, currency = "USD") {
  const cur = currency || "USD";
  const sym = cur === "USD" ? "$" : cur === "NGN" ? "₦" : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, green }) {
  const Icon = icon;
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""} ${green ? styles.statCardGreen : ""}`}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={20} /> : null}
      </span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function Alert({ type, text, onClose }) {
  if (!text) return null;
  const Icon = type === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon size={14} /> {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

// Policy table skeleton — mirrors the real policy table layout
function SkeletonPolicies({ rows = 8 }) {
  return (
    <div className={styles.skeletonWrap}>
      <div className={styles.skeletonRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skCell} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonBodyRow}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} className={styles.skBar} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Overview skeleton — KPI cards + breakdown rows + coverage cards
function SkeletonOverview() {
  return (
    <>
      {/* KPI grid skeleton */}
      <div className={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={styles.statCard}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={styles.skBlockIcon} />
            <div className={styles.skBlockValue} />
            <div className={styles.skBlockLabel} />
          </div>
        ))}
      </div>

      {/* Revenue by Plan skeleton */}
      <div className={styles.section}>
        <div className={styles.skSectionTitle} />
        <div className={styles.planBreakdown}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={styles.breakdownRow}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={styles.breakdownLeft}>
                <div className={styles.skBlockIcon} />
                <div style={{ flex: 1 }}>
                  <div className={styles.skBlockLabel} />
                  <div className={styles.skBlockSub} />
                </div>
              </div>
              <div className={styles.breakdownBar}>
                <div className={styles.skBarTrack} />
              </div>
              <div className={styles.breakdownRight}>
                <div className={styles.skBlockLabel} />
                <div className={styles.skBlockValueSm} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage tiers skeleton */}
      <div className={styles.section}>
        <div className={styles.skSectionTitle} />
        <div className={styles.coverageGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={styles.coverageCard}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={styles.coverageHeader}>
                <div className={styles.skBlockIcon} />
                <div className={styles.skBlockPill} />
              </div>
              <div className={styles.skBlockLabel} />
              <div className={styles.skBlockValue} />
              <div className={styles.skBlockSub} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Plans tab skeleton — plan cards grid
function SkeletonPlans() {
  return (
    <div className={styles.plansGrid}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={styles.planCard}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className={styles.planHeader}>
            <div className={styles.skBlockIcon} />
            <div className={styles.skBlockPill} />
          </div>
          <div className={styles.skBlockValue} />
          <div className={styles.skBlockSub} />
          <div className={styles.skBlockValue} />
          <div className={styles.skBlockRow}>
            <div className={styles.skBlockSub} />
            <div className={styles.skBlockSub} />
          </div>
          <div className={styles.skBlockRow}>
            <div className={styles.skBlockSub} />
            <div className={styles.skBlockSub} />
          </div>
          <div className={styles.skBlockRow}>
            <div className={styles.skBlockSub} />
            <div className={styles.skBlockSub} />
          </div>
          <div className={styles.skBlockTall} />
        </div>
      ))}
    </div>
  );
}

function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={styles.dimText}>—</span>;
  return (
    <span className={styles.copyPill} title={String(text)}>
      <span className={styles.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={styles.copyPillBtn}
        onClick={async (e) => {
          e.stopPropagation();
          if (await copyText(text)) {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }
        }}
        title="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, stats }) {
  const pc = PLAN_COLORS[plan.color] || PLAN_COLORS.blue;
  const planStats = stats?.[plan.id] || { total: 0, revenue: 0, active: 0 };
  const Icon = iconForPlan(plan);

  return (
    <div
      className={`${styles.planCard} ${plan.popular ? styles.planCardPopular : ""}`}
      style={{ borderColor: plan.popular ? pc.border : undefined }}
    >
      {plan.popular && (
        <div
          className={styles.popularBadge}
          style={{
            backgroundColor: pc.text,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Star size={10} /> Most Popular
        </div>
      )}

      <div className={styles.planHeader}>
        <div
          className={styles.planIconWrap}
          style={{
            backgroundColor: pc.bg,
            borderColor: pc.border,
            color: pc.text,
          }}
        >
          <Icon size={24} />
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
        <span className={styles.planPriceAmount}>
          {fmtMoney(plan.price, plan.currency)}
        </span>
        <span className={styles.planPricePer}>/booking</span>
      </div>

      <div className={styles.planCoverage}>
        Coverage up to{" "}
        <strong>
          {fmtMoney(
            plan.coverageAmount,
            plan.coverageCurrency || plan.currency,
          )}
        </strong>
      </div>

      <ul className={styles.planFeatures}>
        {plan.features.map((f) => (
          <li key={f} className={styles.planFeature}>
            <span className={styles.planFeatureTick}>
              <Check size={12} />
            </span>
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
            {fmtMoney(planStats.revenue, plan.currency)}
          </p>
          <p className={styles.planStatLabel}>Revenue</p>
        </div>
      </div>
    </div>
  );
}

// ── Policy Detail Modal ───────────────────────────────────────────────────────
function PolicyDetailModal({ policy, plan, onClose }) {
  const pc = PLAN_COLORS[plan?.color || "blue"];
  const cur = policy.currency || "USD";
  const PlanIcon = iconForPlan(plan);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalWide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Shield size={15} /> Policy — <code>{policy.reference}</code>
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* User card */}
          <div className={styles.userCard}>
            <div className={styles.avatarLg}>
              {policy.user?.avatar ? (
                <img src={policy.user.avatar} alt="" />
              ) : (
                <span>{initials(policy.user)}</span>
              )}
            </div>
            <div className={styles.userCardInfo}>
              <p className={styles.userCardName}>
                {policy.user?.firstName} {policy.user?.lastName}
              </p>
              <p className={styles.userCardEmail}>{policy.user?.email}</p>
              <p className={styles.userCardMeta}>
                {policy.user?.role}
                {policy.user?.city || policy.user?.country
                  ? ` · ${[policy.user?.city, policy.user?.country].filter(Boolean).join(", ")}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Plan hero */}
          <div
            className={`${styles.planHero}`}
            style={{ borderColor: pc.border }}
          >
            <span className={styles.planHeroIcon} style={{ color: pc.text }}>
              <PlanIcon size={26} />
            </span>
            <div className={styles.planHeroInfo}>
              <span className={styles.planHeroTier}>
                {policy.planName || plan?.name || "—"}
              </span>
              <span className={styles.planHeroPrice}>
                {fmtMoney(policy.price, cur)}
              </span>
            </div>
            <span
              className={styles.statusBadge}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <CheckCircle2 size={11} /> {policy.status || "ACTIVE"}
            </span>
          </div>

          {/* Identifiers */}
          <p className={styles.sectionTitle}>Identifiers</p>
          <div className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Notification ID</span>
              <CopyPill
                text={policy.notificationId}
                label={policy.notificationId}
              />
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Reference</span>
              <CopyPill text={policy.reference} />
            </div>
            {policy.flwTransactionId && (
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>FLW Transaction ID</span>
                <CopyPill text={String(policy.flwTransactionId)} />
              </div>
            )}
            {policy.user?.id && (
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>User ID</span>
                <CopyPill
                  text={policy.user.id}
                  label={policy.user.id.slice(0, 12) + "…"}
                />
              </div>
            )}
          </div>

          {/* Plan meta */}
          <p className={styles.sectionTitle}>Plan details</p>
          <div className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Plan ID</span>
              <span className={styles.detailVal}>{policy.planId || "—"}</span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Plan name</span>
              <span className={styles.detailVal}>{policy.planName || "—"}</span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Price</span>
              <span className={styles.detailVal}>
                {fmtMoney(policy.price, cur)}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Payment currency</span>
              <span className={styles.detailVal}>{cur}</span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Coverage amount</span>
              <span className={styles.detailVal}>
                {fmtMoney(
                  policy.coverageAmount,
                  policy.coverageCurrency || "USD",
                )}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Coverage currency</span>
              <span className={styles.detailVal}>
                {policy.coverageCurrency || "USD"}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Status</span>
              <span className={styles.detailVal}>
                {policy.status || "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Booking link */}
          {policy.booking ? (
            <>
              <p className={styles.sectionTitle}>Linked booking</p>
              <div className={styles.detailGrid}>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Booking ID</span>
                  <CopyPill
                    text={policy.booking.id}
                    label={policy.booking.id.slice(0, 12) + "…"}
                  />
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Title</span>
                  <span className={styles.detailVal}>
                    {policy.booking.title || "—"}
                  </span>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailVal}>
                    {policy.booking.status || "—"}
                  </span>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Currency</span>
                  <span className={styles.detailVal}>
                    {policy.booking.currency || "—"}
                  </span>
                </div>
                {policy.booking.scheduledAt && (
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>Scheduled</span>
                    <span className={styles.detailVal}>
                      {fmtDateTime(policy.booking.scheduledAt)}
                    </span>
                  </div>
                )}
                {policy.booking.hirer && (
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>Hirer</span>
                    <span className={styles.detailVal}>
                      {policy.booking.hirer.firstName}{" "}
                      {policy.booking.hirer.lastName}
                    </span>
                  </div>
                )}
                {policy.booking.worker && (
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>Worker</span>
                    <span className={styles.detailVal}>
                      {policy.booking.worker.firstName}{" "}
                      {policy.booking.worker.lastName}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className={styles.sectionTitle}>Linked booking</p>
              <p className={styles.noBooking}>
                Standalone policy — not attached to any booking.
              </p>
            </>
          )}

          {/* Notification shell */}
          <p className={styles.sectionTitle}>Notification record</p>
          <div className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailVal}>{policy.type || "—"}</span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Read</span>
              <span className={styles.detailVal}>
                {policy.isRead ? "Yes" : "No"}
              </span>
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Created</span>
              <span className={styles.detailVal}>
                {fmtDateTime(policy.createdAt)}
              </span>
            </div>
            {policy.updatedAt && (
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Updated</span>
                <span className={styles.detailVal}>
                  {fmtDateTime(policy.updatedAt)}
                </span>
              </div>
            )}
            {policy.purchasedAt && (
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Purchased</span>
                <span className={styles.detailVal}>
                  {fmtDateTime(policy.purchasedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Raw title + body */}
          {policy.title && (
            <div className={styles.rawBox}>
              <p className={styles.rawLabel}>Notification title</p>
              <p className={styles.rawText}>{policy.title}</p>
            </div>
          )}
          {policy.body && (
            <div className={styles.rawBox}>
              <p className={styles.rawLabel}>Notification body</p>
              <p className={styles.rawText}>{policy.body}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Policy Row ────────────────────────────────────────────────────────────────
function PolicyRow({ policy, plans, onDetail }) {
  const plan = plans.find(
    (p) => p.id === policy.planId || p.name === policy.planName,
  );
  const pc = PLAN_COLORS[plan?.color || "blue"];
  const cur = policy.currency || "USD";
  const PlanIcon = iconForPlan(plan);

  return (
    <tr
      className={styles.tableRow}
      onClick={() => onDetail(policy)}
      style={{ cursor: "pointer" }}
    >
      <td className={styles.td}>
        <code className={styles.refCode}>{policy.reference || "—"}</code>
      </td>
      <td className={styles.td}>
        <div className={styles.userCell}>
          <div className={styles.avatarFallback}>
            {policy.user?.avatar ? (
              <img src={policy.user.avatar} alt="" />
            ) : (
              initials(policy.user)
            )}
          </div>
          <div>
            <p className={styles.userName}>
              {policy.user?.firstName} {policy.user?.lastName}
            </p>
            <p className={styles.userEmail}>{policy.user?.email || "—"}</p>
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
          <PlanIcon size={11} /> {policy.planName || plan?.name || "—"}
        </span>
      </td>
      <td className={styles.td}>
        <span className={styles.coverageBadge}>
          {fmtMoney(policy.coverageAmount, policy.coverageCurrency || "USD")}
        </span>
      </td>
      <td className={styles.td}>
        {policy.price ? (
          <span className={styles.priceTag}>{fmtMoney(policy.price, cur)}</span>
        ) : (
          "—"
        )}
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
        <span
          className={`${styles.statusBadge} ${styles.statusActive}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <CheckCircle2 size={11} /> {policy.status || "ACTIVE"}
        </span>
      </td>
      <td className={styles.td}>
        <span className={styles.dimText}>
          {timeAgo(policy.purchasedAt || policy.createdAt)}
        </span>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminInsurance() {
  const [tab, setTab] = useState("overview"); // "overview" | "policies" | "plans"

  // Plans (fetched from backend — canonical source)
  const [plans, setPlans] = useState(PLAN_META_FALLBACK);

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Policies
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Modal
  const [detailTarget, setDetailTarget] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const LIMIT = 20;

  // ── Load plans (canonical) ─────────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/insurance/plans")
      .then((r) => {
        const list = r.data.data?.plans;
        if (Array.isArray(list) && list.length) {
          // Merge with fallback meta (badge, color, Icon) since backend omits them.
          const merged = list.map((p) => {
            const fb = PLAN_META_FALLBACK.find((f) => f.id === p.id) || {};
            return {
              ...fb,
              ...p,
              badge: fb.badge || p.id.toUpperCase(),
              color: fb.color || "blue",
              Icon: fb.Icon || Shield,
            };
          });
          setPlans(merged);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/insurance/stats");
      setStats(res.data.data);
    } catch {
      setError("Failed to load insurance stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Load policies ──────────────────────────────────────────────────────────
  const loadPolicies = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (planFilter) params.planId = planFilter;
        if (search) params.search = search;
        if (from) params.from = from;
        if (to) params.to = to;

        const res = await api.get("/admin/insurance/policies", { params });
        const d = res.data.data;
        setPolicies(d.policies || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        setError("Failed to load insurance policies.");
      } finally {
        setLoading(false);
      }
    },
    [planFilter, search, from, to],
  );

  useEffect(() => {
    if (tab === "policies") loadPolicies(1);
  }, [tab, loadPolicies]);

  // ── Overview derived numbers ───────────────────────────────────────────────
  const overview = stats?.overview || {};
  const perPlan = stats?.perPlan || {};
  const totalRevenue = overview.totalRevenue || 0;
  const totalPolicies = overview.totalPolicies || 0;
  const avgPrice = overview.avgPrice || 0;

  return (
    <AdminLayout>
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
            { key: "overview", label: "Overview", Icon: BarChart2 },
            { key: "policies", label: "Policies", Icon: ClipboardList },
            { key: "plans", label: "Plans", Icon: Shield },
          ].map((t) => {
            const TIcon = t.Icon;
            return (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                onClick={() => setTab(t.key)}
              >
                <TIcon size={13} />
                <span style={{ marginLeft: 6 }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className={styles.tabContent}>
            {statsLoading ? (
              <SkeletonOverview />
            ) : (
              <>
                {/* KPI cards */}
                <div className={styles.statsGrid}>
                  <StatCard
                    icon={ClipboardList}
                    label="Total Policies"
                    value={fmt(totalPolicies)}
                    sub="All time"
                  />
                  <StatCard
                    icon={Wallet}
                    label="Total Revenue"
                    value={fmtMoney(totalRevenue, overview.currency || "USD")}
                    sub="Flutterwave processed"
                    accent
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Active Policies"
                    value={fmt(overview.activePolicies || 0)}
                    green
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Avg Policy Price"
                    value={fmtMoney(avgPrice, overview.currency || "USD")}
                    sub="Per policy"
                  />
                </div>

                {/* Plan breakdown */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Revenue by Plan</h2>
                  <div className={styles.planBreakdown}>
                    {plans.map((plan) => {
                      const ps = perPlan[plan.id] || {
                        total: 0,
                        revenue: 0,
                        active: 0,
                      };
                      const pc = PLAN_COLORS[plan.color] || PLAN_COLORS.blue;
                      const pct =
                        totalPolicies > 0
                          ? Math.round((ps.total / totalPolicies) * 100)
                          : 0;
                      const PIcon = iconForPlan(plan);
                      return (
                        <div key={plan.id} className={styles.breakdownRow}>
                          <div className={styles.breakdownLeft}>
                            <span
                              className={styles.breakdownIcon}
                              style={{
                                backgroundColor: pc.bg,
                                borderColor: pc.border,
                                color: pc.text,
                              }}
                            >
                              <PIcon size={18} />
                            </span>
                            <div>
                              <p className={styles.breakdownName}>
                                {plan.name}
                              </p>
                              <p className={styles.breakdownPrice}>
                                {fmtMoney(plan.price, plan.currency)} / booking
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
                              {fmtMoney(ps.revenue, plan.currency)}
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
                    {plans.map((plan) => {
                      const pc = PLAN_COLORS[plan.color] || PLAN_COLORS.blue;
                      const CIcon = iconForPlan(plan);
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
                            <span style={{ color: pc.text }}>
                              <CIcon size={22} />
                            </span>
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
                            {fmtMoney(
                              plan.coverageAmount,
                              plan.coverageCurrency || "USD",
                            )}
                          </p>
                          <p className={styles.coveragePrice}>
                            {fmtMoney(plan.price, plan.currency)} per booking
                          </p>
                          {plan.popular && (
                            <div
                              className={styles.coveragePopularTag}
                              style={{
                                backgroundColor: pc.text,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Star size={10} /> Most Popular
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
                placeholder="Search by email, ref, name, or booking ID…"
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
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className={styles.select}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                title="From"
              />
              <input
                type="date"
                className={styles.select}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                title="To"
              />

              {(search || planFilter || from || to) && (
                <button
                  className={styles.btnOutline}
                  onClick={() => {
                    setSearch("");
                    setPlanFilter("");
                    setFrom("");
                    setTo("");
                    setPage(1);
                  }}
                >
                  <X size={13} /> Clear
                </button>
              )}

              <button
                className={styles.btnOutline}
                onClick={() => loadPolicies(1)}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <p className={styles.resultsCount}>
              {total} {total === 1 ? "policy" : "policies"} found
            </p>

            {loading ? (
              <SkeletonPolicies rows={LIMIT} />
            ) : policies.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Shield size={40} />
                </span>
                <p className={styles.emptyTitle}>No policies found</p>
                <p className={styles.emptySub}>
                  {search || planFilter || from || to
                    ? "Try adjusting your filters."
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
                      {policies.map((pol) => (
                        <PolicyRow
                          key={pol.id}
                          policy={pol}
                          plans={plans}
                          onDetail={setDetailTarget}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {pages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => loadPolicies(page - 1)}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={page >= pages}
                      onClick={() => loadPolicies(page + 1)}
                    >
                      Next <ChevronRight size={13} />
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
              <span style={{ color: "#3b82f6", flexShrink: 0 }}>
                <Info size={18} />
              </span>
              <p>
                Plans are defined in{" "}
                <code>src/controllers/insurance.controller.js</code> as the{" "}
                <code>PLANS</code> constant. To change pricing or coverage,
                update that file and redeploy.
              </p>
            </div>

            {statsLoading ? (
              <SkeletonPlans />
            ) : (
              <div className={styles.plansGrid}>
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} stats={perPlan} />
                ))}
              </div>
            )}

            {/* Flutterwave integration info */}
            <div className={styles.section} style={{ marginTop: 24 }}>
              <h2 className={styles.sectionTitle}>Flutterwave Integration</h2>
              <div className={styles.stripeInfo}>
                {[
                  {
                    label: "Checkout Flow",
                    value:
                      "POST /api/insurance/checkout → Flutterwave Checkout Link → Redirect → POST /api/insurance/verify",
                  },
                  {
                    label: "Payment Mode",
                    value:
                      "One-time payment (not subscription). Each booking purchase creates a new session.",
                  },
                  {
                    label: "Currency",
                    value:
                      "USD. Flutterwave handles FX conversion automatically when the buyer's card is in another currency.",
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

        {/* ── Policy Detail Modal ── */}
        {detailTarget && (
          <PolicyDetailModal
            policy={detailTarget}
            plan={plans.find(
              (p) =>
                p.id === detailTarget.planId ||
                p.name === detailTarget.planName,
            )}
            onClose={() => setDetailTarget(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
