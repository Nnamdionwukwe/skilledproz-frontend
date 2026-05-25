// src/pages/subscriptions/AdminSubscriptions.jsx
// Full admin subscription management.
// Endpoints:
//   GET    /admin/subscriptions?status=&tier=&page=&limit=
//   PATCH  /admin/subscriptions/:subscriptionId/cancel  { reason }

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminSubscriptions.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "EXPIRED", label: "Expired" },
  { key: "CANCELLED", label: "Cancelled" },
];

const TIER_META = {
  FREE: { label: "Free", icon: "🆓", color: "dim" },
  PRO: { label: "Pro", icon: "⚡", color: "indigo" },
  ENTERPRISE: { label: "Enterprise", icon: "👑", color: "gold" },
};

const STATUS_META = {
  ACTIVE: { label: "Active", color: "green" },
  PENDING: { label: "Pending", color: "yellow" },
  EXPIRED: { label: "Expired", color: "red" },
  CANCELLED: { label: "Cancelled", color: "dim" },
};

const ROLE_META = {
  WORKER: { label: "Worker", color: "orange" },
  HIRER: { label: "Hirer", color: "indigo" },
};

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function fmtPrice(price, currency = "USD") {
  if (price == null || price === 0) return "Free";
  return `${currency} ${Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

// Build tier breakdown from summary groupBy array
function buildTierBreakdown(summary = []) {
  const tiers = { FREE: {}, PRO: {}, ENTERPRISE: {} };
  summary.forEach(({ tier, status, _count }) => {
    if (!tiers[tier]) tiers[tier] = {};
    tiers[tier][status] = _count;
  });
  return tiers;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm" }) {
  return (
    <div className={`${s.avatar} ${size === "lg" ? s.avatarLg : ""}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, color: "dim" };
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>{m.label}</span>
  );
}

