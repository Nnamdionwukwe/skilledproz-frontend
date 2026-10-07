import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminVerifications.module.css";

// ─── Icons (react-icons — Feather family) ─────────────────────────────────────
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiCircle,
  FiTool,
  FiBriefcase,
  FiShield,
  FiFileText,
  FiCheck,
  FiX,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiAlertTriangle,
  FiAward,
  FiActivity,
  FiRotateCcw,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
  FiDownload,
  FiPlay,
  FiRotateCw,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

/**
 * Classify a URL by file type. Extend as needed.
 * Returns "image" | "video" | "pdf" | "other".
 */
function classifyFile(url) {
  if (!url) return "other";
  const u = url.split("?")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/.test(u))
    return "image";
  if (/\.(mp4|webm|mov|m4v|ogg|ogv|avi|mkv)$/.test(u)) return "video";
  if (/\.pdf$/.test(u)) return "pdf";
  // Cloudinary often uses /image/upload/ or /video/upload/ segments
  if (u.includes("/image/upload/")) return "image";
  if (u.includes("/video/upload/")) return "video";
  return "other";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.type === "error" ? (
        <FiXCircle size={13} />
      ) : (
        <FiCheckCircle size={13} />
      )}
      {toast.msg}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent, onClick, active }) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""} ${active ? styles.statCardActive : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div className={styles.statValue}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub != null && <div className={styles.statSub}>{sub}</div>}
    </button>
  );
}

// ─── Verification Status Badge ────────────────────────────────────────────────

