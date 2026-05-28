// src/pages/referral/CampaignDashboard.jsx
// Daily Referral Campaign — shared by Hirer and Worker
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./CampaignDashboard.module.css";
import WorkerLayout from "../../components/layout/WorkerLayout";
import HirerLayout from "../../components/layout/HirerLayout";

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
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Task metadata ─────────────────────────────────────────────────────────────
const TASKS = [
  {
    key: "hasDownloadedApp",
    label: "Download App",
    icon: "📱",
    color: "#60a5fa",
    auto: true,
  },
  {
    key: "hasSetupProfile",
    label: "Setup Profile",
    icon: "👤",
    color: "#a78bfa",
    auto: true,
  },
  {
    key: "hasFollowedFb",
    label: "Follow Facebook",
    icon: "👥",
    color: "#3b82f6",
    platform: "facebook",
  },
  {
    key: "hasFollowedIg",
    label: "Follow Instagram",
    icon: "📸",
    color: "#ec4899",
    platform: "instagram",
  },
  {
    key: "hasFollowedTt",
    label: "Follow TikTok",
    icon: "🎵",
    color: "#000",
    platform: "tiktok",
  },
];

const SUBMISSION_META = {
  PENDING: { label: "Under Review", cls: "yellow" },
  REVIEWING: { label: "Reviewing", cls: "orange" },
  APPROVED: { label: "Approved", cls: "green" },
  PARTIAL: { label: "Partial", cls: "blue" },
  REJECTED: { label: "Declined", cls: "red" },
};
const REFERRAL_META = {
  PENDING: { label: "In Progress", cls: "yellow" },
  TASKS_DONE: { label: "Ready", cls: "green" },
  SUBMITTED: { label: "Submitted", cls: "indigo" },
  APPROVED: { label: "Approved", cls: "green" },
  REJECTED: { label: "Rejected", cls: "red" },
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
function Badge({ status, meta }) {
  const m = meta[status] || { label: status, cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}
function Avatar({ name, avatar }) {
  const initials =
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <div className={styles.avatar}>
      {avatar ? <img src={avatar} alt={name} /> : <span>{initials}</span>}
    </div>
  );
}

// ─── Task Dots ─────────────────────────────────────────────────────────────────
function TaskDots({ ref: r }) {
  return (
    <div className={styles.taskDots}>
      {TASKS.map((t) => (
        <span
          key={t.key}
          className={`${styles.taskDot} ${r[t.key] ? styles.taskDotDone : ""}`}
          style={r[t.key] ? { background: t.color } : {}}
          title={t.label}
        >
          {r[t.key] ? "✓" : ""}
        </span>
      ))}
    </div>
  );
}

// ─── Social Platform Card ─────────────────────────────────────────────────────
function SocialCard({ task, done, onReport, reporting, link, screenshotUrl }) {
  const [showUpload, setShowUpload] = useState(false);
  const [proof, setProof] = useState("");

  const platformColors = {
    facebook: {
      bg: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.3)",
      color: "#3b82f6",
    },
    instagram: {
      bg: "rgba(236,72,153,0.1)",
      border: "rgba(236,72,153,0.3)",
      color: "#ec4899",
    },
    tiktok: {
      bg: "rgba(0,0,0,0.2)",
      border: "rgba(255,255,255,0.15)",
      color: "#fff",
    },
  };
  const pc = platformColors[task.platform] || {};

  return (
    <div
      className={`${styles.socialCard} ${done ? styles.socialCardDone : ""}`}
      style={{
        borderColor: done ? "var(--green)" : pc.border,
        background: done ? "var(--green-dim)" : pc.bg,
      }}
    >
      <div className={styles.socialCardTop}>
        <span className={styles.socialIcon}>{task.icon}</span>
        <div className={styles.socialInfo}>
          <p className={styles.socialName}>{task.label}</p>
          <p className={styles.socialHint}>@skilledproz</p>
        </div>
        {done ? (
          <span className={styles.socialDoneCheck}>✅ Done</span>
        ) : (
          <div className={styles.socialActions}>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className={styles.socialFollowBtn}
              style={{
                background: pc.color,
                color: task.platform === "tiktok" ? "#fff" : "#000",
              }}
            >
              Follow
            </a>
            <button
              className={styles.socialMarkBtn}
              onClick={() => onReport(task.platform, proof)}
              disabled={reporting === task.platform}
            >
              {reporting === task.platform ? (
                <span className={styles.spinner} />
              ) : (
                "Mark done"
              )}
            </button>
          </div>
        )}
      </div>
      {!done && (
        <div className={styles.socialProofRow}>
          <button
            className={styles.socialProofToggle}
            onClick={() => setShowUpload((v) => !v)}
          >
            📎 Add screenshot (optional)
          </button>
          {showUpload && (
            <input
              className={styles.socialProofInput}
              placeholder="Paste screenshot URL…"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ balance, minWithdrawal, onClose, onSuccess }) {
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
    if (!amt || amt < minWithdrawal) {
      setError(`Minimum is ${fmtAmt(minWithdrawal)}`);
      return;
    }
    if (amt > balance) {
      setError(`Insufficient balance. Available: ${fmtAmt(balance)}`);
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      setError("All bank fields required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/campaign/withdraw", form);
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
          <p className={styles.modalTitle}>💸 Withdraw Campaign Earnings</p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.walletPreview}>
            <span>Available</span>
            <span className={styles.walletPreviewAmt}>{fmtAmt(balance)}</span>
            <span className={styles.walletPreviewMin}>
              Min. {fmtAmt(minWithdrawal)}
            </span>
          </div>
          {[
            {
              k: "amount",
              label: "Amount (₦) *",
              type: "number",
              placeholder: `Min ${fmtAmt(minWithdrawal)}`,
            },
            {
              k: "bankName",
              label: "Bank Name *",
              type: "text",
              placeholder: "e.g. Access Bank",
            },
            {
              k: "accountNumber",
              label: "Account Number *",
              type: "text",
              placeholder: "10-digit number",
            },
            {
              k: "accountName",
              label: "Account Name *",
              type: "text",
              placeholder: "Name on account",
            },
          ].map((f) => (
            <div key={f.k} className={styles.formField}>
              <label className={styles.formLabel}>{f.label}</label>
              <input
                className={styles.input}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.k]}
                onChange={(e) => setF(f.k, e.target.value)}
                maxLength={f.k === "accountNumber" ? 10 : undefined}
              />
            </div>
          ))}
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
          <p className={styles.formHint}>Processed within 1–3 business days</p>
        </form>
      </div>
    </div>
  );
}

// ─── Submission Card ──────────────────────────────────────────────────────────
function SubmissionCard({ sub }) {
  const [open, setOpen] = useState(false);
  const s = SUBMISSION_META[sub.status] || SUBMISSION_META.PENDING;

  return (
    <div
      className={`${styles.submissionCard} ${styles[`submissionCard_${sub.status}`]}`}
    >
      <div
        className={styles.submissionCardTop}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={styles.submissionCardLeft}>
          <p className={styles.submissionDate}>{sub.date}</p>
          <div className={styles.submissionMeta}>
            <Badge status={sub.status} meta={SUBMISSION_META} />
            <span className={styles.submissionCount}>
              {sub.totalSubmitted} submitted
            </span>
            {sub.totalApproved > 0 && (
              <span className={styles.submissionApproved}>
                ✓ {sub.totalApproved} approved
              </span>
            )}
            {sub.totalRejected > 0 && (
              <span className={styles.submissionRejected}>
                ✗ {sub.totalRejected} rejected
              </span>
            )}
          </div>
        </div>
        <div className={styles.submissionCardRight}>
          {sub.netAmount > 0 && (
            <p className={styles.submissionEarned}>{fmtAmt(sub.netAmount)}</p>
          )}
          <span className={styles.submissionToggle}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className={styles.submissionExpanded}>
          {sub.adminNote && (
            <div className={styles.adminNoteBox}>
              <span>📝 Admin:</span> {sub.adminNote}
            </div>
          )}
          <div className={styles.submissionReferralList}>
            {sub.referrals?.map((r) => (
              <div key={r.id} className={styles.subReferralRow}>
                <Avatar name={r.name} avatar={r.avatar} />
                <span className={styles.subReferralName}>{r.name}</span>
                <Badge status={r.status} meta={REFERRAL_META} />
                {r.status === "APPROVED" && (
                  <span className={styles.subReward}>+{fmtAmt(r.reward)}</span>
                )}
                {r.note && (
                  <span className={styles.subNote} title={r.note}>
                    ⚠️
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CampaignDashboard() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [status, setStatus] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [myTasks, setMyTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("earn");
  const [copied, setCopied] = useState(false);
  const [showWd, setShowWd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(null); // platform being reported
  const [toast, setToast] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, referralsRes, subsRes, tasksRes] =
        await Promise.allSettled([
          api.get("/campaign/status"),
          api.get("/campaign/referrals?limit=50"),
          api.get("/campaign/submissions?limit=30"),
          api.get("/campaign/my-tasks"),
        ]);
      if (statusRes.status === "fulfilled")
        setStatus(statusRes.value.data.data);
      if (referralsRes.status === "fulfilled")
        setReferrals(referralsRes.value.data.data?.referrals || []);
      if (subsRes.status === "fulfilled")
        setSubmissions(subsRes.value.data.data?.submissions || []);
      if (tasksRes.status === "fulfilled") setMyTasks(tasksRes.value.data.data);
    } catch {
      showToast("Failed to load campaign data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Copy referral link ─────────────────────────────────────────────────────
  async function copyLink() {
    const link = `${status?.social ? window.location.origin : "https://skilledproz.com"}/signup?ref=${user?.referralCode || ""}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showToast("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Copy failed", "error");
    }
  }

  // ── Submit daily campaign ──────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await api.post("/campaign/submit");
      showToast(`${res.data.message}`);
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Report social follow ───────────────────────────────────────────────────
  async function reportFollow(platform, screenshotUrl = "") {
    setReporting(platform);
    try {
      const res = await api.post("/campaign/my-tasks/social", {
        platform,
        screenshotUrl: screenshotUrl || undefined,
      });
      showToast(
        `${platform} follow recorded${res.data.data?.allDone ? " 🎉 All tasks done!" : ""}!`,
      );
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to record", "error");
    } finally {
      setReporting(null);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const st = status;
  const readyCount = st?.stats?.readyToSubmit || 0;
  const alreadySubmitted = st?.alreadySubmittedToday;
  const canSubmit = readyCount > 0 && !alreadySubmitted && !submitting;
  const hasMyTasks = myTasks?.hasCampaignReferral;
  const walletBalance = st?.wallet?.balance || 0;

  const TABS = [
    { key: "earn", label: "💰 Earn Daily" },
    ...(hasMyTasks ? [{ key: "tasks", label: "✅ My Tasks" }] : []),
    { key: "history", label: "📋 History" },
  ];

  // today's referrals
  const todayStr = todayString();
  const todayRefs = referrals.filter(
    (r) => r.joinedAt?.slice(0, 10) === todayStr,
  );
  const readyRefs = referrals.filter((r) => r.status === "TASKS_DONE");
  const pendingRefs = referrals.filter((r) => r.status === "PENDING");

  return (
    <Layout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Daily Campaign</p>
            <h1 className={styles.pageTitle}>Refer &amp; Earn Daily</h1>
            <p className={styles.pageSubtitle}>
              Earn <strong className={styles.highlight}>₦100</strong> for every
              person who downloads the app, sets up their account, and follows
              us on social media.
            </p>
          </div>
          <div className={styles.headerBadge}>
            <span>💵</span> ₦100 / referral
          </div>
        </div>

        {/* ── Wallet + Stats Row ── */}
        <div className={styles.topRow}>
          {/* Wallet Card */}
          <div className={styles.walletCard}>
            <p className={styles.walletLabel}>Campaign Wallet</p>
            {loading ? (
              <div className={styles.skWallet} />
            ) : (
              <>
                <p className={styles.walletBalance}>{fmtAmt(walletBalance)}</p>
                <p className={styles.walletLifetime}>
                  All-time: {fmtAmt(st?.wallet?.lifetimeTotal)}
                </p>
                <button
                  className={styles.withdrawBtn}
                  disabled={!st?.wallet?.canWithdraw}
                  onClick={() => setShowWd(true)}
                  title={
                    !st?.wallet?.canWithdraw
                      ? `Min. ${fmtAmt(st?.wallet?.minWithdrawal)}`
                      : ""
                  }
                >
                  💸 Withdraw
                </button>
                {!st?.wallet?.canWithdraw && (
                  <p className={styles.walletHint}>
                    Need {fmtAmt(st?.wallet?.minWithdrawal)} · You have{" "}
                    {fmtAmt(walletBalance)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            {[
              {
                icon: "👥",
                val: st?.stats?.totalReferred,
                label: "Total Referred",
              },
              {
                icon: "✅",
                val: readyCount,
                label: "Ready Today",
                accent: readyCount > 0 ? "green" : "",
              },
              {
                icon: "📋",
                val: st?.stats?.pendingTasks,
                label: "Tasks Pending",
              },
              {
                icon: "💰",
                val: fmtAmt(st?.stats?.totalEarnings),
                label: "Total Earned",
                accent: "orange",
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`${styles.statCard} ${s.accent ? styles[`accent_${s.accent}`] : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={styles.statIcon}>{s.icon}</span>
                <p className={styles.statVal}>
                  {loading ? "—" : (s.val ?? "0")}
                </p>
                <p className={styles.statLabel}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Submit Banner ── */}
        {!loading && (
          <div
            className={`${styles.submitBanner} ${alreadySubmitted ? styles.submitBannerDone : canSubmit ? styles.submitBannerReady : styles.submitBannerIdle}`}
          >
            {alreadySubmitted ? (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>📤</span>
                <div>
                  <p className={styles.submitBannerTitle}>Submitted today!</p>
                  <p className={styles.submitBannerSub}>
                    {st?.todaySubmission?.totalSubmitted} referral
                    {st?.todaySubmission?.totalSubmitted !== 1 ? "s" : ""} sent
                    for review. Status:{" "}
                    <Badge
                      status={st?.todaySubmission?.status}
                      meta={SUBMISSION_META}
                    />
                  </p>
                </div>
              </div>
            ) : canSubmit ? (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>🚀</span>
                <div>
                  <p className={styles.submitBannerTitle}>
                    {readyCount} referral{readyCount !== 1 ? "s" : ""} ready —
                    earn {fmtAmt(readyCount * 100)}!
                  </p>
                  <p className={styles.submitBannerSub}>
                    Submit today's batch for admin review to get paid.
                  </p>
                </div>
                <button
                  className={styles.submitBannerBtn}
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className={styles.spinner} /> Submitting…
                    </>
                  ) : (
                    "Submit Now →"
                  )}
                </button>
              </div>
            ) : (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>⏳</span>
                <div>
                  <p className={styles.submitBannerTitle}>
                    {pendingRefs.length > 0
                      ? `${pendingRefs.length} referral${pendingRefs.length !== 1 ? "s" : ""} still completing tasks`
                      : "Start referring to earn daily"}
                  </p>
                  <p className={styles.submitBannerSub}>
                    {pendingRefs.length > 0
                      ? "Share your code with them so they can complete all 5 tasks."
                      : "Share your referral code below — earn ₦100 per qualified person."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Confirm Modal ── */}
        {showConfirm && (
          <div
            className={styles.backdrop}
            onClick={() => setShowConfirm(false)}
          >
            <div
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 400 }}
            >
              <div className={styles.modalHeader}>
                <p className={styles.modalTitle}>
                  Submit {readyCount} referrals?
                </p>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowConfirm(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.confirmBody}>
                <p>
                  You are submitting <strong>{readyCount}</strong> referral
                  {readyCount !== 1 ? "s" : ""} for admin review.
                </p>
                <p>
                  If approved, you will earn{" "}
                  <strong className={styles.highlight}>
                    {fmtAmt(readyCount * 100)}
                  </strong>
                  .
                </p>
                <p className={styles.confirmNote}>
                  ⚠️ Admin has final say. Any referral that didn't fully
                  complete tasks will be declined and deducted.
                </p>
                <div className={styles.confirmActions}>
                  <button
                    className={styles.confirmCancel}
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.confirmSubmit}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className={styles.spinner} /> Submitting…
                      </>
                    ) : (
                      "Confirm Submit"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className={styles.tabsWrap}>
          <div className={styles.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── EARN TAB ── */}
          {tab === "earn" && (
            <div className={styles.tabContent}>
              {/* Code Card */}
              <div className={styles.codeCard}>
                <div className={styles.codeCardLeft}>
                  <p className={styles.codeLabel}>Your referral code</p>
                  <p className={styles.codeValue}>
                    {user?.referralCode || "Loading…"}
                  </p>
                  <p className={styles.codeLink}>
                    {`${window.location.origin}/signup?ref=${user?.referralCode || ""}`}
                  </p>
                </div>
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ""}`}
                  onClick={copyLink}
                >
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <div className={styles.shareRow}>
                  <p className={styles.shareLabel}>Share via:</p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Join SkilledProz! Download the app, sign up with my code ${user?.referralCode} and follow us on social media. I earn ₦100 when you complete all tasks! ${window.location.origin}/signup?ref=${user?.referralCode}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.shareBtn} ${styles.shareBtnWa}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Earn with me on SkilledProz! Use my referral code ${user?.referralCode} when you sign up 👇`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.shareBtn} ${styles.shareBtnX}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Post
                  </a>
                </div>
              </div>

              {/* How it works */}
              <div className={styles.howItWorks}>
                <p className={styles.howTitle}>How to earn ₦100 per person</p>
                <div className={styles.howSteps}>
                  {[
                    {
                      step: "1",
                      icon: "🔗",
                      text: "Share your referral code or link",
                    },
                    {
                      step: "2",
                      icon: "📱",
                      text: "They download & sign up with your code",
                    },
                    {
                      step: "3",
                      icon: "👤",
                      text: "They complete their profile setup",
                    },
                    {
                      step: "4",
                      icon: "📲",
                      text: "They follow us on Facebook, Instagram & TikTok",
                    },
                    {
                      step: "5",
                      icon: "📤",
                      text: "You submit daily — admin verifies — ₦100 credited!",
                    },
                  ].map((s) => (
                    <div key={s.step} className={styles.howStep}>
                      <div className={styles.howStepNum}>{s.step}</div>
                      <span className={styles.howStepIcon}>{s.icon}</span>
                      <p className={styles.howStepText}>{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task legend */}
              <div className={styles.taskLegend}>
                {TASKS.map((t) => (
                  <span key={t.key} className={styles.taskLegendItem}>
                    <span
                      className={styles.taskDot}
                      style={{ background: t.color }}
                    >
                      ✓
                    </span>
                    {t.label}
                  </span>
                ))}
              </div>

              {/* Today's Referrals */}
              <div className={styles.sectionHeader}>
                <p className={styles.sectionTitle}>
                  All Referrals
                  {referrals.length > 0 && (
                    <span className={styles.sectionCount}>
                      {referrals.length}
                    </span>
                  )}
                </p>
              </div>

              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              ) : referrals.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>👥</span>
                  <p>No referrals yet — share your code to start earning!</p>
                </div>
              ) : (
                <div className={styles.referralsList}>
                  {referrals.map((r, i) => (
                    <div
                      key={r.id}
                      className={styles.referralCard}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Avatar name={r.name} avatar={r.avatar} />
                      <div className={styles.referralInfo}>
                        <p className={styles.referralName}>{r.name}</p>
                        <p className={styles.referralMeta}>
                          <span
                            className={`${styles.rolePill} ${r.role === "WORKER" ? styles.rolePillW : styles.rolePillH}`}
                          >
                            {r.role === "WORKER" ? "🔨" : "🧑"} {r.role}
                          </span>
                          <span>· {timeAgo(r.joinedAt)}</span>
                        </p>
                        {/* Task progress */}
                        <div className={styles.taskProgress}>
                          {TASKS.map((t) => (
                            <span
                              key={t.key}
                              className={`${styles.taskPip} ${r.tasks[t.key] ? styles.taskPipDone : ""}`}
                              style={
                                r.tasks[t.key] ? { background: t.color } : {}
                              }
                              title={t.label}
                            >
                              {r.tasks[t.key] ? "✓" : ""}
                            </span>
                          ))}
                          <span className={styles.taskScore}>
                            {r.tasks.completedCount}/{r.tasks.totalCount} tasks
                          </span>
                        </div>
                      </div>
                      <div className={styles.referralRight}>
                        <Badge status={r.status} meta={REFERRAL_META} />
                        {r.status === "APPROVED" && (
                          <span className={styles.referralEarned}>
                            +₦{r.rewardAmount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MY TASKS TAB (referred user) ── */}
          {tab === "tasks" && (
            <div className={styles.tabContent}>
              {!hasMyTasks ? (
                <div className={styles.emptyState}>
                  <span>ℹ️</span>
                  <p>
                    You didn't sign up with a referral code, so you have no
                    tasks to complete.
                  </p>
                </div>
              ) : (
                <>
                  {/* Progress header */}
                  <div className={styles.tasksHeader}>
                    <div className={styles.tasksProgress}>
                      <div className={styles.tasksProgressBar}>
                        <div
                          className={styles.tasksProgressFill}
                          style={{
                            width: `${(myTasks.completedCount / myTasks.totalCount) * 100}%`,
                          }}
                        />
                      </div>
                      <p className={styles.tasksProgressText}>
                        {myTasks.completedCount}/{myTasks.totalCount} tasks
                        complete
                        {myTasks.allDone && " 🎉"}
                      </p>
                    </div>
                    {myTasks.allDone && (
                      <div className={styles.allDoneBanner}>
                        ✅ All tasks done! Your referrer can now submit you for
                        the ₦100 reward.
                      </div>
                    )}
                  </div>

                  {/* Auto tasks */}
                  <div className={styles.autoTasks}>
                    {myTasks.tasks
                      ?.filter((t) => t.auto)
                      .map((t) => (
                        <div
                          key={t.key}
                          className={`${styles.autoTaskRow} ${t.done ? styles.autoTaskDone : ""}`}
                        >
                          <span className={styles.autoTaskIcon}>
                            {t.done ? "✅" : "⏳"}
                          </span>
                          <div>
                            <p className={styles.autoTaskLabel}>{t.label}</p>
                            {t.hint && (
                              <p className={styles.autoTaskHint}>{t.hint}</p>
                            )}
                          </div>
                          {t.done && (
                            <span className={styles.autoTaskCheck}>Done</span>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Social tasks */}
                  <p className={styles.socialTasksTitle}>
                    Follow us on social media
                  </p>
                  <div className={styles.socialTasks}>
                    {myTasks.tasks
                      ?.filter((t) => !t.auto)
                      .map((t) => (
                        <SocialCard
                          key={t.key}
                          task={TASKS.find((tk) => tk.key === t.key)}
                          done={t.done}
                          onReport={reportFollow}
                          reporting={reporting}
                          link={
                            myTasks.social?.[
                              t.key?.replace("hasFollowed", "").toLowerCase()
                            ] || "#"
                          }
                          screenshotUrl={t.proofUrl}
                        />
                      ))}
                  </div>

                  <div className={styles.tasksNote}>
                    📝 Screenshots are optional but help if admin needs to
                    verify your follows.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <div className={styles.tabContent}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms`, height: 80 }}
                  />
                ))
              ) : submissions.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>📋</span>
                  <p>
                    No submissions yet. Submit your first daily batch to see
                    history here.
                  </p>
                </div>
              ) : (
                <div className={styles.submissionsList}>
                  {submissions.map((s) => (
                    <SubmissionCard key={s.id} sub={s} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWd && (
        <WithdrawModal
          balance={walletBalance}
          minWithdrawal={st?.wallet?.minWithdrawal || 500}
          onClose={() => setShowWd(false)}
          onSuccess={() => {
            setShowWd(false);
            showToast("Withdrawal submitted! Processing in 1–3 days 💸");
            loadAll();
          }}
        />
      )}
    </Layout>
  );
}
