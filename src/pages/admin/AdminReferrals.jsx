// src/pages/admin/AdminReferrals.jsx
// Full admin referral program management.
//
// Endpoints:
//   GET   /referral/admin/stats
//   GET   /referral/admin?status=&search=&page=&limit=
//   GET   /referral/leaderboard?limit=
//   PATCH /referral/admin/:id/flag          { reason }
//   PATCH /referral/admin/:id/expire
//   POST  /referral/admin/:id/reward        { bonusOverride, notes }
//   PATCH /referral/admin/:userId/wallet    { amount, description, type, userId }
//
// Every field the backend sends is rendered. Lucide icons throughout.
// Fully responsive, with a mobile card layout for tables.

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  CheckCircle,
  Wallet,
  PiggyBank,
  TrendingUp,
  Trophy,
  ClipboardList,
  Copy,
  Check,
  X,
  Search,
  RefreshCw,
  Gift,
  Flag,
  Clock,
  AlertTriangle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Users,
  UserCircle,
  Layers,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import styles from "./AdminReferrals.module.css";

// ── Tier / status class maps ──────────────────────────────────────────────────
const TIER_CLASS = {
  bronze: styles.tierBronze,
  silver: styles.tierSilver,
  gold: styles.tierGold,
  diamond: styles.tierDiamond,
};

