// src/pages/admin/AdminCampaign.jsx
// Full admin campaign management.
//
// Endpoints:
//   GET   /campaign/admin/stats
//   GET   /campaign/admin/submissions?status=&search=&date=&page=&limit=
//   PATCH /campaign/admin/submissions/:id/review     { decisions, adminNote }
//   GET   /campaign/admin/withdrawals?status=&page=&limit=
//   PATCH /campaign/admin/withdrawals/:id/approve
//   PATCH /campaign/admin/withdrawals/:id/reject     { reason }
//
// Every field the backend sends is rendered. Lucide icons throughout.
// Fully responsive. Uses platform AlertModal.

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  ClipboardList,
  CheckCircle,
  Wallet,
  Clock,
  PiggyBank,
  Layers,
  Smartphone,
  UserCircle,
  Users,
  Camera,
  Music2,
  Copy,
  Check,
  X,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Paperclip,
  ZoomIn,
  Paperclip as PaperclipIcon,
  AlertTriangle,
  Trophy,
  Banknote,
  Landmark,
  FileText,
  Inbox,
  Receipt,
  BadgeCheck,
  XCircle as XCircleIcon,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import styles from "./AdminCampaign.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtAmt = (n) =>
  `₦${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const timeAgo = (d) => {
  if (!d) return "—";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

function isImageUrl(str) {
  if (!str || typeof str !== "string") return false;
  const t = str.trim();
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(t))
    return true;
  if (
    /^https?:\/\/.*(cloudinary\.com|cloudfront\.net|amazonaws\.com|supabase\.co|firebase\w*\.app|imgix\.net|imagekit\.io|res\.cloudinary\.com)\/.+/i.test(
      t,
    )
  )
    return true;
  return false;
}

// ─── Task metadata (Lucide icons) ─────────────────────────────────────────────
const TASKS = [
  {
    key: "hasDownloadedApp",
    label: "Download",
    Icon: Smartphone,
    proofKey: null,
    color: "#60a5fa",
  },
  {
    key: "hasSetupProfile",
    label: "Profile",
    Icon: UserCircle,
    proofKey: null,
    color: "#a78bfa",
  },
  {
    key: "hasFollowedFb",
    label: "Facebook",
    Icon: Users,
    proofKey: "fbScreenshotUrl",
    color: "#3b82f6",
  },
  {
    key: "hasFollowedIg",
    label: "Instagram",
    Icon: Camera,
    proofKey: "igScreenshotUrl",
    color: "#ec4899",
  },
  {
    key: "hasFollowedTt",
    label: "TikTok",
    Icon: Music2,
    proofKey: "ttScreenshotUrl",
    color: "#94a3b8",
  },
];

const SUB_STATUS = {
  PENDING: { label: "Pending Review", cls: "yellow" },
  REVIEWING: { label: "Reviewing", cls: "orange" },
  APPROVED: { label: "Approved", cls: "green" },
  PARTIAL: { label: "Partial", cls: "blue" },
  REJECTED: { label: "Rejected", cls: "red" },
};
const WD_STATUS = {
  PENDING: { label: "Pending", cls: "yellow" },
  APPROVED: { label: "Approved", cls: "green" },
  REJECTED: { label: "Rejected", cls: "red" },
};
const REF_STATUS = {
  PENDING: { label: "Pending", cls: "dim" },
  TASKS_DONE: { label: "Tasks Done", cls: "blue" },
  SUBMITTED: { label: "Submitted", cls: "indigo" },
  APPROVED: { label: "Approved", cls: "green" },
  REJECTED: { label: "Rejected", cls: "red" },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

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

function Badge({ status, meta }) {
  const m = (meta || {})[status] || { label: status, cls: "dim" };
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

function TaskPip({ done, label, Icon, color, proofUrl, onViewProof }) {
  return (
    <span
      className={`${styles.taskPip} ${done ? styles.taskPipDone : styles.taskPipMiss}`}
      style={done ? { background: color, borderColor: color } : {}}
      title={label + (proofUrl ? " (screenshot available)" : "")}
    >
      {Icon ? <Icon size={11} /> : null}
      {proofUrl && done && (
        <button
          type="button"
          className={styles.proofDot}
          onClick={(e) => {
            e.stopPropagation();
            onViewProof?.(proofUrl);
          }}
          title="View screenshot"
          aria-label="View screenshot"
        />
      )}
    </span>
  );
}

// ─── Evidence / Screenshot Lightbox ───────────────────────────────────────────
function ScreenshotLightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isImg = isImageUrl(url);
  return (
    <div className={styles.evidenceBackdrop} onClick={onClose}>
      <div className={styles.evidenceHeader}>
        <span className={styles.evidenceHeaderLabel}>
          <PaperclipIcon size={13} /> Screenshot
        </span>
        <div className={styles.evidenceHeaderActions}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={styles.evidenceOpenBtn}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> Open in new tab
          </a>
          <button
            className={styles.evidenceClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className={styles.evidenceBody} onClick={(e) => e.stopPropagation()}>
        {isImg ? (
          <img src={url} alt="Screenshot" className={styles.evidenceImg} />
        ) : (
          <div className={styles.evidenceNonImage}>
            <FileText size={40} />
            <p className={styles.evidenceNonImageText}>
              This proof is a file, not an image.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={styles.evidenceOpenBtnLg}
            >
              <ExternalLink size={13} /> Open file
            </a>
            <p className={styles.evidenceUrlText} title={url}>
              {url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function ReviewDrawer({ submission, onClose, onDone, showToast }) {
  const [decisions, setDecisions] = useState(() => {
    const d = {};
    (submission.referrals || []).forEach((r) => {
      d[r.id] = { approved: null, note: "" };
    });
    return d;
  });
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [proofUrl, setProofUrl] = useState(null);

  function setDecision(refId, approved) {
    setDecisions((prev) => ({
      ...prev,
      [refId]: { ...prev[refId], approved },
    }));
    setError("");
  }
  function setNote(refId, note) {
    setDecisions((prev) => ({ ...prev, [refId]: { ...prev[refId], note } }));
  }
  function approveAll() {
    const d = {};
    (submission.referrals || []).forEach((r) => {
      d[r.id] = { approved: true, note: "" };
    });
    setDecisions(d);
  }
  function rejectAll() {
    const d = {};
    (submission.referrals || []).forEach((r) => {
      d[r.id] = { approved: false, note: "" };
    });
    setDecisions(d);
  }

  const approved = Object.values(decisions).filter(
    (d) => d.approved === true,
  ).length;
  const rejected = Object.values(decisions).filter(
    (d) => d.approved === false,
  ).length;
  const pending = Object.values(decisions).filter(
    (d) => d.approved === null,
  ).length;
  const netAmt = approved * 100;
  const allSet = pending === 0;

  async function handleSubmit() {
    if (!allSet) {
      setError("Please approve or reject every referral before submitting.");
      return;
    }
    setSaving(true);
    try {
      const decisionsArr = (submission.referrals || []).map((r) => ({
        referralId: r.id,
        approved: decisions[r.id]?.approved ?? false,
        note: decisions[r.id]?.note || undefined,
      }));
      await api.patch(`/campaign/admin/submissions/${submission.id}/review`, {
        decisions: decisionsArr,
        adminNote: adminNote || undefined,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Review failed");
    } finally {
      setSaving(false);
    }
  }

  const refs = submission.referrals || [];

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose}>
        <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.drawerHeaderLeft}>
              <p className={styles.drawerEyebrow}>Reviewing Submission</p>
              <p className={styles.drawerTitle}>{submission.submissionDate}</p>
              <p className={styles.drawerSubtitle}>
                Referred by{" "}
                <strong>
                  {submission.referrer?.firstName}{" "}
                  {submission.referrer?.lastName}
                </strong>
                &nbsp;·&nbsp;{submission.totalSubmitted} referral
                {submission.totalSubmitted !== 1 ? "s" : ""}
                &nbsp;·&nbsp;Gross {fmtAmt(submission.grossAmount)}
              </p>
              {submission.id && (
                <div className={styles.drawerSubIds}>
                  <CopyPill
                    text={submission.id}
                    label={`submission ${submission.id.slice(0, 10)}…`}
                  />
                </div>
              )}
            </div>
            <button
              className={styles.drawerClose}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick actions */}
          <div className={styles.drawerQuickActions}>
            <button className={styles.approveAllBtn} onClick={approveAll}>
              <CheckCircle size={13} /> Approve All
            </button>
            <button className={styles.rejectAllBtn} onClick={rejectAll}>
              <XCircleIcon size={13} /> Reject All
            </button>
            <div className={styles.drawerRunning}>
              <span className={styles.runningApprove}>
                <Check size={11} /> {approved}
              </span>
              <span className={styles.runningReject}>
                <X size={11} /> {rejected}
              </span>
              {pending > 0 && (
                <span className={styles.runningPending}>? {pending}</span>
              )}
              <span className={styles.runningAmt}>{fmtAmt(netAmt)}</span>
            </div>
          </div>

          {/* Referral list */}
          <div className={styles.drawerReferrals}>
            {refs.map((r, i) => {
              const dec = decisions[r.id] || { approved: null, note: "" };
              const tasksDone = TASKS.filter((t) => r[t.key]).length;
              return (
                <div
                  key={r.id}
                  className={`${styles.reviewCard}
                    ${dec.approved === true ? styles.reviewCardApproved : ""}
                    ${dec.approved === false ? styles.reviewCardRejected : ""}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Top row */}
                  <div className={styles.reviewCardTop}>
                    <Avatar
                      name={r.referred?.firstName + " " + r.referred?.lastName}
                      avatar={r.referred?.avatar}
                    />
                    <div className={styles.reviewCardInfo}>
                      <p className={styles.reviewCardName}>
                        {r.referred?.firstName} {r.referred?.lastName}
                      </p>
                      <div className={styles.reviewCardMeta}>
                        <span
                          className={`${styles.rolePill} ${r.referred?.role === "WORKER" ? styles.rolePillW : styles.rolePillH}`}
                        >
                          {r.referred?.role === "WORKER" ? (
                            <>
                              <Users size={10} /> WORKER
                            </>
                          ) : (
                            <>
                              <UserCircle size={10} /> HIRER
                            </>
                          )}
                        </span>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.tasksScore}>
                          {tasksDone}/5 tasks
                        </span>
                        {r.id && (
                          <>
                            <span className={styles.metaDot}>·</span>
                            <CopyPill
                              text={r.id}
                              label={`ref ${r.id.slice(0, 8)}…`}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Decision buttons */}
                    <div className={styles.decisionBtns}>
                      <button
                        type="button"
                        className={`${styles.approveBtn} ${dec.approved === true ? styles.approveBtnActive : ""}`}
                        onClick={() => setDecision(r.id, true)}
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.rejectBtn} ${dec.approved === false ? styles.rejectBtnActive : ""}`}
                        onClick={() => setDecision(r.id, false)}
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Task flags */}
                  <div className={styles.taskFlagsRow}>
                    {TASKS.map((t) => {
                      const proofUrl = t.proofKey ? r[t.proofKey] : null;
                      return (
                        <div key={t.key} className={styles.taskFlag}>
                          <TaskPip
                            done={!!r[t.key]}
                            label={t.label}
                            Icon={t.Icon}
                            color={t.color}
                            proofUrl={proofUrl}
                            onViewProof={setProofUrl}
                          />
                          <span className={styles.taskFlagLabel}>
                            {t.label}
                          </span>
                          {proofUrl && (
                            <button
                              type="button"
                              className={styles.screenshotBtn}
                              onClick={() => setProofUrl(proofUrl)}
                              title="View screenshot"
                              aria-label="View screenshot"
                            >
                              <Paperclip size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Note (only when rejected) */}
                  {dec.approved === false && (
                    <div className={styles.noteRow}>
                      <input
                        className={styles.noteInput}
                        placeholder="Reason for rejection (optional)…"
                        value={dec.note}
                        onChange={(e) => setNote(r.id, e.target.value)}
                      />
                    </div>
                  )}

                  {/* Joined date */}
                  <p className={styles.reviewCardJoined}>
                    Joined {timeAgo(r.referred?.createdAt || r.createdAt)}
                    {r.referred?.createdAt && (
                      <> · {fmtDateTime(r.referred.createdAt)}</>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={styles.drawerFooter}>
            <div className={styles.footerSummary}>
              <div className={styles.footerSummaryRow}>
                <span>
                  <CheckCircle size={12} /> Approved
                </span>
                <span className={styles.footerGreen}>
                  {approved} × ₦100 = {fmtAmt(netAmt)}
                </span>
              </div>
              <div className={styles.footerSummaryRow}>
                <span>
                  <XCircleIcon size={12} /> Rejected
                </span>
                <span className={styles.footerRed}>
                  {rejected} referral{rejected !== 1 ? "s" : ""} — no credit
                </span>
              </div>
              {pending > 0 && (
                <div className={styles.footerSummaryRow}>
                  <span>
                    <Clock size={12} /> Undecided
                  </span>
                  <span className={styles.footerOrange}>
                    {pending} remaining
                  </span>
                </div>
              )}
            </div>

            <div className={styles.adminNoteField}>
              <label className={styles.adminNoteLabel}>
                Overall note (optional)
              </label>
              <textarea
                className={styles.adminNoteInput}
                placeholder="Add a note visible to the referrer…"
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            {error && (
              <div className={styles.drawerError}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            <div className={styles.drawerActions}>
              <button className={styles.drawerCancel} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.drawerSubmit}
                onClick={handleSubmit}
                disabled={saving || !allSet}
              >
                {saving ? (
                  <>
                    <Spinner /> Submitting…
                  </>
                ) : !allSet ? (
                  `Decide ${pending} more`
                ) : (
                  `Submit Review · ${fmtAmt(netAmt)} to credit`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {proofUrl && (
        <ScreenshotLightbox url={proofUrl} onClose={() => setProofUrl(null)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT WITHDRAWAL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RejectWdModal({ wd, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/campaign/admin/withdrawals/${wd.id}/reject`, {
        reason,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Rejection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Reject Withdrawal</p>
          <button
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className={styles.modalForm}>
          <div className={styles.wdPreview}>
            <span className={styles.wdPreviewUser}>
              {wd.user?.firstName} {wd.user?.lastName}
            </span>
            <span className={styles.wdPreviewAmt}>{fmtAmt(wd.amount)}</span>
            <span className={styles.wdPreviewBank}>
              <Landmark size={11} /> {wd.bankName} · {wd.accountNumber}
            </span>
            <span className={styles.wdPreviewBank}>
              <UserCircle size={11} /> {wd.accountName}
            </span>
            <div className={styles.wdPreviewIds}>
              <CopyPill
                text={wd.id}
                label={`withdrawal ${wd.id.slice(0, 10)}…`}
              />
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Reason (shown to user)</label>
            <textarea
              className={styles.noteInput}
              rows={3}
              placeholder="Why is this being rejected?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && (
            <div className={styles.drawerError}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.drawerCancel}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.drawerSubmit} ${styles.drawerSubmitRed}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Rejecting…
                </>
              ) : (
                "Reject & Refund Balance"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCampaign() {
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subFilter, setSubFilter] = useState("PENDING");
  const [subSearch, setSubSearch] = useState("");
  const [subDate, setSubDate] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdTotal, setWdTotal] = useState(0);
  const [wdPage, setWdPage] = useState(1);
  const [wdFilter, setWdFilter] = useState("PENDING");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [wdLoading, setWdLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [rejectingWd, setRejectingWd] = useState(null);
  const [notify, setNotify] = useState(null);

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  // ── Load stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get("/campaign/admin/stats");
      setStats(r.data.data);
    } catch {
      showToast("Failed to load stats", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load submissions ───────────────────────────────────────────────────────
  const loadSubmissions = useCallback(async () => {
    setSubLoading(true);
    try {
      const params = new URLSearchParams({ page: subPage, limit: 20 });
      if (subFilter !== "ALL") params.set("status", subFilter);
      if (subSearch.trim()) params.set("search", subSearch.trim());
      if (subDate) params.set("date", subDate);
      const r = await api.get(`/campaign/admin/submissions?${params}`);
      setSubmissions(r.data.data?.submissions || []);
      setSubTotal(r.data.data?.total || 0);
    } catch {
      showToast("Failed to load submissions", "error");
    } finally {
      setSubLoading(false);
    }
  }, [subPage, subFilter, subSearch, subDate]);

  // ── Load withdrawals ───────────────────────────────────────────────────────
  const loadWithdrawals = useCallback(async () => {
    setWdLoading(true);
    try {
      const r = await api.get(
        `/campaign/admin/withdrawals?status=${wdFilter}&page=${wdPage}&limit=20`,
      );
      setWithdrawals(r.data.data?.withdrawals || []);
      setWdTotal(r.data.data?.total || 0);
    } catch {
      showToast("Failed to load withdrawals", "error");
    } finally {
      setWdLoading(false);
    }
  }, [wdFilter, wdPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    if (tab === "submissions") loadSubmissions();
  }, [tab, loadSubmissions]);
  useEffect(() => {
    if (tab === "withdrawals") loadWithdrawals();
  }, [tab, loadWithdrawals]);

  // ── Approve withdrawal ─────────────────────────────────────────────────────
  async function approveWithdrawal(wd) {
    try {
      await api.patch(`/campaign/admin/withdrawals/${wd.id}/approve`);
      showToast(
        `Approved ${fmtAmt(wd.amount)} withdrawal for ${wd.user?.firstName}`,
      );
      loadWithdrawals();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || "Approval failed", "error");
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const pendingSubCount = stats?.byStatus?.PENDING || 0;
  const pendingWdCount = stats?.pendingWithdrawals?.length || 0;

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Admin · Daily Referral Campaign</p>
            <h1 className={styles.pageTitle}>
              <Megaphone size={20} /> Campaign Control
            </h1>
            <p className={styles.pageSubtitle}>
              Review daily submissions, approve payouts, and manage withdrawals.
            </p>
          </div>
          <div className={styles.alertPills}>
            {pendingSubCount > 0 && (
              <button
                className={styles.alertPill}
                onClick={() => {
                  setTab("submissions");
                  setSubFilter("PENDING");
                }}
              >
                <ClipboardList size={12} /> {pendingSubCount} pending review
                {pendingSubCount !== 1 ? "s" : ""}
              </button>
            )}
            {pendingWdCount > 0 && (
              <button
                className={styles.alertPillGreen}
                onClick={() => setTab("withdrawals")}
              >
                <Banknote size={12} /> {pendingWdCount} pending withdrawal
                {pendingWdCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          {[
            {
              Icon: ClipboardList,
              label: "Total Submissions",
              val: stats?.overview?.totalSubmissions,
            },
            {
              Icon: CheckCircle,
              label: "Total Approved",
              val: stats?.overview?.totalReferralsApproved,
            },
            {
              Icon: Wallet,
              label: "Total Paid Out",
              val: fmtAmt(stats?.overview?.totalPaidOut),
              accent: "orange",
            },
            {
              Icon: PiggyBank,
              label: "In Wallets",
              val: fmtAmt(stats?.overview?.totalCampaignWallets),
            },
            {
              Icon: Layers,
              label: "Total Earned",
              val: fmtAmt(stats?.overview?.totalCampaignEarned),
            },
            {
              Icon: Clock,
              label: "Pending Reviews",
              val: pendingSubCount,
              accent: pendingSubCount > 0 ? "yellow" : "",
            },
            {
              Icon: Banknote,
              label: "Pending Payouts",
              val: pendingWdCount,
              accent: pendingWdCount > 0 ? "green" : "",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`${styles.statCard} ${s.accent ? styles[`accent_${s.accent}`] : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={styles.statIcon}>
                <s.Icon size={16} />
              </span>
              <p className={styles.statVal}>{loading ? "—" : (s.val ?? "0")}</p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabsWrap}>
          <div className={styles.tabBar}>
            {[
              { key: "overview", label: "Overview", Icon: Layers },
              {
                key: "submissions",
                label: `Submissions${pendingSubCount > 0 ? ` (${pendingSubCount})` : ""}`,
                Icon: ClipboardList,
              },
              {
                key: "withdrawals",
                label: `Withdrawals${pendingWdCount > 0 ? ` (${pendingWdCount})` : ""}`,
                Icon: Banknote,
              },
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
              {/* Status breakdown */}
              <div className={styles.statusBreakdown}>
                {Object.entries(SUB_STATUS).map(([key, meta]) => (
                  <div
                    key={key}
                    className={`${styles.statusBox} ${styles[`accent_${meta.cls}`]}`}
                  >
                    <p className={styles.statusBoxVal}>
                      {stats?.byStatus?.[key] || 0}
                    </p>
                    <p className={styles.statusBoxLabel}>{meta.label}</p>
                  </div>
                ))}
              </div>

              {/* Pending submissions alert */}
              {pendingSubCount > 0 && (
                <div className={styles.pendingAlert}>
                  <span className={styles.pendingAlertIcon}>
                    <AlertTriangle size={22} />
                  </span>
                  <div>
                    <p className={styles.pendingAlertTitle}>
                      {pendingSubCount} submission
                      {pendingSubCount !== 1 ? "s" : ""} awaiting your review
                    </p>
                    <p className={styles.pendingAlertSub}>
                      Users are waiting to be paid. Review and approve to credit
                      their wallets.
                    </p>
                  </div>
                  <button
                    className={styles.pendingAlertBtn}
                    onClick={() => {
                      setTab("submissions");
                      setSubFilter("PENDING");
                    }}
                  >
                    Review Now
                  </button>
                </div>
              )}

              {/* Reward config */}
              <div className={styles.configCard}>
                <p className={styles.configTitle}>
                  <AlertTriangle size={13} /> Campaign Configuration
                </p>
                <div className={styles.configGrid}>
                  <div className={styles.configItem}>
                    <span>Reward per referral</span>
                    <strong>₦100</strong>
                  </div>
                  <div className={styles.configItem}>
                    <span>Min withdrawal</span>
                    <strong>₦500</strong>
                  </div>
                  <div className={styles.configItem}>
                    <span>Required tasks</span>
                    <strong>5</strong>
                  </div>
                  <div className={styles.configItem}>
                    <span>Max daily referrals</span>
                    <strong>50</strong>
                  </div>
                  <div className={styles.configItem}>
                    <span>Social platforms</span>
                    <strong>FB · IG · TikTok</strong>
                  </div>
                  <div className={styles.configItem}>
                    <span>Admin final say</span>
                    <strong>Yes</strong>
                  </div>
                </div>
              </div>

              {/* Top earners */}
              {stats?.topReferrers?.length > 0 && (
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <p className={styles.panelTitle}>
                      <Trophy size={13} /> Top Campaign Earners
                    </p>
                  </div>
                  <div className={styles.panelBody}>
                    {stats.topReferrers.map((u, i) => (
                      <div key={u.id} className={styles.topEarnerRow}>
                        <span className={styles.topEarnerRank}>
                          {i === 0
                            ? "1"
                            : i === 1
                              ? "2"
                              : i === 2
                                ? "3"
                                : `${i + 1}`}
                        </span>
                        <Avatar
                          name={`${u.firstName} ${u.lastName}`}
                          avatar={u.avatar}
                        />
                        <div className={styles.topEarnerInfo}>
                          <p className={styles.topEarnerName}>
                            {u.firstName} {u.lastName}
                          </p>
                          {u.id && (
                            <CopyPill
                              text={u.id}
                              label={`id ${u.id.slice(0, 8)}…`}
                            />
                          )}
                        </div>
                        <p className={styles.topEarnerAmt}>
                          {fmtAmt(u.campaignWalletLifetimeTotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending withdrawals list */}
              {stats?.pendingWithdrawals?.length > 0 && (
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <p className={styles.panelTitle}>
                      <Banknote size={13} /> Pending Withdrawals
                    </p>
                    <button
                      className={styles.panelViewAll}
                      onClick={() => setTab("withdrawals")}
                    >
                      View all
                    </button>
                  </div>
                  <div className={styles.panelBody}>
                    {stats.pendingWithdrawals.slice(0, 5).map((w) => (
                      <div key={w.id} className={styles.miniWdRow}>
                        <Avatar
                          name={`${w.user?.firstName} ${w.user?.lastName}`}
                          avatar={w.user?.avatar}
                        />
                        <div className={styles.miniWdInfo}>
                          <p className={styles.miniWdName}>
                            {w.user?.firstName} {w.user?.lastName}
                          </p>
                          <p className={styles.miniWdBank}>
                            {w.bankName} · {w.accountNumber}
                          </p>
                        </div>
                        <p className={styles.miniWdAmt}>{fmtAmt(w.amount)}</p>
                        <span className={styles.miniWdAge}>
                          {timeAgo(w.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ SUBMISSIONS TAB ══ */}
          {tab === "submissions" && (
            <div className={styles.tabContent}>
              {/* Filters */}
              <div className={styles.filterBar}>
                <div className={styles.filterStatus}>
                  {["PENDING", "APPROVED", "PARTIAL", "REJECTED", "ALL"].map(
                    (s) => (
                      <button
                        key={s}
                        className={`${styles.filterBtn} ${subFilter === s ? styles.filterBtnActive : ""}`}
                        onClick={() => {
                          setSubFilter(s);
                          setSubPage(1);
                        }}
                      >
                        {s === "ALL" ? "All" : SUB_STATUS[s]?.label || s}
                        {s === "PENDING" && pendingSubCount > 0 && (
                          <span className={styles.filterCount}>
                            {pendingSubCount}
                          </span>
                        )}
                      </button>
                    ),
                  )}
                </div>
                <div className={styles.filterRight}>
                  <div className={styles.searchWrap}>
                    <Search size={13} />
                    <input
                      className={styles.searchInput}
                      placeholder="Search by name or email…"
                      value={subSearch}
                      onChange={(e) => {
                        setSubSearch(e.target.value);
                        setSubPage(1);
                      }}
                    />
                    {subSearch && (
                      <button
                        className={styles.searchClear}
                        onClick={() => {
                          setSubSearch("");
                          setSubPage(1);
                        }}
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <input
                    className={styles.dateInput}
                    type="date"
                    value={subDate}
                    onChange={(e) => {
                      setSubDate(e.target.value);
                      setSubPage(1);
                    }}
                    title="Filter by submission date"
                  />
                </div>
              </div>

              {/* List */}
              {subLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              ) : submissions.length === 0 ? (
                <div className={styles.emptyState}>
                  <Inbox size={32} />
                  <p>No submissions found</p>
                </div>
              ) : (
                <>
                  <div className={styles.submissionsList}>
                    {submissions.map((sub, i) => (
                      <div
                        key={sub.id}
                        className={`${styles.submissionCard} ${styles[`subCard_${sub.status}`]}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className={styles.subCardTop}>
                          {/* Referrer info */}
                          <div className={styles.subCardReferrer}>
                            <Avatar
                              name={`${sub.referrer?.firstName} ${sub.referrer?.lastName}`}
                              avatar={sub.referrer?.avatar}
                              size="md"
                            />
                            <div className={styles.subCardReferrerText}>
                              <p className={styles.subCardName}>
                                {sub.referrer?.firstName}{" "}
                                {sub.referrer?.lastName}
                              </p>
                              <p className={styles.subCardEmail}>
                                {sub.referrer?.email}
                              </p>
                              {sub.referrer?.id && (
                                <CopyPill
                                  text={sub.referrer.id}
                                  label={`id ${sub.referrer.id.slice(0, 8)}…`}
                                />
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className={styles.subCardMeta}>
                            <p className={styles.subCardDate}>
                              <Calendar size={11} /> {sub.submissionDate}
                            </p>
                            <div className={styles.subCardCounts}>
                              <span>
                                Submitted: <strong>{sub.totalSubmitted}</strong>
                              </span>
                              {sub.totalApproved > 0 && (
                                <span className={styles.countGreen}>
                                  <Check size={10} /> {sub.totalApproved}
                                </span>
                              )}
                              {sub.totalRejected > 0 && (
                                <span className={styles.countRed}>
                                  <X size={10} /> {sub.totalRejected}
                                </span>
                              )}
                            </div>
                            {sub.id && (
                              <CopyPill
                                text={sub.id}
                                label={`sub ${sub.id.slice(0, 8)}…`}
                              />
                            )}
                          </div>

                          {/* Amount + status */}
                          <div className={styles.subCardRight}>
                            <Badge status={sub.status} meta={SUB_STATUS} />
                            <p className={styles.subCardGross}>
                              {fmtAmt(sub.grossAmount)} potential
                            </p>
                            {sub.netAmount > 0 && (
                              <p className={styles.subCardNet}>
                                {fmtAmt(sub.netAmount)} paid
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Referral mini-list */}
                        <div className={styles.subCardReferrals}>
                          {(sub.referrals || []).slice(0, 5).map((r) => (
                            <div key={r.id} className={styles.subMiniRef}>
                              <Avatar
                                name={
                                  r.referred?.firstName +
                                  " " +
                                  r.referred?.lastName
                                }
                                avatar={r.referred?.avatar}
                              />
                              <div className={styles.subMiniRefInfo}>
                                <p className={styles.subMiniRefName}>
                                  {r.referred?.firstName} {r.referred?.lastName}
                                </p>
                                <div className={styles.subMiniTasks}>
                                  {TASKS.map((t) => {
                                    const Icon = t.Icon;
                                    return (
                                      <span
                                        key={t.key}
                                        className={`${styles.miniPip} ${r[t.key] ? styles.miniPipDone : ""}`}
                                        style={
                                          r[t.key]
                                            ? { background: t.color }
                                            : {}
                                        }
                                        title={t.label}
                                      >
                                        <Icon size={9} />
                                      </span>
                                    );
                                  })}
                                </div>
                                {r.rewardAmount && (
                                  <p className={styles.subMiniRefReward}>
                                    {fmtAmt(r.rewardAmount)}
                                  </p>
                                )}
                              </div>
                              {["APPROVED", "REJECTED"].includes(r.status) && (
                                <Badge status={r.status} meta={REF_STATUS} />
                              )}
                            </div>
                          ))}
                          {sub.referrals?.length > 5 && (
                            <p className={styles.moreRefs}>
                              +{sub.referrals.length - 5} more
                            </p>
                          )}
                        </div>

                        {/* Admin note */}
                        {sub.adminNote && (
                          <div className={styles.subAdminNote}>
                            <Receipt size={11} /> {sub.adminNote}
                          </div>
                        )}

                        {/* Action */}
                        {sub.status === "PENDING" && (
                          <button
                            className={styles.reviewBtn}
                            onClick={() => setReviewing(sub)}
                          >
                            <Search size={13} /> Review Submission
                          </button>
                        )}
                        {sub.status !== "PENDING" && (
                          <p className={styles.subReviewedAt}>
                            {sub.reviewedAt && (
                              <>
                                <BadgeCheck size={11} /> Reviewed{" "}
                                {fmtDateTime(sub.reviewedAt)}
                              </>
                            )}
                            {sub.creditedAt && (
                              <>
                                {" · "}
                                <Wallet size={11} /> Credited{" "}
                                {fmtDateTime(sub.creditedAt)}
                              </>
                            )}
                            {sub.reviewedById && (
                              <>
                                {" · "}
                                <CopyPill
                                  text={sub.reviewedById}
                                  label={`rev ${sub.reviewedById.slice(0, 8)}…`}
                                />
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {Math.ceil(subTotal / 20) > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                        disabled={subPage === 1}
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <span className={styles.pageInfo}>
                        Page {subPage} of {Math.ceil(subTotal / 20)}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setSubPage((p) => p + 1)}
                        disabled={subPage >= Math.ceil(subTotal / 20)}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ WITHDRAWALS TAB ══ */}
          {tab === "withdrawals" && (
            <div className={styles.tabContent}>
              {/* Filter tabs */}
              <div className={styles.filterStatus}>
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
                  <button
                    key={s}
                    className={`${styles.filterBtn} ${wdFilter === s ? styles.filterBtnActive : ""}`}
                    onClick={() => {
                      setWdFilter(s);
                      setWdPage(1);
                    }}
                  >
                    {WD_STATUS[s]?.label || "All"}
                    {s === "PENDING" && pendingWdCount > 0 && (
                      <span className={styles.filterCount}>
                        {pendingWdCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              {wdLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.skRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              ) : withdrawals.length === 0 ? (
                <div className={styles.emptyState}>
                  <Banknote size={32} />
                  <p>No withdrawals found</p>
                </div>
              ) : (
                <>
                  <div className={styles.wdList}>
                    {withdrawals.map((wd, i) => (
                      <div
                        key={wd.id}
                        className={`${styles.wdCard} ${styles[`wdCard_${wd.status}`]}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className={styles.wdCardLeft}>
                          <Avatar
                            name={`${wd.user?.firstName} ${wd.user?.lastName}`}
                            avatar={wd.user?.avatar}
                            size="md"
                          />
                          <div className={styles.wdCardInfo}>
                            <p className={styles.wdCardName}>
                              {wd.user?.firstName} {wd.user?.lastName}
                            </p>
                            <p className={styles.wdCardEmail}>
                              {wd.user?.email}
                            </p>
                            <div className={styles.wdBankRow}>
                              <span className={styles.wdBankIcon}>
                                <Landmark size={11} />
                              </span>
                              <span className={styles.wdBankText}>
                                {wd.bankName}
                              </span>
                              <span className={styles.wdDot}>·</span>
                              <span className={styles.wdBankText}>
                                {wd.accountNumber}
                              </span>
                              <span className={styles.wdDot}>·</span>
                              <span className={styles.wdAccName}>
                                {wd.accountName}
                              </span>
                            </div>
                            <p className={styles.wdDate}>
                              <Clock size={11} /> Requested{" "}
                              {timeAgo(wd.createdAt)}
                            </p>
                            {wd.id && (
                              <div className={styles.wdIdRow}>
                                <CopyPill
                                  text={wd.id}
                                  label={`id ${wd.id.slice(0, 10)}…`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.wdCardRight}>
                          <p className={styles.wdAmt}>{fmtAmt(wd.amount)}</p>
                          <Badge status={wd.status} meta={WD_STATUS} />
                          {wd.adminNote && (
                            <p className={styles.wdNote} title={wd.adminNote}>
                              <Receipt size={11} /> {wd.adminNote}
                            </p>
                          )}
                          {wd.status === "PENDING" && (
                            <div className={styles.wdActions}>
                              <button
                                className={styles.wdApproveBtn}
                                onClick={() => approveWithdrawal(wd)}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                className={styles.wdRejectBtn}
                                onClick={() => setRejectingWd(wd)}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          )}
                          {wd.processedAt && (
                            <p className={styles.wdProcessed}>
                              {wd.status === "APPROVED" ? (
                                <>
                                  <CheckCircle size={11} /> Approved{" "}
                                  {fmtDateTime(wd.processedAt)}
                                </>
                              ) : (
                                <>
                                  <XCircleIcon size={11} /> Rejected{" "}
                                  {fmtDateTime(wd.processedAt)}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {Math.ceil(wdTotal / 20) > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setWdPage((p) => Math.max(1, p - 1))}
                        disabled={wdPage === 1}
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <span className={styles.pageInfo}>
                        Page {wdPage} of {Math.ceil(wdTotal / 20)}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setWdPage((p) => p + 1)}
                        disabled={wdPage >= Math.ceil(wdTotal / 20)}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Review Drawer ── */}
      {reviewing && (
        <ReviewDrawer
          submission={reviewing}
          onClose={() => setReviewing(null)}
          showToast={showToast}
          onDone={() => {
            setReviewing(null);
            showToast("Review submitted! Wallet updated.");
            loadSubmissions();
            loadStats();
          }}
        />
      )}

      {/* ── Reject Withdrawal Modal ── */}
      {rejectingWd && (
        <RejectWdModal
          wd={rejectingWd}
          onClose={() => setRejectingWd(null)}
          onDone={() => {
            setRejectingWd(null);
            showToast("Withdrawal rejected and balance refunded.");
            loadWithdrawals();
            loadStats();
          }}
        />
      )}

      {/* ── Platform AlertModal ── */}
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
    </AdminLayout>
  );
}