function VerifBadge({ status }) {
  const map = {
    VERIFIED: {
      cls: styles.badgeVerified,
      icon: <FiCheck size={10} />,
      label: "Verified",
    },
    PENDING: {
      cls: styles.badgePending,
      icon: <FiClock size={10} />,
      label: "Pending",
    },
    REJECTED: {
      cls: styles.badgeRejected,
      icon: <FiX size={10} />,
      label: "Rejected",
    },
    UNVERIFIED: {
      cls: styles.badgeUnverified,
      icon: <FiCircle size={10} />,
      label: "Unverified",
    },
  };
  const s = map[status] || map.UNVERIFIED;
  return (
    <span className={`${styles.badge} ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

// ─── Full-Screen Media Viewer ─────────────────────────────────────────────────
// Handles images (with zoom + rotate), videos (native player), pdfs (iframe),
// and everything else (download prompt).
// ─────────────────────────────────────────────────────────────────────────────

function MediaViewer({ src, title, kind, onClose }) {
  // kind: "image" | "video" | "pdf" | "other"
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom/rotation whenever the source changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [src]);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (kind === "image") {
        if (e.key === "+" || e.key === "=")
          setZoom((z) => Math.min(4, z + 0.25));
        if (e.key === "-") setZoom((z) => Math.max(0.25, z - 0.25));
        if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360);
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, kind]);

  return (
    <div className={styles.fsBackdrop} onClick={onClose}>
      {/* Top bar */}
      <div className={styles.fsTopBar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.fsTitle}>
          {kind === "video" ? <FiPlay size={14} /> : <FiFileText size={14} />}
          <span>{title}</span>
        </div>

        <div className={styles.fsControls}>
          {kind === "image" && (
            <>
              <button
                type="button"
                className={styles.fsBtn}
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                title="Zoom out (−)"
              >
                <FiZoomOut size={14} />
              </button>
              <span className={styles.fsZoomLabel}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className={styles.fsBtn}
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                title="Zoom in (+)"
              >
                <FiZoomIn size={14} />
              </button>
              <button
                type="button"
                className={styles.fsBtn}
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate (R)"
              >
                <FiRotateCw size={14} />
              </button>
              <button
                type="button"
                className={styles.fsBtn}
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                title="Reset"
              >
                <FiRefreshCw size={14} />
              </button>
            </>
          )}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className={styles.fsBtn}
            title="Open in new tab"
          >
            <FiMaximize2 size={14} />
          </a>
          <a
            href={src}
            download
            className={styles.fsBtn}
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <FiDownload size={14} />
          </a>
          <button
            type="button"
            className={styles.fsCloseBtn}
            onClick={onClose}
            title="Close (Esc)"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Media area */}
      <div className={styles.fsStage} onClick={(e) => e.stopPropagation()}>
        {kind === "image" && (
          <img
            src={src}
            alt={title}
            className={styles.fsImage}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        )}

        {kind === "video" && (
          <video
            src={src}
            className={styles.fsVideo}
            controls
            autoPlay
            playsInline
            preload="metadata"
          />
        )}

        {kind === "pdf" && (
          <iframe src={src} title={title} className={styles.fsPdf} />
        )}

        {kind === "other" && (
          <div className={styles.fsOther}>
            <FiFileText size={48} />
            <p>Preview not available for this file type.</p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className={styles.fsOpenLink}
            >
              Open in new tab <FiExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reason Modal (Reject / Revoke) ───────────────────────────────────────────

function ReasonModal({
  title,
  subtitle,
  name,
  placeholder,
  confirmLabel,
  confirmIcon,
  tone = "reject",
  onConfirm,
  onClose,
  loading,
}) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  function submit() {
    if (!notes.trim() || notes.trim().length < 5) {
      setError("Please write at least 5 characters.");
      return;
    }
    setError(null);
    onConfirm(notes.trim());
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            <FiAlertTriangle size={14} /> {title}
          </p>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            {subtitle} <strong>{name}</strong> in their notification.
          </p>
          <textarea
            className={styles.textarea}
            placeholder={placeholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            autoFocus
          />
          {error && <div className={styles.inlineError}>{error}</div>}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={
                tone === "reject" ? styles.modalReject : styles.modalRevoke
              }
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  {confirmIcon} {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerCard({ item, onAction, i }) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Full-screen media state: { src, title, kind } | null
  const [media, setMedia] = useState(null);

  const [bgChecked, setBgChecked] = useState(item.backgroundCheck ?? false);

  const u = item.user || {};
  const wp = item;
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";

  const sub = item.submissionData || {};
  const docs = [sub.documentUrl, wp.idDocument].filter(
    (v, idx, arr) => v && arr.indexOf(v) === idx,
  );

  const certs = wp.certifications || [];
  const categories = wp.categories || [];

  const isPending = wp.verificationStatus === "PENDING";
  const isVerified = wp.verificationStatus === "VERIFIED";
  const isRejected = wp.verificationStatus === "REJECTED";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function openMedia(src, title) {
    if (!src) return;
    setMedia({ src, title, kind: classifyFile(src) });
  }

  // PATCH /api/verification/admin/workers/:userId/review
  async function handleVerify() {
    setActing("verify");
    try {
      await api.patch(`/verification/admin/workers/${u.id}/review`, {
        status: "VERIFIED",
      });
      showToast("Worker verified");
      setTimeout(() => onAction(u.id, "VERIFIED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Verification failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(notes) {
    setActing("reject");
    setRejectOpen(false);
    try {
      await api.patch(`/verification/admin/workers/${u.id}/review`, {
        status: "REJECTED",
        rejectionReason: notes,
      });
      showToast("Worker rejected");
      setTimeout(() => onAction(u.id, "REJECTED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  // PATCH /api/verification/admin/workers/:userId/revoke
  async function handleRevoke(notes) {
    setActing("revoke");
    setRevokeOpen(false);
    try {
      await api.patch(`/verification/admin/workers/${u.id}/revoke`, {
        reason: notes,
      });
      showToast("Worker verification revoked");
      setTimeout(() => onAction(u.id, "REVOKED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Revoke failed", "error");
    } finally {
      setActing(null);
    }
  }

  // PATCH /api/verification/admin/certifications/:certId/verify
  async function handleCertVerify(certId) {
    setActing(certId);
    try {
      await api.patch(`/verification/admin/certifications/${certId}/verify`);
      showToast("Certification verified");
      onAction(u.id, "cert_verified");
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Cert verification failed",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  // PATCH /api/verification/admin/workers/:userId/background-check
  async function handleBgCheck(passed) {
    setActing("bgcheck");
    try {
      await api.patch(`/verification/admin/workers/${u.id}/background-check`, {
        passed,
      });
      setBgChecked(passed);
      showToast(
        passed ? "Background check passed" : "Background check marked failed",
      );
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Background check update failed",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  return (
    <div
      className={`${styles.card} ${open ? styles.cardOpen : ""}`}
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <Toast toast={toast} />

      {/* ── Card Header ── */}
      <div className={styles.cardHeader} onClick={() => setOpen((o) => !o)}>
        <div className={styles.cardAvatar}>
          {u.avatar ? (
            <img src={u.avatar} alt="" />
          ) : (
            `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`
          )}
        </div>

        <div className={styles.cardMain}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{name}</span>
            <VerifBadge status={wp.verificationStatus} />
          </div>
          <p className={styles.cardEmail}>{u.email || "—"}</p>
          <p className={styles.cardMeta}>
            {wp.title && <span>{wp.title}</span>}
            {wp.title && <span className={styles.dot}>·</span>}
            <span>Joined {fmtDate(u.createdAt)}</span>
            {certs.length > 0 && (
              <>
                <span className={styles.dot}>·</span>
                <span>
                  {certs.length} cert{certs.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {docs.length > 0 && (
              <>
                <span className={styles.dot}>·</span>
                <span>
                  {docs.length} doc{docs.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>
        </div>

        <div className={styles.cardRight}>
          <span className={styles.submittedLabel}>
            {isPending
              ? `Submitted ${timeAgo(item.submittedAt || wp.updatedAt)}`
              : isVerified
                ? `Verified ${timeAgo(wp.reviewedAt || wp.updatedAt)}`
                : isRejected
                  ? `Rejected ${timeAgo(wp.reviewedAt || wp.updatedAt)}`
                  : `Joined ${fmtDate(u.createdAt)}`}
          </span>
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {open && (
        <div className={styles.cardDetail}>
          {/* Contact / location */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Contact &amp; Location</p>
            <div className={styles.fieldGrid}>
              <Field label="Email" value={u.email || "—"} />
              <Field label="Phone" value={u.phone || "—"} />
              <Field
                label="Location"
                value={
                  [u.city, u.state, u.country].filter(Boolean).join(", ") || "—"
                }
              />
              <Field label="Joined" value={fmtDate(u.createdAt)} />
              <Field
                label="Email Verified"
                value={u.isEmailVerified ? "Yes" : "No"}
              />
              <Field
                label="Phone Verified"
                value={u.isPhoneVerified ? "Yes" : "No"}
              />
            </div>
          </div>

          {/* Professional */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Professional</p>
            <div className={styles.fieldGrid}>
              <Field label="Title" value={wp.title || "—"} />
              <Field
                label="Hourly Rate"
                value={
                  wp.hourlyRate
                    ? `${wp.currency || "₦"}${Number(wp.hourlyRate).toLocaleString()}/hr`
                    : "—"
                }
              />
              <Field label="Currency" value={wp.currency || "—"} />
              <Field
                label="Profile Currency"
                value={wp.profileCurrency || "—"}
              />
              <Field
                label="Daily Rate"
                value={
                  wp.dailyRate
                    ? `${wp.currency || "₦"}${Number(wp.dailyRate).toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Weekly Rate"
                value={
                  wp.weeklyRate
                    ? `${wp.currency || "₦"}${Number(wp.weeklyRate).toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Monthly Rate"
                value={
                  wp.monthlyRate
                    ? `${wp.currency || "₦"}${Number(wp.monthlyRate).toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Yearly Rate"
                value={
                  wp.yearlyRate
                    ? `${wp.currency || "₦"}${Number(wp.yearlyRate).toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Custom Rate"
                value={
                  wp.customRate
                    ? `${wp.currency || "₦"}${Number(wp.customRate).toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Custom Rate Label"
                value={wp.customRateLabel || "—"}
              />
              <Field label="Pricing Note" value={wp.pricingNote || "—"} />
              <Field
                label="Description"
                value={
                  wp.description
                    ? wp.description.slice(0, 200) +
                      (wp.description.length > 200 ? "…" : "")
                    : "—"
                }
              />
              <Field
                label="Years Experience"
                value={wp.yearsExperience ?? "—"}
              />
              <Field
                label="Service Radius (km)"
                value={wp.serviceRadius ?? "—"}
              />
              <Field label="Available" value={wp.isAvailable ? "Yes" : "No"} />
              <Field
                label="Avg Rating"
                value={wp.avgRating != null ? `${wp.avgRating}★` : "—"}
              />
              <Field label="Total Reviews" value={wp.totalReviews ?? 0} />
              <Field label="Completed Jobs" value={wp.completedJobs ?? 0} />
              <Field
                label="Response Rate"
                value={wp.responseRate ? `${wp.responseRate}%` : "—"}
              />
              <Field
                label="Total Earnings"
                value={
                  wp.totalEarnings
                    ? `${wp.currency || "₦"}${Number(wp.totalEarnings).toLocaleString()}`
                    : 0
                }
              />
              <Field
                label="Video Intro"
                value={
                  wp.videoIntroUrl ? (
                    <button
                      type="button"
                      className={styles.inlineMediaBtn}
                      onClick={() =>
                        openMedia(wp.videoIntroUrl, `Video intro — ${name}`)
                      }
                    >
                      <FiPlay size={11} /> Watch
                    </button>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Joined (profile)" value={fmtDate(wp.createdAt)} />
              <Field label="Last Updated" value={fmtDate(wp.updatedAt)} />
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>Categories</p>
              <div className={styles.chipRow}>
                {categories.map((c, idx) => (
                  <span
                    key={c.id || idx}
                    className={`${styles.chip} ${c.isPrimary ? styles.chipGreen : ""}`}
                  >
                    {c.category?.icon} {c.category?.name}
                    {c.isPrimary ? " · primary" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submission data */}
          {(sub.idType ||
            sub.idNumber ||
            sub.dateOfBirth ||
            sub.nationality ||
            sub.submittedAt ||
            wp.rejectionReason) && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>ID Submission</p>
              <div className={styles.fieldGrid}>
                {sub.idType && <Field label="ID Type" value={sub.idType} />}
                {sub.idNumber && (
                  <Field label="ID Number" value={sub.idNumber} />
                )}
                {sub.dateOfBirth && (
                  <Field
                    label="Date of Birth"
                    value={fmtDate(sub.dateOfBirth)}
                  />
                )}
                {sub.nationality && (
                  <Field label="Nationality" value={sub.nationality} />
                )}
                {sub.submittedAt && (
                  <Field
                    label="Submitted"
                    value={fmtDateTime(sub.submittedAt)}
                  />
                )}
                {wp.reviewedAt && (
                  <Field label="Reviewed" value={fmtDateTime(wp.reviewedAt)} />
                )}
                {wp.rejectionReason && (
                  <Field label="Rejection Reason" value={wp.rejectionReason} />
                )}
              </div>
            </div>
          )}

          {/* Background check */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Background Check</p>
            <div className={styles.bgCheckRow}>
              <span className={styles.bgCheckLabel}>
                {bgChecked ? (
                  <>
                    <FiCheckCircle size={13} /> Passed
                  </>
                ) : (
                  <>
                    <FiClock size={13} /> Not yet checked
                  </>
                )}
              </span>
              <div className={styles.bgCheckBtns}>
                <button
                  type="button"
                  className={styles.btnSmallGreen}
                  disabled={acting === "bgcheck" || bgChecked}
                  onClick={() => handleBgCheck(true)}
                >
                  {acting === "bgcheck" ? (
                    <span className={styles.spinner} />
                  ) : (
                    "Mark Passed"
                  )}
                </button>
                <button
                  type="button"
                  className={styles.btnSmallRed}
                  disabled={acting === "bgcheck" || !bgChecked}
                  onClick={() => handleBgCheck(false)}
                >
                  Mark Failed
                </button>
              </div>
            </div>
          </div>

          {/* Certifications */}
          {certs.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>Certifications</p>
              <div className={styles.certList}>
                {certs.map((cert) => (
                  <div key={cert.id} className={styles.certRow}>
                    <div className={styles.certInfo}>
                      <span className={styles.certName}>{cert.name}</span>
                      <span className={styles.certIssuer}>
                        by {cert.issuedBy}
                      </span>
                      {cert.issueDate && (
                        <span className={styles.certDate}>
                          {fmtDate(cert.issueDate)}
                          {cert.expiryDate
                            ? ` – ${fmtDate(cert.expiryDate)}`
                            : " (no expiry)"}
                        </span>
                      )}
                      {cert.documentUrl && (
                        <button
                          type="button"
                          className={styles.inlineMediaBtn}
                          style={{ marginTop: 4, fontSize: "0.7rem" }}
                          onClick={() =>
                            openMedia(
                              cert.documentUrl,
                              `Certification — ${cert.name}`,
                            )
                          }
                        >
                          <FiFileText size={11} /> View document
                        </button>
                      )}
                      {cert.rejectionReason && (
                        <span
                          className={styles.certDate}
                          style={{ color: "var(--red)" }}
                        >
                          Rejected: {cert.rejectionReason}
                        </span>
                      )}
                      {cert.createdAt && (
                        <span
                          className={styles.certDate}
                          style={{ opacity: 0.7 }}
                        >
                          Uploaded {fmtDate(cert.createdAt)}
                        </span>
                      )}
                    </div>
                    {cert.verified ? (
                      <span className={styles.certVerified}>
                        <FiCheck size={11} /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnSmallGreen}
                        disabled={acting === cert.id}
                        onClick={() => handleCertVerify(cert.id)}
                      >
                        {acting === cert.id ? (
                          <span className={styles.spinner} />
                        ) : (
                          "Verify Cert"
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents — each is a full-screen-openable button */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Submitted Documents</p>
            {docs.length === 0 ? (
              <p className={styles.noDoc}>No documents uploaded yet.</p>
            ) : (
              <div className={styles.docBtnGrid}>
                {docs.map((doc, idx) => {
                  const kind = classifyFile(doc);
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={styles.docOpenBtn}
                      onClick={() =>
                        openMedia(doc, `${name} — Document ${idx + 1}`)
                      }
                      title="Click to view full screen"
                    >
                      {kind === "image" ? (
                        <FiFileText size={13} />
                      ) : kind === "video" ? (
                        <FiPlay size={13} />
                      ) : (
                        <FiFileText size={13} />
                      )}
                      Document {idx + 1}
                      <span className={styles.docOpenHint}>
                        <FiMaximize2 size={10} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary actions */}
          <div className={styles.actionBar}>
            {!isVerified && (
              <button
                type="button"
                className={styles.verifyBtn}
                onClick={handleVerify}
                disabled={acting !== null || !isPending}
                title={
                  !isPending
                    ? "Only pending verifications can be approved"
                    : undefined
                }
              >
                {acting === "verify" ? (
                  <>
                    <span className={styles.spinner} /> Verifying…
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={13} /> Verify Worker
                  </>
                )}
              </button>
            )}

            {isVerified && (
              <button
                type="button"
                className={styles.revokeBtn}
                onClick={() => setRevokeOpen(true)}
                disabled={acting !== null}
              >
                {acting === "revoke" ? (
                  <>
                    <span className={styles.spinner} /> Revoking…
                  </>
                ) : (
                  <>
                    <FiRotateCcw size={13} /> Revoke Verification
                  </>
                )}
              </button>
            )}

            {!isRejected && (
              <button
                type="button"
                className={styles.rejectBtn}
                onClick={() => setRejectOpen(true)}
                disabled={acting !== null || !isPending}
                title={
                  !isPending
                    ? "Only pending verifications can be rejected"
                    : undefined
                }
              >
                {acting === "reject" ? (
                  <>
                    <span className={styles.spinner} /> Rejecting…
                  </>
                ) : (
                  <>
                    <FiXCircle size={13} /> Reject
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {rejectOpen && (
        <ReasonModal
          title="Reject Verification"
          subtitle="This note will be sent to"
          name={name}
          placeholder="Reason for rejection (e.g. ID document unclear, expired certification)…"
          confirmLabel="Confirm Reject"
          confirmIcon={<FiXCircle size={13} />}
          tone="reject"
          loading={acting === "reject"}
          onConfirm={handleReject}
          onClose={() => setRejectOpen(false)}
        />
      )}
      {revokeOpen && (
        <ReasonModal
          title="Revoke Verification"
          subtitle="This reason will be sent to"
          name={name}
          placeholder="Reason for revoking (e.g. fraudulent documents, policy violation)…"
          confirmLabel="Confirm Revoke"
          confirmIcon={<FiRotateCcw size={13} />}
          tone="revoke"
          loading={acting === "revoke"}
          onConfirm={handleRevoke}
          onClose={() => setRevokeOpen(false)}
        />
      )}
      {media && (
        <MediaViewer
          src={media.src}
          title={media.title}
          kind={media.kind}
          onClose={() => setMedia(null)}
        />
      )}
    </div>
  );
}

// ─── Hirer Card ───────────────────────────────────────────────────────────────

function HirerCard({ item, onAction, i }) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [media, setMedia] = useState(null);

  const u = item.user || {};
  const hp = item;
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";
  const sub = item.submissionData || {};

  const docs = [sub.documentUrl, hp.idDocument].filter(
    (v, idx, arr) => v && arr.indexOf(v) === idx,
  );

  const isPending = hp.verificationStatus === "PENDING";
  const isVerified = hp.verificationStatus === "VERIFIED";
  const isRejected = hp.verificationStatus === "REJECTED";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function openMedia(src, title) {
    if (!src) return;
    setMedia({ src, title, kind: classifyFile(src) });
  }

  // PATCH /api/verification/admin/hirers/:userId/review
  async function handleApprove() {
    setActing("approve");
    try {
      await api.patch(`/verification/admin/hirers/${u.id}/review`, {
        status: "VERIFIED",
      });
      showToast("Hirer approved");
      setTimeout(() => onAction(u.id, "VERIFIED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Approval failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(notes) {
    setActing("reject");
    setRejectOpen(false);
    try {
      await api.patch(`/verification/admin/hirers/${u.id}/review`, {
        status: "REJECTED",
        rejectionReason: notes,
      });
      showToast("Hirer rejected");
      setTimeout(() => onAction(u.id, "REJECTED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleRevoke(notes) {
    setActing("revoke");
    setRevokeOpen(false);
    try {
      await api.patch(`/verification/admin/hirers/${u.id}/revoke`, {
        reason: notes,
      });
      showToast("Hirer verification revoked");
      setTimeout(() => onAction(u.id, "REVOKED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Revoke failed", "error");
    } finally {
      setActing(null);
    }
  }

  const submittedAt = item.submittedAt || u.createdAt;

  return (
    <div
      className={`${styles.card} ${open ? styles.cardOpen : ""}`}
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <Toast toast={toast} />

      <div className={styles.cardHeader} onClick={() => setOpen((o) => !o)}>
        <div className={`${styles.cardAvatar} ${styles.cardAvatarHirer}`}>
          {u.avatar ? (
            <img src={u.avatar} alt="" />
          ) : (
            `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`
          )}
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{name}</span>
            <span className={styles.hirerPill}>
              <FiBriefcase size={11} /> Hirer
            </span>
            <VerifBadge status={hp.verificationStatus} />
          </div>
          <p className={styles.cardEmail}>{u.email || "—"}</p>
          <p className={styles.cardMeta}>
            {hp.companyName && <span>{hp.companyName}</span>}
            {hp.companyName && <span className={styles.dot}>·</span>}
            <span>Joined {fmtDate(u.createdAt)}</span>
            {hp.verificationType && (
              <>
                <span className={styles.dot}>·</span>
                <span>{hp.verificationType}</span>
              </>
            )}
          </p>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.submittedLabel}>
            {isPending
              ? `Submitted ${timeAgo(submittedAt)}`
              : isVerified
                ? `Verified ${timeAgo(hp.reviewedAt || hp.updatedAt)}`
                : isRejected
                  ? `Rejected ${timeAgo(hp.reviewedAt || hp.updatedAt)}`
                  : `Joined ${fmtDate(u.createdAt)}`}
          </span>
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className={styles.cardDetail}>
          {/* Contact & Location */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Contact &amp; Location</p>
            <div className={styles.fieldGrid}>
              <Field label="Email" value={u.email || "—"} />
              <Field label="Phone" value={u.phone || "—"} />
              <Field
                label="Location"
                value={
                  [u.city, u.state, u.country].filter(Boolean).join(", ") || "—"
                }
              />
              <Field label="Joined" value={fmtDate(u.createdAt)} />
              <Field
                label="Email Verified"
                value={u.isEmailVerified ? "Yes" : "No"}
              />
              <Field
                label="Phone Verified"
                value={u.isPhoneVerified ? "Yes" : "No"}
              />
            </div>
          </div>

          {/* Company details */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Company Details</p>
            <div className={styles.fieldGrid}>
              <Field label="Company" value={hp.companyName || "—"} />
              <Field label="Company Size" value={hp.companySize || "—"} />
              <Field
                label="Website"
                value={
                  hp.website ? (
                    <a
                      href={hp.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      Visit <FiExternalLink size={10} />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Total Hires" value={hp.totalHires ?? 0} />
              <Field
                label="Total Spent"
                value={
                  hp.totalSpent
                    ? `${hp.currency || "₦"}${Number(hp.totalSpent).toLocaleString()}`
                    : 0
                }
              />
              <Field label="Profile ID" value={hp.id || "—"} />
            </div>
          </div>

          {/* Verification submission */}
          {(sub.verificationType ||
            sub.idType ||
            sub.idNumber ||
            sub.companyRegNumber ||
            sub.companyCountry ||
            sub.website ||
            sub.submittedAt ||
            hp.rejectionReason) && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>Verification Submission</p>
              <div className={styles.fieldGrid}>
                {sub.verificationType && (
                  <Field
                    label="Verification Type"
                    value={sub.verificationType}
                  />
                )}
                {sub.idType && <Field label="ID Type" value={sub.idType} />}
                {sub.idNumber && (
                  <Field label="ID Number" value={sub.idNumber} />
                )}
                {sub.companyRegNumber && (
                  <Field
                    label="Company Reg Number"
                    value={sub.companyRegNumber}
                  />
                )}
                {sub.companyCountry && (
                  <Field label="Company Country" value={sub.companyCountry} />
                )}
                {sub.website && <Field label="Website" value={sub.website} />}
                {sub.submittedAt && (
                  <Field
                    label="Submitted"
                    value={fmtDateTime(sub.submittedAt)}
                  />
                )}
                {hp.reviewedAt && (
                  <Field label="Reviewed" value={fmtDateTime(hp.reviewedAt)} />
                )}
                {hp.rejectionReason && (
                  <Field label="Rejection Reason" value={hp.rejectionReason} />
                )}
              </div>
            </div>
          )}

          {/* Documents — full-screen openable */}
          {docs.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>Submitted Documents</p>
              <div className={styles.docBtnGrid}>
                {docs.map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.docOpenBtn}
                    onClick={() =>
                      openMedia(doc, `${name} — Document ${idx + 1}`)
                    }
                    title="Click to view full screen"
                  >
                    <FiFileText size={13} /> Document {idx + 1}
                    <span className={styles.docOpenHint}>
                      <FiMaximize2 size={10} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.actionBar}>
            {!isVerified && (
              <button
                type="button"
                className={styles.verifyBtn}
                onClick={handleApprove}
                disabled={acting !== null || !isPending}
                title={
                  !isPending
                    ? "Only pending verifications can be approved"
                    : undefined
                }
              >
                {acting === "approve" ? (
                  <>
                    <span className={styles.spinner} /> Approving…
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={13} /> Approve Hirer
                  </>
                )}
              </button>
            )}

            {isVerified && (
              <button
                type="button"
                className={styles.revokeBtn}
                onClick={() => setRevokeOpen(true)}
                disabled={acting !== null}
              >
                {acting === "revoke" ? (
                  <>
                    <span className={styles.spinner} /> Revoking…
                  </>
                ) : (
                  <>
                    <FiRotateCcw size={13} /> Revoke Verification
                  </>
                )}
              </button>
            )}

            {!isRejected && (
              <button
                type="button"
                className={styles.rejectBtn}
                onClick={() => setRejectOpen(true)}
                disabled={acting !== null || !isPending}
                title={
                  !isPending
                    ? "Only pending verifications can be rejected"
                    : undefined
                }
              >
                {acting === "reject" ? (
                  <>
                    <span className={styles.spinner} /> Rejecting…
                  </>
                ) : (
                  <>
                    <FiXCircle size={13} /> Reject
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {rejectOpen && (
        <ReasonModal
          title="Reject Verification"
          subtitle="This note will be sent to"
          name={name}
          placeholder="Reason for rejection (e.g. ID document unclear, expired documents)…"
          confirmLabel="Confirm Reject"
          confirmIcon={<FiXCircle size={13} />}
          tone="reject"
          loading={acting === "reject"}
          onConfirm={handleReject}
          onClose={() => setRejectOpen(false)}
        />
      )}
      {revokeOpen && (
        <ReasonModal
          title="Revoke Verification"
          subtitle="This reason will be sent to"
          name={name}
          placeholder="Reason for revoking (e.g. fraudulent documents, policy violation)…"
          confirmLabel="Confirm Revoke"
          confirmIcon={<FiRotateCcw size={13} />}
          tone="revoke"
          loading={acting === "revoke"}
          onConfirm={handleRevoke}
          onClose={() => setRevokeOpen(false)}
        />
      )}
      {media && (
        <MediaViewer
          src={media.src}
          title={media.title}
          kind={media.kind}
          onClose={() => setMedia(null)}
        />
      )}
    </div>
  );
}

// ─── Certification Card ───────────────────────────────────────────────────────

function CertCard({ item, onAction, i }) {
  const [acting, setActing] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [media, setMedia] = useState(null);

  const worker = item.workerProfile || {};
  const u = worker.user || {};
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function openMedia(src, title) {
    if (!src) return;
    setMedia({ src, title, kind: classifyFile(src) });
  }

  // PATCH /api/verification/admin/certifications/:certId/verify
  async function handleVerify() {
    setActing("verify");
    try {
      await api.patch(`/verification/admin/certifications/${item.id}/verify`);
      showToast("Certification verified");
      setTimeout(() => onAction(item.id, "VERIFIED"), 900);
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Cert verification failed",
        "error",
      );
    } finally {
      setActing(null);
    }
  }

  // PATCH /api/verification/admin/certifications/:certId/reject
  async function handleReject(notes) {
    setActing("reject");
    setRejectOpen(false);
    try {
      await api.patch(`/verification/admin/certifications/${item.id}/reject`, {
        reason: notes,
      });
      showToast("Certification rejected");
      setTimeout(() => onAction(item.id, "REJECTED"), 900);
    } catch (e) {
      showToast(e?.response?.data?.message || "Cert rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className={styles.card} style={{ animationDelay: `${i * 40}ms` }}>
      <Toast toast={toast} />

      <div className={styles.cardHeader} style={{ cursor: "default" }}>
        <div className={styles.cardAvatar}>
          {u.avatar ? (
            <img src={u.avatar} alt="" />
          ) : (
            `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`
          )}
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>
              <FiAward size={13} style={{ marginRight: 5 }} />
              {item.name}
            </span>
            <span
              className={styles.badge}
              style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}
            >
              <FiClock size={10} /> Pending
            </span>
          </div>
          <p className={styles.cardEmail}>
            by {item.issuedBy} · worker: {name} ({u.email})
          </p>
          <p className={styles.cardMeta}>
            {item.issueDate && <span>Issued {fmtDate(item.issueDate)}</span>}
            {item.expiryDate && (
              <>
                <span className={styles.dot}>·</span>
                <span>Expires {fmtDate(item.expiryDate)}</span>
              </>
            )}
            {item.createdAt && (
              <>
                <span className={styles.dot}>·</span>
                <span>Uploaded {timeAgo(item.createdAt)}</span>
              </>
            )}
          </p>
        </div>
        <div className={styles.cardRight}>
          {item.documentUrl && (
            <button
              type="button"
              className={styles.inlineMediaBtn}
              onClick={() =>
                openMedia(item.documentUrl, `Certification — ${item.name}`)
              }
              title="View document full screen"
            >
              <FiFileText size={12} /> View Doc
            </button>
          )}
        </div>
      </div>

      <div className={styles.actionBar}>
        <button
          type="button"
          className={styles.verifyBtn}
          onClick={handleVerify}
          disabled={acting !== null}
        >
          {acting === "verify" ? (
            <>
              <span className={styles.spinner} /> Verifying…
            </>
          ) : (
            <>
              <FiCheckCircle size={13} /> Verify Certification
            </>
          )}
        </button>
        <button
          type="button"
          className={styles.rejectBtn}
          onClick={() => setRejectOpen(true)}
          disabled={acting !== null}
        >
          {acting === "reject" ? (
            <>
              <span className={styles.spinner} /> Rejecting…
            </>
          ) : (
            <>
              <FiXCircle size={13} /> Reject
            </>
          )}
        </button>
      </div>

      {rejectOpen && (
        <ReasonModal
          title="Reject Certification"
          subtitle="This note will be sent to"
          name={name}
          placeholder="Reason for rejection (e.g. document unreadable, credential not recognised)…"
          confirmLabel="Confirm Reject"
          confirmIcon={<FiXCircle size={13} />}
          tone="reject"
          loading={acting === "reject"}
          onConfirm={handleReject}
          onClose={() => setRejectOpen(false)}
        />
      )}
      {media && (
        <MediaViewer
          src={media.src}
          title={media.title}
          kind={media.kind}
          onClose={() => setMedia(null)}
        />
      )}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ item }) {
  const admin = item.admin || {};
  const target = item.targetUser || {};
  const adminName =
    `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || "Admin";
  const targetName =
    `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || "user";

  const isReject = item.action === "USER_VERIFICATION_REJECTED";
  const isVerify = item.action === "USER_VERIFIED";

  return (
    <div className={styles.card} style={{ padding: "12px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          className={`${styles.badge} ${isVerify ? styles.badgeVerified : styles.badgeRejected}`}
        >
          {isVerify ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
          {isVerify ? "Verified" : "Rejected"}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
          <strong style={{ color: "var(--text)" }}>{adminName}</strong>{" "}
          {isVerify ? "verified" : "rejected"}{" "}
          <strong style={{ color: "var(--text)" }}>{targetName}</strong>
          {target.role ? ` (${target.role})` : ""}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {timeAgo(item.createdAt)}
        </span>
      </div>
      {item.description && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            margin: "6px 0 0",
          }}
        >
          {item.description}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVerifications() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "workers"; // workers | hirers | certs | activity
  const sub = searchParams.get("sub") || "pending"; // pending | verified | rejected | unverified
  const page = parseInt(searchParams.get("page") || "1");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageToast, setPageToast] = useState(null);

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  function showPageToast(msg, type = "success") {
    setPageToast({ msg, type });
    setTimeout(() => setPageToast(null), 3500);
  }

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    api
      .get("/verification/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch((e) => console.error("stats fetch:", e));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Fetch activity ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "activity") return;
    setLoading(true);
    api
      .get("/verification/admin/activity", { params: { limit: 30 } })
      .then((r) => {
        setActivity(r.data.data.activity || []);
        setActivityTotal(r.data.data.total || 0);
      })
      .catch(() => showPageToast("Failed to load activity", "error"))
      .finally(() => setLoading(false));
  }, [tab]);

  // ── Fetch queue ─────────────────────────────────────────────────────────────
  const fetchItems = useCallback(() => {
    if (tab === "activity") return;
    setLoading(true);

    let endpoint;
    if (tab === "workers") {
      endpoint = `/verification/admin/workers/${sub}`;
    } else if (tab === "hirers") {
      const s = ["pending", "verified", "rejected"].includes(sub)
        ? sub
        : "pending";
      endpoint = `/verification/admin/hirers/${s}`;
    } else if (tab === "certs") {
      endpoint = "/verification/admin/certifications/pending";
    }

    api
      .get(endpoint, { params: { page, limit: 10 } })
      .then((r) => {
        const d = r.data.data || {};
        setItems(d.workers || d.hirers || d.certifications || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => showPageToast("Failed to load queue", "error"))
      .finally(() => setLoading(false));
  }, [tab, sub, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Handle card action ──────────────────────────────────────────────────────
  function handleAction(id, result) {
    if (
      result === "VERIFIED" ||
      result === "REJECTED" ||
      result === "REVOKED"
    ) {
      setItems((prev) =>
        prev.filter((item) => (item.user?.id || item.id) !== id),
      );
      setTotal((t) => Math.max(0, t - 1));
      showPageToast(
        result === "VERIFIED"
          ? "Verification approved"
          : result === "REJECTED"
            ? "Verification rejected"
            : "Verification revoked",
        result === "VERIFIED" ? "success" : "warn",
      );
      fetchStats();
    } else if (result === "cert_verified") {
      fetchStats();
    }
  }

  // ── Stat card click → jump to that sub-tab ──────────────────────────────────
  function jumpTo(tabName, subName) {
    const p = new URLSearchParams();
    p.set("tab", tabName);
    if (subName) p.set("sub", subName);
    p.set("page", "1");
    setSearchParams(p);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const workerStats = stats?.workers || {};
  const hirerStats = stats?.hirers || {};
  const certStats = stats?.certifications || {};

  const SUBTABS = {
    workers: [
      { key: "pending", label: "Pending", count: workerStats.pending },
      { key: "verified", label: "Verified", count: workerStats.verified },
      { key: "rejected", label: "Rejected", count: workerStats.rejected },
      { key: "unverified", label: "Unverified", count: workerStats.unverified },
    ],
    hirers: [
      { key: "pending", label: "Pending", count: hirerStats.pending },
      { key: "verified", label: "Verified", count: hirerStats.verified },
      { key: "rejected", label: "Rejected", count: hirerStats.rejected },
    ],
    certs: [{ key: "pending", label: "Pending", count: certStats.pending }],
    activity: [],
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={pageToast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Trust &amp; Safety</p>
            <h1 className={styles.pageTitle}>
              <FiShield size={22} /> Verifications
            </h1>
            <p className={styles.pageSubtitle}>
              Review identity documents, approve workers and hirers, and manage
              certifications.
            </p>
          </div>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => {
              fetchStats();
              fetchItems();
            }}
          >
            <FiRefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className={styles.statsGrid}>
          <StatCard
            icon={FiTool}
            label="Workers · Pending"
            value={workerStats.pending ?? "—"}
            sub={`${workerStats.verified ?? 0} verified`}
            accent="yellow"
            active={tab === "workers" && sub === "pending"}
            onClick={() => jumpTo("workers", "pending")}
          />
          <StatCard
            icon={FiBriefcase}
            label="Hirers · Pending"
            value={hirerStats.pending ?? "—"}
            sub={`${hirerStats.verified ?? 0} verified`}
            accent="indigo"
            active={tab === "hirers" && sub === "pending"}
            onClick={() => jumpTo("hirers", "pending")}
          />
          <StatCard
            icon={FiAward}
            label="Certifications"
            value={certStats.pending ?? "—"}
            sub={`${certStats.verified ?? 0} verified`}
            accent="orange"
            active={tab === "certs"}
            onClick={() => jumpTo("certs", "pending")}
          />
          <StatCard
            icon={FiActivity}
            label="Activity (30d)"
            value={activityTotal || "—"}
            sub="recent actions"
            accent="green"
            active={tab === "activity"}
            onClick={() => jumpTo("activity")}
          />
        </div>

        {/* ── Top-level Tabs ── */}
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.filterTab} ${tab === "workers" ? styles.filterTabActive : ""}`}
            onClick={() => jumpTo("workers", "pending")}
          >
            <FiTool size={12} /> Workers
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${tab === "hirers" ? styles.filterTabActive : ""}`}
            onClick={() => jumpTo("hirers", "pending")}
          >
            <FiBriefcase size={12} /> Hirers
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${tab === "certs" ? styles.filterTabActive : ""}`}
            onClick={() => jumpTo("certs", "pending")}
          >
            <FiAward size={12} /> Certifications
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${tab === "activity" ? styles.filterTabActive : ""}`}
            onClick={() => jumpTo("activity")}
          >
            <FiActivity size={12} /> Activity
          </button>
        </div>

        {/* ── Sub-tabs ── */}
        {SUBTABS[tab]?.length > 0 && (
          <div className={styles.filterBar}>
            {SUBTABS[tab].map((s) => (
              <button
                key={s.key}
                type="button"
                className={`${styles.filterTab} ${sub === s.key ? styles.filterTabActive : ""}`}
                onClick={() => setParam("sub", s.key)}
              >
                {s.label}
                {s.count != null && ` (${s.count})`}
              </button>
            ))}
          </div>
        )}

        {/* ── Queue ── */}
        {loading ? (
          <div className={styles.skList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : tab === "activity" ? (
          activity.length === 0 ? (
            <div className={styles.empty}>
              <span>
                <FiActivity size={32} />
              </span>
              <p>No recent activity</p>
              <small>Verification actions will appear here.</small>
            </div>
          ) : (
            <div className={styles.cardList}>
              {activity.map((item, i) => (
                <ActivityRow key={item.id || i} item={item} />
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <span>
              {tab === "hirers" ? (
                <FiBriefcase size={32} />
              ) : tab === "certs" ? (
                <FiAward size={32} />
              ) : (
                <FiShield size={32} />
              )}
            </span>
            <p>
              No {sub}{" "}
              {tab === "hirers"
                ? "hirer"
                : tab === "certs"
                  ? "certification"
                  : "worker"}{" "}
              {tab !== "certs" && "verifications"}
            </p>
            <small>Nothing to review in this view.</small>
          </div>
        ) : (
          <div className={styles.cardList}>
            {tab === "workers" &&
              items.map((item, i) => (
                <WorkerCard
                  key={item.user?.id || item.id || i}
                  item={item}
                  onAction={handleAction}
                  i={i}
                />
              ))}
            {tab === "hirers" &&
              items.map((item, i) => (
                <HirerCard
                  key={item.user?.id || item.id || i}
                  item={item}
                  onAction={handleAction}
                  i={i}
                />
              ))}
            {tab === "certs" &&
              items.map((item, i) => (
                <CertCard
                  key={item.id || i}
                  item={item}
                  onAction={handleAction}
                  i={i}
                />
              ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {tab !== "activity" && pages > 1 && (
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              <FiChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {total} total
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <FiChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
