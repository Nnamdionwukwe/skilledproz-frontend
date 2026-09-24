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
  FiUser,
  FiAlertTriangle,
  FiBookOpen,
  FiAward,
  FiImage,
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
function timeAgo(d) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
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

function StatCard({ icon, label, value, accent, onClick, active }) {
  const Icon = icon;
  return (
    <button
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""} ${active ? styles.statCardActive : ""}`}
      onClick={onClick}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div className={styles.statVal}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
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
      icon: null,
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

// ─── Document Viewer Modal ────────────────────────────────────────────────────

function DocViewerModal({ docs, name, onClose }) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.docModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.docModalHeader}>
          <p className={styles.docModalTitle}>Documents — {name}</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>
        <div className={styles.docGrid}>
          {docs?.length ? (
            docs.map((doc, i) => (
              <div key={i} className={styles.docCard}>
                {doc.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <img
                    src={doc}
                    alt={`Doc ${i + 1}`}
                    className={styles.docImg}
                  />
                ) : (
                  <a
                    href={doc}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.docLink}
                  >
                    <FiFileText size={13} /> Document {i + 1}
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className={styles.docNone}>No documents submitted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reject Reason Modal ──────────────────────────────────────────────────────

function RejectModal({ name, onConfirm, onClose, loading }) {
  const [notes, setNotes] = useState("");
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            <FiAlertTriangle size={14} /> Reject Verification
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            This note will be sent to <strong>{name}</strong> in their
            notification.
          </p>
          <textarea
            className={styles.textarea}
            placeholder="Reason for rejection (e.g. ID document unclear, expired certification)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            autoFocus
          />
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.modalReject}
              onClick={() => onConfirm(notes)}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <FiXCircle size={13} /> Confirm Reject
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Worker Verification Card ─────────────────────────────────────────────────

function WorkerCard({ item, onAction, i }) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [bgChecked, setBgChecked] = useState(item.backgroundCheck ?? false);

  const u = item.user;
  const wp = item;
  const name = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();

  // Documents: prefer submissionData.documentUrl, fall back to wp.idDocument
  const sub = item.submissionData || {};
  const docs = [sub.documentUrl, wp.idDocument].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );

  const certs = wp.certifications || [];
  const categories = wp.categories || [];

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleVerify() {
    setActing("verify");
    try {
      await api.patch(`/admin/users/${u.id}/verify`, { status: "VERIFIED" });
      showToast("Worker verified");
      setTimeout(() => onAction(u.id, "VERIFIED"), 1200);
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
      await api.patch(`/admin/users/${u.id}/verify`, {
        status: "REJECTED",
        notes,
      });
      showToast("Worker rejected");
      setTimeout(() => onAction(u.id, "REJECTED"), 1200);
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleCertVerify(certId) {
    setActing(certId);
    try {
      await api.patch(`/verification/admin/certifications/${certId}/verify`, {
        verified: true,
      });
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

  async function handleBgCheck(checked) {
    setActing("bgcheck");
    try {
      await api.patch(`/verification/admin/${u.id}/background-check`, {
        passed: checked,
      });
      setBgChecked(checked);
      showToast(
        checked ? "Background check passed" : "Background check marked failed",
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
          {u?.avatar ? (
            <img src={u.avatar} alt="" />
          ) : (
            `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`
          )}
        </div>

        <div className={styles.cardMain}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{name || "—"}</span>
            <VerifBadge status={wp.verificationStatus} />
          </div>
          <p className={styles.cardEmail}>{u?.email}</p>
          <p className={styles.cardMeta}>
            {wp.title && <span>{wp.title}</span>}
            {wp.title && <span className={styles.dot}>·</span>}
            <span>Joined {fmtDate(u?.createdAt)}</span>
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
            Submitted {timeAgo(item.submittedAt || wp.updatedAt)}
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
              <Field label="Email" value={u?.email || "—"} />
              <Field label="Phone" value={u?.phone || "—"} />
              <Field
                label="Location"
                value={[u?.city, u?.country].filter(Boolean).join(", ") || "—"}
              />
              <Field label="Joined" value={fmtDate(u?.createdAt)} />
            </div>
          </div>

          {/* Identity fields */}
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
                    ? wp.description.slice(0, 140) +
                      (wp.description.length > 140 ? "…" : "")
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
                    <a
                      href={wp.videoIntroUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      Watch <FiExternalLink size={10} />
                    </a>
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
              <div className={styles.fieldGrid}>
                <Field
                  label="Assigned"
                  value={categories
                    .map((c) =>
                      `${c.category?.icon || ""} ${c.category?.name || ""}`.trim(),
                    )
                    .join(", ")}
                />
                <Field
                  label="Primary"
                  value={
                    categories.find((c) => c.isPrimary)?.category?.name || "—"
                  }
                />
              </div>
            </div>
          )}

          {/* Submission data */}
          {(sub.idType ||
            sub.idNumber ||
            sub.dateOfBirth ||
            sub.nationality ||
            sub.submittedAt) && (
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
                  <Field label="Submitted" value={fmtDate(sub.submittedAt)} />
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
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.docLink}
                          style={{ marginTop: 4, fontSize: "0.7rem" }}
                        >
                          <FiFileText size={11} /> View document
                        </a>
                      )}
                      {cert.createdAt && (
                        <span
                          className={styles.certDate}
                          style={{ opacity: 0.7 }}
                        >
                          Uploaded {fmtDate(cert.createdAt)}
                        </span>
                      )}
                      {cert.updatedAt && cert.updatedAt !== cert.createdAt && (
                        <span
                          className={styles.certDate}
                          style={{ opacity: 0.7 }}
                        >
                          Updated {fmtDate(cert.updatedAt)}
                        </span>
                      )}
                    </div>
                    {cert.verified ? (
                      <span className={styles.certVerified}>
                        <FiCheck size={11} /> Verified
                      </span>
                    ) : (
                      <button
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

          {/* Documents */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Submitted Documents</p>
            {docs.length === 0 ? (
              <p className={styles.noDoc}>No documents uploaded yet.</p>
            ) : (
              <button
                className={styles.viewDocsBtn}
                onClick={() => setDocOpen(true)}
              >
                <FiFileText size={13} /> View {docs.length} document
                {docs.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Primary actions */}
          <div className={styles.actionBar}>
            <button
              className={styles.verifyBtn}
              onClick={handleVerify}
              disabled={acting !== null || wp.verificationStatus === "VERIFIED"}
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
            <button
              className={styles.rejectBtn}
              onClick={() => setRejectOpen(true)}
              disabled={acting !== null || wp.verificationStatus === "REJECTED"}
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
        </div>
      )}

      {/* Modals */}
      {rejectOpen && (
        <RejectModal
          name={name}
          loading={acting === "reject"}
          onConfirm={handleReject}
          onClose={() => setRejectOpen(false)}
        />
      )}
      {docOpen && (
        <DocViewerModal
          docs={docs}
          name={name}
          onClose={() => setDocOpen(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

// ─── Hirer Verification Card ──────────────────────────────────────────────────

function HirerCard({ item, onAction, i }) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const u = item.user;
  const hp = u?.hirerProfile || item.hirerProfile || item;
  const name = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  const sub = item.submissionData || {};

  // Documents to show in viewer — only from submissionData
  const docs = sub.documentUrl ? [sub.documentUrl] : [];

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove() {
    setActing("approve");
    try {
      await api.patch(`/verification/admin/hirers/${u.id}/review`, {
        status: "VERIFIED",
      });
      showToast("Hirer approved");
      setTimeout(() => onAction(u.id, "VERIFIED"), 1200);
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
      setTimeout(() => onAction(u.id, "REJECTED"), 1200);
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  const submittedAt = item.submittedAt || u?.createdAt;

  return (
    <div
      className={`${styles.card} ${open ? styles.cardOpen : ""}`}
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <Toast toast={toast} />

      <div className={styles.cardHeader} onClick={() => setOpen((o) => !o)}>
        <div className={`${styles.cardAvatar} ${styles.cardAvatarHirer}`}>
          {u?.avatar ? (
            <img src={u.avatar} alt="" />
          ) : (
            `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`
          )}
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{name}</span>
            <span className={styles.hirerPill}>
              <FiBriefcase size={11} /> Hirer
            </span>
          </div>
          <p className={styles.cardEmail}>{u?.email}</p>
          <p className={styles.cardMeta}>
            {hp.companyName && <span>{hp.companyName}</span>}
            {hp.companyName && <span className={styles.dot}>·</span>}
            <span>Submitted {timeAgo(submittedAt)}</span>
          </p>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className={styles.cardDetail}>
          {/* Contact & Location */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Contact &amp; Location</p>
            <div className={styles.fieldGrid}>
              <Field label="Email" value={u?.email || "—"} />
              <Field label="Phone" value={u?.phone || "—"} />
              <Field
                label="Location"
                value={[u?.city, u?.country].filter(Boolean).join(", ") || "—"}
              />
              <Field label="Joined" value={fmtDate(u?.createdAt)} />
            </div>
          </div>

          {/* Company details */}
          <div className={styles.detailSection}>
            <p className={styles.sectionTitle}>Company Details</p>
            <div className={styles.fieldGrid}>
              <Field label="Company" value={hp.companyName || "—"} />
              <Field label="Company Size" value={hp.companySize || "—"} />
              <Field label="Website" value={hp.website || "—"} />
              <Field label="Total Hires" value={hp.totalHires ?? 0} />
              <Field label="Total Spent" value={hp.totalSpent ?? 0} />
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
            sub.documentUrl ||
            sub.status ||
            sub.submittedAt) && (
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
                {sub.status && (
                  <Field
                    label="Submission Status"
                    value={<VerifBadge status={sub.status} />}
                  />
                )}
                {sub.submittedAt && (
                  <Field label="Submitted" value={fmtDate(sub.submittedAt)} />
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.sectionTitle}>Submitted Documents</p>
              <button
                className={styles.viewDocsBtn}
                onClick={() => setDocOpen(true)}
              >
                <FiFileText size={13} /> View {docs.length} document
                {docs.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          <div className={styles.actionBar}>
            <button
              className={styles.verifyBtn}
              onClick={handleApprove}
              disabled={acting !== null}
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
            <button
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
        </div>
      )}

      {rejectOpen && (
        <RejectModal
          name={name}
          loading={acting === "reject"}
          onConfirm={handleReject}
          onClose={() => setRejectOpen(false)}
        />
      )}
      {docOpen && (
        <DocViewerModal
          docs={docs}
          name={name}
          onClose={() => setDocOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVerifications() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "workers"; // "workers" | "hirers"
  const page = parseInt(searchParams.get("page") || "1");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageToast, setPageToast] = useState(null);

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  function showPageToast(msg, type = "success") {
    setPageToast({ msg, type });
    setTimeout(() => setPageToast(null), 3500);
  }

  // ── Fetch stats ─────────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .get("/admin/verifications/stats")
      .then((r) => setStats(r.data.data))
      .catch(console.error);
  }, []);

  // ── Fetch queue ─────────────────────────────────────────────────────────────

  const fetchItems = useCallback(() => {
    setLoading(true);
    // ── CHANGED ── worker queue now uses the richer verification.controller
    // endpoint (which returns phone/country/city/categories/submissionData).
    const endpoint =
      tab === "hirers"
        ? "/verification/admin/hirers/pending"
        : "/verification/admin/pending";

    api
      .get(endpoint, { params: { page, limit: 10 } })
      .then((r) => {
        const d = r.data.data;
        setItems(d.verifications || d.hirers || d.workers || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => showPageToast("Failed to load queue", "error"))
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Handle card action ──────────────────────────────────────────────────────

  function handleAction(userId, result) {
    if (result === "VERIFIED" || result === "REJECTED") {
      setItems((prev) => prev.filter((item) => item.user?.id !== userId));
      setTotal((t) => Math.max(0, t - 1));
      showPageToast(
        result === "VERIFIED"
          ? "Verification approved"
          : "Verification rejected",
        result === "VERIFIED" ? "success" : "warn",
      );
      api
        .get("/admin/verifications/stats")
        .then((r) => setStats(r.data.data))
        .catch(console.error);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={pageToast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Trust &amp; Safety</p>
            <h1 className={styles.pageTitle}>Verifications</h1>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          <StatCard
            icon={FiClock}
            label="Pending"
            value={stats?.pending ?? "—"}
            accent="amber"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Verified"
            value={stats?.verified ?? "—"}
            accent="green"
          />
          <StatCard
            icon={FiXCircle}
            label="Rejected"
            value={stats?.rejected ?? "—"}
            accent="red"
          />
          <StatCard
            icon={FiCircle}
            label="Unverified"
            value={stats?.unverified ?? "—"}
          />
        </div>

        {/* ── Tab Row ── */}
        <div className={styles.tabRow}>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tab} ${tab === "workers" ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "workers")}
            >
              <FiTool size={12} /> Worker Queue
            </button>
            <button
              className={`${styles.tab} ${tab === "hirers" ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "hirers")}
            >
              <FiBriefcase size={12} /> Hirer Queue
            </button>
          </div>
          <span className={styles.totalPill}>{total} pending</span>
        </div>

        {/* ── Queue ── */}
        {loading ? (
          <div className={styles.skList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <span>
              {tab === "hirers" ? (
                <FiBriefcase size={32} />
              ) : (
                <FiShield size={32} />
              )}
            </span>
            <p>
              No pending {tab === "hirers" ? "hirer" : "worker"} verifications
            </p>
            <small>All submissions have been reviewed.</small>
          </div>
        ) : (
          <div className={styles.cardList}>
            {tab === "workers"
              ? items.map((item, i) => (
                  <WorkerCard
                    key={item.user?.id || i}
                    item={item}
                    onAction={handleAction}
                    i={i}
                  />
                ))
              : items.map((item, i) => (
                  <HirerCard
                    key={item.user?.id || i}
                    item={item}
                    onAction={handleAction}
                    i={i}
                  />
                ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
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
