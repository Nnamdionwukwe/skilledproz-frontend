import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./JobDetail.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import DurationBadge from "../common/DurationBadge";
import { formatJobDurationParts } from "../utils/formatDuration";
import ReportButton from "../../pages/reports/ReportButton";
import {
  FiBriefcase,
  FiClock,
  FiFileText,
  FiCalendar,
  FiGlobe,
  FiMapPin,
  FiUsers,
  FiDollarSign,
  FiCreditCard,
  FiTag,
  FiEdit3,
  FiBookmark,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiSearch,
  FiChevronLeft,
  FiArrowRight,
  FiSend,
  FiSun,
  FiShuffle,
  FiAward,
  FiBookOpen,
  FiLink,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiTrendingUp,
  FiAlignLeft,
  FiExternalLink,
  FiLayers,
  FiUserCheck,
  FiGlobe as FiLanguage,
  FiHome,
  FiCoffee,
  FiRefreshCw,
  FiTarget,
  FiNavigation,
  FiInfo,
} from "react-icons/fi";

// ─── Language map (mirrors PostJob.jsx) ────────────────────────────────────
const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ur", label: "Urdu" },
  { code: "tr", label: "Turkish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "fa", label: "Persian" },
  { code: "am", label: "Amharic" },
  { code: "zu", label: "Zulu" },
  { code: "af", label: "Afrikaans" },
  { code: "so", label: "Somali" },
];

// ─── Budget type labels (mirrors PostJob.jsx) ───────────────────────────────
const BUDGET_TYPE_LABELS = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
  FIXED: "Fixed Price",
};

const SALARY_PERIOD_LABELS = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
};

