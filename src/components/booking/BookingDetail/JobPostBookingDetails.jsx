// src/components/booking/BookingDetail/JobPostBookingDetails.jsx
//
// Renders the job-post payload on a booking that originated from a job post.
// Mirrors JobDetail.jsx field-for-field and label-for-label, so the hirer/
// worker see exactly what the job post originally displayed.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../../lib/api";
import { formatJobDurationParts } from "../../utils/formatDuration";
import {
  FaBriefcase,
  FaClock,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlobe,
  FaRandom,
  FaDollarSign,
  FaCreditCard,
  FaTag,
  FaAward,
  FaHome,
  FaCoffee,
  FaLink,
  FaEnvelope,
  FaWhatsapp,
  FaPhone,
  FaFileAlt,
  FaListAlt,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaLocationArrow,
  FaBookOpen,
  FaChartLine as FaTrendingUpAlias,
  FaAlignLeft,
} from "react-icons/fa";

// ── Lookup maps (identical to JobDetail.jsx) ──────────────────────────
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

const JOB_TYPE_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
};

const LOCATION_TYPE_LABEL = {
  REMOTE: "Remote",
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
};

const LOCATION_TYPE_ICON = {
  REMOTE: FaGlobe,
  ON_SITE: FaMapMarkerAlt,
  HYBRID: FaRandom,
};

