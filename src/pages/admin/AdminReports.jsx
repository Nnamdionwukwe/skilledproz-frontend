// src/pages/admin/AdminReports.jsx
// Full admin reports moderation.
//
// Endpoints:
//   GET   /reports/admin?status=&type=&reason=&search=&from=&to=&page=&limit=
//   GET   /reports/admin/stats
//   GET   /reports/admin/:id
//   GET   /reports/admin/target/:targetType/:targetId
//   PATCH /reports/admin/:id/review
//   PATCH /reports/admin/:id/resolve        { action, adminNote }
//   PATCH /reports/admin/:id/dismiss        { adminNote }
//   PATCH /reports/admin/bulk-dismiss       { reportIds, adminNote }
//
// Every field the backend sends is rendered. Lucide icons throughout.
// Fully responsive. Uses platform AlertModal.
//
// 2026-09-25: Fixed nested <button> hydration error in ReportRow.
//             Added fullscreen evidence viewer (image preview + open in new tab).

import { useState, useEffect, useCallback } from "react";
import {
  Flag,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  FileText,
  Star,
  ClipboardList,
  MessageCircle,
  AlertTriangle,
  Trash2,
  Ban,
  ShieldAlert,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Inbox,
  TrendingUp,
  ScrollText,
  X,
  ZoomIn,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import s from "./AdminReports.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "Pending", cls: "yellow", Icon: Clock },
  REVIEWING: { label: "Reviewing", cls: "blue", Icon: Search },
  RESOLVED: { label: "Resolved", cls: "green", Icon: CheckCircle },
  DISMISSED: { label: "Dismissed", cls: "dim", Icon: XCircle },
};

const ACTION_META = {
  NO_ACTION: { label: "No Action", cls: "dim", Icon: XCircle },
  WARNING_ISSUED: {
    label: "Warning Issued",
    cls: "yellow",
    Icon: AlertTriangle,
  },
  CONTENT_REMOVED: { label: "Content Removed", cls: "orange", Icon: Trash2 },
  USER_SUSPENDED: { label: "User Suspended", cls: "orange", Icon: Ban },
  USER_BANNED: { label: "User Banned", cls: "red", Icon: ShieldAlert },
};

const REASON_LABELS = {
  SPAM: "Spam",
  FAKE_PROFILE: "Fake Profile",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  FRAUD: "Fraud / Scam",
  HARASSMENT: "Harassment",
  SCAM: "Scam",
  MISLEADING_INFORMATION: "Misleading Information",
  FAKE_REVIEWS: "Fake Reviews",
  UNDERAGE_USER: "Underage User",
  HATE_SPEECH: "Hate Speech",
  OTHER: "Other",
};

const TYPE_META = {
  USER: { Icon: User, label: "User" },
  JOB_POST: { Icon: Briefcase, label: "Job Post" },
  POST: { Icon: FileText, label: "Post" },
  REVIEW: { Icon: Star, label: "Review" },
  BOOKING: { Icon: ClipboardList, label: "Booking" },
  MESSAGE: { Icon: MessageCircle, label: "Message" },
};