const EDUCATION_LEVEL_LABELS = {
  HIGH_SCHOOL: "High School",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree",
  DOCTORATE: "Doctorate",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

// ─── Helpers: parse recurring info from notes ───────────────────────────────
function parseRecurring(notes) {
  if (!notes) return null;
  const match = notes.match(/Recurring:\s*([^.]+)\./i);
  return match ? match[1].trim() : null;
}

function parseCustomDuration(notes) {
  if (!notes) return null;
  const match = notes.match(/Duration:\s*([^.]+)\./i);
  return match ? match[1].trim() : null;
}

function stripSystemNotes(notes) {
  if (!notes) return notes;
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const isWorker = user?.role === "WORKER";
  const isHirer = user?.role === "HIRER";
  const isOwner = user?.id === job?.hirer?.id;

  const backDestination =
    user?.role === "WORKER"
      ? "/jobs"
      : user?.role === "HIRER"
        ? "/dashboard/hirer/jobs-management"
        : "/landingpage";

  useEffect(() => {
    if (!id || id === "undefined" || id === "null") {
      setError("Job not found.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get(`/jobs/${id}`)
      .then((res) => {
        if (cancelled) return;
        setJob(res.data.data);
        setIsSaved(res.data.data.isSaved || false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Job not found.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleApply(e) {
    e.preventDefault();
    setApplying(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/jobs/${id}/apply`, { message });
      setJob((j) => ({ ...j, hasApplied: true }));
      setSuccess("Application submitted! The hirer will be notified.");
      setShowForm(false);
      setMessage("");
    } catch (e) {
      setError(
        e.response?.data?.message || "Failed to apply. Please try again.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleStatusUpdate(status) {
    try {
      await api.patch(`/jobs/${id}/status`, { status });
      setJob((j) => ({ ...j, jobPost: { ...j.jobPost, status } }));
      setSuccess(`Job marked as ${status.toLowerCase()}.`);
    } catch {
      setError("Failed to update status.");
    }
  }

  async function handleSave() {
    try {
      if (isSaved) {
        await api.delete(`/jobs/${id}/save`);
        setIsSaved(false);
        setSuccess("Job removed from your saved list.");
      } else {
        await api.post(`/jobs/${id}/save`);
        setIsSaved(true);
        setSuccess("Job saved to your list.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update saved status.");
    }
  }

  if (loading) return <JobSkeleton />;

  if (error && !job)
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <span className={styles.notFoundIcon}>
            <FiSearch size={48} />
          </span>
          <h2 className={styles.notFoundTitle}>Job not found</h2>
          <Link to={backDestination} className={styles.backLink}>
            <FiChevronLeft size={14} /> Back to Jobs
          </Link>
        </div>
      </div>
    );

  const { jobPost, hasApplied } = job;
  const scheduled = new Date(jobPost.scheduledAt);
  const isOpen = jobPost.status === "OPEN";
  const statusMeta = {
    OPEN: { label: "Open", color: "green" },
    FILLED: { label: "Filled", color: "indigo" },
    CANCELLED: { label: "Cancelled", color: "red" },
  };
  const sm = statusMeta[jobPost.status] || statusMeta.OPEN;

  const jobTypeMeta = {
    FULL_TIME: { icon: FiBriefcase, label: "Full-time" },
    PART_TIME: { icon: FiClock, label: "Part-time" },
    CONTRACT: { icon: FiFileText, label: "Contract" },
    TEMPORARY: { icon: FiClock, label: "Temporary" },
  }[jobPost.jobType];

  const locationTypeMeta = {
    REMOTE: { icon: FiGlobe, label: "Remote" },
    ON_SITE: { icon: FiMapPin, label: "On-site" },
    HYBRID: { icon: FiShuffle, label: "Hybrid" },
  }[jobPost.locationType];

  const budgetTypeMeta = {
    FIXED: { icon: FiDollarSign, label: "Fixed" },
    HOURLY: { icon: FiClock, label: "Hourly" },
    DAILY: { icon: FiSun, label: "Daily" },
    WEEKLY: { icon: FiCalendar, label: "Weekly" },
    MONTHLY: { icon: FiCalendar, label: "Monthly" },
    YEARLY: { icon: FiCalendar, label: "Yearly" },
    CUSTOM: { icon: FiEdit3, label: "Custom" },
  }[jobPost.budgetType];

  const salaryPeriodLabel = SALARY_PERIOD_LABELS[jobPost.salaryPeriod];
  const educationLevelLabel = EDUCATION_LEVEL_LABELS[jobPost.educationLevel];
  const budgetTypeLabel = BUDGET_TYPE_LABELS[jobPost.budgetType];

  const JobTypeIcon = jobTypeMeta?.icon;
  const LocationTypeIcon = locationTypeMeta?.icon;
  const BudgetTypeIcon = budgetTypeMeta?.icon;

  // ── Language label ──
  const languageLabel =
    ALL_LANGUAGES.find((l) => l.code === jobPost.languageRequirement)?.label ||
    jobPost.languageRequirement;

  // ── Recurring / custom duration parsed from notes ──
  const recurringLabel = parseRecurring(jobPost.notes);
  const customDurationLabel = parseCustomDuration(jobPost.notes);
  const cleanNotes = stripSystemNotes(jobPost.notes);

  // ── Derived: payment display ──
  const hasSalaryText = !!jobPost.salaryText;
  const hasSalaryRange = !!(
    jobPost.salaryAmount ||
    jobPost.salaryMin ||
    jobPost.salaryMax
  );
  const hasBudget = jobPost.budget !== null && jobPost.budget !== undefined;

  let salaryRangeText = null;
  if (jobPost.salaryMin && jobPost.salaryMax) {
    const cur = jobPost.salaryCurrency || jobPost.currency || "";
    salaryRangeText = `${cur} ${Number(jobPost.salaryMin).toLocaleString()} – ${Number(jobPost.salaryMax).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  } else if (jobPost.salaryAmount) {
    const cur = jobPost.salaryCurrency || jobPost.currency || "";
    salaryRangeText = `${cur} ${Number(jobPost.salaryAmount).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  }

  const mainPaymentText = hasSalaryText
    ? jobPost.salaryText
    : hasSalaryRange
      ? salaryRangeText
      : hasBudget
        ? `${jobPost.currency} ${parseFloat(jobPost.budget).toLocaleString()}`
        : "—";

  const mainPaymentLabel = hasSalaryText
    ? "Salary"
    : hasSalaryRange
      ? "Salary Range"
      : "Budget";

  // ── Derived: budget display suffix (per hour / per day / etc.) ──
  const budgetSuffix =
    jobPost.budgetType && jobPost.budgetType !== "FIXED"
      ? jobPost.budgetType === "CUSTOM"
        ? jobPost.budgetCustomLabel
          ? ` · ${jobPost.budgetCustomLabel}`
          : " · Custom"
        : ` · ${BUDGET_TYPE_LABELS[jobPost.budgetType] || jobPost.budgetType}`
      : " total";

  // ── Derived: duration text ──
  const durationParts = formatJobDurationParts(jobPost);
  const hasEstimatedDuration = !!(durationParts || jobPost.estimatedHours);
  const hasProjectDuration = !!(jobPost.durationValue && jobPost.durationType);
  const hasRecurring = !!recurringLabel;
  const hasCustomDuration = !!customDurationLabel;

  // ── Derived: application channels ──
  const hasExternalApplyChannels = !!(
    jobPost.applicationUrl ||
    jobPost.applicationEmail ||
    jobPost.applicationWhatsApp ||
    jobPost.applicationPhone
  );

  // ── Derived: employer / company info ──
  const companyDisplay =
    jobPost.companyName || jobPost.hirer?.hirerProfile?.companyName || null;

  // ── Derived: coordinates ──
  const hasCoordinates =
    jobPost.latitude !== null &&
    jobPost.latitude !== undefined &&
    jobPost.longitude !== null &&
    jobPost.longitude !== undefined;

  // ── Derived: work conditions ──
  const hasWorkConditions =
    jobPost.providesAccommodation || jobPost.providesMeals;

  // ── Derived: qualifications (PostJob sends a string[]) ──
  const qualificationsList = Array.isArray(jobPost.qualifications)
    ? jobPost.qualifications.filter(
        (q) => typeof q === "string" && q.trim().length > 0,
      )
    : [];

  // ── Derived: requirements block items ──
  const requirementItems = [
    jobPost.minQualification && {
      icon: <FiAward size={14} />,
      label: "Minimum Qualification",
      value: jobPost.minQualification,
    },
    jobPost.experienceLevel && {
      icon: <FiTrendingUp size={14} />,
      label: "Experience Level",
      value: jobPost.experienceLength
        ? `${jobPost.experienceLevel} · ${jobPost.experienceLength}`
        : jobPost.experienceLevel,
    },
    jobPost.experienceLength &&
      !jobPost.experienceLevel && {
        icon: <FiTrendingUp size={14} />,
        label: "Experience Length",
        value: jobPost.experienceLength,
      },
    educationLevelLabel && {
      icon: <FiBookOpen size={14} />,
      label: "Education Level",
      value: educationLevelLabel,
    },
    languageLabel && {
      icon: <FiLanguage size={14} />,
      label: "Language",
      value: languageLabel,
    },
    jobPost.workingHours && {
      icon: <FiClock size={14} />,
      label: "Working Hours",
      value: jobPost.workingHours,
    },
    jobPost.applicantLocation && {
      icon: <FiMapPin size={14} />,
      label: "Preferred Applicant Location",
      value: jobPost.applicantLocation,
    },
  ].filter(Boolean);

  const hasRequirementsBlock = requirementItems.length > 0;

  return (
    <div className={styles.page}>
      <Link to={backDestination} className={styles.backLink}>
        <FiChevronLeft size={14} /> Back to Jobs
      </Link>

      {error && (
        <Alert type="error" text={error} onClose={() => setError("")} />
      )}
      {success && (
        <Alert type="success" text={success} onClose={() => setSuccess("")} />
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* ═══════════════════════════════════════════════════════
              HEADER CARD — status, category, title, key pills
          ═══════════════════════════════════════════════════════ */}
          <div className={styles.headerCard}>
            <div className={styles.headerTop}>
              {jobPost.category?.name && (
                <div className={styles.categoryChip}>
                  {jobPost.category?.icon && (
                    <span>{jobPost.category.icon}</span>
                  )}
                  {jobPost.category?.name}
                  {jobPost.category?.isUserSubmitted && (
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        opacity: 0.7,
                        fontStyle: "italic",
                      }}
                    >
                      (custom)
                    </span>
                  )}
                </div>
              )}
              <span
                className={`${styles.statusBadge} ${styles[`status_${sm.color}`]}`}
              >
                {sm.label}
              </span>

              {isWorker && !isOwner && (
                <button
                  className={`${styles.saveJobBtn} ${isSaved ? styles.saveJobBtnActive : ""}`}
                  onClick={handleSave}
                >
                  <FiBookmark size={13} />
                  {isSaved ? "Saved" : "Save Job"}
                </button>
              )}
            </div>

            {companyDisplay && (
              <p className={styles.jobCompany}>{companyDisplay}</p>
            )}

            <h1 className={styles.jobTitle}>{jobPost.title}</h1>

            {(jobTypeMeta ||
              locationTypeMeta ||
              jobPost.budgetType ||
              jobPost.experienceLevel ||
              jobPost.sourcePlatform) && (
              <div className={styles.typePillRow}>
                {jobTypeMeta && (
                  <span className={styles.typePill}>
                    <JobTypeIcon size={12} /> {jobTypeMeta.label}
                  </span>
                )}
                {locationTypeMeta && (
                  <span className={styles.typePill}>
                    <LocationTypeIcon size={12} /> {locationTypeMeta.label}
                  </span>
                )}
                {jobPost.budgetType &&
                  jobPost.budgetType !== "FIXED" &&
                  budgetTypeMeta && (
                    <span className={styles.typePill}>
                      <BudgetTypeIcon size={12} /> {budgetTypeMeta.label}
                    </span>
                  )}
                {jobPost.experienceLevel && (
                  <span className={styles.typePill}>
                    <FiTrendingUp size={12} /> {jobPost.experienceLevel}
                  </span>
                )}
                {hasRecurring && (
                  <span className={styles.typePill}>
                    <FiRefreshCw size={12} /> Recurring
                  </span>
                )}
                {jobPost.sourcePlatform && (
                  <span className={styles.typePill}>
                    <FiExternalLink size={12} /> via {jobPost.sourcePlatform}
                  </span>
                )}
              </div>
            )}

            <div className={styles.metaRow}>
              <MetaItem
                icon={<FiCalendar size={12} />}
                text={`${scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              />
              {jobPost.address && (
                <MetaItem
                  icon={<FiMapPin size={12} />}
                  text={jobPost.address}
                />
              )}
              <DurationBadge job={jobPost} size="sm" />
              <MetaItem
                icon={<FiCalendar size={12} />}
                text={`Posted ${timeAgo(new Date(jobPost.createdAt))}`}
              />
            </div>

            <div className={styles.budgetBlock}>
              <span className={styles.budgetAmount}>{mainPaymentText}</span>
              <span className={styles.budgetLabel}>{mainPaymentLabel}</span>
              <span className={styles.applicantCount}>
                <FiUsers size={12} /> {jobPost._count?.applications || 0}{" "}
                applicant
                {jobPost._count?.applications !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              DESCRIPTION
          ═══════════════════════════════════════════════════════ */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Job Description</h2>
            <p className={styles.description}>{jobPost.description}</p>
            {cleanNotes && (
              <div className={styles.notes}>
                <FiFileText size={14} />
                <p>{cleanNotes}</p>
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              RESPONSIBILITIES (only if present)
          ═══════════════════════════════════════════════════════ */}
          {jobPost.responsibilities && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiAlignLeft
                  size={14}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Responsibilities
              </h2>
              <p className={styles.description}>{jobPost.responsibilities}</p>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              REQUIREMENTS (only if present)
          ═══════════════════════════════════════════════════════ */}
          {jobPost.requirements && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiCheckCircle
                  size={14}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Requirements
              </h2>
              <p className={styles.description}>{jobPost.requirements}</p>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              SKILLS (only if present)
          ═══════════════════════════════════════════════════════ */}
          {jobPost.skills?.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Required Skills</h2>
              <div className={styles.skillsWrap}>
                {jobPost.skills.map((skill, i) => (
                  <span key={i} className={styles.skillChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              QUALIFICATIONS (from PostJob.qualifications[])
          ═══════════════════════════════════════════════════════ */}
          {qualificationsList.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiAward
                  size={14}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Required Qualifications
              </h2>
              <div className={styles.skillsWrap}>
                {qualificationsList.map((qual, i) => (
                  <span key={i} className={styles.skillChip}>
                    <FiAward
                      size={11}
                      style={{ marginRight: 4, verticalAlign: "-1px" }}
                    />
                    {qual}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              WORK CONDITIONS (from PostJob: providesAccommodation,
              providesMeals)
          ═══════════════════════════════════════════════════════ */}
          {hasWorkConditions && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiHome
                  size={14}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Work Conditions
              </h2>
              <div className={styles.detailGrid}>
                {jobPost.providesAccommodation && (
                  <DetailCard
                    icon={<FiHome size={14} />}
                    label="Accommodation"
                    value="Provided"
                  />
                )}
                {jobPost.providesMeals && (
                  <DetailCard
                    icon={<FiCoffee size={14} />}
                    label="Meals"
                    value="Provided"
                  />
                )}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              DETAILS GRID — every present field
          ═══════════════════════════════════════════════════════ */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Details</h2>
            <div className={styles.detailGrid}>
              {jobPost.category?.name && (
                <DetailCard
                  icon={<FiFileText size={14} />}
                  label="Category"
                  value={
                    <>
                      {jobPost.category.icon ? `${jobPost.category.icon} ` : ""}
                      {jobPost.category.name}
                      {jobPost.category.isUserSubmitted && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 4,
                          }}
                        >
                          (custom)
                        </span>
                      )}
                    </>
                  }
                />
              )}

              {mainPaymentText !== "—" && (
                <DetailCard
                  icon={<FiDollarSign size={14} />}
                  label={mainPaymentLabel}
                  value={
                    <>
                      {mainPaymentText}
                      {hasBudget && !hasSalaryRange && !hasSalaryText && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 4,
                          }}
                        >
                          {budgetSuffix}
                        </span>
                      )}
                    </>
                  }
                  accent
                />
              )}

              {hasSalaryText && hasSalaryRange && (
                <DetailCard
                  icon={<FiDollarSign size={14} />}
                  label="Salary Range (numeric)"
                  value={salaryRangeText}
                />
              )}

              <DetailCard
                icon={<FiCalendar size={14} />}
                label="Scheduled"
                value={scheduled.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />

              {hasEstimatedDuration && durationParts && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Estimated Duration"
                  value={
                    <span>
                      {durationParts.primary}
                      {durationParts.equivalents.length > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 5,
                          }}
                        >
                          (
                          {durationParts.equivalents
                            .map((e) => e.label)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </span>
                  }
                />
              )}

              {(jobPost.estimatedValue || jobPost.estimatedUnit) && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Estimated Time"
                  value={
                    <>
                      {jobPost.estimatedValue || "—"}
                      {jobPost.estimatedUnit && ` ${jobPost.estimatedUnit}`}
                      {jobPost.estimatedHours && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 4,
                          }}
                        >
                          ({jobPost.estimatedHours}h)
                        </span>
                      )}
                    </>
                  }
                />
              )}

              {hasCustomDuration && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Custom Duration"
                  value={customDurationLabel}
                />
              )}

              {hasRecurring && (
                <DetailCard
                  icon={<FiRefreshCw size={14} />}
                  label="Recurring Schedule"
                  value={recurringLabel}
                />
              )}

              {hasProjectDuration && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Project Duration"
                  value={`${jobPost.durationValue} ${jobPost.durationType.toLowerCase()}`}
                />
              )}

              {jobPost.locationType && jobPost.address && (
                <DetailCard
                  icon={<FiMapPin size={14} />}
                  label="Location"
                  value={jobPost.address}
                />
              )}

              {hasCoordinates && (
                <DetailCard
                  icon={<FiNavigation size={14} />}
                  label="Coordinates"
                  value={
                    <a
                      href={`https://www.google.com/maps?q=${jobPost.latitude},${jobPost.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--orange)", textDecoration: "none" }}
                    >
                      {Number(jobPost.latitude).toFixed(5)},{" "}
                      {Number(jobPost.longitude).toFixed(5)}
                      <FiExternalLink
                        size={10}
                        style={{ marginLeft: 4, verticalAlign: "-1px" }}
                      />
                    </a>
                  }
                />
              )}

              <DetailCard
                icon={<FiTag size={14} />}
                label="Status"
                value={sm.label}
              />

              {jobTypeMeta && (
                <DetailCard
                  icon={<JobTypeIcon size={14} />}
                  label="Job Type"
                  value={jobTypeMeta.label}
                />
              )}

              {locationTypeMeta && (
                <DetailCard
                  icon={<LocationTypeIcon size={14} />}
                  label="Work Style"
                  value={locationTypeMeta.label}
                />
              )}

              {jobPost.languageRequirement && (
                <DetailCard
                  icon={<FiLanguage size={14} />}
                  label="Language Required"
                  value={languageLabel}
                />
              )}

              {jobPost.budgetType && budgetTypeLabel && (
                <DetailCard
                  icon={<FiCreditCard size={14} />}
                  label="Payment Type"
                  value={
                    <>
                      {budgetTypeLabel}
                      {jobPost.budgetType === "CUSTOM" &&
                        jobPost.budgetCustomLabel && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginLeft: 4,
                            }}
                          >
                            ({jobPost.budgetCustomLabel})
                          </span>
                        )}
                    </>
                  }
                />
              )}

              {jobPost.currency && (
                <DetailCard
                  icon={<FiDollarSign size={14} />}
                  label="Currency"
                  value={jobPost.currency}
                />
              )}

              {jobPost.sourcePlatform && (
                <DetailCard
                  icon={<FiExternalLink size={14} />}
                  label="Source Platform"
                  value={jobPost.sourcePlatform}
                />
              )}

              {jobPost.expiryDate && (
                <DetailCard
                  icon={<FiCalendar size={14} />}
                  label="Expires"
                  value={new Date(jobPost.expiryDate).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                />
              )}

              {jobPost.createdAt && (
                <DetailCard
                  icon={<FiCalendar size={14} />}
                  label="Posted"
                  value={new Date(jobPost.createdAt).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                />
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              REQUIREMENTS & QUALIFICATIONS (grouped card)
          ═══════════════════════════════════════════════════════ */}
          {hasRequirementsBlock && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiCheckCircle
                  size={14}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Requirements & Qualifications
              </h2>
              <div className={styles.detailGrid}>
                {requirementItems.map((item, i) => (
                  <DetailCard
                    key={i}
                    icon={item.icon}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              HOW TO APPLY — external channels only
          ═══════════════════════════════════════════════════════ */}
          {hasExternalApplyChannels && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>How to Apply</h2>
              <div className={styles.applyChannels}>
                {jobPost.applicationUrl && (
                  <a
                    href={jobPost.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.applyChannel}
                  >
                    <FiLink size={14} />
                    <span>Apply via link</span>
                  </a>
                )}
                {jobPost.applicationEmail && (
                  <a
                    href={`mailto:${jobPost.applicationEmail}`}
                    className={styles.applyChannel}
                  >
                    <FiMail size={14} />
                    <span>{jobPost.applicationEmail}</span>
                  </a>
                )}
                {jobPost.applicationWhatsApp && (
                  <a
                    href={`https://wa.me/${jobPost.applicationWhatsApp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.applyChannel}
                  >
                    <FiMessageCircle size={14} />
                    <span>{jobPost.applicationWhatsApp}</span>
                  </a>
                )}
                {jobPost.applicationPhone && (
                  <a
                    href={`tel:${jobPost.applicationPhone}`}
                    className={styles.applyChannel}
                  >
                    <FiPhone size={14} />
                    <span>{jobPost.applicationPhone}</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              APPLY (worker only, job open)
          ═══════════════════════════════════════════════════════ */}
          {isWorker && isOpen && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Apply for this Job</h2>
              {hasApplied ? (
                <div className={styles.appliedBanner}>
                  <FiCheckCircle size={16} />
                  <p>
                    You've already applied to this job. The hirer will review
                    your application.
                  </p>
                </div>
              ) : showForm ? (
                <form className={styles.applyForm} onSubmit={handleApply}>
                  <label className={styles.applyLabel}>
                    Message to Hirer{" "}
                    <span className={styles.optional}>(optional)</span>
                  </label>
                  <textarea
                    className={styles.applyTextarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself, explain your experience with this type of job..."
                    rows={4}
                  />
                  <div className={styles.applyActions}>
                    <button
                      type="submit"
                      className={styles.applyBtn}
                      disabled={applying}
                    >
                      {applying ? (
                        <>
                          <span className={styles.spinner} /> Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.cancelApplyBtn}
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className={styles.applyTriggerBtn}
                  onClick={() => setShowForm(true)}
                >
                  <FiSend size={15} /> Apply Now
                </button>
              )}
              <ReportButton
                targetType="JOB_POST"
                targetId={job.id}
                targetName={job.title}
              />
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              MANAGE (owner only)
          ═══════════════════════════════════════════════════════ */}
          {isOwner && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Manage Job</h2>
              <div className={styles.manageActions}>
                <Link
                  to={`/jobs/${id}/applications`}
                  className={styles.manageBtn}
                >
                  <FiUsers size={14} /> View Applications (
                  {jobPost._count?.applications || 0})
                </Link>
                {isOpen && (
                  <>
                    <button
                      className={styles.manageBtnFilled}
                      onClick={() => handleStatusUpdate("FILLED")}
                    >
                      Mark as Filled
                    </button>
                    <button
                      className={styles.manageBtnCancel}
                      onClick={() => handleStatusUpdate("CANCELLED")}
                    >
                      Cancel Job
                    </button>
                  </>
                )}
                {!isOpen && (
                  <button
                    className={styles.manageBtnReopen}
                    onClick={() => handleStatusUpdate("OPEN")}
                  >
                    Reopen Job
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            SIDEBAR
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.sidebar}>
          <div className={styles.hirerCard}>
            <p className={styles.hirerCardLabel}>Posted by</p>
            <div className={styles.hirerAvatar}>
              {jobPost.hirer?.avatar ? (
                <img src={jobPost.hirer.avatar} alt="" />
              ) : (
                <span>
                  {jobPost.hirer?.firstName?.[0]}
                  {jobPost.hirer?.lastName?.[0]}
                </span>
              )}
            </div>
            <p className={styles.hirerName}>
              {jobPost.hirer?.firstName} {jobPost.hirer?.lastName}
            </p>
            {(companyDisplay || jobPost.hirer?.hirerProfile?.companyName) && (
              <p className={styles.hirerCompany}>
                {companyDisplay || jobPost.hirer?.hirerProfile?.companyName}
              </p>
            )}
            {(jobPost.hirer?.city || jobPost.hirer?.country) && (
              <p className={styles.hirerLocation}>
                <FiMapPin size={11} />{" "}
                {[jobPost.hirer.city, jobPost.hirer.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <div className={styles.hirerStats}>
              {jobPost.hirer?.hirerProfile?.totalHires > 0 && (
                <span>{jobPost.hirer.hirerProfile.totalHires} hires</span>
              )}
              {jobPost.hirer?.hirerProfile?.avgRating > 0 && (
                <span>★ {jobPost.hirer.hirerProfile.avgRating.toFixed(1)}</span>
              )}
            </div>
            <Link
              to={`/hirers/${jobPost.hirer?.id}`}
              className={styles.viewHirerBtn}
            >
              View Profile <FiArrowRight size={12} />
            </Link>
          </div>

          <div className={styles.quickFacts}>
            <p className={styles.quickFactsTitle}>Quick Facts</p>

            {mainPaymentText !== "—" && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>{mainPaymentLabel}</span>
                <span
                  className={styles.factValue}
                  style={{ color: "var(--orange)" }}
                >
                  {mainPaymentText}
                </span>
              </div>
            )}

            {jobPost.category?.name && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Category</span>
                <span className={styles.factValue}>
                  {jobPost.category.name}
                </span>
              </div>
            )}

            <div className={styles.factRow}>
              <span className={styles.factLabel}>Applicants</span>
              <span className={styles.factValue}>
                {jobPost._count?.applications || 0}
              </span>
            </div>

            <div className={styles.factRow}>
              <span className={styles.factLabel}>Status</span>
              <span
                className={`${styles.factBadge} ${styles[`status_${sm.color}`]}`}
              >
                {sm.label}
              </span>
            </div>

            {jobTypeMeta && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Job Type</span>
                <span className={styles.factValue}>{jobTypeMeta.label}</span>
              </div>
            )}

            {locationTypeMeta && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Work Style</span>
                <span className={styles.factValue}>
                  {locationTypeMeta.label}
                </span>
              </div>
            )}

            {jobPost.skills?.length > 0 && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Skills</span>
                <span className={styles.factValue}>
                  {jobPost.skills.length} required
                </span>
              </div>
            )}

            {qualificationsList.length > 0 && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Qualifications</span>
                <span className={styles.factValue}>
                  {qualificationsList.length} required
                </span>
              </div>
            )}

            {jobPost.languageRequirement && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Language</span>
                <span className={styles.factValue}>{languageLabel}</span>
              </div>
            )}

            {hasWorkConditions && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Includes</span>
                <span className={styles.factValue}>
                  {[
                    jobPost.providesAccommodation && "Accommodation",
                    jobPost.providesMeals && "Meals",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}

            {hasProjectDuration && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Project Duration</span>
                <span className={styles.factValue}>
                  {jobPost.durationValue} {jobPost.durationType.toLowerCase()}
                </span>
              </div>
            )}

            {hasEstimatedDuration && durationParts && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Est. Duration</span>
                <span className={styles.factValue}>
                  {durationParts.primary}
                  {durationParts.equivalents[0] && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        marginLeft: 4,
                      }}
                    >
                      ({durationParts.equivalents[0].label})
                    </span>
                  )}
                </span>
              </div>
            )}

            {hasRecurring && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Recurring</span>
                <span className={styles.factValue}>{recurringLabel}</span>
              </div>
            )}

            {hasCustomDuration && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Duration</span>
                <span className={styles.factValue}>{customDurationLabel}</span>
              </div>
            )}

            {jobPost.experienceLevel && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Experience</span>
                <span className={styles.factValue}>
                  {jobPost.experienceLevel}
                </span>
              </div>
            )}

            {educationLevelLabel && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Education</span>
                <span className={styles.factValue}>{educationLevelLabel}</span>
              </div>
            )}

            {jobPost.applicantLocation && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Preferred Location</span>
                <span className={styles.factValue}>
                  {jobPost.applicantLocation}
                </span>
              </div>
            )}

            {jobPost.expiryDate && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Expires</span>
                <span className={styles.factValue}>
                  {new Date(jobPost.expiryDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {!user && (
            <div className={styles.guestCta}>
              <p>Sign in as a worker to apply for this job.</p>
              <Link to="/login" className={styles.guestCtaBtn}>
                Sign In to Apply
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }) {
  return (
    <div className={styles.metaItem}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function DetailCard({ icon, label, value, accent }) {
  return (
    <div className={styles.detailCard}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <p className={styles.detailLabel}>{label}</p>
        <p
          className={`${styles.detailValue} ${accent ? styles.detailAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Alert({ type, text, onClose }) {
  const Icon = type === "error" ? FiAlertTriangle : FiCheckCircle;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon size={14} /> {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        <FiX size={14} />
      </button>
    </div>
  );
}

function timeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function JobSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skBack} />
      <div className={styles.layout}>
        <div className={styles.skMain} />
        <div className={styles.skSide} />
      </div>
    </div>
  );
}