// ── Notes parsing (identical to JobDetail.jsx) ────────────────────────
function parseRecurring(notes) {
  if (!notes) return null;
  const m = notes.match(/Recurring:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}
function parseCustomDuration(notes) {
  if (!notes) return null;
  const m = notes.match(/Duration:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}
function stripSystemNotes(notes) {
  if (!notes) return notes;
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
}

// ── Small detail card (mirrors BookingDetail.module.css classes) ──────
function DetailCard({ icon, label, value, accent, full }) {
  return (
    <div
      className={`${styles.detailCard} ${full ? styles.detailCardFull : ""}`}
    >
      <span className={styles.detailCardIcon}>{icon}</span>
      <div className={styles.detailCardBody}>
        <p className={styles.detailCardLabel}>{label}</p>
        <p
          className={`${styles.detailCardValue} ${accent ? styles.detailAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function JobPostBookingDetails({ booking }) {
  if (!booking) return null;

  // ── Fetch the original job post so we render its full field set ──
  const [jobPost, setJobPost] = useState(booking.jobPost || null);
  const [loadingJob, setLoadingJob] = useState(!booking.jobPost);

  useEffect(() => {
    if (!booking?.jobPostId) return;
    if (booking.jobPost) {
      setJobPost(booking.jobPost);
      setLoadingJob(false);
      return;
    }
    let cancelled = false;
    setLoadingJob(true);
    api
      .get(`/jobs/${booking.jobPostId}`)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data.data;
        setJobPost(payload?.jobPost ?? payload);
      })
      .catch(() => {
        if (!cancelled) setJobPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingJob(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking?.jobPostId, booking?.jobPost]);

  // ── Merge: booking wins, jobPost fills gaps ────────────────────────
  const jp = jobPost || {};
  const merged = {
    // Core
    title: booking.title || jp.title,
    description: booking.description || jp.description,

    // Location
    locationType: booking.locationType || jp.locationType,
    address: booking.address || jp.address,
    latitude: booking.latitude ?? jp.latitude,
    longitude: booking.longitude ?? jp.longitude,

    // Meta
    jobType: booking.jobType || jp.jobType,
    scheduledAt: booking.scheduledAt || jp.scheduledAt,

    // Duration — read from both sides, prefer whichever has data
    estimatedHours: booking.estimatedHours ?? jp.estimatedHours,
    estimatedUnit: booking.estimatedUnit || jp.estimatedUnit || "hours",
    estimatedValue: booking.estimatedValue || jp.estimatedValue,
    durationValue: booking.durationValue || jp.durationValue,
    durationType: booking.durationType || jp.durationType,

    // Extras
    skills:
      Array.isArray(booking.skills) && booking.skills.length
        ? booking.skills
        : Array.isArray(jp.skills)
          ? jp.skills
          : [],
    qualifications:
      Array.isArray(booking.qualifications) && booking.qualifications.length
        ? booking.qualifications
        : Array.isArray(jp.qualifications)
          ? jp.qualifications
          : [],
    requirements: booking.requirements || jp.requirements,
    responsibilities: booking.responsibilities || jp.responsibilities,
    notes: booking.notes || jp.notes,

    // Work conditions
    providesAccommodation:
      booking.providesAccommodation ?? jp.providesAccommodation ?? false,
    providesMeals: booking.providesMeals ?? jp.providesMeals ?? false,

    // Language
    languageRequirement: booking.languageRequirement || jp.languageRequirement,

    // Payment / category / experience — booking may not carry these,
    // so we always read from the job post.
    currency: booking.currency || jp.currency,
    budgetType: booking.jobRateSnapshot?.budgetType || jp.budgetType || "FIXED",
    budget: jp.budget,
    salaryText: jp.salaryText,
    salaryAmount: jp.salaryAmount,
    salaryMin: jp.salaryMin,
    salaryMax: jp.salaryMax,
    salaryCurrency: jp.salaryCurrency,
    salaryPeriod: jp.salaryPeriod,
    budgetCustomLabel: jp.budgetCustomLabel,

    // Category (from jobPost include)
    category: jp.category,

    // Requirements block
    minQualification: jp.minQualification,
    experienceLevel: jp.experienceLevel,
    experienceLength: jp.experienceLength,
    educationLevel: jp.educationLevel,
    workingHours: jp.workingHours,
    applicantLocation: jp.applicantLocation,

    // Apply channels
    applicationUrl: jp.applicationUrl,
    applicationEmail: jp.applicationEmail,
    applicationWhatsApp: jp.applicationWhatsApp,
    applicationPhone: jp.applicationPhone,
    sourcePlatform: jp.sourcePlatform,
    companyName: jp.companyName,

    // Lifecycle
    expiryDate: jp.expiryDate,
    createdAt: jp.createdAt,
  };

  // ── Derived (identical logic to JobDetail.jsx) ─────────────────────
  const LocationIcon = LOCATION_TYPE_ICON[merged.locationType];

  const languageLabel = merged.languageRequirement
    ? ALL_LANGUAGES.find((l) => l.code === merged.languageRequirement)?.label ||
      merged.languageRequirement.toUpperCase()
    : null;

  const recurringLabel = parseRecurring(merged.notes);
  const customDurationLabel = parseCustomDuration(merged.notes);
  const cleanNotes = stripSystemNotes(merged.notes);

  const durationParts = formatJobDurationParts({
    estimatedUnit: merged.estimatedUnit,
    estimatedValue: merged.estimatedValue,
    estimatedHours: merged.estimatedHours,
  });
  const hasEstimatedDuration = !!(durationParts || merged.estimatedHours);
  const hasProjectDuration = !!(merged.durationValue && merged.durationType);
  const hasRecurring = !!recurringLabel;
  const hasCustomDuration = !!customDurationLabel;

  const salaryPeriodLabel = SALARY_PERIOD_LABELS[merged.salaryPeriod];
  const educationLevelLabel = EDUCATION_LEVEL_LABELS[merged.educationLevel];
  const budgetTypeLabel = BUDGET_TYPE_LABELS[merged.budgetType];

  const hasSalaryText = !!merged.salaryText;
  const hasSalaryRange = !!(
    merged.salaryAmount ||
    merged.salaryMin ||
    merged.salaryMax
  );
  const hasBudget = merged.budget !== null && merged.budget !== undefined;

  let salaryRangeText = null;
  if (merged.salaryMin && merged.salaryMax) {
    const cur = merged.salaryCurrency || merged.currency || "";
    salaryRangeText = `${cur} ${Number(merged.salaryMin).toLocaleString()} – ${Number(merged.salaryMax).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  } else if (merged.salaryAmount) {
    const cur = merged.salaryCurrency || merged.currency || "";
    salaryRangeText = `${cur} ${Number(merged.salaryAmount).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  }

  const mainPaymentText = hasSalaryText
    ? merged.salaryText
    : hasSalaryRange
      ? salaryRangeText
      : hasBudget
        ? `${merged.currency} ${parseFloat(merged.budget).toLocaleString()}`
        : "—";

  const mainPaymentLabel = hasSalaryText
    ? "Salary"
    : hasSalaryRange
      ? "Salary Range"
      : "Budget";

  const budgetSuffix =
    merged.budgetType && merged.budgetType !== "FIXED"
      ? merged.budgetType === "CUSTOM"
        ? merged.budgetCustomLabel
          ? ` · ${merged.budgetCustomLabel}`
          : " · Custom"
        : ` · ${BUDGET_TYPE_LABELS[merged.budgetType] || merged.budgetType}`
      : " total";

  const hasCoordinates =
    merged.latitude != null &&
    merged.longitude != null &&
    merged.locationType !== "REMOTE";

  const hasWorkConditions =
    merged.providesAccommodation || merged.providesMeals;

  const qualificationsList = Array.isArray(merged.qualifications)
    ? merged.qualifications.filter(
        (q) => typeof q === "string" && q.trim().length > 0,
      )
    : [];

  const requirementItems = [
    merged.minQualification && {
      icon: <FaAward size={14} />,
      label: "Minimum Qualification",
      value: merged.minQualification,
    },
    merged.experienceLevel && {
      icon: <FaTrendingUpAlias size={14} />,
      label: "Experience Level",
      value: merged.experienceLength
        ? `${merged.experienceLevel} · ${merged.experienceLength}`
        : merged.experienceLevel,
    },
    merged.experienceLength &&
      !merged.experienceLevel && {
        icon: <FaTrendingUpAlias size={14} />,
        label: "Experience Length",
        value: merged.experienceLength,
      },
    educationLevelLabel && {
      icon: <FaBookOpen size={14} />,
      label: "Education Level",
      value: educationLevelLabel,
    },
    languageLabel && {
      icon: <FaGlobe size={14} />,
      label: "Language",
      value: languageLabel,
    },
    merged.workingHours && {
      icon: <FaClock size={14} />,
      label: "Working Hours",
      value: merged.workingHours,
    },
    merged.applicantLocation && {
      icon: <FaMapMarkerAlt size={14} />,
      label: "Preferred Applicant Location",
      value: merged.applicantLocation,
    },
  ].filter(Boolean);

  const hasRequirementsBlock = requirementItems.length > 0;

  const hasExternalApplyChannels = !!(
    merged.applicationUrl ||
    merged.applicationEmail ||
    merged.applicationWhatsApp ||
    merged.applicationPhone
  );

  return (
    <>
      {/* DESCRIPTION — identical to JobDetail.jsx */}
      {merged.description && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Job Description</h2>
          <p className={styles.description}>{merged.description}</p>
          {cleanNotes && (
            <div className={styles.notes}>
              <span className={styles.notesIcon}>
                <FaFileAlt size={14} />
              </span>
              <p>{cleanNotes}</p>
            </div>
          )}
        </section>
      )}

      {/* RESPONSIBILITIES — identical */}
      {merged.responsibilities && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaAlignLeft
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Responsibilities
          </h2>
          <p className={styles.description}>{merged.responsibilities}</p>
        </section>
      )}

      {/* REQUIREMENTS — identical */}
      {merged.requirements && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaClipboardCheck
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Requirements
          </h2>
          <p className={styles.description}>{merged.requirements}</p>
        </section>
      )}

      {/* REQUIRED SKILLS — identical */}
      {merged.skills?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Required Skills</h2>
          <div className={styles.skillsWrap}>
            {merged.skills.map((skill, i) => (
              <span key={i} className={styles.skillChip}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* REQUIRED QUALIFICATIONS — identical */}
      {qualificationsList.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaAward
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Required Qualifications
          </h2>
          <div className={styles.skillsWrap}>
            {qualificationsList.map((qual, i) => (
              <span key={i} className={styles.skillChip}>
                <FaAward
                  size={11}
                  style={{ marginRight: 4, verticalAlign: "-1px" }}
                />
                {qual}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* WORK CONDITIONS — identical */}
      {hasWorkConditions && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaHome
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Work Conditions
          </h2>
          <div className={styles.detailGrid}>
            {merged.providesAccommodation && (
              <DetailCard
                icon={<FaHome size={14} />}
                label="Accommodation"
                value="Provided"
              />
            )}
            {merged.providesMeals && (
              <DetailCard
                icon={<FaCoffee size={14} />}
                label="Meals"
                value="Provided"
              />
            )}
          </div>
        </section>
      )}

      {/* DETAILS GRID — identical to JobDetail.jsx */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <div className={styles.detailGrid}>
          {merged.category?.name && (
            <DetailCard
              icon={<FaFileAlt size={14} />}
              label="Category"
              value={
                <>
                  {merged.category.icon ? `${merged.category.icon} ` : ""}
                  {merged.category.name}
                </>
              }
            />
          )}

          {mainPaymentText !== "—" && (
            <DetailCard
              icon={<FaDollarSign size={14} />}
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
              icon={<FaDollarSign size={14} />}
              label="Salary Range (numeric)"
              value={salaryRangeText}
            />
          )}

          {merged.scheduledAt && (
            <DetailCard
              icon={<FaCalendarAlt size={14} />}
              label="Scheduled"
              value={new Date(merged.scheduledAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}

          {/* ★ Estimated Duration — the field you said was missing */}
          {hasEstimatedDuration && durationParts && (
            <DetailCard
              icon={<FaClock size={14} />}
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
                      {durationParts.equivalents.map((e) => e.label).join(", ")}
                      )
                    </span>
                  )}
                </span>
              }
            />
          )}

          {hasCustomDuration && (
            <DetailCard
              icon={<FaClock size={14} />}
              label="Custom Duration"
              value={customDurationLabel}
            />
          )}

          {hasRecurring && (
            <DetailCard
              icon={<FaSyncAlt size={14} />}
              label="Recurring Schedule"
              value={recurringLabel}
            />
          )}

          {hasProjectDuration && (
            <DetailCard
              icon={<FaClock size={14} />}
              label="Project Duration"
              value={`${merged.durationValue} ${String(merged.durationType).toLowerCase()}`}
            />
          )}

          {merged.locationType && merged.address && (
            <DetailCard
              icon={<FaMapMarkerAlt size={14} />}
              label="Location"
              value={merged.address}
            />
          )}

          {hasCoordinates && (
            <DetailCard
              icon={<FaLocationArrow size={14} />}
              label="Coordinates"
              value={
                <a
                  href={`https://www.google.com/maps?q=${merged.latitude},${merged.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--orange)", textDecoration: "none" }}
                >
                  {Number(merged.latitude).toFixed(5)},{" "}
                  {Number(merged.longitude).toFixed(5)}
                  <FaExternalLinkAlt
                    size={10}
                    style={{ marginLeft: 4, verticalAlign: "-1px" }}
                  />
                </a>
              }
            />
          )}

          <DetailCard
            icon={<FaTag size={14} />}
            label="Status"
            value="Booked"
          />

          {merged.jobType && (
            <DetailCard
              icon={<FaBriefcase size={14} />}
              label="Job Type"
              value={JOB_TYPE_LABEL[merged.jobType] || merged.jobType}
            />
          )}

          {merged.locationType && LocationIcon && (
            <DetailCard
              icon={<LocationIcon size={14} />}
              label="Work Style"
              value={
                LOCATION_TYPE_LABEL[merged.locationType] || merged.locationType
              }
            />
          )}

          {languageLabel && (
            <DetailCard
              icon={<FaGlobe size={14} />}
              label="Language Required"
              value={languageLabel}
            />
          )}

          {merged.budgetType && budgetTypeLabel && (
            <DetailCard
              icon={<FaCreditCard size={14} />}
              label="Payment Type"
              value={
                <>
                  {budgetTypeLabel}
                  {merged.budgetType === "CUSTOM" &&
                    merged.budgetCustomLabel && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginLeft: 4,
                        }}
                      >
                        ({merged.budgetCustomLabel})
                      </span>
                    )}
                </>
              }
            />
          )}

          {merged.currency && (
            <DetailCard
              icon={<FaDollarSign size={14} />}
              label="Currency"
              value={merged.currency}
            />
          )}

          {merged.sourcePlatform && (
            <DetailCard
              icon={<FaExternalLinkAlt size={14} />}
              label="Source Platform"
              value={merged.sourcePlatform}
            />
          )}

          {merged.expiryDate && (
            <DetailCard
              icon={<FaCalendarAlt size={14} />}
              label="Expires"
              value={new Date(merged.expiryDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}

          {merged.createdAt && (
            <DetailCard
              icon={<FaCalendarAlt size={14} />}
              label="Posted"
              value={new Date(merged.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}
        </div>
      </section>

      {/* REQUIREMENTS & QUALIFICATIONS grouped — identical */}
      {hasRequirementsBlock && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaClipboardCheck
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Requirements
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

      {/* HOW TO APPLY — identical */}
      {hasExternalApplyChannels && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How to Apply</h2>
          <div className={styles.channelRow}>
            {merged.applicationUrl && (
              <a
                href={merged.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelPill}
              >
                <FaLink size={12} /> Apply via link
              </a>
            )}
            {merged.applicationEmail && (
              <a
                href={`mailto:${merged.applicationEmail}`}
                className={styles.channelPill}
              >
                <FaEnvelope size={12} /> {merged.applicationEmail}
              </a>
            )}
            {merged.applicationWhatsApp && (
              <a
                href={`https://wa.me/${String(merged.applicationWhatsApp).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelPill}
              >
                <FaWhatsapp size={12} /> {merged.applicationWhatsApp}
              </a>
            )}
            {merged.applicationPhone && (
              <a
                href={`tel:${merged.applicationPhone}`}
                className={styles.channelPill}
              >
                <FaPhone size={12} /> {merged.applicationPhone}
              </a>
            )}
          </div>
        </section>
      )}
    </>
  );
}
