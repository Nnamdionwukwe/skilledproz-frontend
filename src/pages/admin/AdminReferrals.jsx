import { useState, useEffect, useCallback } from "react";
import styles from "./AdminReferrals.module.css";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";

// ── Tier badge colours ────────────────────────────────────────────────────────
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
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""}`}
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
function AdjustWalletModal({ onClose, onSuccess }) {
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
      const res = await api.post(`/referral/admin/${form.userId}/wallet`, form);
      onSuccess(res.data.data);
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
          <h3 className={styles.modalTitle}>💰 Adjust Wallet Balance</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        {error && <p className={styles.modalError}>⚠️ {error}</p>}

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
            {loading ? <Spinner /> : "Apply Adjustment"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Manual Reward Modal ───────────────────────────────────────────────────────
function ManualRewardModal({ referral, onClose, onSuccess }) {
  const [bonusOverride, setBonusOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.patch(
        `/referral/admin/${referral.id}/manual-reward`,
        {
          bonusOverride: bonusOverride || undefined,
          notes,
        },
      );
      onSuccess(res.data.data);
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
          <h3 className={styles.modalTitle}>🎁 Manual Reward</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
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
            <strong>Current Status:</strong> {referral.status}
          </p>
        </div>

        {error && <p className={styles.modalError}>⚠️ {error}</p>}

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
            {loading ? <Spinner /> : "Confirm Reward"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Flag Modal ────────────────────────────────────────────────────────────────
function FlagModal({ referral, onClose, onSuccess }) {
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
      await api.patch(`/referral/admin/${referral.id}/flag`, { reason });
      onSuccess();
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
          <h3 className={styles.modalTitle}>🚩 Flag Referral</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalWarning}>
          ⚠️ Flagging will reverse any bonus already paid to the referrer and
          prevent future rewards.
        </div>

        {error && <p className={styles.modalError}>{error}</p>}

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
            {loading ? <Spinner /> : "Confirm Flag"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminReferrals() {
  const [tab, setTab] = useState("overview"); // "overview" | "referrals" | "leaderboard"

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

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Modals
  const [showAdjust, setShowAdjust] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);

  // Feedback
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ── Load stats ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/referral/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => setError("Failed to load stats."))
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Load referrals list ─────────────────────────────────────────────────────
  const loadReferrals = useCallback(() => {
    setListLoading(true);
    const params = { page, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    api
      .get("/referral/admin", { params })
      .then((r) => {
        setReferrals(r.data.data.referrals);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch(() => setError("Failed to load referrals."))
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
      .then((r) => setLeaderboard(r.data.data.leaderboard))
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLbLoading(false));
  }, [tab]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleExpire = async (id) => {
    if (!window.confirm("Mark this referral as expired?")) return;
    try {
      await api.patch(`/referral/admin/${id}/expire`);
      setSuccess("Referral expired.");
      loadReferrals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to expire.");
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Admin Panel</p>
            <h1 className={styles.pageTitle}>Referral Programme</h1>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowAdjust(true)}
          >
            💰 Adjust Wallet
          </button>
        </div>

        <Alert type="success" text={success} onClose={() => setSuccess("")} />
        <Alert type="error" text={error} onClose={() => setError("")} />

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          {[
            { key: "overview", label: "📊 Overview" },
            { key: "referrals", label: "📋 Referrals" },
            { key: "leaderboard", label: "🏆 Leaderboard" },
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
            ) : stats ? (
              <>
                {/* ── KPI cards ── */}
                <div className={styles.statsGrid}>
                  <StatCard
                    icon="🔗"
                    label="Total Referrals"
                    value={fmt(stats.overview.totalReferrals)}
                  />
                  <StatCard
                    icon="✅"
                    label="Converted"
                    value={fmt(stats.overview.totalConverted)}
                    accent
                  />
                  <StatCard
                    icon="💸"
                    label="Total Paid Out"
                    value={`₦${fmt(stats.overview.totalPaidOut)}`}
                    sub="REFERRAL_CONFIG.CURRENCY"
                    accent
                  />
                  <StatCard
                    icon="👛"
                    label="Active Wallet Balances"
                    value={`₦${fmt(stats.overview.totalWalletBalance)}`}
                  />
                  <StatCard
                    icon="📈"
                    label="Lifetime Wallet Earned"
                    value={`₦${fmt(stats.overview.totalWalletEarned)}`}
                  />
                </div>

                {/* ── Status breakdown ── */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Referrals by Status</h2>
                  <div className={styles.statusBreakdown}>
                    {Object.entries(stats.byStatus || {}).map(
                      ([status, count]) => (
                        <div key={status} className={styles.statusChip}>
                          <span
                            className={`${styles.statusDot} ${STATUS_CLASS[status]}`}
                          />
                          <span className={styles.statusLabel}>{status}</span>
                          <span className={styles.statusCount}>{count}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* ── Top referrers ── */}
                {stats.topReferrers?.length > 0 && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Top 10 Referrers</h2>
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
                            <td>
                              <div className={styles.userCell}>
                                <Avatar name={`${u.firstName} ${u.lastName}`} />
                                {u.firstName} {u.lastName}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles.tierBadge} ${TIER_CLASS[u.referralTier?.toLowerCase?.()]}`}
                              >
                                {u.referralTier}
                              </span>
                            </td>
                            <td>{u.successfulReferrals}</td>
                            <td>₦{fmt(u.walletLifetimeTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Recent conversions ── */}
                {stats.recentConversions?.length > 0 && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Recent Conversions</h2>
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
                            <td>
                              {r.referrer?.firstName} {r.referrer?.lastName}
                            </td>
                            <td>{r.referred?.firstName}</td>
                            <td>
                              <span className={styles.rolePill}>
                                {r.referred?.role}
                              </span>
                            </td>
                            <td>{fmtDate(r.convertedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Tier table ── */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Tier Configuration</h2>
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
                            <td>
                              <span
                                className={`${styles.tierBadge} ${TIER_CLASS[key.toLowerCase()]}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className={styles.empty}>No stats available.</p>
            )}
          </div>
        )}

        {/* ══ REFERRALS TAB ═════════════════════════════════════════════════════ */}
        {tab === "referrals" && (
          <div className={styles.tabContent}>
            {/* ── Filters ── */}
            <div className={styles.filterRow}>
              <input
                className={styles.searchInput}
                placeholder="Search by code or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
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
                🔄 Refresh
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
                No referrals match your filters.
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
                      {referrals.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <code className={styles.code}>{r.code}</code>
                          </td>
                          <td>
                            <div className={styles.userCell}>
                              <Avatar
                                name={`${r.referrer?.firstName} ${r.referrer?.lastName}`}
                              />
                              <div>
                                <p className={styles.userName}>
                                  {r.referrer?.firstName} {r.referrer?.lastName}
                                </p>
                                <p className={styles.userEmail}>
                                  {r.referrer?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.userCell}>
                              <div>
                                <p className={styles.userName}>
                                  {r.referred?.firstName} {r.referred?.lastName}
                                </p>
                                <p className={styles.userEmail}>
                                  {r.referred?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.rolePill}>
                              {r.referred?.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${STATUS_CLASS[r.status]}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className={styles.bonusCell}>
                            ₦{fmt(r.referrerBonus)}
                          </td>
                          <td>{fmtDate(r.referred?.createdAt)}</td>
                          <td
                            className={
                              new Date(r.expiresAt) < new Date()
                                ? styles.expired
                                : ""
                            }
                          >
                            {fmtDate(r.expiresAt)}
                          </td>
                          <td>
                            <div className={styles.actionGroup}>
                              {!["REWARDED", "FLAGGED", "EXPIRED"].includes(
                                r.status,
                              ) && (
                                <button
                                  className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                                  title="Manual reward"
                                  onClick={() => setRewardTarget(r)}
                                >
                                  🎁
                                </button>
                              )}
                              {!["FLAGGED", "EXPIRED"].includes(r.status) && (
                                <button
                                  className={`${styles.actionBtn} ${styles.actionBtnRed}`}
                                  title="Flag referral"
                                  onClick={() => setFlagTarget(r)}
                                >
                                  🚩
                                </button>
                              )}
                              {!["REWARDED", "FLAGGED", "EXPIRED"].includes(
                                r.status,
                              ) && (
                                <button
                                  className={`${styles.actionBtn} ${styles.actionBtnGray}`}
                                  title="Mark expired"
                                  onClick={() => handleExpire(r.id)}
                                >
                                  ⏰
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ── */}
                {pages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD TAB ═══════════════════════════════════════════════════ */}
        {tab === "leaderboard" && (
          <div className={styles.tabContent}>
            {lbLoading ? (
              <div className={styles.loadingRow}>
                <Spinner /> Loading leaderboard…
              </div>
            ) : leaderboard.length === 0 ? (
              <div className={styles.empty}>No referrals yet.</div>
            ) : (
              <div className={styles.leaderboard}>
                {leaderboard.map((u) => (
                  <div
                    key={u.rank}
                    className={`${styles.lbRow} ${u.isMe ? styles.lbRowMe : ""}`}
                  >
                    <span
                      className={`${styles.lbRank} ${u.rank <= 3 ? styles[`lbRank${u.rank}`] : ""}`}
                    >
                      {u.rank <= 3
                        ? ["🥇", "🥈", "🥉"][u.rank - 1]
                        : `#${u.rank}`}
                    </span>
                    <Avatar src={u.avatar} name={u.name} />
                    <div className={styles.lbInfo}>
                      <p className={styles.lbName}>
                        {u.name}{" "}
                        {u.isMe && <span className={styles.mePill}>You</span>}
                      </p>
                      <span
                        className={`${styles.tierBadge} ${TIER_CLASS[u.badge]}`}
                      >
                        {u.tier}
                      </span>
                    </div>
                    <div className={styles.lbStats}>
                      <p className={styles.lbReferrals}>
                        {u.referrals} referrals
                      </p>
                      <p className={styles.lbEarned}>₦{fmt(u.earned)} earned</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Modals ──────────────────────────────────────────────────────────── */}
        {showAdjust && (
          <AdjustWalletModal
            onClose={() => setShowAdjust(false)}
            onSuccess={(d) => {
              setSuccess(`Wallet adjusted. New balance: ₦${fmt(d.newBalance)}`);
              loadReferrals();
            }}
          />
        )}

        {rewardTarget && (
          <ManualRewardModal
            referral={rewardTarget}
            onClose={() => setRewardTarget(null)}
            onSuccess={(d) => {
              setSuccess(`Reward of ₦${fmt(d.bonus)} applied.`);
              loadReferrals();
            }}
          />
        )}

        {flagTarget && (
          <FlagModal
            referral={flagTarget}
            onClose={() => setFlagTarget(null)}
            onSuccess={() => {
              setSuccess("Referral flagged and bonus reversed.");
              loadReferrals();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