const ACTIONS = [
  { value: "NO_ACTION", label: "No Action", cls: "dim", Icon: XCircle },
  {
    value: "WARNING_ISSUED",
    label: "Issue Warning",
    cls: "yellow",
    Icon: AlertTriangle,
  },
  {
    value: "CONTENT_REMOVED",
    label: "Remove Content",
    cls: "orange",
    Icon: Trash2,
  },
  { value: "USER_SUSPENDED", label: "Suspend User", cls: "orange", Icon: Ban },
  { value: "USER_BANNED", label: "Ban User", cls: "red", Icon: ShieldAlert },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function refOf(report) {
  if (!report) return "";
  if (report.ref) return report.ref;
  if (report.id) return `#${report.id.slice(-8).toUpperCase()}`;
  return "";
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// Detect whether a URL looks like an image we can preview inline.
function isImageUrl(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (
    /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(
      trimmed,
    )
  )
    return true;
  if (
    /^https?:\/\/.*(cloudinary\.com|cloudfront\.net|amazonaws\.com|supabase\.co|firebase\w*\.app|imgix\.net|imagekit\.io|res\.cloudinary\.com)\/.+/i.test(
      trimmed,
    )
  )
    return true;
  return false;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Spinner() {
  return <span className={s.spinner} />;
}

function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={s.dimText}>—</span>;
  return (
    <span className={s.copyPill} title={String(text)}>
      <span className={s.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={s.copyPillBtn}
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
  const source = meta || STATUS_META;
  const m = source[status] || {
    label: status,
    cls: "dim",
    Icon: XCircle,
  };
  const Icon = m.Icon;
  return (
    <span className={`${s.badge} ${s[`badge_${m.cls}`]}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

function Avatar({ user, size = "sm" }) {
  const sz = { sm: s.avatar, md: s.avatarMd }[size] ?? s.avatar;
  return (
    <div className={`${sz} ${s.avatarOrange}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay || 0}s` }}
    >
      <span className={s.statIcon}>{Icon ? <Icon size={16} /> : null}</span>
      <div className={s.statVal}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

function Skeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={s.skRow}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </>
  );
}

// ─── Evidence Lightbox ────────────────────────────────────────────────────────
function EvidenceLightbox({ url, onClose }) {
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

  const isImage = isImageUrl(url);

  return (
    <div className={s.evidenceBackdrop} onClick={onClose}>
      <div className={s.evidenceHeader}>
        <span className={s.evidenceHeaderLabel}>
          <Paperclip size={13} /> Evidence
        </span>
        <div className={s.evidenceHeaderActions}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={s.evidenceOpenBtn}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> Open in new tab
          </a>
          <button
            className={s.evidenceClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className={s.evidenceBody} onClick={(e) => e.stopPropagation()}>
        {isImage ? (
          <img src={url} alt="Evidence" className={s.evidenceImg} />
        ) : (
          <div className={s.evidenceNonImage}>
            <FileText size={40} />
            <p className={s.evidenceNonImageText}>
              This evidence is a file, not an image.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={s.evidenceOpenBtnLg}
            >
              <ExternalLink size={13} /> Open file in new tab
            </a>
            <p className={s.evidenceUrlText} title={url}>
              {url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({ report, onClose, onDone, showToast }) {
  const [action, setAction] = useState("NO_ACTION");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/reports/admin/${report.id}/resolve`, {
        action,
        adminNote: note || undefined,
      });
      showToast(`Report resolved — ${ACTION_META[action]?.label}`);
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Resolution failed");
    } finally {
      setSaving(false);
    }
  }

  const activeAction = ACTIONS.find((a) => a.value === action);
  const ActiveIcon = activeAction?.Icon;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div>
            <p className={s.modalEyebrow}>Resolve Report</p>
            <p className={s.modalTitle}>{refOf(report)}</p>
            <p className={s.modalSub}>
              {report.reasonLabel || REASON_LABELS[report.reason]} ·{" "}
              {report.typeLabel || TYPE_META[report.targetType]?.label}
            </p>
          </div>
          <button className={s.modalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className={s.modalForm}>
          <p className={s.formSectionLabel}>Choose action</p>
          <div className={s.actionGrid}>
            {ACTIONS.map((a) => {
              const Icon = a.Icon;
              const isActive = action === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  className={`${s.actionCard} ${isActive ? s[`actionCard_${a.cls}`] : ""}`}
                  onClick={() => setAction(a.value)}
                >
                  <span className={s.actionCardIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={s.actionCardLabel}>{a.label}</span>
                  {isActive && <span className={s.actionDot} />}
                </button>
              );
            })}
          </div>

          <div className={s.formField}>
            <label className={s.formLabel}>
              Admin note (optional — visible to reporter)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="Add context or reason for this decision…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div className={s.formError}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <div className={s.modalActions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${s.submitBtn} ${s[`submitBtn_${ACTIONS.find((a) => a.value === action)?.cls}`]}`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner /> Resolving…
                </>
              ) : (
                <>
                  {ActiveIcon ? <ActiveIcon size={14} /> : null}
                  Resolve — {activeAction?.label}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dismiss Modal ────────────────────────────────────────────────────────────
function DismissModal({ report, onClose, onDone, showToast }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/reports/admin/${report.id}/dismiss`, {
        adminNote: note || undefined,
      });
      showToast("Report dismissed");
      onDone();
    } catch {
      showToast("Dismiss failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <p className={s.modalTitle}>Dismiss Report {refOf(report)}</p>
          <button className={s.modalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className={s.modalForm}>
          <div className={s.formField}>
            <label className={s.formLabel}>
              Reason for dismissal (optional)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="No violation found — not in breach of community guidelines…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className={s.modalActions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={s.dimBtn} disabled={saving}>
              {saving ? (
                <>
                  <Spinner /> Dismissing…
                </>
              ) : (
                "Dismiss Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ reportId, onClose, onAction, showToast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState(null);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    api
      .get(`/reports/admin/${reportId}`)
      .then((r) => setReport(r.data.data.report))
      .catch(() => showToast("Failed to load report", "error"))
      .finally(() => setLoading(false));
  }, [reportId, showToast]);

  async function startReview() {
    setReviewing(true);
    try {
      await api.patch(`/reports/admin/${reportId}/review`);
      setReport((r) => ({ ...r, status: "REVIEWING" }));
      showToast("Report moved to Reviewing");
    } catch (e) {
      showToast(e.response?.data?.message || "Failed", "error");
    } finally {
      setReviewing(false);
    }
  }

  const canAct = report && !["RESOLVED", "DISMISSED"].includes(report.status);
  const TypeIcon = report ? TYPE_META[report.targetType]?.Icon : User;
  const evidenceList = Array.isArray(report?.evidence) ? report.evidence : [];

  return (
    <>
      <div className={s.drawerBackdrop} onClick={onClose}>
        <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
          <div className={s.drawerHeader}>
            <div>
              <p className={s.drawerEyebrow}>Report Detail</p>
              <p className={s.drawerTitle}>
                {report ? refOf(report) : "Loading…"}
              </p>
              {report?.id && (
                <div className={s.drawerSubIds}>
                  <CopyPill
                    text={report.id}
                    label={`id ${report.id.slice(0, 10)}…`}
                  />
                </div>
              )}
            </div>
            <button
              className={s.modalClose}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div className={s.drawerBody}>
              <Skeleton count={4} />
            </div>
          ) : report ? (
            <div className={s.drawerBody}>
              {/* Status + reason */}
              <div className={s.drawerSection}>
                <div className={s.drawerRow}>
                  <Badge status={report.status} />
                  <span className={s.typeChip}>
                    <TypeIcon size={11} />{" "}
                    {report.typeLabel || TYPE_META[report.targetType]?.label}
                  </span>
                  <span className={s.reasonChip}>
                    {report.reasonLabel || REASON_LABELS[report.reason]}
                  </span>
                </div>
              </div>

              {/* Reporter */}
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>Reporter</p>
                <div className={s.personRow}>
                  <Avatar user={report.reporter} />
                  <div className={s.personInfo}>
                    <p className={s.personName}>
                      {report.reporter?.firstName} {report.reporter?.lastName}
                    </p>
                    <p className={s.personMeta}>
                      {report.reporter?.email} · {report.reporter?.role}
                    </p>
                    {report.reporter?.createdAt && (
                      <p className={s.personMeta}>
                        Joined {fmtDate(report.reporter.createdAt)}
                      </p>
                    )}
                    {report.reporter?.id && (
                      <CopyPill
                        text={report.reporter.id}
                        label={`id ${report.reporter.id.slice(0, 10)}…`}
                      />
                    )}
                    {report.context?.reporterTotalReports != null && (
                      <p className={s.personMeta}>
                        Total reports submitted:{" "}
                        <strong>{report.context.reporterTotalReports}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Target */}
              {report.targetData && (
                <div className={s.drawerSection}>
                  <p className={s.drawerSectionTitle}>
                    Reported{" "}
                    {report.typeLabel || TYPE_META[report.targetType]?.label}
                  </p>
                  <div className={s.targetBox}>
                    {report.targetType === "USER" && (
                      <div className={s.personRow}>
                        <Avatar user={report.targetData} />
                        <div className={s.personInfo}>
                          <p className={s.personName}>
                            {report.targetData.firstName}{" "}
                            {report.targetData.lastName}
                          </p>
                          <p className={s.personMeta}>
                            {report.targetData.email} · {report.targetData.role}
                          </p>
                          {report.targetData.createdAt && (
                            <p className={s.personMeta}>
                              Joined {fmtDate(report.targetData.createdAt)}
                            </p>
                          )}
                          {report.targetData.id && (
                            <CopyPill
                              text={report.targetData.id}
                              label={`id ${report.targetData.id.slice(0, 10)}…`}
                            />
                          )}
                          <div className={s.targetFlags}>
                            {report.targetData.isBanned && (
                              <span className={s.flagBanned}>BANNED</span>
                            )}
                            {!report.targetData.isActive &&
                              !report.targetData.isBanned && (
                                <span className={s.flagSuspended}>
                                  SUSPENDED
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                    {report.targetType !== "USER" && (
                      <div className={s.targetContent}>
                        {report.targetData.title && (
                          <p className={s.targetTitle}>
                            {report.targetData.title}
                          </p>
                        )}
                        {report.targetData.content && (
                          <p className={s.targetText}>
                            {report.targetData.content.slice(0, 400)}
                            {report.targetData.content.length > 400 ? "…" : ""}
                          </p>
                        )}
                        {report.targetData.comment && (
                          <p className={s.targetText}>
                            "{report.targetData.comment}"
                          </p>
                        )}
                        {report.targetData.rating && (
                          <p className={s.targetMeta}>
                            Rating: {"★".repeat(report.targetData.rating)}
                            {"☆".repeat(5 - report.targetData.rating)} (
                            {report.targetData.rating}/5)
                          </p>
                        )}
                        {report.targetData.status && (
                          <p className={s.targetMeta}>
                            Status: <strong>{report.targetData.status}</strong>
                          </p>
                        )}
                        {report.targetData.type && (
                          <p className={s.targetMeta}>
                            Type: <strong>{report.targetData.type}</strong>
                          </p>
                        )}
                        {report.targetData.id && (
                          <CopyPill
                            text={report.targetData.id}
                            label={`id ${report.targetData.id.slice(0, 10)}…`}
                          />
                        )}
                      </div>
                    )}
                    {report.context?.targetTotalReports != null && (
                      <p className={s.targetRepCount}>
                        Total reports on this{" "}
                        {report.typeLabel ||
                          TYPE_META[report.targetType]?.label}
                        : <strong>{report.context.targetTotalReports}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {report.description && (
                <div className={s.drawerSection}>
                  <p className={s.drawerSectionTitle}>Reporter's description</p>
                  <p className={s.descText}>{report.description}</p>
                </div>
              )}

              {/* Evidence — full-featured viewer */}
              {evidenceList.length > 0 && (
                <div className={s.drawerSection}>
                  <p className={s.drawerSectionTitle}>
                    Evidence links ({evidenceList.length})
                  </p>
                  <div className={s.evidenceList}>
                    {evidenceList.map((url, i) => {
                      const isImg = isImageUrl(url);
                      return (
                        <button
                          key={i}
                          type="button"
                          className={s.evidenceLink}
                          onClick={() => setEvidenceUrl(url)}
                        >
                          {isImg ? (
                            <>
                              <img
                                src={url}
                                alt=""
                                className={s.evidenceThumb}
                              />
                              <span className={s.evidenceLinkLabel}>
                                <ImageIcon size={11} /> Evidence {i + 1}
                              </span>
                            </>
                          ) : (
                            <>
                              <Paperclip size={11} />
                              <span className={s.evidenceLinkLabel}>
                                Evidence {i + 1}
                              </span>
                            </>
                          )}
                          <span className={s.evidenceLinkAction}>
                            <ZoomIn size={11} /> View
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolution */}
              {(report.actionTaken || report.adminNote) && (
                <div className={s.drawerSection}>
                  <p className={s.drawerSectionTitle}>Resolution</p>
                  {report.actionTaken && (
                    <Badge status={report.actionTaken} meta={ACTION_META} />
                  )}
                  {report.adminNote && (
                    <p className={s.adminNoteText}>
                      <ScrollText size={11} /> {report.adminNote}
                    </p>
                  )}
                  {report.resolvedAt && (
                    <p className={s.personMeta}>
                      Resolved {fmtDateTime(report.resolvedAt)}
                    </p>
                  )}
                  {report.reviewedBy && (
                    <p className={s.personMeta}>
                      By {report.reviewedBy.firstName}{" "}
                      {report.reviewedBy.lastName}
                    </p>
                  )}
                  {report.reviewedById && (
                    <CopyPill
                      text={report.reviewedById}
                      label={`reviewer ${report.reviewedById.slice(0, 10)}…`}
                    />
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className={s.drawerSection}>
                <p className={s.drawerSectionTitle}>Timeline</p>
                <p className={s.personMeta}>
                  Submitted: {fmtDateTime(report.createdAt)}
                </p>
                <p className={s.personMeta}>({timeAgo(report.createdAt)})</p>
              </div>
            </div>
          ) : null}

          {/* Footer actions */}
          <div className={s.drawerFooter}>
            {report?.status === "PENDING" && (
              <button
                className={s.reviewBtn}
                onClick={startReview}
                disabled={reviewing}
              >
                {reviewing ? (
                  <Spinner />
                ) : (
                  <>
                    <Search size={13} /> Start Review
                  </>
                )}
              </button>
            )}
            {canAct && (
              <>
                <button
                  className={s.resolveBtn}
                  onClick={() => {
                    onClose();
                    onAction("resolve", report);
                  }}
                >
                  <CheckCircle size={13} /> Resolve
                </button>
                <button
                  className={s.dismissBtn}
                  onClick={() => {
                    onClose();
                    onAction("dismiss", report);
                  }}
                >
                  <XCircle size={13} /> Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen evidence viewer */}
      {evidenceUrl && (
        <EvidenceLightbox
          url={evidenceUrl}
          onClose={() => setEvidenceUrl(null)}
        />
      )}
    </>
  );
}

// ─── Report Row ───────────────────────────────────────────────────────────────
// FIX: outer element is now a <div role="button"> so we can nest real
// <button> children (rowResolveBtn, rowDismissBtn) without triggering
// the HTML "button cannot be a descendant of button" hydration error.
function ReportRow({
  report,
  selected,
  onSelect,
  onOpen,
  onResolve,
  onDismiss,
}) {
  const TypeIcon = TYPE_META[report.targetType]?.Icon || FileText;
  const canAct = !["RESOLVED", "DISMISSED"].includes(report.status);

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(report.id);
    }
  }

  return (
    <div className={`${s.reportRow} ${selected ? s.reportRowSelected : ""}`}>
      <input
        type="checkbox"
        className={s.checkbox}
        checked={selected}
        onChange={(e) => onSelect(report.id, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select report"
      />
      <div
        role="button"
        tabIndex={0}
        className={s.reportRowMain}
        onClick={() => onOpen(report.id)}
        onKeyDown={handleKeyDown}
        aria-label={`Open report ${refOf(report)}`}
      >
        <div className={s.reportRowLeft}>
          <span className={s.typeIcon}>
            <TypeIcon size={18} />
          </span>
          <div className={s.reportRowInfo}>
            <div className={s.reportRowTop}>
              <span className={s.reportRef}>{refOf(report)}</span>
              <span className={s.reportReason}>
                {report.reasonLabel || REASON_LABELS[report.reason]}
              </span>
              <Badge status={report.status} />
            </div>
            <div className={s.reportRowBot}>
              <Avatar user={report.reporter} size="sm" />
              <span className={s.reporterName}>
                {report.reporter?.firstName} {report.reporter?.lastName}
              </span>
              <span className={s.reportMeta}>·</span>
              <span className={s.reportMeta}>
                {report.typeLabel || TYPE_META[report.targetType]?.label}
              </span>
              <span className={s.reportMeta}>·</span>
              <span
                className={s.reportMeta}
                title={fmtDateTime(report.createdAt)}
              >
                {timeAgo(report.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div
          className={s.reportRowActions}
          onClick={(e) => e.stopPropagation()}
        >
          {canAct && (
            <>
              <button
                type="button"
                className={s.rowResolveBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(report);
                }}
                title="Resolve"
                aria-label="Resolve"
              >
                <CheckCircle size={14} />
              </button>
              <button
                type="button"
                className={s.rowDismissBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(report);
                }}
                title="Dismiss"
                aria-label="Dismiss"
              >
                <XCircle size={14} />
              </button>
            </>
          )}
          {report.actionTaken && (
            <Badge status={report.actionTaken} meta={ACTION_META} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [repLoading, setRepLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState(new Set());

  const [detailId, setDetailId] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [dismissing, setDismissing] = useState(null);
  const [notify, setNotify] = useState(null);

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get("/reports/admin/stats");
      setStats(r.data.data);
    } catch {
      showToast("Failed to load stats", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load reports
  const loadReports = useCallback(async () => {
    setRepLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (reason) params.set("reason", reason);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await api.get(`/reports/admin?${params}`);
      setReports(r.data.data.reports || []);
      setTotal(r.data.data.total || 0);
      setSummary(r.data.data.summary || {});
      setSelected(new Set());
    } catch {
      showToast("Failed to load reports", "error");
    } finally {
      setRepLoading(false);
    }
  }, [page, status, type, reason, search, from, to]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Selection
  function toggleSelect(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked) {
    setSelected(checked ? new Set(reports.map((r) => r.id)) : new Set());
  }

  // Bulk dismiss
  async function bulkDismiss() {
    if (!selected.size) return;
    try {
      const r = await api.patch("/reports/admin/bulk-dismiss", {
        reportIds: [...selected],
      });
      showToast(r.data.message || `${selected.size} report(s) dismissed`);
      loadReports();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || "Bulk dismiss failed", "error");
    }
  }

  function handleAction(actionType, report) {
    if (actionType === "resolve") setResolving(report);
    if (actionType === "dismiss") setDismissing(report);
  }

  const pages = Math.ceil(total / 20);
  const pendingCount = summary.PENDING ?? stats?.pending ?? 0;

  return (
    <AdminLayout>
      <div className={s.page}>
        {/* Header */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Moderation</p>
            <h1 className={s.pageTitle}>
              <Flag size={20} />
              Reports
              {pendingCount > 0 && (
                <span className={s.pendingPill}>{pendingCount} pending</span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Review and act on user-submitted reports across the platform.
            </p>
          </div>
          {selected.size > 0 && (
            <button className={s.bulkDismissBtn} onClick={bulkDismiss}>
              <XCircle size={13} /> Dismiss {selected.size} selected
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className={s.statsBar}>
          <StatCard
            icon={Flag}
            label="Total Reports"
            value={stats?.total}
            delay={0}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats?.pending}
            accent="yellow"
            delay={0.05}
          />
          <StatCard
            icon={Search}
            label="Reviewing"
            value={stats?.reviewing}
            accent="blue"
            delay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Resolved"
            value={stats?.resolved}
            accent="green"
            delay={0.15}
          />
          <StatCard
            icon={XCircle}
            label="Dismissed"
            value={stats?.dismissed}
            delay={0.2}
          />
        </div>

        {/* Status quick filters */}
        <div className={s.statusBar}>
          {[
            { key: "", label: "All" },
            {
              key: "PENDING",
              label: "Pending",
              count: summary.PENDING,
            },
            {
              key: "REVIEWING",
              label: "Reviewing",
              count: summary.REVIEWING,
            },
            { key: "RESOLVED", label: "Resolved" },
            { key: "DISMISSED", label: "Dismissed" },
          ].map((f) => (
            <button
              key={f.key || "all"}
              className={`${s.statusBtn} ${status === f.key ? s.statusBtnActive : ""}`}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
            >
              {f.label}
              {f.count > 0 && <span className={s.statusCount}>{f.count}</span>}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className={s.filterBar}>
          <div className={s.searchWrap}>
            <Search size={13} />
            <input
              className={s.searchInput}
              placeholder="Search reporter or description…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                className={s.searchClear}
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
            className={s.select}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            className={s.select}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <input
            className={s.dateInput}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From date"
          />
          <input
            className={s.dateInput}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To date"
          />

          {(search || type || reason || from || to) && (
            <button
              className={s.clearBtn}
              onClick={() => {
                setSearch("");
                setType("");
                setReason("");
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Top Reported Users */}
        {stats?.topReportedUsers?.length > 0 && !status && !type && !search && (
          <div className={s.topReportedSection}>
            <p className={s.sectionTitle}>
              <TrendingUp size={13} /> Most Reported Users
            </p>
            <div className={s.topReportedList}>
              {stats.topReportedUsers.slice(0, 5).map((u, i) => (
                <div key={u.id} className={s.topReportedRow}>
                  <span className={s.topRank}>#{i + 1}</span>
                  <Avatar user={u} />
                  <div className={s.topInfo}>
                    <p className={s.topName}>
                      {u.firstName} {u.lastName}
                    </p>
                    <p className={s.topMeta}>{u.email}</p>
                  </div>
                  <div className={s.topFlags}>
                    {u.isBanned && <span className={s.flagBanned}>BANNED</span>}
                    {!u.isActive && !u.isBanned && (
                      <span className={s.flagSuspended}>SUSPENDED</span>
                    )}
                  </div>
                  <span className={s.topCount}>
                    {u.reportCount} report
                    {u.reportCount !== 1 ? "s" : ""}
                  </span>
                  <button
                    className={s.viewTargetBtn}
                    onClick={() => {
                      setType("USER");
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports list */}
        <div className={s.reportsSection}>
          <div className={s.listHeader}>
            <div className={s.listHeaderLeft}>
              <input
                type="checkbox"
                className={s.checkbox}
                checked={selected.size === reports.length && reports.length > 0}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all"
              />
              <span className={s.listCount}>
                {total} report{total !== 1 ? "s" : ""}
              </span>
            </div>
            <span className={s.listPage}>
              Page {page} of {pages || 1}
            </span>
          </div>

          <div className={s.reportsList}>
            {repLoading ? (
              <Skeleton count={6} />
            ) : reports.length === 0 ? (
              <div className={s.emptyState}>
                <Inbox size={40} />
                <p>No reports found</p>
              </div>
            ) : (
              reports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  selected={selected.has(report.id)}
                  onSelect={toggleSelect}
                  onOpen={(id) => setDetailId(id)}
                  onResolve={(r) => setResolving(r)}
                  onDismiss={(r) => setDismissing(r)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className={s.pagination}>
              <button
                className={s.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className={s.pageInfo}>
                Page {page} of {pages}
              </span>
              <button
                className={s.pageBtn}
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {detailId && (
        <DetailDrawer
          reportId={detailId}
          onClose={() => setDetailId(null)}
          showToast={showToast}
          onAction={(actionType, report) => {
            setDetailId(null);
            handleAction(actionType, report);
          }}
        />
      )}

      {/* Resolve Modal */}
      {resolving && (
        <ResolveModal
          report={resolving}
          onClose={() => setResolving(null)}
          showToast={showToast}
          onDone={() => {
            setResolving(null);
            loadReports();
            loadStats();
          }}
        />
      )}

      {/* Dismiss Modal */}
      {dismissing && (
        <DismissModal
          report={dismissing}
          onClose={() => setDismissing(null)}
          showToast={showToast}
          onDone={() => {
            setDismissing(null);
            loadReports();
            loadStats();
          }}
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
    </AdminLayout>
  );
}
