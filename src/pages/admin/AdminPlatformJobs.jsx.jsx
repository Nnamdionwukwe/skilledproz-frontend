// src/pages/jobs/AdminJobs.jsx
// Full admin job post management.
// Endpoints:
//   GET    /admin/jobs?status=&search=&categoryId=&page=&limit=
//   GET    /admin/jobs/:jobId                  (detail + all applications)
//   PATCH  /admin/jobs/:jobId/status           { status }
//   DELETE /admin/jobs/:jobId                  { reason }
//   GET    /categories                          (for filter dropdown)

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminPlatformJobs.module.css";

// ─── Icons (react-icons — Feather family) ─────────────────────────────────────
import {
  FiBriefcase,
  FiClock,
  FiFileText,
  FiGlobe,
  FiMapPin,
  FiShuffle,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiTrash2,
  FiAlertTriangle,
  FiSearch,
  FiX,
  FiTag,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiUsers,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiLink,
  FiBookOpen,
  FiAward,
  FiSliders,
  FiActivity,
  FiAlignLeft,
  FiCornerDownRight,
  FiTarget,
  FiTrendingUp,
  FiHome,
  FiSend,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
} from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "FILLED", label: "Filled" },
  { key: "CANCELLED", label: "Cancelled" },
];

const JOB_STATUS_META = {
  OPEN: { label: "Open", color: "green" },
  FILLED: { label: "Filled", color: "indigo" },
  CANCELLED: { label: "Cancelled", color: "dim" },
};

