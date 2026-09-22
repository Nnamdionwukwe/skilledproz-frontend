// src/pages/referral/CampaignDashboard.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./CampaignDashboard.module.css";
import WorkerLayout from "../../components/layout/WorkerLayout";
import HirerLayout from "../../components/layout/HirerLayout";
import {
  FiSmartphone,
  FiUser,
  FiUsers,
  FiCamera,
  FiMusic,
  FiCheckCircle,
  FiCheck,
  FiXCircle,
  FiX,
  FiClock,
  FiInfo,
  FiAlertTriangle,
  FiPaperclip,
  FiUpload,
  FiSend,
  FiZap,
  FiGift,
  FiCreditCard,
  FiTarget,
  FiLink,
  FiCopy,
  FiShare2,
  FiArrowUp,
  FiArrowDown,
  FiDollarSign,
  FiChevronUp,
  FiChevronDown,
  FiFileText,
  FiLoader,
} from "react-icons/fi";

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
    icon: FiSmartphone,
    color: "#60a5fa",
    auto: true,
  },
  {
    key: "hasSetupProfile",
    label: "Setup Profile",
    icon: FiUser,
    color: "#a78bfa",
    auto: true,
  },
  {
    key: "hasFollowedFb",
    label: "Follow Facebook",
    icon: FiUsers,
    color: "#3b82f6",
    platform: "facebook",
  },
  {
    key: "hasFollowedIg",
    label: "Follow Instagram",
    icon: FiCamera,
    color: "#ec4899",
    platform: "instagram",
  },
  {
    key: "hasFollowedTt",
    label: "Follow TikTok",
    icon: FiMusic,
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

// ── Referral-program status meta (for the cross-system badge) ───────────────
const REFERRAL_PROGRAM_STATUS_META = {
  PENDING: { label: "Referral: Pending", cls: "yellow" },
  QUALIFIED: { label: "Referral: Qualified", cls: "indigo" },
  CONVERTED: { label: "Referral: Converted", cls: "blue" },
  REWARDED: { label: "Referral: Rewarded", cls: "green" },
  EXPIRED: { label: "Referral: Expired", cls: "dim" },
  FLAGGED: { label: "Referral: Flagged", cls: "red" },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.type === "success" ? FiCheckCircle : FiXCircle;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      <Icon size={14} />
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
function ReferralProgramBadge({ status }) {
  if (!status) return null;
  const m = REFERRAL_PROGRAM_STATUS_META[status] || {
    label: `Referral: ${status}`,
    cls: "dim",
  };
  return (
    <span
      className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}
      title="Referral program status"
    >
      👥 {m.label}
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

// ─── Full-screen image viewer ─────────────────────────────────────────────────
function FullscreenImage({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className={styles.lightboxBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="Close"
      >
        <FiX size={22} />
      </button>
      <img
        src={src}
        alt={alt || "Screenshot"}
        className={styles.lightboxImg}
        onClick={(e) => e.stopPropagation()}
      />
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className={styles.lightboxOpen}
        onClick={(e) => e.stopPropagation()}
      >
        Open in new tab ↗
      </a>
    </div>
  );
}

// ─── Social Platform Card ─────────────────────────────────────────────────────
// Requires a screenshot upload (file, not URL) before "Mark as followed"
// becomes enabled. Submitted screenshots open in a full-screen viewer.
function SocialCard({
  task,
  done,
  onReport,
  reporting,
  link,
  screenshotUrl,
  onError,
  onViewScreenshot,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

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
      color: "#3b82f6",
    },
  };
  const pc = platformColors[task.platform] || {};
  const TaskIcon = task.icon;

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onError?.("Please upload an image file (JPG, PNG, or WebP).");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      onError?.("Image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    if (!file) {
      onError?.("Please upload a screenshot first.");
      return;
    }
    onReport(task.platform, file);
  }

  return (
    <div
      className={`${styles.socialCard} ${done ? styles.socialCardDone : ""}`}
      style={{
        borderColor: done ? "var(--green)" : pc.border,
        background: done ? "var(--green-dim)" : pc.bg,
      }}
    >
      <div className={styles.socialCardTop}>
        <span className={styles.socialIcon} style={{ color: pc.color }}>
          <TaskIcon size={24} />
        </span>
        <div className={styles.socialInfo}>
          <p className={styles.socialName}>{task.label}</p>
          <p className={styles.socialHint}>@skilledproz</p>
        </div>
        {done ? (
          <span className={styles.socialDoneCheck}>
            <FiCheckCircle size={14} /> Done
          </span>
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
          </div>
        )}
      </div>

      {!done && (
        <div className={styles.socialProofRow}>
          <p className={styles.socialProofLabel}>
            <FiPaperclip size={12} /> Upload a screenshot showing you follow
            this page <span style={{ color: "var(--red)" }}>*</span>
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={pickFile}
          />

          {!preview ? (
            <button
              type="button"
              className={styles.socialProofToggle}
              onClick={() => fileRef.current?.click()}
            >
              <FiUpload size={12} /> Choose image
            </button>
          ) : (
            <div className={styles.socialPreviewWrap}>
              <img
                src={preview}
                alt="screenshot preview"
                className={styles.socialPreviewImg}
                onClick={() =>
                  onViewScreenshot(preview, `${task.label} preview`)
                }
                style={{ cursor: "zoom-in" }}
              />
              <div className={styles.socialPreviewActions}>
                <button
                  type="button"
                  className={styles.socialPreviewBtn}
                  onClick={() => fileRef.current?.click()}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className={`${styles.socialPreviewBtn} ${styles.socialPreviewBtnRed}`}
                  onClick={clearFile}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.socialMarkBtn}
            onClick={submit}
            disabled={!file || reporting === task.platform}
            title={!file ? "Upload a screenshot first" : ""}
          >
            {reporting === task.platform ? (
              <>
                <span className={styles.spinner} /> Uploading…
              </>
            ) : (
              "Mark as followed"
            )}
          </button>
        </div>
      )}

      {done && screenshotUrl && (
        <button
          type="button"
          className={styles.socialProofView}
          onClick={() =>
            onViewScreenshot(screenshotUrl, `${task.label} screenshot`)
          }
        >
          📎 View submitted screenshot
        </button>
      )}
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ balance, minWithdrawal, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: "",
    pin: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pinNotSet, setPinNotSet] = useState(false);

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
    if (!form.pin || form.pin.length !== 4) {
      setError("Please enter your 4-digit withdrawal PIN");
      return;
    }
    setLoading(true);
    try {
      await api.post("/campaign/withdraw", {
        amount: form.amount,
        pin: form.pin,
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      });
      onSuccess();
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.message || "Withdrawal failed";

      // Detect the "PIN not set" case so we can show a helpful CTA
      if (status === 403 && /pin/i.test(msg)) {
        setPinNotSet(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            <FiCreditCard size={16} /> Withdraw Campaign Earnings
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={14} />
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

          {/* ── Withdrawal PIN ── */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>Withdrawal PIN *</label>
            <input
              className={`${styles.input} ${styles.pinInput}`}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={form.pin}
              onChange={(e) => {
                setF("pin", e.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              autoComplete="off"
            />
            <p
              className={styles.formHint}
              style={{ textAlign: "left", margin: "4px 0 0" }}
            >
              The same 4-digit PIN you use for worker, referral, and campaign
              withdrawals.
            </p>
          </div>

          {error && (
            <div className={styles.formError}>
              <FiAlertTriangle size={14} /> {error}
            </div>
          )}

          {pinNotSet && (
            <a
              href="/settings?tab=security"
              className={styles.formHint}
              style={{
                display: "block",
                textAlign: "center",
                color: "var(--orange)",
                fontWeight: 700,
                textDecoration: "underline",
                marginBottom: 4,
              }}
            >
              Set your withdrawal PIN in Settings → Security →
            </a>
          )}

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
                <FiCheck size={11} /> {sub.totalApproved} approved
              </span>
            )}
            {sub.totalRejected > 0 && (
              <span className={styles.submissionRejected}>
                <FiX size={11} /> {sub.totalRejected} rejected
              </span>
            )}
          </div>
        </div>
        <div className={styles.submissionCardRight}>
          {sub.netAmount > 0 && (
            <p className={styles.submissionEarned}>{fmtAmt(sub.netAmount)}</p>
          )}
          <span className={styles.submissionToggle}>
            {open ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </span>
        </div>
      </div>

      {open && (
        <div className={styles.submissionExpanded}>
          {sub.adminNote && (
            <div className={styles.adminNoteBox}>
              <FiFileText size={13} /> <span>Admin:</span> {sub.adminNote}
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
                    <FiAlertTriangle size={12} />
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
  const [reporting, setReporting] = useState(null);
  const [toast, setToast] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { src, alt } | null

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, subsRes, tasksRes] = await Promise.allSettled([
        api.get("/campaign/status"),
        api.get("/campaign/submissions?limit=30"),
        api.get("/campaign/my-tasks"),
      ]);
      if (statusRes.status === "fulfilled") {
        const statusData = statusRes.value.data.data;
        setStatus(statusData);
        // The /campaign/status endpoint now returns an enriched referrals
        // array with each row carrying its referral-program status.
        setReferrals(statusData?.referrals || []);
      }
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

  // ── Referral code: prefer the store, fall back to the campaign status
  //    endpoint. The endpoint auto-generates a code if the user doesn't
  //    have one yet, so this is always populated for logged-in users.
  const referralCode = user?.referralCode || status?.code || "";

  // ── Reward + min withdrawal — sourced from the backend so we don't have
  //    to keep two numbers in sync. Defaults match the new values (₦200 / ₦1000).
  const rewardPerReferral = status?.rewardPerReferral || 200;
  const minWithdrawal = status?.wallet?.minWithdrawal || 1000;

  async function copyLink() {
    if (!referralCode) {
      showToast("Referral code not loaded yet", "error");
      return;
    }
    const link = `https://skilledproz.com/signup?ref=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showToast("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Copy failed", "error");
    }
  }

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

  // ── Now takes a File object and posts as multipart/form-data
  async function reportFollow(platform, file) {
    if (!file) {
      showToast("Please upload a screenshot first", "error");
      return;
    }
    setReporting(platform);
    try {
      const fd = new FormData();
      fd.append("platform", platform);
      fd.append("screenshot", file);

      const res = await api.post("/campaign/my-tasks/social", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(
        `${platform} follow recorded${res.data.data?.allDone ? " — all tasks done!" : ""}`,
      );
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to record", "error");
    } finally {
      setReporting(null);
    }
  }

  const st = status;
  const readyCount = st?.stats?.readyToSubmit || 0;
  const alreadySubmitted = st?.alreadySubmittedToday;
  const hasMyTasks = myTasks?.hasCampaignReferral;
  const walletBalance = st?.wallet?.balance || 0;

  // ── Submission preconditions ────────────────────────────────────────────
  // Require at least one ready referral, AND every ready referral must have
  // completed profile setup (task #2). If any is missing setup, the backend
  // rejects the submission anyway — so we prevent it at the UI too.
  const readyRefsWithTasks = referrals.filter((r) => r.status === "TASKS_DONE");
  const allReadyHaveProfile = readyRefsWithTasks.every(
    (r) => r.tasks?.hasSetupProfile === true,
  );
  const canSubmit =
    readyCount > 0 && !alreadySubmitted && !submitting && allReadyHaveProfile;

  const TABS = [
    { key: "earn", label: "Earn Daily", icon: FiDollarSign },
    ...(hasMyTasks
      ? [{ key: "tasks", label: "My Tasks", icon: FiCheckCircle }]
      : []),
    { key: "history", label: "History", icon: FiFileText },
  ];

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
              Earn{" "}
              <strong className={styles.highlight}>₦{rewardPerReferral}</strong>{" "}
              for every person who downloads the app, sets up their account, and
              follows us on social media.
            </p>
          </div>
          <div className={styles.headerBadge}>
            <FiDollarSign size={14} /> ₦{rewardPerReferral} / referral
          </div>
        </div>

        {/* ── Wallet + Stats Row ── */}
        <div className={styles.topRow}>
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
                      ? `Min. ${fmtAmt(minWithdrawal)}`
                      : ""
                  }
                >
                  <FiCreditCard size={14} /> Withdraw
                </button>
                {!st?.wallet?.canWithdraw && (
                  <p className={styles.walletHint}>
                    Need {fmtAmt(minWithdrawal)} · You have{" "}
                    {fmtAmt(walletBalance)}
                  </p>
                )}
              </>
            )}
          </div>

          <div className={styles.statsGrid}>
            {[
              {
                icon: FiUsers,
                val: st?.stats?.totalReferred,
                label: "Total Referred",
              },
              {
                icon: FiCheckCircle,
                val: readyCount,
                label: "Ready Today",
                accent: readyCount > 0 ? "green" : "",
              },
              {
                icon: FiClock,
                val: st?.stats?.pendingTasks,
                label: "Tasks Pending",
              },
              {
                icon: FiDollarSign,
                val: fmtAmt(st?.stats?.totalEarnings),
                label: "Total Earned",
                accent: "orange",
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={`${styles.statCard} ${s.accent ? styles[`accent_${s.accent}`] : ""}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className={styles.statIcon}>
                    <Icon size={18} />
                  </span>
                  <p className={styles.statVal}>
                    {loading ? "—" : (s.val ?? "0")}
                  </p>
                  <p className={styles.statLabel}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Submit Banner ── */}
        {!loading && (
          <div
            className={`${styles.submitBanner} ${
              alreadySubmitted
                ? styles.submitBannerDone
                : canSubmit
                  ? styles.submitBannerReady
                  : readyCount > 0 && !allReadyHaveProfile
                    ? styles.submitBannerReady
                    : styles.submitBannerIdle
            }`}
          >
            {alreadySubmitted ? (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>
                  <FiUpload size={24} />
                </span>
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
            ) : readyCount > 0 && !allReadyHaveProfile ? (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>
                  <FiAlertTriangle size={24} />
                </span>
                <div>
                  <p className={styles.submitBannerTitle}>
                    {readyRefsWithTasks.length} referral
                    {readyRefsWithTasks.length !== 1 ? "s" : ""} not fully
                    qualified
                  </p>
                  <p className={styles.submitBannerSub}>
                    Some referrals still need to complete their profile setup
                    before you can submit them.
                  </p>
                </div>
              </div>
            ) : canSubmit ? (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>
                  <FiZap size={24} />
                </span>
                <div>
                  <p className={styles.submitBannerTitle}>
                    {readyCount} referral{readyCount !== 1 ? "s" : ""} ready —
                    earn {fmtAmt(readyCount * rewardPerReferral)}!
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
                    <>
                      Submit Now <FiSend size={14} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className={styles.submitBannerContent}>
                <span className={styles.submitBannerIcon}>
                  <FiClock size={24} />
                </span>
                <div>
                  <p className={styles.submitBannerTitle}>
                    {pendingRefs.length > 0
                      ? `${pendingRefs.length} referral${pendingRefs.length !== 1 ? "s" : ""} still completing tasks`
                      : "Start referring to earn daily"}
                  </p>
                  <p className={styles.submitBannerSub}>
                    {pendingRefs.length > 0
                      ? "Share your code with them so they can complete all 5 tasks."
                      : `Share your referral code below — earn ₦${rewardPerReferral} per qualified person.`}
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
                  <FiX size={14} />
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
                    {fmtAmt(readyCount * rewardPerReferral)}
                  </strong>
                  .
                </p>
                <p className={styles.confirmNote}>
                  <FiAlertTriangle size={14} />
                  <span>
                    Admin has final say. Any referral that didn't fully complete
                    tasks will be declined and deducted.
                  </span>
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
            {TABS.map((t) => {
              const TabIcon = t.icon;
              return (
                <button
                  key={t.key}
                  className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  <TabIcon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ── EARN TAB ── */}
          {tab === "earn" && (
            <div className={styles.tabContent}>
              {/* Code Card */}
              <div className={styles.codeCard}>
                <div className={styles.codeCardLeft}>
                  <p className={styles.codeLabel}>Your referral code</p>
                  <p className={styles.codeValue}>{referralCode || "—"}</p>
                  <p className={styles.codeLink}>
                    {`https://skilledproz.com/signup?ref=${referralCode}`}
                  </p>
                </div>
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ""}`}
                  onClick={copyLink}
                  disabled={!referralCode}
                >
                  {copied ? (
                    <>
                      <FiCheck size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy size={14} /> Copy Link
                    </>
                  )}
                </button>
                <div className={styles.shareRow}>
                  <p className={styles.shareLabel}>Share via:</p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Join SkilledProz! Download the app, sign up with my code ${referralCode} and follow us on social media. I earn ₦${rewardPerReferral} when you complete all tasks! https://skilledproz.com/signup?ref=${referralCode}`)}`}
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
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Earn with me on SkilledProz! Use my referral code ${referralCode} when you sign up`)}`}
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
                <p className={styles.howTitle}>
                  How to earn ₦{rewardPerReferral} per person
                </p>
                <div className={styles.howSteps}>
                  {[
                    {
                      step: "1",
                      icon: FiLink,
                      text: "Share your referral code or link",
                    },
                    {
                      step: "2",
                      icon: FiSmartphone,
                      text: "They download & sign up with your code",
                    },
                    {
                      step: "3",
                      icon: FiUser,
                      text: "They complete their profile setup",
                    },
                    {
                      step: "4",
                      icon: FiUsers,
                      text: "They follow us on Facebook, Instagram & TikTok",
                    },
                    {
                      step: "5",
                      icon: FiUpload,
                      text: `You submit daily — admin verifies — ₦${rewardPerReferral} credited!`,
                    },
                  ].map((s) => {
                    const StepIcon = s.icon;
                    return (
                      <div key={s.step} className={styles.howStep}>
                        <div className={styles.howStepNum}>{s.step}</div>
                        <span className={styles.howStepIcon}>
                          <StepIcon size={16} />
                        </span>
                        <p className={styles.howStepText}>{s.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task legend */}
              <div className={styles.taskLegend}>
                {TASKS.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <span key={t.key} className={styles.taskLegendItem}>
                      <span
                        className={styles.taskDot}
                        style={{ background: t.color }}
                      >
                        <FiCheck size={9} />
                      </span>
                      {t.label}
                    </span>
                  );
                })}
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
                  <span>
                    <FiUsers size={36} />
                  </span>
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
                            {r.role === "WORKER" ? (
                              <FiTarget size={10} />
                            ) : (
                              <FiUser size={10} />
                            )}{" "}
                            {r.role}
                          </span>
                          <span>· {timeAgo(r.joinedAt)}</span>
                        </p>
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
                              {r.tasks[t.key] ? <FiCheck /> : ""}
                            </span>
                          ))}
                          <span className={styles.taskScore}>
                            {r.tasks.completedCount}/{r.tasks.totalCount} tasks
                          </span>
                        </div>
                        {/* ── Cross-system: referral-program status ── */}
                        {r.referralProgram && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <ReferralProgramBadge
                              status={r.referralProgram.status}
                            />
                            {r.referralProgram.bonus > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {fmtAmt(r.referralProgram.bonus)} bonus
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={styles.referralRight}>
                        <Badge status={r.status} meta={REFERRAL_META} />
                        {r.status === "APPROVED" && (
                          <span className={styles.referralEarned}>
                            +{fmtAmt(r.rewardAmount)}
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
                  <span>
                    <FiInfo size={36} />
                  </span>
                  <p>
                    You didn't sign up with a referral code, so you have no
                    tasks to complete.
                  </p>
                </div>
              ) : (
                <>
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
                      </p>
                    </div>
                    {myTasks.allDone && (
                      <div className={styles.allDoneBanner}>
                        <FiCheckCircle size={14} /> All tasks done! Your
                        referrer can now submit you for the ₦{rewardPerReferral}{" "}
                        reward.
                      </div>
                    )}
                  </div>

                  <div className={styles.autoTasks}>
                    {myTasks.tasks
                      ?.filter((t) => t.auto)
                      .map((t) => (
                        <div
                          key={t.key}
                          className={`${styles.autoTaskRow} ${t.done ? styles.autoTaskDone : ""}`}
                        >
                          <span
                            className={styles.autoTaskIcon}
                            style={{
                              color: t.done
                                ? "var(--green)"
                                : "var(--text-muted)",
                            }}
                          >
                            {t.done ? (
                              <FiCheckCircle size={20} />
                            ) : (
                              <FiClock size={20} />
                            )}
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

                  <p className={styles.socialTasksTitle}>
                    Follow us on social media
                  </p>
                  <div className={styles.socialTasks}>
                    {myTasks.tasks
                      ?.filter((t) => !t.auto)
                      .map((t) => {
                        const meta = TASKS.find((tk) => tk.key === t.key);
                        return (
                          <SocialCard
                            key={t.key}
                            task={meta}
                            done={t.done}
                            onReport={reportFollow}
                            reporting={reporting}
                            onError={(msg) => showToast(msg, "error")}
                            onViewScreenshot={(src, alt) =>
                              setLightbox({ src, alt })
                            }
                            link={myTasks.social?.[meta?.platform] || "#"}
                            screenshotUrl={t.proofUrl}
                          />
                        );
                      })}
                  </div>

                  <div className={styles.tasksNote}>
                    <FiFileText size={12} /> Upload a real screenshot for each
                    platform — admin reviews them before approving your reward.
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
                  <span>
                    <FiFileText size={36} />
                  </span>
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
          minWithdrawal={minWithdrawal}
          onClose={() => setShowWd(false)}
          onSuccess={() => {
            setShowWd(false);
            showToast("Withdrawal submitted! Processing in 1–3 days");
            loadAll();
          }}
        />
      )}

      {/* ── Full-screen image viewer ── */}
      {lightbox && (
        <FullscreenImage
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </Layout>
  );
}