function TierBadge({ tier }) {
  const m = TIER_META[tier] ?? { label: tier, icon: "📦", color: "dim" };
  return (
    <span className={`${s.tierBadge} ${s[`tier_${m.color}`]}`}>
      {m.icon} {m.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] ?? { label: role, color: "dim" };
  return (
    <span className={`${s.roleBadge} ${s[`role_${m.color}`]}`}>{m.label}</span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Tier Breakdown Panel ─────────────────────────────────────────────────────
function TierBreakdown({ summary }) {
  const breakdown = buildTierBreakdown(summary);
  const statuses = ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"];

  return (
    <div className={s.breakdownPanel}>
      <div className={s.breakdownHeader}>
        <span className={s.breakdownTitle}>Plan Breakdown</span>
        <span className={s.breakdownSub}>Count by tier & status</span>
      </div>
      <div className={s.breakdownGrid}>
        {Object.entries(TIER_META).map(([tier, meta]) => {
          const data = breakdown[tier] ?? {};
          const active = data.ACTIVE ?? 0;
          const totalTier = Object.values(data).reduce((a, b) => a + b, 0);
          return (
            <div
              key={tier}
              className={`${s.breakdownCard} ${s[`breakdownCard_${meta.color}`]}`}
            >
              <div className={s.breakdownCardTop}>
                <span className={s.breakdownCardIcon}>{meta.icon}</span>
                <span className={s.breakdownCardLabel}>{meta.label}</span>
              </div>
              <div className={s.breakdownCardCount}>{totalTier}</div>
              <div className={s.breakdownCardSub}>{active} active</div>
              <div className={s.breakdownStatuses}>
                {statuses.map(
                  (st) =>
                    data[st] > 0 && (
                      <div key={st} className={s.breakdownStatRow}>
                        <span className={s.breakdownStatLabel}>
                          {st.toLowerCase()}
                        </span>
                        <span className={s.breakdownStatVal}>{data[st]}</span>
                      </div>
                    ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ sub, onClose, onCancel }) {
  const isActive = sub.status === "ACTIVE";
  const tierMeta = TIER_META[sub.tier] ?? {
    label: sub.tier,
    icon: "📦",
    color: "dim",
  };
  const roleMeta = ROLE_META[sub.role] ?? { label: sub.role, color: "dim" };
  const statusMeta = STATUS_META[sub.status] ?? {
    label: sub.status,
    color: "dim",
  };

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>Subscription Detail</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          {/* User card */}
          <div className={s.userCard}>
            <Avatar user={sub.user} size="lg" />
            <div className={s.userCardInfo}>
              <p className={s.userCardName}>
                {sub.user?.firstName} {sub.user?.lastName}
              </p>
              <p className={s.userCardEmail}>{sub.user?.email}</p>
              <RoleBadge role={sub.user?.role ?? sub.role} />
            </div>
          </div>

          {/* Plan hero */}
          <div className={`${s.planHero} ${s[`planHero_${tierMeta.color}`]}`}>
            <span className={s.planHeroIcon}>{tierMeta.icon}</span>
            <div className={s.planHeroInfo}>
              <span className={s.planHeroTier}>{tierMeta.label} Plan</span>
              <span className={s.planHeroPrice}>
                {fmtPrice(sub.price)}
                <span className={s.planHeroPer}>/mo</span>
              </span>
            </div>
            <span className={`${s.badge} ${s[`badge_${statusMeta.color}`]}`}>
              {statusMeta.label}
            </span>
          </div>

          {/* Detail grid */}
          <div className={s.detailGrid}>
            {[
              {
                label: "Subscription ID",
                value: sub.id?.slice(-8).toUpperCase(),
                mono: true,
              },
              { label: "Role", value: sub.role },
              { label: "Started", value: fmtDate(sub.createdAt) },
              {
                label: "Expires / Renews",
                value: sub.expiresAt
                  ? fmtDate(sub.expiresAt)
                  : sub.renewsAt
                    ? fmtDate(sub.renewsAt)
                    : "—",
              },
              {
                label: "Stripe ID",
                value: sub.stripeSubscriptionId?.slice(-12) ?? "—",
                mono: true,
              },
              {
                label: "Payment Ref",
                value: sub.paymentReference?.slice(-12) ?? "—",
                mono: true,
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className={s.detailCell}>
                <span className={s.detailLabel}>{label}</span>
                <span className={`${s.detailVal} ${mono ? s.mono : ""}`}>
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {isActive && (
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={onClose}>
                Close
              </button>
              <button
                className={s.btnCancel}
                onClick={() => {
                  onClose();
                  onCancel(sub);
                }}
              >
                🚫 Cancel Subscription
              </button>
            </div>
          )}
          {!isActive && (
            <button className={s.btnGhostFull} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({ sub, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/subscriptions/${sub.id}/cancel`, { reason });
      onSuccess(
        `Subscription cancelled for ${sub.user?.firstName} ${sub.user?.lastName}.`,
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to cancel subscription.",
      );
    } finally {
      setLoading(false);
    }
  }

  const tierMeta = TIER_META[sub.tier] ?? { label: sub.tier, icon: "📦" };

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>🚫 Cancel Subscription</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.cancelWarning}>
            <span>⚠️</span>
            <p>
              This will immediately cancel the subscription and notify the user.
              This action cannot be undone.
            </p>
          </div>

          {/* Summary */}
          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>User</span>
              <span className={s.summaryVal}>
                {sub.user?.firstName} {sub.user?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Email</span>
              <span className={s.summaryVal}>{sub.user?.email}</span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Plan</span>
              <span className={s.summaryVal}>
                {tierMeta.icon} {tierMeta.label}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Price</span>
              <span className={`${s.summaryVal} ${s.priceHighlight}`}>
                {fmtPrice(sub.price)}/mo
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Current Status</span>
              <StatusBadge status={sub.status} />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>
              Reason (sent to user as notification)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Fraudulent activity detected. Account subscription suspended pending review."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Keep Active
            </button>
            <button
              className={s.btnCancelConfirm}
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                "🚫 Cancel Subscription"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function SubRow({ sub, index, onDetail, onCancel }) {
  const isActive = sub.status === "ACTIVE";

  return (
    <div className={s.tableRow} style={{ animationDelay: `${index * 0.025}s` }}>
      {/* User */}
      <div className={s.tdUser}>
        <Avatar user={sub.user} />
        <div className={s.tdUserInfo}>
          <span className={s.tdName}>
            {sub.user?.firstName} {sub.user?.lastName}
          </span>
          <span className={s.tdEmail}>{sub.user?.email}</span>
        </div>
      </div>

      {/* Plan */}
      <div className={s.tdPlan}>
        <TierBadge tier={sub.tier} />
      </div>

      {/* Role */}
      <div className={s.tdRole}>
        <RoleBadge role={sub.user?.role ?? sub.role} />
      </div>

      {/* Price */}
      <div className={s.tdPrice}>
        <span className={sub.price > 0 ? s.priceVal : s.priceFree}>
          {fmtPrice(sub.price)}
        </span>
        {sub.price > 0 && <span className={s.pricePer}>/mo</span>}
      </div>

      {/* Status + date */}
      <div className={s.tdStatus}>
        <StatusBadge status={sub.status} />
        <span className={s.tdRelative}>{fmtRelative(sub.createdAt)}</span>
      </div>

      {/* Expires */}
      <div className={s.tdExpiry}>
        {sub.expiresAt
          ? fmtDate(sub.expiresAt)
          : sub.renewsAt
            ? fmtDate(sub.renewsAt)
            : "—"}
      </div>

      {/* Actions */}
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(sub)}
          title="View detail"
        >
          👁
        </button>
        {isActive && (
          <button
            className={s.cancelBtn}
            onClick={() => onCancel(sub)}
            title="Cancel subscription"
          >
            🚫
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Modals
  const [detailTarget, setDetailTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const searchTimer = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (
      pg = 1,
      tab = filter,
      tier = tierFilter,
      role = roleFilter,
      q = search,
    ) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab !== "ALL") params.status = tab;
        if (tier !== "ALL") params.tier = tier;
        if (role !== "ALL") params.role = role;
        if (q.trim()) params.search = q.trim();

        const res = await api.get("/admin/subscriptions", { params });
        const d = res.data.data;

        setSubs(d.subscriptions);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);

        // Summary from first full load
        if (d.summary) setSummary(d.summary);
      } catch {
        showToast("error", "Failed to load subscriptions.");
      } finally {
        setLoading(false);
      }
    },
    [filter, tierFilter, roleFilter, search],
  );

  useEffect(() => {
    load(1, filter, tierFilter, roleFilter, search);
  }, [filter, tierFilter, roleFilter]);

  // ── Derived stats from current page ────────────────────────────────────────
  const activeCount = subs.filter((s) => s.status === "ACTIVE").length;
  const proCount = subs.filter((s) => s.tier === "PRO").length;
  const enterpriseCount = subs.filter((s) => s.tier === "ENTERPRISE").length;
  const totalRevenue = subs.reduce((sum, s) => sum + (s.price || 0), 0);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => load(1, filter, tierFilter, roleFilter, val),
      380,
    );
  }

  function handleTabChange(key) {
    setFilter(key);
    setSearch("");
    setPage(1);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActionSuccess(msg) {
    setDetailTarget(null);
    setCancelTarget(null);
    showToast("success", msg);
    load(page, filter, tierFilter, roleFilter, search);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Monetisation</p>
            <h1 className={s.pageTitle}>
              Subscriptions
              {total > 0 && <span className={s.countPill}>{total}</span>}
            </h1>
            <p className={s.pageSubtitle}>
              Manage plans, monitor revenue, and oversee user subscriptions
            </p>
          </div>
          <button
            className={s.breakdownToggle}
            onClick={() => setShowBreakdown((v) => !v)}
          >
            {showBreakdown ? "Hide breakdown" : "Show breakdown"}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon="💎"
            label="Total Subscriptions"
            value={total}
            sub="All tiers"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon="✅"
            label="Active"
            value={activeCount}
            sub="This page"
            accent="green"
            delay={0.05}
          />
          <StatCard
            icon="⚡"
            label="Pro Plans"
            value={proCount}
            sub="This page"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon="👑"
            label="Enterprise"
            value={enterpriseCount}
            sub="This page"
            accent="gold"
            delay={0.15}
          />
        </div>

        {/* ── Tier breakdown ── */}
        {showBreakdown && summary.length > 0 && (
          <TierBreakdown summary={summary} />
        )}

        {/* ── Toolbar ── */}
        <div className={s.toolBar}>
          {/* Status filter tabs */}
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={s.toolRight}>
            {/* Tier filter */}
            <select
              className={s.select}
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Tiers</option>
              <option value="FREE">🆓 Free</option>
              <option value="PRO">⚡ Pro</option>
              <option value="ENTERPRISE">👑 Enterprise</option>
            </select>

            {/* Role filter */}
            <select
              className={s.select}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="WORKER">Worker</option>
              <option value="HIRER">Hirer</option>
            </select>

            {/* Search */}
            <div className={s.searchBar}>
              <span className={s.searchIcon}>🔍</span>
              <input
                className={s.searchInput}
                placeholder="Search name or email…"
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  className={s.searchClear}
                  onClick={() => {
                    setSearch("");
                    load(1, filter, tierFilter, roleFilter, "");
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Revenue summary bar ── */}
        {!loading && subs.length > 0 && (
          <div className={s.revSummary}>
            <div className={s.revItem}>
              <span className={s.revLabel}>Page MRR estimate</span>
              <span className={s.revVal}>
                USD{" "}
                {totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className={s.revDivider} />
            <div className={s.revItem}>
              <span className={s.revLabel}>Active on page</span>
              <span className={s.revVal}>{activeCount}</span>
            </div>
            <div className={s.revDivider} />
            <div className={s.revItem}>
              <span className={s.revLabel}>Paid plans</span>
              <span className={s.revVal}>
                {subs.filter((s) => s.price > 0).length}
              </span>
            </div>
            <div className={s.revDivider} />
            <div className={s.revItem}>
              <span className={s.revLabel}>Free plans</span>
              <span className={s.revVal}>
                {subs.filter((s) => !s.price || s.price === 0).length}
              </span>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <span>User</span>
            <span>Plan</span>
            <span>Role</span>
            <span>Price</span>
            <span>Status</span>
            <span>Renews / Expires</span>
            <span>Actions</span>
          </div>

          <div className={s.tableBody}>
            {loading ? (
              <SkeletonRows />
            ) : subs.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>💎</span>
                <p className={s.emptyTitle}>
                  {filter === "ALL" && !search
                    ? "No subscriptions yet"
                    : "No subscriptions match your filters"}
                </p>
                <p className={s.emptySub}>
                  {filter !== "ALL" ||
                  search ||
                  tierFilter !== "ALL" ||
                  roleFilter !== "ALL"
                    ? "Try adjusting your filters."
                    : "User subscription data will appear here."}
                </p>
                {(filter !== "ALL" ||
                  search ||
                  tierFilter !== "ALL" ||
                  roleFilter !== "ALL") && (
                  <button
                    className={s.emptyReset}
                    onClick={() => {
                      handleTabChange("ALL");
                      setTierFilter("ALL");
                      setRoleFilter("ALL");
                      setSearch("");
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              subs.map((sub, i) => (
                <SubRow
                  key={sub.id}
                  sub={sub}
                  index={i}
                  onDetail={setDetailTarget}
                  onCancel={setCancelTarget}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {detailTarget && (
        <DetailModal
          sub={detailTarget}
          onClose={() => setDetailTarget(null)}
          onCancel={(sub) => {
            setDetailTarget(null);
            setCancelTarget(sub);
          }}
        />
      )}

      {cancelTarget && (
        <CancelModal
          sub={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </AdminLayout>
  );
}