const APP_STATUS_META = {
  PENDING: { label: "Pending", color: "yellow" },
  ACCEPTED: { label: "Accepted", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

const JOB_TYPE_ICONS = {
  FULL_TIME: { label: "Full-time", icon: FiBriefcase },
  PART_TIME: { label: "Part-time", icon: FiClock },
  CONTRACT: { label: "Contract", icon: FiFileText },
  TEMPORARY: { label: "Temporary", icon: FiClock },
};

const LOCATION_TYPE_META = {
  REMOTE: { label: "Remote", icon: FiGlobe },
  ON_SITE: { label: "On-site", icon: FiMapPin },
  HYBRID: { label: "Hybrid", icon: FiShuffle },
};

const BUDGET_TYPE_LABELS = {
  FIXED: "Fixed",
  HOURLY: "/hr",
  DAILY: "/day",
  WEEKLY: "/wk",
  MONTHLY: "/mo",
  CUSTOM: "Custom",
};

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBudget(min, max, type, currency = "USD") {
  if (!min && !max) return "—";
  const sym = BUDGET_TYPE_LABELS[type] || "";
  const fmtN = (n) => Number(n).toLocaleString();
  if (min && max) return `${currency} ${fmtN(min)}–${fmtN(max)}${sym}`;
  if (min) return `${currency} ${fmtN(min)}${sym}`;
  return `${currency} ${fmtN(max)}${sym}`;
}

// ── FIXED ── backend sends `budget`/`currency`/`budgetType` (single budget),
// and optionally salaryAmount/salaryMin/salaryMax/salaryCurrency/salaryPeriod
// for external-style jobs. Compute a single display string from the real
// backend fields instead of the non-existent budgetMin/budgetMax/budgetCurrency.
function computeBudgetLabel(job) {
  if (!job) return "—";

  const {
    salaryAmount,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    salaryText,
  } = job;

  const sym = (code) => {
    if (!code) return "";
    const map = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
    return map[code] || code + " ";
  };

  // Full text fallback if no numeric data at all
  if (
    salaryAmount == null &&
    salaryMin == null &&
    salaryMax == null &&
    !job.budget &&
    salaryText
  ) {
    return salaryText;
  }

  const periodSuffix =
    {
      HOURLY: "/hr",
      DAILY: "/day",
      WEEKLY: "/wk",
      MONTHLY: "/mo",
      YEARLY: "/yr",
      ANNUALLY: "/yr",
    }[salaryPeriod] || "";

  const currency = salaryCurrency || job.currency || "USD";
  const n = (v) => Number(v).toLocaleString();

  if (salaryMin != null && salaryMax != null) {
    return `${sym(currency)}${n(salaryMin)}–${n(salaryMax)}${periodSuffix}`;
  }
  if (salaryAmount != null) {
    return `${sym(currency)}${n(salaryAmount)}${periodSuffix}`;
  }
  if (salaryMin != null) {
    return `${sym(currency)}${n(salaryMin)}${periodSuffix}`;
  }
  if (salaryMax != null) {
    return `${sym(currency)}${n(salaryMax)}${periodSuffix}`;
  }

  // Fall back to the flat `budget` field
  if (job.budget != null) {
    const typeSuffix =
      {
        FIXED: "",
        HOURLY: "/hr",
        DAILY: "/day",
        WEEKLY: "/wk",
        MONTHLY: "/mo",
        CUSTOM: "",
      }[job.budgetType] || "";
    return `${sym(currency)}${n(job.budget)}${typeSuffix}`;
  }

  return "—";
}

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

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function truncate(str, n = 80) {
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ status, meta }) {
  const m = meta[status] ?? { label: status, color: "dim" };
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>{m.label}</span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  const Icon = icon;
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{Icon ? <Icon size={18} /> : null}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Application card (inside detail modal) ───────────────────────────────────
function ApplicationCard({ app }) {
  const meta = APP_STATUS_META[app.status] ?? {
    label: app.status,
    color: "dim",
  };
  return (
    <div className={s.appCard}>
      <Avatar user={app.worker} size="sm" />
      <div className={s.appInfo}>
        <span className={s.appName}>
          {app.worker?.firstName} {app.worker?.lastName}
        </span>
        {app.message && (
          <span className={s.appMessage}>{truncate(app.message, 100)}</span>
        )}
        <span className={s.appDate}>{fmtRelative(app.createdAt)}</span>
        {/* ── ADDED ── updatedAt + worker email ── */}
        {app.updatedAt && app.updatedAt !== app.createdAt && (
          <span className={s.appDate} style={{ opacity: 0.7 }}>
            Updated {fmtRelative(app.updatedAt)}
          </span>
        )}
        {app.worker?.email && (
          <span className={s.appDate} style={{ opacity: 0.6 }}>
            {app.worker.email}
          </span>
        )}
      </div>
      <span className={`${s.badge} ${s[`badge_${meta.color}`]}`}>
        {meta.label}
      </span>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ jobId, onClose, onStatusChange, onDelete }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("details"); // "details" | "applications"

  useEffect(() => {
    api;
    api
      .get(`/admin/platform/jobs/${jobId}`)
      .then((r) => setJob(r.data.data.job))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalHeader}>
            <h3 className={s.modalTitle}>Job Detail</h3>
            <button className={s.modalClose} onClick={onClose}>
              <FiX size={16} />
            </button>
          </div>
          <div className={s.modalBody}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={s.skCard} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalHeader}>
            <h3 className={s.modalTitle}>Job Detail</h3>
            <button className={s.modalClose} onClick={onClose}>
              <FiX size={16} />
            </button>
          </div>
          <div className={s.modalBody}>
            <p className={s.noData}>Failed to load job details.</p>
          </div>
        </div>
      </div>
    );
  }

  const appCounts = {
    total: job.applications?.length ?? 0,
    pending:
      job.applications?.filter((a) => a.status === "PENDING").length ?? 0,
    accepted:
      job.applications?.filter((a) => a.status === "ACCEPTED").length ?? 0,
  };

  const jtype = JOB_TYPE_ICONS[job.jobType] ?? {
    label: job.jobType,
    icon: FiBriefcase,
  };
  const ltype = LOCATION_TYPE_META[job.locationType] ?? {
    label: job.locationType,
    icon: FiMapPin,
  };
  const JTypeIcon = jtype.icon;
  const LTypeIcon = ltype.icon;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modalLg} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.modalHeader}>
          <div className={s.modalTitleRow}>
            <h3 className={s.modalTitle}>{job.title}</h3>
            <Badge status={job.status} meta={JOB_STATUS_META} />
          </div>
          <button className={s.modalClose} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className={s.modalTabs}>
          <button
            className={`${s.modalTab} ${tab === "details" ? s.modalTabActive : ""}`}
            onClick={() => setTab("details")}
          >
            Details
          </button>
          <button
            className={`${s.modalTab} ${tab === "applications" ? s.modalTabActive : ""}`}
            onClick={() => setTab("applications")}
          >
            Applications
            <span className={s.tabCount}>{appCounts.total}</span>
          </button>
        </div>

        <div className={s.modalBody}>
          {tab === "details" ? (
            <>
              {/* Hirer card */}
              <div className={s.hirerCard}>
                <Avatar user={job.hirer} size="sm" />
                <div className={s.hirerInfo}>
                  <span className={s.hirerName}>
                    {job.hirer?.firstName} {job.hirer?.lastName}
                  </span>
                  <span className={s.hirerEmail}>{job.hirer?.email}</span>
                </div>
                <span className={s.hirerLabel}>Posted by</span>
              </div>

              {/* Detail chips */}
              <div className={s.chipRow}>
                {job.category && (
                  <span className={s.chip}>
                    <FiTag size={11} /> {job.category.name}
                  </span>
                )}
                <span className={s.chip}>
                  <JTypeIcon size={11} /> {jtype.label}
                </span>
                <span className={s.chip}>
                  <LTypeIcon size={11} /> {ltype.label}
                </span>
                {/* ── FIXED ── use real budget/salary fields via helper ── */}
                {(() => {
                  const label = computeBudgetLabel(job);
                  return label !== "—" ? (
                    <span className={`${s.chip} ${s.chipGreen}`}>
                      <FiDollarSign size={11} /> {label}
                    </span>
                  ) : null;
                })()}
                {job.isUrgent && (
                  <span className={`${s.chip} ${s.chipRed}`}>
                    <FiZap size={11} /> Urgent
                  </span>
                )}
              </div>

              {/* Description */}
              <div className={s.descBox}>
                <span className={s.descLabel}>Description</span>
                <p className={s.descText}>
                  {job.description || "No description provided."}
                </p>
              </div>

              {/* Address */}
              {job.address && (
                <div className={s.detailRow}>
                  <span className={s.detailRowIcon}>
                    <FiMapPin size={13} />
                  </span>
                  <span className={s.detailRowVal}>{job.address}</span>
                </div>
              )}

              {/* ── FIXED ── backend field is expiryDate, not expiresAt ── */}
              {job.expiryDate && (
                <div className={s.detailRow}>
                  <span className={s.detailRowIcon}>
                    <FiClock size={13} />
                  </span>
                  <span className={s.detailRowVal}>
                    Expires {fmtDate(job.expiryDate)}
                  </span>
                </div>
              )}

              {/* ── ADDED ── schedule + duration + estimated fields ── */}
              {(job.scheduledAt ||
                job.estimatedHours != null ||
                job.estimatedUnit ||
                job.estimatedValue ||
                job.durationType ||
                job.durationValue) && (
                <div className={s.descBox}>
                  <span className={s.descLabel}>Schedule & Duration</span>
                  {job.scheduledAt && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiCalendar size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Scheduled {fmtDate(job.scheduledAt)}
                      </span>
                    </div>
                  )}
                  {job.estimatedHours != null && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiClock size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        {job.estimatedHours} {job.estimatedUnit || "hours"}{" "}
                        estimated
                        {job.estimatedValue
                          ? ` · ${job.estimatedValue} total`
                          : ""}
                      </span>
                    </div>
                  )}
                  {(job.durationType || job.durationValue) && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiClock size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Duration: {job.durationValue || "—"}{" "}
                        {job.durationType || ""}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── ADDED ── requirements + responsibilities ── */}
              {(job.minQualification ||
                job.educationLevel ||
                job.experienceLevel ||
                job.experienceLength ||
                job.languageRequirement ||
                job.workingHours ||
                job.applicantLocation ||
                job.requirements ||
                job.responsibilities) && (
                <div className={s.descBox}>
                  <span className={s.descLabel}>Requirements</span>
                  {job.minQualification && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiAward size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Min. qualification: {job.minQualification}
                      </span>
                    </div>
                  )}
                  {job.educationLevel && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiBookOpen size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Education level: {job.educationLevel}
                      </span>
                    </div>
                  )}
                  {job.experienceLevel && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiTrendingUp size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Experience: {job.experienceLevel}
                        {job.experienceLength
                          ? ` (${job.experienceLength})`
                          : ""}
                      </span>
                    </div>
                  )}
                  {job.languageRequirement && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiMessageCircle size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Language: {job.languageRequirement}
                      </span>
                    </div>
                  )}
                  {job.workingHours && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiClock size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Working hours: {job.workingHours}
                      </span>
                    </div>
                  )}
                  {job.applicantLocation && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiGlobe size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Applicant location: {job.applicantLocation}
                      </span>
                    </div>
                  )}
                  {job.requirements && (
                    <p className={s.descText} style={{ marginTop: 6 }}>
                      {job.requirements}
                    </p>
                  )}
                  {job.responsibilities && (
                    <p className={s.descText} style={{ marginTop: 6 }}>
                      {job.responsibilities}
                    </p>
                  )}
                </div>
              )}

              {/* ── ADDED ── application channels ── */}
              {(job.applicationUrl ||
                job.applicationEmail ||
                job.applicationWhatsApp ||
                job.applicationPhone) && (
                <div className={s.descBox}>
                  <span className={s.descLabel}>How to Apply</span>
                  {job.applicationUrl && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiLink size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        <a
                          href={job.applicationUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--orange)" }}
                        >
                          {job.applicationUrl}
                        </a>
                      </span>
                    </div>
                  )}
                  {job.applicationEmail && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiMail size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        {job.applicationEmail}
                      </span>
                    </div>
                  )}
                  {job.applicationWhatsApp && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiMessageCircle size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        WhatsApp {job.applicationWhatsApp}
                      </span>
                    </div>
                  )}
                  {job.applicationPhone && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiPhone size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        {job.applicationPhone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── ADDED ── skills + notes + company + source ── */}
              {(job.skills?.length ||
                job.notes ||
                job.companyName ||
                job.sourcePlatform) && (
                <div className={s.descBox}>
                  <span className={s.descLabel}>Additional Info</span>
                  {job.companyName && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiHome size={13} />
                      </span>
                      <span className={s.detailRowVal}>{job.companyName}</span>
                    </div>
                  )}
                  {job.sourcePlatform && (
                    <div className={s.detailRow}>
                      <span className={s.detailRowIcon}>
                        <FiSend size={13} />
                      </span>
                      <span className={s.detailRowVal}>
                        Source: {job.sourcePlatform}
                      </span>
                    </div>
                  )}
                  {job.skills?.length > 0 && (
                    <div className={s.chipRow} style={{ marginTop: 6 }}>
                      {job.skills.map((skill, i) => (
                        <span key={i} className={s.chip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  {job.notes && (
                    <p className={s.descText} style={{ marginTop: 6 }}>
                      {job.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Stats mini row */}
              <div className={s.miniStats}>
                <div className={s.miniStat}>
                  <span className={s.miniStatVal}>{appCounts.total}</span>
                  <span className={s.miniStatLabel}>Applications</span>
                </div>
                <div className={s.miniStat}>
                  <span className={`${s.miniStatVal} ${s.yellow}`}>
                    {appCounts.pending}
                  </span>
                  <span className={s.miniStatLabel}>Pending</span>
                </div>
                <div className={s.miniStat}>
                  <span className={`${s.miniStatVal} ${s.green}`}>
                    {appCounts.accepted}
                  </span>
                  <span className={s.miniStatLabel}>Accepted</span>
                </div>
                <div className={s.miniStat}>
                  <span className={s.miniStatVal}>
                    {fmtDate(job.createdAt)}
                  </span>
                  <span className={s.miniStatLabel}>Posted</span>
                </div>
              </div>

              {/* Actions */}
              <div className={s.detailActions}>
                {job.status === "OPEN" && (
                  <>
                    <button
                      className={s.btnStatusFill}
                      onClick={() => {
                        onClose();
                        onStatusChange(job, "FILLED");
                      }}
                    >
                      <FiCheckCircle size={13} /> Mark Filled
                    </button>
                    <button
                      className={s.btnStatusCancel}
                      onClick={() => {
                        onClose();
                        onStatusChange(job, "CANCELLED");
                      }}
                    >
                      <FiXCircle size={13} /> Cancel Job
                    </button>
                  </>
                )}
                {job.status !== "OPEN" && (
                  <button
                    className={s.btnStatusReopen}
                    onClick={() => {
                      onClose();
                      onStatusChange(job, "OPEN");
                    }}
                  >
                    <FiRefreshCw size={13} /> Re-open Job
                  </button>
                )}
                <button
                  className={s.btnDelete}
                  onClick={() => {
                    onClose();
                    onDelete(job);
                  }}
                >
                  <FiTrash2 size={13} /> Delete Job
                </button>
              </div>
            </>
          ) : (
            /* Applications tab */
            <div className={s.appList}>
              {job.applications?.length === 0 ? (
                <div className={s.empty}>
                  <span className={s.emptyIcon}>
                    <FiInbox size={32} />
                  </span>
                  <p className={s.emptyTitle}>No applications yet</p>
                </div>
              ) : (
                job.applications.map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal ──────────────────────────────────────────────────────
function StatusModal({ job, targetStatus, onClose, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const metaMap = {
    OPEN: { label: "Re-open", icon: FiRefreshCw, btn: s.btnStatusReopen },
    FILLED: { label: "Fill", icon: FiCheckCircle, btn: s.btnStatusFill },
    CANCELLED: { label: "Cancel", icon: FiXCircle, btn: s.btnStatusCancel },
  };
  const meta = metaMap[targetStatus] ?? {
    label: targetStatus,
    icon: FiZap,
    btn: s.btnSubmit,
  };
  const MetaIcon = meta.icon;

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/platform/jobs/${job.id}/status`, {
        status: targetStatus,
        notes,
      });
      onSuccess(`Job marked as ${targetStatus.toLowerCase()}.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update job status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <MetaIcon size={14} /> Change Job Status
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>
        <div className={s.modalBody}>
          {/* Job summary */}
          <div className={s.jobSummaryCard}>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Job</span>
              <span className={s.summaryVal}>{truncate(job.title, 50)}</span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Hirer</span>
              <span className={s.summaryVal}>
                {job.hirer?.firstName} {job.hirer?.lastName}
              </span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Current Status</span>
              <Badge status={job.status} meta={JOB_STATUS_META} />
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>New Status</span>
              <Badge status={targetStatus} meta={JOB_STATUS_META} />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Reason / Notes (optional)</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="Reason for changing status…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={meta.btn}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <MetaIcon size={13} /> Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ job, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/admin/platform/jobs/${job.id}`, { data: { reason } });
      onSuccess("Job post deleted and hirer notified.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete job post.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <FiTrash2 size={14} /> Delete Job Post
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <span className={s.deleteWarningIcon}>
              <FiAlertTriangle size={18} />
            </span>
            <p className={s.deleteWarningText}>
              This will permanently remove the job post and notify the hirer.
              All {job._count?.applications ?? 0} application(s) will also be
              deleted.
            </p>
          </div>

          <div className={s.jobSummaryCard}>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Title</span>
              <span className={s.summaryVal}>{truncate(job.title, 50)}</span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Hirer</span>
              <span className={s.summaryVal}>
                {job.hirer?.firstName} {job.hirer?.lastName}
              </span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Applications</span>
              <span className={s.summaryVal}>
                {job._count?.applications ?? 0}
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Reason (sent to hirer)</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Post violates our community guidelines…"
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
              Keep Job
            </button>
            <button
              className={s.btnDeleteConfirm}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <FiTrash2 size={13} /> Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function JobRow({ job, index, onDetail, onStatusChange, onDelete }) {
  const jtype = JOB_TYPE_ICONS[job.jobType] ?? { icon: FiBriefcase };
  const ltype = LOCATION_TYPE_META[job.locationType] ?? { icon: FiMapPin };
  const JTypeIcon = jtype.icon;
  const LTypeIcon = ltype.icon;

  return (
    <div className={s.tableRow} style={{ animationDelay: `${index * 0.025}s` }}>
      {/* Title + badges */}
      <div className={s.tdJob}>
        {/* ── ADDED ── description tooltip ── */}
        <div className={s.tdJobTitle} title={job.description || ""}>
          {job.title}
        </div>
        <div className={s.tdJobMeta}>
          <span className={s.typeChip}>
            <JTypeIcon size={11} />{" "}
            {JOB_TYPE_ICONS[job.jobType]?.label ?? job.jobType}
          </span>
          <span className={s.typeChip}>
            <LTypeIcon size={11} />{" "}
            {LOCATION_TYPE_META[job.locationType]?.label ?? job.locationType}
          </span>
        </div>
      </div>

      {/* Hirer */}
      <div className={s.tdHirer}>
        <Avatar user={job.hirer} />
        <div className={s.tdHirerInfo}>
          <span className={s.tdHirerName}>
            {job.hirer?.firstName} {job.hirer?.lastName}
          </span>
          <span className={s.tdHirerEmail}>{job.hirer?.email}</span>
        </div>
      </div>

      {/* Category */}
      <div className={s.tdMeta}>{job.category?.name || "—"}</div>

      {/* ── FIXED ── backend sends budget/currency/budgetType not budgetMin/Max ── */}
      <div className={s.tdBudget}>{computeBudgetLabel(job)}</div>

      {/* Applications count */}
      <div className={s.tdApps}>
        <span
          className={`${s.appsCount} ${(job._count?.applications ?? 0) > 0 ? s.appsCountActive : ""}`}
        >
          {job._count?.applications ?? 0}
        </span>
      </div>

      {/* Status + date */}
      <div className={s.tdStatus}>
        <Badge status={job.status} meta={JOB_STATUS_META} />
        <span className={s.tdRelative}>{fmtRelative(job.createdAt)}</span>
      </div>

      {/* Actions */}
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(job.id)}
          title="View detail"
        >
          <FiEye size={13} />
        </button>
        {job.status === "OPEN" && (
          <>
            <button
              className={s.fillBtn}
              onClick={() => onStatusChange(job, "FILLED")}
              title="Mark filled"
            >
              <FiCheckCircle size={13} />
            </button>
            <button
              className={s.cancelBtn}
              onClick={() => onStatusChange(job, "CANCELLED")}
              title="Cancel job"
            >
              <FiXCircle size={13} />
            </button>
          </>
        )}
        {job.status !== "OPEN" && (
          <button
            className={s.reopenBtn}
            onClick={() => onStatusChange(job, "OPEN")}
            title="Re-open"
          >
            <FiRefreshCw size={13} />
          </button>
        )}
        <button
          className={s.deleteBtn}
          onClick={() => onDelete(job)}
          title="Delete"
        >
          <FiTrash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPlatformJobs() {
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);

  // Modals
  const [detailJobId, setDetailJobId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null); // { job, targetStatus }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const searchTimer = useRef(null);

  // ── Load jobs ───────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, tab = filter, q = search, catId = categoryId) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab !== "ALL") params.status = tab;
        if (q.trim()) params.search = q.trim();
        if (catId) params.categoryId = catId;

        const res = await api.get("/admin/platform/jobs", { params });
        const d = res.data.data;

        setJobs(d.jobs);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);

        // Build stats from ALL page-1 load
        if (tab === "ALL" && pg === 1 && !q && !catId) {
          setStatsData({ total: d.total });
        }
      } catch {
        showToast("error", "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    },
    [filter, search, categoryId],
  );

  // ── Load categories for filter dropdown ─────────────────────────────────────
  useEffect(() => {
    api
      .get("/admin/categories", { params: { limit: 100 } })
      .then((r) => setCategories(r.data.data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(1, filter, search, categoryId);
  }, [filter, categoryId]);

  // ── Compute tab counts from current jobs ────────────────────────────────────
  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const filledCount = jobs.filter((j) => j.status === "FILLED").length;
  const cancelledCount = jobs.filter((j) => j.status === "CANCELLED").length;
  const totalApps = jobs.reduce(
    (sum, j) => sum + (j._count?.applications ?? 0),
    0,
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => load(1, filter, val, categoryId),
      380,
    );
  }

  function handleTabChange(key) {
    setFilter(key);
    setSearch("");
    setPage(1);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActionSuccess(msg) {
    setDetailJobId(null);
    setStatusTarget(null);
    setDeleteTarget(null);
    showToast("success", msg);
    load(page, filter, search, categoryId);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? (
                <FiCheckCircle size={13} />
              ) : (
                <FiXCircle size={13} />
              )}{" "}
              {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Platform</p>
            <h1 className={s.pageTitle}>
              Job Posts
              {total > 0 && <span className={s.countPill}>{total}</span>}
            </h1>
            <p className={s.pageSubtitle}>
              Manage all job posts, applications, and listings
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon={FiBriefcase}
            label="Total Jobs"
            value={total}
            sub="All statuses"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Open"
            value={openCount}
            sub="Accepting applications"
            accent="green"
            delay={0.05}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Filled"
            value={filledCount}
            sub="Position hired"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon={FiSend}
            label="Applications"
            value={totalApps}
            sub="Across this page"
            accent="yellow"
            delay={0.15}
          />
        </div>

        {/* ── Toolbar ── */}
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={s.toolRight}>
            {/* Category filter */}
            <select
              className={s.select}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className={s.searchBar}>
              <span className={s.searchIcon}>
                <FiSearch size={13} />
              </span>
              <input
                className={s.searchInput}
                placeholder="Search job title…"
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  className={s.searchClear}
                  onClick={() => {
                    setSearch("");
                    load(1, filter, "", categoryId);
                  }}
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <span>Job Title</span>
            <span>Hirer</span>
            <span>Category</span>
            <span>Budget</span>
            <span>Apps</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className={s.tableBody}>
            {loading ? (
              <SkeletonRows />
            ) : jobs.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>
                  <FiBriefcase size={32} />
                </span>
                <p className={s.emptyTitle}>
                  {filter === "ALL" && !search
                    ? "No job posts yet"
                    : "No jobs match your filters"}
                </p>
                <p className={s.emptySub}>
                  {filter !== "ALL" || search
                    ? "Try adjusting your filters."
                    : "Job posts created by hirers will appear here."}
                </p>
                {(filter !== "ALL" || search || categoryId) && (
                  <button
                    className={s.emptyReset}
                    onClick={() => {
                      handleTabChange("ALL");
                      setCategoryId("");
                      setSearch("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              jobs.map((job, i) => (
                <JobRow
                  key={job.id}
                  job={job}
                  index={i}
                  onDetail={setDetailJobId}
                  onStatusChange={(j, ts) =>
                    setStatusTarget({ job: j, targetStatus: ts })
                  }
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              <FiChevronLeft size={13} /> Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next <FiChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {detailJobId && (
        <DetailModal
          jobId={detailJobId}
          onClose={() => setDetailJobId(null)}
          onStatusChange={(j, ts) =>
            setStatusTarget({ job: j, targetStatus: ts })
          }
          onDelete={setDeleteTarget}
        />
      )}

      {statusTarget && (
        <StatusModal
          job={statusTarget.job}
          targetStatus={statusTarget.targetStatus}
          onClose={() => setStatusTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          job={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </AdminLayout>
  );
}
