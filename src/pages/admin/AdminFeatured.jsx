// src/pages/featured/AdminFeatured.jsx
// Full admin featured listings / boosts management.
// Endpoints:
//   GET    /admin/featured?type=&page=&limit=
//   DELETE /admin/featured/:listingId   { reason }

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminFeatured.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const LIMIT = 16;

const TYPE_TABS = [
  { key: "ALL", label: "All" },
  { key: "WORKER", label: "Worker" },
  { key: "JOB", label: "Job" },
  { key: "PROFILE", label: "Profile" },
  { key: "POST", label: "Post" },
];

const TYPE_META = {
  WORKER: { label: "Worker Boost", icon: "👷", color: "orange" },
  JOB: { label: "Job Boost", icon: "💼", color: "indigo" },
  PROFILE: { label: "Profile Feature", icon: "⭐", color: "gold" },
  POST: { label: "Post Boost", icon: "📝", color: "green" },
};

const ROLE_META = {
  WORKER: { label: "Worker", color: "orange" },
  HIRER: { label: "Hirer", color: "indigo" },
  ADMIN: { label: "Admin", color: "red" },
};

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

function expiryInfo(expiresAt) {
  if (!expiresAt) return { label: "No expiry", color: "dim", daysLeft: null };
  const diff = new Date(expiresAt) - Date.now();
  const daysLeft = Math.floor(diff / 86400000);
  if (daysLeft < 0) return { label: "Expired", color: "red", daysLeft };
  if (daysLeft === 0) return { label: "Expires today", color: "red", daysLeft };
  if (daysLeft <= 3)
    return { label: `${daysLeft}d left`, color: "red", daysLeft };
  if (daysLeft <= 7)
    return { label: `${daysLeft}d left`, color: "yellow", daysLeft };
  return { label: `${daysLeft}d left`, color: "green", daysLeft };
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function truncate(str, n = 45) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
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
function TypeBadge({ type }) {
  const m = TYPE_META[type] ?? { label: type, icon: "🌟", color: "dim" };
  return (
    <span className={`${s.typeBadge} ${s[`type_${m.color}`]}`}>
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

function ExpiryBadge({ expiresAt }) {
  const { label, color } = expiryInfo(expiresAt);
  return (
    <span className={`${s.expiryBadge} ${s[`expiry_${color}`]}`}>{label}</span>
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skCard} />
      ))}
    </>
  );
}