const STATUS_CLASS = {
  PENDING: styles.statusPending,
  QUALIFIED: styles.statusQualified,
  CONVERTED: styles.statusConverted,
  REWARDED: styles.statusRewarded,
  EXPIRED: styles.statusExpired,
  FLAGGED: styles.statusFlagged,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function fmtCurrency(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} />;
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
        aria-label="Copy"
      >
        {ok ? <Check size={10} /> : <Copy size={10} />}
      </button>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""}`}
      style={{ animationDelay: `${delay || 0}s` }}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={18} /> : null}
      </span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function Avatar({ src, name }) {
  if (src) return <img src={src} className={styles.avatar} alt="" />;
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <div className={styles.avatarFallback}>{initials}</div>;
}

// ── Adjust Wallet Modal ───────────────────────────────────────────────────────
function AdjustWalletModal({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    userId: "",
    amount: "",
    description: "",
    type: "ADJUSTMENT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.amount || !form.description) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Backend: PATCH /referral/admin/:id/wallet → adminAdjustWallet
      // Controller reads req.body.userId, so we send it in the body too.
      const res = await api.patch(`/referral/admin/${form.userId}/wallet`, {
        userId: form.userId,
        amount: Number(form.amount),
        description: form.description,
        type: form.type,
      });
      onSuccess(res.data.data);
      showToast(
        `Wallet adjusted. New balance: ${fmtCurrency(res.data.data.newBalance)}`,
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Adjustment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Wallet size={16} /> Adjust Wallet Balance
          </h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className={styles.modalError}>
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.label}>User ID *</label>
          <input
            className={styles.input}
            placeholder="Paste the user's UUID"
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          />

          <label className={styles.label}>
            Amount (positive = credit, negative = debit) *
          </label>
          <input
            className={styles.input}
            type="number"
            step="0.01"
            placeholder="e.g. 5000 or -2500"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />

          <label className={styles.label}>Type</label>
          <select
            className={styles.select}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="REFERRAL_BONUS">Referral Bonus</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <label className={styles.label}>Description *</label>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Reason for this adjustment…"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />

          <button
            className={styles.btnPrimary}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner /> Applying…
              </>
            ) : (
              <>
                <SlidersHorizontal size={13} /> Apply Adjustment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Manual Reward Modal ───────────────────────────────────────────────────────
function ManualRewardModal({ referral, onClose, onSuccess, showToast }) {
  const [bonusOverride, setBonusOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Backend: POST /referral/admin/:id/reward → adminManualReward
      const res = await api.post(`/referral/admin/${referral.id}/reward`, {
        bonusOverride: bonusOverride || undefined,
        notes,
      });
      onSuccess(res.data.data);
      showToast(`Reward of ${fmtCurrency(res.data.data.bonus)} applied.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reward.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Gift size={16} /> Manual Reward
          </h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalInfo}>
          <p>
            <strong>Referrer:</strong> {referral.referrer?.firstName}{" "}
            {referral.referrer?.lastName}
          </p>
          <p>
            <strong>Referred:</strong> {referral.referred?.firstName}{" "}
            {referral.referred?.lastName} ({referral.referred?.role})
          </p>
          <p>
            <strong>Current Status:</strong>{" "}
            <span
              className={`${styles.statusBadge} ${STATUS_CLASS[referral.status] || ""}`}
            >
              {referral.status}
            </span>
          </p>
          {referral.code && (
            <p>
              <strong>Code:</strong>{" "}
              <code className={styles.code}>{referral.code}</code>
            </p>
          )}
        </div>

        {error && (
          <p className={styles.modalError}>
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.label}>
            Bonus Override (₦) — leave blank to use tier default
          </label>
          <input
            className={styles.input}
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 3500"
            value={bonusOverride}
            onChange={(e) => setBonusOverride(e.target.value)}
          />

          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="e.g. Manually approved — edge case"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button
            className={`${styles.btnPrimary} ${styles.btnGreen}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner /> Rewarding…
              </>
            ) : (
              <>
                <CheckCircle size={13} /> Confirm Reward
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Flag Modal ────────────────────────────────────────────────────────────────
function FlagModal({ referral, onClose, onSuccess, showToast }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Backend: PATCH /referral/admin/:id/flag → adminFlagReferral
      await api.patch(`/referral/admin/${referral.id}/flag`, { reason });
      onSuccess();
      showToast("Referral flagged and bonus reversed.");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to flag.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Flag size={16} /> Flag Referral
          </h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalWarning}>
          <AlertTriangle size={13} /> Flagging will reverse any bonus already
          paid to the referrer and prevent future rewards.
        </div>

        {error && (
          <p className={styles.modalError}>
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.label}>Reason *</label>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="e.g. Self-referral detected, fake account, policy violation…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            className={`${styles.btnPrimary} ${styles.btnRed}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner /> Flagging…
              </>
            ) : (
              <>
                <Flag size={13} /> Confirm Flag
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminReferrals() {
  const [tab, setTab] = useState("overview");

  // Overview / stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Referrals list
  const [referrals, setReferrals] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listStats, setListStats] = useState(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbTiers, setLbTiers] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Modals
  const [showAdjust, setShowAdjust] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [expiring, setExpiring] = useState(null);

  // Feedback
  const [notify, setNotify] = useState(null);

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  // ── Load stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api
      .get("/referral/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => showToast("Failed to load stats.", "error"))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Load referrals list ─────────────────────────────────────────────────────
  const loadReferrals = useCallback(() => {
    setListLoading(true);
    const params = { page, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    api
      .get("/referral/admin", { params })
      .then((r) => {
        setReferrals(r.data.data.referrals || []);
        setTotal(r.data.data.total || 0);
        setPages(r.data.data.pages || 1);
        setListStats(r.data.data.stats || null);
      })
      .catch(() => showToast("Failed to load referrals.", "error"))
      .finally(() => setListLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => {
    if (tab === "referrals") loadReferrals();
  }, [tab, loadReferrals]);

  // ── Load leaderboard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLbLoading(true);
    api
      .get("/referral/leaderboard", { params: { limit: 30 } })
      .then((r) => {
        setLeaderboard(r.data.data.leaderboard || []);
        setLbTiers(r.data.data.tiers || []);
      })
      .catch(() => showToast("Failed to load leaderboard.", "error"))
      .finally(() => setLbLoading(false));
  }, [tab]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleExpire(id) {
    if (!window.confirm("Mark this referral as expired?")) return;
    setExpiring(id);
    try {
      // Backend: PATCH /referral/admin/:id/expire
      await api.patch(`/referral/admin/${id}/expire`);
      showToast("Referral expired.");
      loadReferrals();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to expire.", "error");
    } finally {
      setExpiring(null);
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <p className={styles.eyebrow}>Admin Panel</p>
            <h1 className={styles.pageTitle}>
              <Link2 size={22} /> Referral Programme
            </h1>
            <p className={styles.pageSubtitle}>
              Monitor earnings, tiers, and flagged activity across the platform.
            </p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowAdjust(true)}
          >
            <Wallet size={14} /> Adjust Wallet
          </button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          {[
            { key: "overview", label: "Overview", Icon: Layers },
            { key: "referrals", label: "Referrals", Icon: ClipboardList },
            { key: "leaderboard", label: "Leaderboard", Icon: Trophy },
          ].map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.Icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {tab === "overview" && (
          <div className={styles.tabContent}>
            {statsLoading ? (
              <div className={styles.loadingRow}>
                <Spinner /> Loading stats…
              </div>
            ) : stats ? (
              <>
                {/* KPI cards */}
                <div className={styles.statsGrid}>
                  <StatCard
                    icon={Link2}
                    label="Total Referrals"
                    value={fmt(stats.overview.totalReferrals)}
                    delay={0}
                  />
                  <StatCard
                    icon={CheckCircle}
                    label="Converted"
                    value={fmt(stats.overview.totalConverted)}
                    accent
                    delay={0.05}
                  />
                  <StatCard
                    icon={Banknote}
                    label="Total Paid Out"
                    value={fmtCurrency(stats.overview.totalPaidOut)}
                    sub={stats.overview.currency || "NGN"}
                    accent
                    delay={0.1}
                  />
                  <StatCard
                    icon={Wallet}
                    label="Active Wallet Balances"
                    value={fmtCurrency(stats.overview.totalWalletBalance)}
                    delay={0.15}
                  />
                  <StatCard
                    icon={PiggyBank}
                    label="Lifetime Wallet Earned"
                    value={fmtCurrency(stats.overview.totalWalletEarned)}
                    delay={0.2}
                  />
                </div>

                {/* Status breakdown */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <ClipboardList size={12} /> Referrals by Status
                  </h2>
                  <div className={styles.statusBreakdown}>
                    {Object.entries(stats.byStatus || {}).map(
                      ([status, count]) => (
                        <div key={status} className={styles.statusChip}>
                          <span
                            className={`${styles.statusDot} ${STATUS_CLASS[status] || ""}`}
                          />
                          <span className={styles.statusLabel}>{status}</span>
                          <span className={styles.statusCount}>{count}</span>
                        </div>
                      ),
                    )}
                    {Object.keys(stats.byStatus || {}).length === 0 && (
                      <p className={styles.empty}>No referrals yet.</p>
                    )}
                  </div>
                </div>

                {/* Top referrers */}
                {stats.topReferrers?.length > 0 && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                      <Trophy size={12} /> Top 10 Referrers
                    </h2>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Tier</th>
                            <th>Successful</th>
                            <th>Lifetime Earned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topReferrers.map((u) => (
                            <tr key={u.id}>
                              <td data-label="User">
                                <div className={styles.userCell}>
                                  <Avatar
                                    name={`${u.firstName} ${u.lastName}`}
                                  />
                                  <div className={styles.userCellText}>
                                    <p className={styles.userName}>
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <CopyPill
                                      text={u.id}
                                      label={`id ${u.id.slice(0, 8)}…`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td data-label="Tier">
                                <span
                                  className={`${styles.tierBadge} ${TIER_CLASS[u.referralTier?.toLowerCase?.()] || ""}`}
                                >
                                  {u.referralTier}
                                </span>
                              </td>
                              <td data-label="Successful">
                                {u.successfulReferrals}
                              </td>
                              <td data-label="Lifetime">
                                {fmtCurrency(u.walletLifetimeTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent conversions */}
                {stats.recentConversions?.length > 0 && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                      <TrendingUp size={12} /> Recent Conversions
                    </h2>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Referrer</th>
                            <th>Referred</th>
                            <th>Role</th>
                            <th>Converted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentConversions.map((r) => (
                            <tr key={r.id}>
                              <td data-label="Referrer">
                                {r.referrer?.firstName} {r.referrer?.lastName}
                              </td>
                              <td data-label="Referred">
                                {r.referred?.firstName}
                              </td>
                              <td data-label="Role">
                                <span className={styles.rolePill}>
                                  {r.referred?.role}
                                </span>
                              </td>
                              <td data-label="Converted">
                                {fmtDate(r.convertedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tier table */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <Layers size={12} /> Tier Configuration
                  </h2>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tier</th>
                          <th>Min Referrals</th>
                          <th>Worker Bonus</th>
                          <th>Hirer Bonus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.tierBreakdown || {}).map(
                          ([key, label]) => (
                            <tr key={key}>
                              <td data-label="Tier">
                                <span
                                  className={`${styles.tierBadge} ${TIER_CLASS[key.toLowerCase()] || ""}`}
                                >
                                  {label}
                                </span>
                              </td>
                              <td data-label="Min Referrals">—</td>
                              <td data-label="Worker Bonus">—</td>
                              <td data-label="Hirer Bonus">—</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.empty}>No stats available.</p>
            )}
          </div>
        )}

        {/* ══ REFERRALS TAB ══ */}
        {tab === "referrals" && (
          <div className={styles.tabContent}>
            {/* Queue stats */}
            {listStats && (
              <div className={styles.queueStats}>
                {Object.entries(listStats).map(([status, data]) => (
                  <div key={status} className={styles.queueStat}>
                    <span className={styles.queueStatLabel}>{status}</span>
                    <span className={styles.queueStatCount}>{data.count}</span>
                    <span className={styles.queueStatBonus}>
                      {fmtCurrency(data.totalBonus)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <Search size={13} />
                <input
                  className={styles.searchInput}
                  placeholder="Search by code or email…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    className={styles.searchClear}
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {[
                  "PENDING",
                  "QUALIFIED",
                  "CONVERTED",
                  "REWARDED",
                  "EXPIRED",
                  "FLAGGED",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className={styles.btnOutline} onClick={loadReferrals}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <p className={styles.resultsCount}>
              {total} referral{total !== 1 ? "s" : ""} found
            </p>

            {listLoading ? (
              <div className={styles.loadingRow}>
                <Spinner /> Loading…
              </div>
            ) : referrals.length === 0 ? (
              <div className={styles.empty}>
                <Inbox size={32} />
                <p>No referrals match your filters.</p>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Referrer</th>
                        <th>Referred</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Bonus (₦)</th>
                        <th>Joined</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((r) => {
                        const isExpired = new Date(r.expiresAt) < new Date();
                        const isLocked = [
                          "REWARDED",
                          "FLAGGED",
                          "EXPIRED",
                        ].includes(r.status);
                        return (
                          <tr key={r.id}>
                            <td data-label="Code">
                              <CopyPill text={r.code} />
                            </td>
                            <td data-label="Referrer">
                              <div className={styles.userCell}>
                                <Avatar
                                  name={`${r.referrer?.firstName} ${r.referrer?.lastName}`}
                                />
                                <div className={styles.userCellText}>
                                  <p className={styles.userName}>
                                    {r.referrer?.firstName}{" "}
                                    {r.referrer?.lastName}
                                  </p>
                                  <p className={styles.userEmail}>
                                    {r.referrer?.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td data-label="Referred">
                              <div className={styles.userCellText}>
                                <p className={styles.userName}>
                                  {r.referred?.firstName} {r.referred?.lastName}
                                </p>
                                <p className={styles.userEmail}>
                                  {r.referred?.email}
                                </p>
                              </div>
                            </td>
                            <td data-label="Role">
                              <span className={styles.rolePill}>
                                {r.referred?.role === "WORKER" ? (
                                  <>
                                    <Users size={9} /> WORKER
                                  </>
                                ) : (
                                  <>
                                    <UserCircle size={9} /> HIRER
                                  </>
                                )}
                              </span>
                            </td>
                            <td data-label="Status">
                              <span
                                className={`${styles.statusBadge} ${STATUS_CLASS[r.status] || ""}`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td data-label="Bonus" className={styles.bonusCell}>
                              {fmtCurrency(r.referrerBonus)}
                            </td>
                            <td data-label="Joined">
                              {fmtDate(r.referred?.createdAt)}
                            </td>
                            <td
                              data-label="Expires"
                              className={isExpired ? styles.expired : ""}
                              title={fmtDateTime(r.expiresAt)}
                            >
                              {fmtDate(r.expiresAt)}
                            </td>
                            <td data-label="Actions">
                              <div className={styles.actionGroup}>
                                {!isLocked && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                                    title="Manual reward"
                                    aria-label="Manual reward"
                                    onClick={() => setRewardTarget(r)}
                                  >
                                    <Gift size={14} />
                                  </button>
                                )}
                                {!["FLAGGED", "EXPIRED"].includes(r.status) && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnRed}`}
                                    title="Flag referral"
                                    aria-label="Flag referral"
                                    onClick={() => setFlagTarget(r)}
                                  >
                                    <Flag size={14} />
                                  </button>
                                )}
                                {!isLocked && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnGray}`}
                                    title="Mark expired"
                                    aria-label="Mark expired"
                                    onClick={() => handleExpire(r.id)}
                                    disabled={expiring === r.id}
                                  >
                                    {expiring === r.id ? (
                                      <Loader2
                                        size={14}
                                        className={styles.spinning}
                                      />
                                    ) : (
                                      <Clock size={14} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD TAB ══ */}
        {tab === "leaderboard" && (
          <div className={styles.tabContent}>
            {lbLoading ? (
              <div className={styles.loadingRow}>
                <Spinner /> Loading leaderboard…
              </div>
            ) : leaderboard.length === 0 ? (
              <div className={styles.empty}>
                <Trophy size={32} />
                <p>No referrals yet.</p>
              </div>
            ) : (
              <>
                <div className={styles.leaderboard}>
                  {leaderboard.map((u, i) => (
                    <div
                      key={u.id || `${u.rank}-${i}`}
                      className={`${styles.lbRow} ${u.isMe ? styles.lbRowMe : ""}`}
                    >
                      <span
                        className={`${styles.lbRank} ${u.rank <= 3 ? styles[`lbRank${u.rank}`] : ""}`}
                      >
                        {u.rank <= 3 ? <Trophy size={18} /> : `#${u.rank}`}
                      </span>
                      <Avatar src={u.avatar} name={u.name} />
                      <div className={styles.lbInfo}>
                        <p className={styles.lbName}>
                          {u.name}{" "}
                          {u.isMe && <span className={styles.mePill}>You</span>}
                        </p>
                        <span
                          className={`${styles.tierBadge} ${TIER_CLASS[u.badge] || ""}`}
                        >
                          {u.tier}
                        </span>
                      </div>
                      <div className={styles.lbStats}>
                        <p className={styles.lbReferrals}>
                          {u.referrals} referrals
                        </p>
                        <p className={styles.lbEarned}>
                          {fmtCurrency(u.earned)} earned
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {lbTiers.length > 0 && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                      <Layers size={12} /> Tier Configuration
                    </h2>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Tier</th>
                            <th>Min Referrals</th>
                            <th>Worker Bonus</th>
                            <th>Hirer Bonus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lbTiers.map((t) => (
                            <tr key={t.key}>
                              <td data-label="Tier">
                                <span
                                  className={`${styles.tierBadge} ${TIER_CLASS[t.badge] || ""}`}
                                >
                                  {t.label}
                                </span>
                              </td>
                              <td data-label="Min Referrals">
                                {t.minReferrals}
                              </td>
                              <td data-label="Worker Bonus">
                                {fmtCurrency(t.workerBonus)}
                              </td>
                              <td data-label="Hirer Bonus">
                                {fmtCurrency(t.hirerBonus)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modals */}
        {showAdjust && (
          <AdjustWalletModal
            onClose={() => setShowAdjust(false)}
            onSuccess={() => loadReferrals()}
            showToast={showToast}
          />
        )}

        {rewardTarget && (
          <ManualRewardModal
            referral={rewardTarget}
            onClose={() => setRewardTarget(null)}
            onSuccess={() => loadReferrals()}
            showToast={showToast}
          />
        )}

        {flagTarget && (
          <FlagModal
            referral={flagTarget}
            onClose={() => setFlagTarget(null)}
            onSuccess={() => loadReferrals()}
            showToast={showToast}
          />
        )}

        {/* Platform AlertModal */}
        <AlertModal
          isOpen={!!notify}
          onClose={() => setNotify(null)}
          title={notify?.type === "error" ? "Something went wrong" : "Done"}
          subtitle={
            notify?.type === "error"
              ? "The action could not be completed."
              : "The action was completed successfully."
          }
          alerts={
            notify
              ? [
                  {
                    icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                    label: notify.type === "error" ? "Error" : "Success",
                    description: notify.text,
                    variant: notify.type === "error" ? "red" : "green",
                  },
                ]
              : []
          }
        />
      </div>
    </AdminLayout>
  );
}
