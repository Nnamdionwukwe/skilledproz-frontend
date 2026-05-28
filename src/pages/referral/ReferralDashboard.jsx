// src/pages/referral/ReferralDashboard.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./ReferralDashboard.module.css";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmt(n) {
  return `₦${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Tier config (mirrors backend) ───────────────────────────────────────────
const TIER_STYLES = {
  BRONZE: {
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.12)",
    border: "rgba(205,127,50,0.3)",
    emoji: "🥉",
  },
  SILVER: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.3)",
    emoji: "🥈",
  },
  GOLD: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
    emoji: "🥇",
  },
  DIAMOND: {
    color: "#67e8f9",
    bg: "rgba(103,232,249,0.12)",
    border: "rgba(103,232,249,0.3)",
    emoji: "💎",
  },
};
const STATUS_META = {
  PENDING: { label: "Pending", cls: "yellow" },
  QUALIFIED: { label: "Qualified", cls: "indigo" },
  CONVERTED: { label: "Converted", cls: "blue" },
  REWARDED: { label: "Rewarded", cls: "green" },
  EXPIRED: { label: "Expired", cls: "dim" },
  FLAGGED: { label: "Flagged", cls: "red" },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

function TierBadge({ tier }) {
  const s = TIER_STYLES[tier] || TIER_STYLES.BRONZE;
  return (
    <span
      className={styles.tierBadge}
      style={{
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.emoji} {tier}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function Avatar({ name, avatar, size = "sm" }) {
  const initials =
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {avatar ? <img src={avatar} alt={name} /> : <span>{initials}</span>}
    </div>
  );
}

// ─── Share buttons ────────────────────────────────────────────────────────────
function ShareButtons({ link, shareText }) {
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className={styles.shareRow}>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        className={`${styles.shareBtn} ${styles.shareBtnWa}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        WhatsApp
      </a>
      <a
        href={twitter}
        target="_blank"
        rel="noreferrer"
        className={`${styles.shareBtn} ${styles.shareBtnX}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Post
      </a>
      {typeof navigator !== "undefined" && navigator.share && (
        <button
          className={`${styles.shareBtn} ${styles.shareBtnMore}`}
          onClick={() =>
            navigator
              .share({ title: "SkilledProz", text: shareText, url: link })
              .catch(() => {})
          }
        >
          ↗ More
        </button>
      )}
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ wallet, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt < (wallet?.minWithdrawal || 5000)) {
      setError(
        `Minimum withdrawal is ${fmtAmt(wallet?.minWithdrawal || 5000)}`,
      );
      return;
    }
    if (amt > (wallet?.balance || 0)) {
      setError(`Insufficient balance. Available: ${fmtAmt(wallet?.balance)}`);
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      setError("All bank details are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/referral/withdraw", {
        amount: form.amount,
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>💸 Withdraw Earnings</p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.walletPreview}>
            <span className={styles.walletPreviewLabel}>Available balance</span>
            <span className={styles.walletPreviewVal}>
              {fmtAmt(wallet?.balance)}
            </span>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Amount (₦) *</label>
            <input
              className={styles.input}
              type="number"
              step="100"
              min={wallet?.minWithdrawal || 5000}
              placeholder={`Min. ${fmtAmt(wallet?.minWithdrawal || 5000)}`}
              value={form.amount}
              onChange={(e) => setF("amount", e.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Bank Name *</label>
            <input
              className={styles.input}
              placeholder="e.g. First Bank"
              value={form.bankName}
              onChange={(e) => setF("bankName", e.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Account Number *</label>
            <input
              className={styles.input}
              placeholder="10-digit account number"
              maxLength={10}
              value={form.accountNumber}
              onChange={(e) => setF("accountNumber", e.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Account Name *</label>
            <input
              className={styles.input}
              placeholder="Name on the account"
              value={form.accountName}
              onChange={(e) => setF("accountName", e.target.value)}
            />
          </div>

          {error && <div className={styles.formError}>⚠️ {error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} /> Processing…
              </>
            ) : (
              "Withdraw"
            )}
          </button>
          <p className={styles.formHint}>
            Processing within 1–3 business days.
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReferralDashboard() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [dashboard, setDashboard] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("referrals");
  const [copied, setCopied] = useState(false);
  const [showWd, setShowWd] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load dashboard ────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get("/referral/dashboard");
      setDashboard(res.data.data);
    } catch {
      showToast("Failed to load referral data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Load leaderboard on tab select ────────────────────────────────────────
  useEffect(() => {
    if (tab !== "leaderboard" || leaderboard) return;
    api
      .get("/referral/leaderboard?limit=20")
      .then((r) => setLeaderboard(r.data.data))
      .catch(() => {});
  }, [tab, leaderboard]);

  // ── Copy link ─────────────────────────────────────────────────────────────
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(dashboard?.link || "");
      setCopied(true);
      showToast("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy", "error");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const d = dashboard;
  const tier = d?.tier;
  const ts = tier
    ? TIER_STYLES[tier.key] || TIER_STYLES.BRONZE
    : TIER_STYLES.BRONZE;

  return (
    <Layout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Referral Program</p>
            <h1 className={styles.pageTitle}>Invite &amp; Earn</h1>
            <p className={styles.pageSubtitle}>
              Share your code. Earn real money when your referrals complete
              their first booking.
            </p>
          </div>
          {d && (
            <div className={styles.rankPill}>🏅 Rank #{d.leaderboardRank}</div>
          )}
        </div>

        {/* ── Code Card ── */}
        <div className={styles.codeCard}>
          <div className={styles.codeCardLeft}>
            <p className={styles.codeLabel}>Your referral code</p>
            {loading ? (
              <div className={styles.skCode} />
            ) : (
              <p className={styles.codeValue}>{d?.code || "—"}</p>
            )}
            <p className={styles.codeLinkText}>{d?.link || "Loading…"}</p>
          </div>
          <div className={styles.codeCardRight}>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ""}`}
              onClick={copyLink}
              disabled={!d?.link}
            >
              {copied ? "✅ Copied!" : "📋 Copy Link"}
            </button>
          </div>
          {d && (
            <div className={styles.codeCardShare}>
              <p className={styles.shareLabel}>Share via</p>
              <ShareButtons link={d.link} shareText={d.shareText} />
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className={styles.statsGrid}>
          {[
            {
              icon: "👥",
              label: "Total Invited",
              val: d?.stats?.totalReferrals,
              accent: "",
            },
            {
              icon: "✅",
              label: "Conversions",
              val: d?.stats?.successfulReferrals,
              accent: "green",
            },
            {
              icon: "⏳",
              label: "Pending",
              val: d?.stats?.pendingReferrals,
              accent: "",
            },
            {
              icon: "💰",
              label: "Wallet Balance",
              val: fmtAmt(d?.wallet?.balance),
              accent: "orange",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`${styles.statCard} ${s.accent ? styles[`accent_${s.accent}`] : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={styles.statIcon}>{s.icon}</span>
              <div className={styles.statVal}>
                {loading ? "—" : (s.val ?? "0")}
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tier + Wallet ── */}
        <div className={styles.twoCol}>
          {/* Tier Card */}
          <div
            className={styles.panel}
            style={{
              borderColor: tier ? ts.border : undefined,
              background: tier ? ts.bg : undefined,
            }}
          >
            <div className={styles.panelHeader}>
              <p className={styles.panelTitle}>Your Tier</p>
              {tier && <TierBadge tier={tier.key} />}
            </div>
            <div className={styles.panelBody}>
              {loading ? (
                <div className={styles.skTier} />
              ) : tier ? (
                <>
                  <div className={styles.tierDisplay}>
                    <span className={styles.tierEmoji}>{ts.emoji}</span>
                    <div>
                      <p
                        className={styles.tierName}
                        style={{ color: ts.color }}
                      >
                        {tier.current}
                      </p>
                      <p className={styles.tierSub}>
                        {tier.successCount} successful referral
                        {tier.successCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={styles.tierProgressWrap}>
                    <div className={styles.tierProgressBar}>
                      <div
                        className={styles.tierProgressFill}
                        style={{
                          width: `${tier.progressPct}%`,
                          background: ts.color,
                        }}
                      />
                    </div>
                    <div className={styles.tierProgressLabels}>
                      <span>{tier.successCount}</span>
                      <span className={styles.tierProgressNext}>
                        {tier.referralsToNext > 0
                          ? `${tier.referralsToNext} more to ${tier.nextTierLabel}`
                          : "Maximum tier reached 🎉"}
                      </span>
                    </div>
                  </div>

                  {/* Earnings per referral */}
                  <div className={styles.tierEarnings}>
                    <div className={styles.tierEarnRow}>
                      <span>🔨 Per Worker referral</span>
                      <span
                        className={styles.tierEarnVal}
                        style={{ color: ts.color }}
                      >
                        {fmtAmt(tier.workerBonus)}
                      </span>
                    </div>
                    <div className={styles.tierEarnRow}>
                      <span>🧑 Per Hirer referral</span>
                      <span
                        className={styles.tierEarnVal}
                        style={{ color: ts.color }}
                      >
                        {fmtAmt(tier.hirerBonus)}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Wallet Card */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelTitle}>Earnings Wallet</p>
              <span className={styles.walletCurrency}>₦ NGN</span>
            </div>
            <div className={styles.panelBody}>
              {loading ? (
                <div className={styles.skTier} />
              ) : d?.wallet ? (
                <>
                  <div className={styles.walletBalance}>
                    <p className={styles.walletBalanceLabel}>
                      Available balance
                    </p>
                    <p className={styles.walletBalanceVal}>
                      {fmtAmt(d.wallet.balance)}
                    </p>
                    <p className={styles.walletLifetime}>
                      Total earned all-time: {fmtAmt(d.wallet.lifetimeTotal)}
                    </p>
                  </div>

                  <button
                    className={styles.withdrawBtn}
                    disabled={!d.wallet.canWithdraw}
                    onClick={() => setShowWd(true)}
                    title={
                      d.wallet.canWithdraw
                        ? "Withdraw to bank"
                        : `Min. ${fmtAmt(d.wallet.minWithdrawal)} required`
                    }
                  >
                    💸 Withdraw Earnings
                  </button>
                  {!d.wallet.canWithdraw && (
                    <p className={styles.walletMinNote}>
                      Min. {fmtAmt(d.wallet.minWithdrawal)} needed to withdraw
                      {d.wallet.balance > 0 &&
                        ` · You have ${fmtAmt(d.wallet.balance)}`}
                    </p>
                  )}

                  {/* Recent earnings */}
                  {d.recentEarnings?.length > 0 && (
                    <div className={styles.earningsList}>
                      <p className={styles.earningsTitle}>Recent earnings</p>
                      {d.recentEarnings.slice(0, 4).map((tx) => (
                        <div key={tx.id} className={styles.earningsRow}>
                          <div>
                            <p className={styles.earningsDesc}>
                              {tx.description}
                            </p>
                            <p className={styles.earningsDate}>
                              {timeAgo(tx.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`${styles.earningsAmt} ${tx.amount < 0 ? styles.earningsAmtNeg : styles.earningsAmtPos}`}
                          >
                            {tx.amount < 0 ? "-" : "+"}₦
                            {Math.abs(tx.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Perks Section ── */}
        <div className={styles.perksSection}>
          <div className={styles.perksSectionHeader}>
            <p className={styles.eyebrow}>Incentives</p>
            <h2 className={styles.perksSectionTitle}>How it works</h2>
          </div>
          <div className={styles.perksGrid}>
            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>🔗</div>
              <p className={styles.perkStep}>Step 1</p>
              <p className={styles.perkTitle}>Share your code</p>
              <p className={styles.perkDesc}>
                Copy your unique referral link and share it with friends,
                colleagues, or on social media.
              </p>
            </div>
            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>📝</div>
              <p className={styles.perkStep}>Step 2</p>
              <p className={styles.perkTitle}>They sign up</p>
              <p className={styles.perkDesc}>
                Your referral creates an account using your code and gets
                exclusive welcome perks.
              </p>
            </div>
            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>✅</div>
              <p className={styles.perkStep}>Step 3</p>
              <p className={styles.perkTitle}>They complete a booking</p>
              <p className={styles.perkDesc}>
                Once your referral completes their first booking, your reward is
                automatically credited.
              </p>
            </div>
            <div
              className={styles.perkCard}
              style={{
                borderColor: "rgba(249,115,22,0.3)",
                background: "rgba(249,115,22,0.05)",
              }}
            >
              <div className={styles.perkIcon}>💰</div>
              <p className={styles.perkStep}>You earn</p>
              <p className={styles.perkTitle}>Cash in your wallet</p>
              <p className={styles.perkDesc}>
                {d?.perks ? (
                  <>
                    <strong style={{ color: "var(--orange)" }}>
                      {
                        d.perks.whatYouEarn[
                          user?.role?.toLowerCase() || "worker"
                        ]
                      }
                    </strong>
                    <br />
                    Withdraw directly to your bank.
                  </>
                ) : (
                  "Earn ₦1,500–₦9,000 per successful referral based on your tier."
                )}
              </p>
            </div>
          </div>

          {/* Referee perks */}
          <div className={styles.refereePerkRow}>
            <div className={styles.refereePerkCard}>
              <p className={styles.refereePerkRole}>
                🔨 Workers who use your code get
              </p>
              <p className={styles.refereePerkDesc}>
                {d?.perks?.whatTheyGet?.worker ||
                  "30-day profile boost + platform fee waived on first 3 jobs"}
              </p>
            </div>
            <div className={styles.refereePerkCard}>
              <p className={styles.refereePerkRole}>
                🧑 Hirers who use your code get
              </p>
              <p className={styles.refereePerkDesc}>
                {d?.perks?.whatTheyGet?.hirer ||
                  "5% off first booking (up to ₦5,000) + ₦500 wallet credit"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabsWrap}>
          <div className={styles.tabBar}>
            {[
              {
                key: "referrals",
                label: `My Referrals${d?.stats?.totalReferrals > 0 ? ` (${d.stats.totalReferrals})` : ""}`,
              },
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

          {/* My Referrals */}
          {tab === "referrals" && (
            <div className={styles.tabContent}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              ) : !d?.referrals?.length ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>👥</span>
                  <p className={styles.emptyTitle}>No referrals yet</p>
                  <p className={styles.emptySub}>
                    Share your referral code to get started and start earning!
                  </p>
                  <button className={styles.emptyBtn} onClick={copyLink}>
                    Copy my referral link
                  </button>
                </div>
              ) : (
                <div className={styles.referralsList}>
                  {d.referrals.map((r, i) => (
                    <div
                      key={r.id}
                      className={styles.referralRow}
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <Avatar name={r.name} avatar={r.avatar} />
                      <div className={styles.referralInfo}>
                        <p className={styles.referralName}>{r.name}</p>
                        <p className={styles.referralMeta}>
                          <span
                            className={`${styles.rolePill} ${r.role === "WORKER" ? styles.rolePillWorker : styles.rolePillHirer}`}
                          >
                            {r.role === "WORKER" ? "🔨" : "🧑"} {r.role}
                          </span>
                          <span>· Joined {timeAgo(r.joinedAt)}</span>
                        </p>
                      </div>
                      <div className={styles.referralRight}>
                        <StatusBadge status={r.status} />
                        {r.status === "REWARDED" && (
                          <span className={styles.referralBonus}>
                            +{fmtAmt(r.bonus)}
                          </span>
                        )}
                        {r.status === "PENDING" && r.expiresAt && (
                          <span className={styles.referralExpiry}>
                            Expires {fmtDate(r.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <div className={styles.tabContent}>
              {!leaderboard ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              ) : (
                <>
                  {/* My rank highlight */}
                  {d?.leaderboardRank && (
                    <div className={styles.myRankBanner}>
                      🏅 You are rank <strong>#{d.leaderboardRank}</strong> on
                      the leaderboard
                    </div>
                  )}
                  <div className={styles.leaderboardList}>
                    {leaderboard.leaderboard?.map((u, i) => {
                      const ts2 =
                        TIER_STYLES[u.tier?.replace(/[^A-Z]/g, "")] ||
                        TIER_STYLES.BRONZE;
                      const medalEmoji =
                        i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `#${u.rank}`;
                      return (
                        <div
                          key={i}
                          className={`${styles.leaderboardRow} ${u.isMe ? styles.leaderboardRowMe : ""}`}
                          style={{ animationDelay: `${i * 35}ms` }}
                        >
                          <span className={styles.leaderboardRank}>
                            {medalEmoji}
                          </span>
                          <Avatar name={u.name} avatar={u.avatar} />
                          <div className={styles.leaderboardInfo}>
                            <p className={styles.leaderboardName}>
                              {u.name}{" "}
                              {u.isMe && (
                                <span className={styles.youTag}>You</span>
                              )}
                            </p>
                            <TierBadge
                              tier={u.tier?.replace(/[^A-Z]/g, "") || "BRONZE"}
                            />
                          </div>
                          <div className={styles.leaderboardRight}>
                            <p className={styles.leaderboardRefs}>
                              {u.referrals} referrals
                            </p>
                            <p className={styles.leaderboardEarned}>
                              {fmtAmt(u.earned)} earned
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Tiers reference */}
                  <div className={styles.tiersRef}>
                    <p className={styles.tiersRefTitle}>Tier requirements</p>
                    <div className={styles.tiersRefGrid}>
                      {leaderboard.tiers?.map((t) => {
                        const ts3 = TIER_STYLES[t.key] || TIER_STYLES.BRONZE;
                        return (
                          <div
                            key={t.key}
                            className={styles.tiersRefCard}
                            style={{
                              borderColor: ts3.border,
                              background: ts3.bg,
                            }}
                          >
                            <p style={{ color: ts3.color, fontWeight: 700 }}>
                              {t.label}
                            </p>
                            <p className={styles.tiersRefReqs}>
                              {t.minReferrals}+ referrals
                            </p>
                            <p className={styles.tiersRefBonus}>
                              Worker: {fmtAmt(t.workerBonus)}
                            </p>
                            <p className={styles.tiersRefBonus}>
                              Hirer: {fmtAmt(t.hirerBonus)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWd && (
        <WithdrawModal
          wallet={d?.wallet}
          onClose={() => setShowWd(false)}
          onSuccess={() => {
            setShowWd(false);
            showToast(
              "Withdrawal request submitted! Processing in 1–3 days 💸",
            );
            loadDashboard();
          }}
        />
      )}
    </Layout>
  );
}