// ─── Remove Modal ─────────────────────────────────────────────────────────────
function RemoveModal({ listing, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/admin/featured/${listing.id}`, { data: { reason } });
      onSuccess(
        `Featured listing removed — ${listing.user?.firstName} notified.`,
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove listing.");
    } finally {
      setLoading(false);
    }
  }

  const typeMeta = TYPE_META[listing.type] ?? {
    label: listing.type,
    icon: "🌟",
  };

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>🗑 Remove Featured Listing</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.removeWarning}>
            <span>⚠️</span>
            <p>
              This will remove the featured placement and notify the user. Any
              paid boost will require a manual refund if applicable.
            </p>
          </div>

          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>User</span>
              <span className={s.summaryVal}>
                {listing.user?.firstName} {listing.user?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Email</span>
              <span className={s.summaryVal}>{listing.user?.email}</span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Boost Type</span>
              <span className={s.summaryVal}>
                {typeMeta.icon} {typeMeta.label}
              </span>
            </div>
            {listing.category && (
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Category</span>
                <span className={s.summaryVal}>
                  {listing.category.icon} {listing.category.name}
                </span>
              </div>
            )}
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Expires</span>
              <ExpiryBadge expiresAt={listing.expiresAt} />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>
              Reason (sent to user as notification)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Listing violates our community guidelines or terms of service."
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
              Cancel
            </button>
            <button
              className={s.btnRemove}
              onClick={handleRemove}
              disabled={loading}
            >
              {loading ? <span className={s.spinner} /> : "🗑 Remove Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ listing, onClose, onRemove }) {
  const typeMeta = TYPE_META[listing.type] ?? {
    label: listing.type,
    icon: "🌟",
    color: "dim",
  };
  const expiry = expiryInfo(listing.expiresAt);
  const expired = isExpired(listing.expiresAt);

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleRow}>
            <span className={s.modalTitleIcon}>{typeMeta.icon}</span>
            <h3 className={s.modalTitle}>{typeMeta.label}</h3>
            <ExpiryBadge expiresAt={listing.expiresAt} />
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          {/* User card */}
          <div className={s.detailUserCard}>
            <Avatar user={listing.user} size="lg" />
            <div className={s.detailUserInfo}>
              <p className={s.detailUserName}>
                {listing.user?.firstName} {listing.user?.lastName}
              </p>
              <p className={s.detailUserEmail}>{listing.user?.email}</p>
              <div className={s.detailUserBadges}>
                <RoleBadge role={listing.user?.role} />
                <TypeBadge type={listing.type} />
              </div>
            </div>
          </div>

          {/* Boost hero */}
          <div className={`${s.boostHero} ${s[`boostHero_${typeMeta.color}`]}`}>
            <span className={s.boostHeroIcon}>{typeMeta.icon}</span>
            <div className={s.boostHeroText}>
              <span className={s.boostHeroLabel}>Featured Placement</span>
              <span className={s.boostHeroType}>{typeMeta.label}</span>
            </div>
            {!expired && <span className={s.boostHeroActive}>🟢 Active</span>}
            {expired && <span className={s.boostHeroExpired}>🔴 Expired</span>}
          </div>

          {/* Detail grid */}
          <div className={s.detailGrid}>
            {[
              {
                label: "Listing ID",
                value: listing.id?.slice(-10).toUpperCase(),
                mono: true,
              },
              { label: "Type", value: `${typeMeta.icon} ${typeMeta.label}` },
              {
                label: "Category",
                value: listing.category
                  ? `${listing.category.icon ?? "🏷️"} ${listing.category.name}`
                  : "—",
              },
              { label: "User Role", value: listing.user?.role },
              { label: "Created", value: fmtDate(listing.createdAt) },
              {
                label: "Expires",
                value: listing.expiresAt
                  ? fmtDate(listing.expiresAt)
                  : "No expiry",
              },
              {
                label: "Days Remaining",
                value:
                  expiry.daysLeft != null
                    ? expiry.daysLeft < 0
                      ? "Expired"
                      : `${expiry.daysLeft} days`
                    : "—",
              },
              {
                label: "Is Active",
                value:
                  listing.isActive != null
                    ? listing.isActive
                      ? "Yes"
                      : "No"
                    : "—",
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className={s.detailCell}>
                <span className={s.detailCellLabel}>{label}</span>
                <span className={`${s.detailCellVal} ${mono ? s.mono : ""}`}>
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Expiry progress bar */}
          {listing.expiresAt &&
            listing.createdAt &&
            (() => {
              const total =
                new Date(listing.expiresAt) - new Date(listing.createdAt);
              const elapsed = Date.now() - new Date(listing.createdAt);
              const pct = Math.min(
                100,
                Math.max(0, Math.round((elapsed / total) * 100)),
              );
              const remaining = 100 - pct;
              return (
                <div className={s.expiryProgress}>
                  <div className={s.expiryProgressHeader}>
                    <span className={s.expiryProgressLabel}>
                      Boost Progress
                    </span>
                    <span className={s.expiryProgressPct}>
                      {remaining}% remaining
                    </span>
                  </div>
                  <div className={s.expiryProgressBar}>
                    <div
                      className={`${s.expiryProgressFill} ${pct > 80 ? s.fillRed : pct > 50 ? s.fillYellow : s.fillGreen}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose}>
              Close
            </button>
            <button
              className={s.btnRemove}
              onClick={() => {
                onClose();
                onRemove(listing);
              }}
            >
              🗑 Remove Listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({ listing, index, onView, onRemove }) {
  const typeMeta = TYPE_META[listing.type] ?? {
    label: listing.type,
    icon: "🌟",
    color: "dim",
  };
  const expiry = expiryInfo(listing.expiresAt);
  const expired = isExpired(listing.expiresAt);

  return (
    <div
      className={`${s.card} ${expired ? s.cardExpired : ""}`}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Card header: type badge + expiry */}
      <div className={s.cardHeader}>
        <TypeBadge type={listing.type} />
        <ExpiryBadge expiresAt={listing.expiresAt} />
      </div>

      {/* User info */}
      <div className={s.cardUser}>
        <Avatar user={listing.user} />
        <div className={s.cardUserInfo}>
          <span className={s.cardUserName}>
            {listing.user?.firstName} {listing.user?.lastName}
          </span>
          <span className={s.cardUserEmail}>{listing.user?.email}</span>
          <RoleBadge role={listing.user?.role} />
        </div>
      </div>

      {/* Category */}
      {listing.category && (
        <div className={s.cardCategory}>
          <span className={s.cardCategoryIcon}>
            {listing.category.icon ?? "🏷️"}
          </span>
          <span className={s.cardCategoryName}>{listing.category.name}</span>
        </div>
      )}

      {/* Footer: dates + actions */}
      <div className={s.cardFooter}>
        <div className={s.cardDates}>
          <span className={s.cardDateLabel}>Since</span>
          <span className={s.cardDateVal}>{fmtDate(listing.createdAt)}</span>
        </div>
        <div className={s.cardActions}>
          <button
            className={s.viewBtn}
            onClick={() => onView(listing)}
            title="View detail"
          >
            👁
          </button>
          <button
            className={s.removeBtn}
            onClick={() => onRemove(listing)}
            title="Remove listing"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Expired overlay */}
      {expired && (
        <div className={s.expiredOverlay}>
          <span>Expired</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminFeatured() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [viewListing, setViewListing] = useState(null);
  const [removeListing, setRemoveListing] = useState(null);

  const searchTimer = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, type = typeFilter, q = search) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (type !== "ALL") params.type = type;
        if (q.trim()) params.search = q.trim();
        const res = await api.get("/admin/featured", { params });
        const d = res.data.data;
        setListings(d.listings);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);
      } catch {
        showToast("error", "Failed to load featured listings.");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, search],
  );

  useEffect(() => {
    load(1, typeFilter, search);
  }, [typeFilter]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const activeCount = listings.filter((l) => !isExpired(l.expiresAt)).length;
  const expiredCount = listings.filter((l) => isExpired(l.expiresAt)).length;
  const expiringSoon = listings.filter((l) => {
    if (!l.expiresAt) return false;
    const days = Math.floor((new Date(l.expiresAt) - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  // Type breakdown for the bar
  const typeBreakdown = TYPE_TABS.slice(1).map((t) => ({
    ...t,
    count: listings.filter((l) => l.type === t.key).length,
  }));

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, typeFilter, val), 380);
  }

  function handleTypeChange(key) {
    setTypeFilter(key);
    setSearch("");
    setPage(1);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleRemoveSuccess(msg) {
    setRemoveListing(null);
    setViewListing(null);
    showToast("success", msg);
    load(page, typeFilter, search);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* Toast */}
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

        {/* Header */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Monetisation</p>
            <h1 className={s.pageTitle}>
              Featured & Boosts
              {total > 0 && <span className={s.countPill}>{total}</span>}
              {expiringSoon > 0 && (
                <span className={s.warnPill}>⏰ {expiringSoon} expiring</span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Manage all featured placements and user boosts across the platform
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className={s.statsGrid}>
          <StatCard
            icon="🌟"
            label="Total Listings"
            value={total}
            sub="All types"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon="✅"
            label="Active Boosts"
            value={activeCount}
            sub="Not yet expired"
            accent="green"
            delay={0.05}
          />
          <StatCard
            icon="⏰"
            label="Expiring Soon"
            value={expiringSoon}
            sub="Within 7 days"
            accent="yellow"
            delay={0.1}
          />
          <StatCard
            icon="🔴"
            label="Expired"
            value={expiredCount}
            sub="This page"
            accent="red"
            delay={0.15}
          />
        </div>

        {/* Type breakdown bar */}
        <div className={s.typeBar}>
          {typeBreakdown.map((t) => {
            const m = TYPE_META[t.key] ?? { icon: "🌟", color: "dim" };
            return (
              <button
                key={t.key}
                className={`${s.typeBarItem} ${typeFilter === t.key ? s.typeBarItemActive : ""}`}
                onClick={() => handleTypeChange(t.key)}
              >
                <span className={s.typeBarIcon}>{m.icon}</span>
                <span className={s.typeBarLabel}>{t.label}</span>
                <span className={s.typeBarCount}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${typeFilter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTypeChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Search user name or email…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                className={s.searchClear}
                onClick={() => {
                  setSearch("");
                  load(1, typeFilter, "");
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={s.grid}>
            <SkeletonCards />
          </div>
        ) : listings.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>🌟</span>
            <p className={s.emptyTitle}>
              {typeFilter === "ALL" && !search
                ? "No featured listings yet"
                : "No listings match your filters"}
            </p>
            <p className={s.emptySub}>
              {typeFilter !== "ALL" || search
                ? "Try adjusting your type filter or search."
                : "Featured and boosted listings will appear here."}
            </p>
            {(typeFilter !== "ALL" || search) && (
              <button
                className={s.emptyReset}
                onClick={() => {
                  handleTypeChange("ALL");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={s.grid}>
            {listings.map((listing, i) => (
              <FeaturedCard
                key={listing.id}
                listing={listing}
                index={i}
                onView={setViewListing}
                onRemove={setRemoveListing}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
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

      {/* Modals */}
      {viewListing && (
        <DetailModal
          listing={viewListing}
          onClose={() => setViewListing(null)}
          onRemove={(l) => {
            setViewListing(null);
            setRemoveListing(l);
          }}
        />
      )}

      {removeListing && (
        <RemoveModal
          listing={removeListing}
          onClose={() => setRemoveListing(null)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </AdminLayout>
  );
}
