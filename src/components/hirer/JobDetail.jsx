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
  FiMoon,
  FiLayers,
  FiShuffle,
  // ── NEW icons for the external-style fields ──
  FiAward,
  FiBookOpen,
  FiLink,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiTrendingUp,
  FiCheckSquare,
  FiAlignLeft,
  FiExternalLink,
} from "react-icons/fi";

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
    api
      .get(`/jobs/${id}`)
      .then((res) => {
        setJob(res.data.data);
        setIsSaved(res.data.data.isSaved || false);
        setLoading(false);
      })
      .catch(() => {
        setError("Job not found.");
        setLoading(false);
      });
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
    CUSTOM: { icon: FiEdit3, label: "Custom" },
  }[jobPost.budgetType];

  const salaryPeriodLabel = {
    HOURLY: "Per Hour",
    DAILY: "Per Day",
    WEEKLY: "Per Week",
    MONTHLY: "Per Month",
    YEARLY: "Per Year",
  }[jobPost.salaryPeriod];

  const educationLevelLabel = {
    HIGH_SCHOOL: "High School",
    DIPLOMA: "Diploma",
    BACHELOR: "Bachelor's Degree",
    MASTER: "Master's Degree",
    DOCTORATE: "Doctorate",
    CERTIFICATION: "Certification",
    OTHER: "Other",
  }[jobPost.educationLevel];

  const JobTypeIcon = jobTypeMeta?.icon;
  const LocationTypeIcon = locationTypeMeta?.icon;
  const BudgetTypeIcon = budgetTypeMeta?.icon;

  // ── Derived: whether to show a link-based application channel ─────────
  const hasExternalApplyChannels =
    jobPost.applicationUrl ||
    jobPost.applicationEmail ||
    jobPost.applicationWhatsApp ||
    jobPost.applicationPhone;

  const hasSalaryRange =
    jobPost.salaryAmount ||
    jobPost.salaryMin ||
    jobPost.salaryMax ||
    jobPost.salaryText;

  const hasRequirementsBlock =
    jobPost.responsibilities ||
    jobPost.requirements ||
    jobPost.minQualification ||
    jobPost.experienceLevel ||
    jobPost.experienceLength ||
    jobPost.educationLevel ||
    jobPost.languageRequirement ||
    jobPost.workingHours ||
    jobPost.applicantLocation;

  // Formatted salary range for display
  let salaryRangeText = null;
  if (jobPost.salaryText) {
    salaryRangeText = jobPost.salaryText;
  } else if (jobPost.salaryMin && jobPost.salaryMax) {
    const cur = jobPost.salaryCurrency || jobPost.currency || "";
    salaryRangeText = `${cur} ${Number(jobPost.salaryMin).toLocaleString()} – ${Number(jobPost.salaryMax).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  } else if (jobPost.salaryAmount) {
    const cur = jobPost.salaryCurrency || jobPost.currency || "";
    salaryRangeText = `${cur} ${Number(jobPost.salaryAmount).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  }

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
          <div className={styles.headerCard}>
            <div className={styles.headerTop}>
              <div className={styles.categoryChip}>
                {jobPost.category?.icon && <span>{jobPost.category.icon}</span>}
                {jobPost.category?.name}
              </div>
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

            {/* Company name (external-style only) — rendered above title if present */}
            {jobPost.companyName && (
              <p className={styles.jobCompany}>{jobPost.companyName}</p>
            )}

            <h1 className={styles.jobTitle}>{jobPost.title}</h1>

            {(jobPost.jobType ||
              jobPost.locationType ||
              jobPost.budgetType) && (
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
              <MetaItem icon={<FiMapPin size={12} />} text={jobPost.address} />
              <DurationBadge job={jobPost} size="sm" />
              <MetaItem
                icon={<FiCalendar size={12} />}
                text={`Posted ${timeAgo(new Date(jobPost.createdAt))}`}
              />
            </div>

            <div className={styles.budgetBlock}>
              {/* Prefer salaryText / salary range when provided, fallback to budget */}
              <span className={styles.budgetAmount}>
                {jobPost.salaryText ? (
                  jobPost.salaryText
                ) : (
                  <>
                    {jobPost.currency}{" "}
                    {parseFloat(jobPost.budget).toLocaleString()}
                  </>
                )}
              </span>
              <span className={styles.budgetLabel}>
                {jobPost.salaryText ? "Salary" : "Budget"}
              </span>
              <span className={styles.applicantCount}>
                <FiUsers size={12} /> {jobPost._count?.applications || 0}{" "}
                applicant
                {jobPost._count?.applications !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Job Description</h2>
            <p className={styles.description}>{jobPost.description}</p>
            {jobPost.notes && (
              <div className={styles.notes}>
                <FiFileText size={14} />
                <p>{jobPost.notes}</p>
              </div>
            )}
          </section>

          {/* ── NEW: Responsibilities (only if present) ── */}
          {jobPost.responsibilities && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Responsibilities</h2>
              <p className={styles.description}>{jobPost.responsibilities}</p>
            </section>
          )}

          {/* ── NEW: Requirements (only if present) ── */}
          {jobPost.requirements && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Requirements</h2>
              <p className={styles.description}>{jobPost.requirements}</p>
            </section>
          )}

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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Details</h2>
            <div className={styles.detailGrid}>
              <DetailCard
                icon={<FiFileText size={14} />}
                label="Category"
                value={jobPost.category?.name || "—"}
              />
              <DetailCard
                icon={<FiDollarSign size={14} />}
                label={jobPost.salaryText ? "Salary" : "Budget"}
                value={
                  jobPost.salaryText
                    ? jobPost.salaryText
                    : `${jobPost.currency} ${parseFloat(jobPost.budget).toLocaleString()}`
                }
                accent
              />
              <DetailCard
                icon={<FiCalendar size={14} />}
                label="Scheduled"
                value={scheduled.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              {formatJobDurationParts(jobPost) && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Est. Duration"
                  value={
                    <span>
                      {formatJobDurationParts(jobPost).primary}
                      {formatJobDurationParts(jobPost).equivalents.length >
                        0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 5,
                          }}
                        >
                          (
                          {formatJobDurationParts(jobPost)
                            .equivalents.map((e) => e.label)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              <DetailCard
                icon={<FiMapPin size={14} />}
                label="Location"
                value={jobPost.address}
              />
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
              {jobPost.budgetType && budgetTypeMeta && (
                <DetailCard
                  icon={<FiCreditCard size={14} />}
                  label="Payment Type"
                  value={
                    {
                      FIXED: "Fixed Price",
                      HOURLY: "Per Hour",
                      DAILY: "Per Day",
                      WEEKLY: "Per Week",
                      MONTHLY: "Per Month",
                      CUSTOM: "Custom",
                    }[jobPost.budgetType] ?? jobPost.budgetType
                  }
                />
              )}
              {jobPost.durationValue && jobPost.durationType && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Job Duration"
                  value={`${jobPost.durationValue} ${jobPost.durationType.toLowerCase()}`}
                />
              )}

              {/* ── NEW: Salary range detail card ── */}
              {salaryRangeText && jobPost.salaryText && (
                <DetailCard
                  icon={<FiDollarSign size={14} />}
                  label="Salary Range"
                  value={salaryRangeText}
                />
              )}

              {/* ── NEW: Experience Level ── */}
              {jobPost.experienceLevel && (
                <DetailCard
                  icon={<FiTrendingUp size={14} />}
                  label="Experience"
                  value={
                    jobPost.experienceLength
                      ? `${jobPost.experienceLevel} · ${jobPost.experienceLength}`
                      : jobPost.experienceLevel
                  }
                />
              )}

              {/* ── NEW: Minimum Qualification ── */}
              {jobPost.minQualification && (
                <DetailCard
                  icon={<FiAward size={14} />}
                  label="Min. Qualification"
                  value={jobPost.minQualification}
                />
              )}

              {/* ── NEW: Education Level ── */}
              {educationLevelLabel && (
                <DetailCard
                  icon={<FiBookOpen size={14} />}
                  label="Education"
                  value={educationLevelLabel}
                />
              )}

              {/* ── NEW: Language Requirement ── */}
              {jobPost.languageRequirement && (
                <DetailCard
                  icon={<FiGlobe size={14} />}
                  label="Language"
                  value={jobPost.languageRequirement}
                />
              )}

              {/* ── NEW: Working Hours ── */}
              {jobPost.workingHours && (
                <DetailCard
                  icon={<FiClock size={14} />}
                  label="Working Hours"
                  value={jobPost.workingHours}
                />
              )}

              {/* ── NEW: Applicant Location ── */}
              {jobPost.applicantLocation && (
                <DetailCard
                  icon={<FiMapPin size={14} />}
                  label="Applicant Location"
                  value={jobPost.applicantLocation}
                />
              )}

              {/* ── NEW: Expiry Date ── */}
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

              {/* ── NEW: Source Platform ── */}
              {jobPost.sourcePlatform && (
                <DetailCard
                  icon={<FiExternalLink size={14} />}
                  label="Source"
                  value={jobPost.sourcePlatform}
                />
              )}
            </div>
          </section>

          {/* ── NEW: How to Apply (external channels only) ── */}
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
            {jobPost.hirer?.hirerProfile?.companyName && (
              <p className={styles.hirerCompany}>
                {jobPost.hirer.hirerProfile.companyName}
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
            <div className={styles.factRow}>
              <span className={styles.factLabel}>
                {jobPost.salaryText ? "Salary" : "Budget"}
              </span>
              <span
                className={styles.factValue}
                style={{ color: "var(--orange)" }}
              >
                {jobPost.salaryText
                  ? jobPost.salaryText
                  : `${jobPost.currency} ${parseFloat(jobPost.budget).toLocaleString()}`}
              </span>
            </div>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>Category</span>
              <span className={styles.factValue}>{jobPost.category?.name}</span>
            </div>
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
            {jobPost.durationValue && jobPost.durationType && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Duration</span>
                <span className={styles.factValue}>
                  {jobPost.durationValue} {jobPost.durationType.toLowerCase()}
                </span>
              </div>
            )}
            {formatJobDurationParts(jobPost) && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Duration</span>
                <span className={styles.factValue}>
                  {formatJobDurationParts(jobPost).primary}
                  {formatJobDurationParts(jobPost).equivalents[0] && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        marginLeft: 4,
                      }}
                    >
                      ({formatJobDurationParts(jobPost).equivalents[0].label})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* ── NEW: Quick fact for experience level ── */}
            {jobPost.experienceLevel && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Experience</span>
                <span className={styles.factValue}>
                  {jobPost.experienceLevel}
                </span>
              </div>
            )}

            {/* ── NEW: Quick fact for education level ── */}
            {educationLevelLabel && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Education</span>
                <span className={styles.factValue}>{educationLevelLabel}</span>
              </div>
            )}

            {/* ── NEW: Quick fact for applicant location ── */}
            {jobPost.applicantLocation && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Preferred Location</span>
                <span className={styles.factValue}>
                  {jobPost.applicantLocation}
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
