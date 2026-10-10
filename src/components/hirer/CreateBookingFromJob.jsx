// src/components/hirer/CreateBookingFromJob.jsx
import { useState, useEffect, useMemo } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import HirerLayout from "../layout/HirerLayout";
import api from "../../lib/api";
import styles from "./CreateBookingFromJob.module.css";
import {
  FiChevronLeft,
  FiLock,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiBriefcase,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiDollarSign,
  FiTrendingUp,
  FiLayers,
  FiCheckSquare,
  FiSearch,
  FiInfo,
  FiGlobe,
  FiHome,
  FiCoffee,
  FiAward,
  FiUser,
  FiUsers,
  FiRefreshCw,
} from "react-icons/fi";

// ── Static lookups (mirror backend enums) ──────────────────────────────────
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
  REMOTE: FiGlobe,
  ON_SITE: FiMapPin,
  HYBRID: FiRefreshCw,
};

const BUDGET_TYPE_LABEL = {
  FIXED: "Fixed Price",
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
};

// Singular form for "per month" / "per week" etc.
const BUDGET_TYPE_PERIOD_LABEL = {
  HOURLY: "per hour",
  DAILY: "per day",
  WEEKLY: "per week",
  MONTHLY: "per month",
  YEARLY: "per year",
};

// The unit noun used for a given budget type ("Month" → "month")
const BUDGET_TYPE_UNIT = {
  HOURLY: "hours",
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};

const RATE_OPTION_LABEL = {
  budget: "Job Budget",
  salaryAmount: "Salary Amount",
  salaryMin: "Salary (Minimum)",
  salaryMax: "Salary (Maximum)",
  salaryText: "Salary Headline",
};

// Plural / singular noun forms for the multiplier line
const DURATION_UNIT_NOUN = {
  hours: ["hour", "hours"],
  days: ["day", "days"],
  weeks: ["week", "weeks"],
  months: ["month", "months"],
  years: ["year", "years"],
};

const EDUCATION_LEVEL_LABEL = {
  HIGH_SCHOOL: "High School",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree",
  DOCTORATE: "Doctorate",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

const ALL_LANGUAGES = {
  en: "English",
  fr: "French",
  ar: "Arabic",
  yo: "Yoruba",
  ha: "Hausa",
  ig: "Igbo",
  sw: "Swahili",
  pt: "Portuguese",
  es: "Spanish",
  de: "German",
  zh: "Chinese",
  hi: "Hindi",
  bn: "Bengali",
  ur: "Urdu",
  tr: "Turkish",
  ko: "Korean",
  ja: "Japanese",
  ru: "Russian",
  id: "Indonesian",
  vi: "Vietnamese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  fa: "Persian",
  am: "Amharic",
  zu: "Zulu",
  af: "Afrikaans",
  so: "Somali",
};

const OPTION_ERROR_LABEL = {
  MISSING_RATE: "No amount set for this option",
  MISSING_DURATION:
    "This rate needs a duration — enter a negotiated total below",
  CUSTOM_UNSUPPORTED:
    "Custom rate — enter the agreed total as a negotiated amount below",
  SALARY_TEXT_UNSUPPORTED:
    "Salary headline only — enter a negotiated amount below",
};

function formatMoney(amount, currency = "NGN") {
  if (amount == null || isNaN(amount)) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

/**
 * Renders "1 week", "3 months", "a full weekend".
 */
function formatDurationLabel(estimatedValue, estimatedUnit) {
  if (estimatedValue == null || estimatedValue === "") return null;
  const unit = estimatedUnit || "hours";
  if (unit === "custom") return String(estimatedValue);
  const num = parseFloat(estimatedValue);
  if (!Number.isFinite(num)) return String(estimatedValue);
  const [singular, plural] = DURATION_UNIT_NOUN[unit] || [unit, unit];
  const noun = num === 1 ? singular : plural;
  return `${formatNumber(num)} ${noun}`;
}

// ── Notes parsing — mirrors JobDetail.jsx exactly ─────────────────────────
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

/**
 * Parse the recurring text "Monthly for 1 month" into { count, unit, label }.
 * Used as a fallback when the job post has no estimatedValue/estimatedUnit
 * (older job posts that predate the schema change).
 *
 *  "Monthly for 1 month"    → { count: 1, unit: "months" }
 *  "Weekly for 3 months"    → { count: 3, unit: "months" }
 *  "Daily for 2 weeks"      → { count: 2, unit: "weeks" }
 *  "Bi-weekly for 1 month"  → { count: 1, unit: "months" }
 *  "Yearly for 2 years"     → { count: 2, unit: "years" }
 *  "Monthly ongoing"        → { count: 1, unit: "months", label: "ongoing" }
 */
function parseRecurringBreakdown(recurringText) {
  if (!recurringText) return null;
  const text = recurringText.toLowerCase();

  // Find the "for N unit" portion
  const forMatch = text.match(/for\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
  if (forMatch) {
    const count = parseFloat(forMatch[1]);
    let unit = forMatch[2];
    // Normalize singular → plural
    if (unit === "month") unit = "months";
    else if (unit === "week") unit = "weeks";
    else if (unit === "day") unit = "days";
    else if (unit === "year") unit = "years";
    else if (unit === "hour") unit = "hours";
    if (DURATION_UNIT_NOUN[unit] && Number.isFinite(count) && count > 0) {
      return { count, unit };
    }
  }

  // "ongoing" → treat as 1 unit of the interval's natural unit
  if (text.includes("ongoing")) {
    const interval = text.split(/\s/)[0];
    const unitMap = {
      daily: "days",
      weekly: "weeks",
      "bi-weekly": "weeks",
      biweekly: "weeks",
      monthly: "months",
      yearly: "years",
    };
    const unit = unitMap[interval];
    if (unit) return { count: 1, unit };
  }

  return null;
}

/**
 * Best-effort extraction of the multiplier label from notes:
 *  "Recurring: Monthly for 1 month."  → "1 month"
 */
function parseRecurringDurationLabel(recurringText) {
  const parsed = parseRecurringBreakdown(recurringText);
  if (!parsed) return null;
  return formatDurationLabel(String(parsed.count), parsed.unit);
}

export default function CreateBookingFromJob() {
  const { jobPostId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workerId = searchParams.get("workerId");

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [selectedRateOption, setSelectedRateOption] = useState("");
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!jobPostId) return;

    const url = workerId
      ? `/bookings/from-job/${jobPostId}/draft?workerId=${workerId}`
      : `/bookings/from-job/${jobPostId}/draft`;

    api
      .get(url)
      .then((res) => {
        const data = res.data.data;
        setDraft(data);

        const firstComputable = data.priceOptions?.find(
          (o) => o.canAutoCompute !== false && o.estimatedTotal != null,
        );
        if (firstComputable) {
          setSelectedRateOption(firstComputable.key);
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Failed to load the job post. Try again.",
        );
      })
      .finally(() => setLoading(false));
  }, [jobPostId, workerId]);

  const hasNegotiated = negotiatedRate !== "" && parseFloat(negotiatedRate) > 0;

  const selectedPriceOption = draft?.priceOptions?.find(
    (p) => p.key === selectedRateOption,
  );

  const selectedOptionBlocked =
    !hasNegotiated &&
    selectedPriceOption &&
    (selectedPriceOption.canAutoCompute === false ||
      selectedPriceOption.estimatedTotal == null);

  const finalAmount = hasNegotiated
    ? parseFloat(negotiatedRate)
    : (selectedPriceOption?.estimatedTotal ??
      selectedPriceOption?.amount ??
      null);

  const finalCurrency =
    selectedPriceOption?.currency || draft?.lockedFields?.currency || "NGN";

  const canSubmit =
    !submitting &&
    selectedRateOption &&
    finalAmount != null &&
    (!selectedOptionBlocked || hasNegotiated);

  // ── Full payment breakdown ───────────────────────────────────────────
  const breakdown = useMemo(() => {
    if (!draft || !selectedPriceOption) return null;

    const lf = draft.lockedFields || {};
    const snap = lf.jobRateSnapshot || {};

    const rate = selectedPriceOption.amount;
    const rateCurrency = selectedPriceOption.currency || finalCurrency;
    const period = selectedPriceOption.period;
    const budgetType = period || snap.budgetType || lf.budgetType || "FIXED";

    // ── Resolve the duration from the job post's fields.
    // Prefer estimatedValue/estimatedUnit. If they're missing (older job
    // posts), parse the recurring note to get the multiplier instead.
    let estimatedValue = lf.estimatedValue;
    let estimatedUnit = lf.estimatedUnit;
    const estimatedHours = lf.estimatedHours;
    const recurringLabel = parseRecurring(lf.notes);

    let derivedFromNotes = false;
    if (
      (!estimatedValue || estimatedValue === "") &&
      budgetType !== "FIXED" &&
      budgetType !== "CUSTOM"
    ) {
      const parsed = parseRecurringBreakdown(recurringLabel);
      if (parsed) {
        estimatedValue = String(parsed.count);
        estimatedUnit = parsed.unit;
        derivedFromNotes = true;
      }
    }

    const numericDuration = parseFloat(estimatedValue);
    const durationLabel = formatDurationLabel(estimatedValue, estimatedUnit);

    let multiplierLabel = null;
    let subtotal = 0;
    let calculationText = null;
    let isRecurring = false;

    if (hasNegotiated) {
      subtotal = parseFloat(negotiatedRate);
      calculationText = null;
    } else if (budgetType === "FIXED" || !budgetType) {
      subtotal = rate ?? 0;
      calculationText = `Fixed price · ${formatMoney(subtotal, rateCurrency)}`;
    } else if (budgetType === "CUSTOM") {
      subtotal = selectedPriceOption.estimatedTotal ?? rate ?? 0;
      calculationText = `Estimated from custom duration: ${formatMoney(subtotal, rateCurrency)}`;
    } else {
      // HOURLY / DAILY / WEEKLY / MONTHLY / YEARLY
      if (Number.isFinite(numericDuration) && numericDuration > 0) {
        multiplierLabel = durationLabel;
        isRecurring = true;
        subtotal = (rate ?? 0) * numericDuration;
        calculationText =
          `${formatMoney(rate, rateCurrency)} ` +
          `${BUDGET_TYPE_PERIOD_LABEL[budgetType] || BUDGET_TYPE_LABEL[budgetType]} ` +
          `× ${multiplierLabel} = ${formatMoney(subtotal, rateCurrency)}`;
      } else {
        subtotal = selectedPriceOption.estimatedTotal ?? rate ?? 0;
        calculationText = `Estimated total: ${formatMoney(subtotal, rateCurrency)}`;
      }
    }

    const platformFeePct = 0.05;
    const platformFee = Math.round(subtotal * platformFeePct * 100) / 100;
    const grandTotal = subtotal + platformFee;

    return {
      rate,
      rateCurrency,
      budgetType,
      budgetTypeLabel: BUDGET_TYPE_LABEL[budgetType] || budgetType,
      periodLabel: BUDGET_TYPE_PERIOD_LABEL[budgetType] || null,
      multiplierLabel,
      durationLabel,
      estimatedHours,
      calculationText,
      subtotal,
      platformFeePct,
      platformFee,
      grandTotal,
      isNegotiated: hasNegotiated,
      isFixed: budgetType === "FIXED" && !hasNegotiated,
      isRecurring,
      isCustom: budgetType === "CUSTOM",
      derivedFromNotes,
    };
  }, [
    draft,
    selectedPriceOption,
    hasNegotiated,
    negotiatedRate,
    finalCurrency,
  ]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!workerId && !draft?.lockedFields?.workerId) {
      setError("Missing worker. Reload the page and try again.");
      return;
    }
    if (!selectedRateOption) {
      setError("Please select a payment option.");
      return;
    }
    if (selectedOptionBlocked && !hasNegotiated) {
      setError(
        "This option has no automatic total. Please enter a negotiated amount.",
      );
      return;
    }

    const resolvedWorkerId = workerId || draft?.lockedFields?.workerId;

    setSubmitting(true);
    try {
      const payload = {
        workerId: resolvedWorkerId,
        selectedRateOption,
        notes: notes.trim() || undefined,
      };
      if (hasNegotiated) {
        payload.negotiatedRate = parseFloat(negotiatedRate);
        if (negotiationNote.trim()) {
          payload.negotiationNote = negotiationNote.trim();
        }
      }
      const res = await api.post(`/bookings/from-job/${jobPostId}`, payload);
      setSuccess(res.data.data.booking);
      setTimeout(() => {
        navigate(`/bookings/${res.data.data.booking.id}`);
      }, 50);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create booking. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <FiCheckCircle size={56} />
            </div>
            <h2 className={styles.successTitle}>Booking Created!</h2>
            <p className={styles.successText}>
              A booking request has been sent to{" "}
              <strong>
                {success.worker?.firstName} {success.worker?.lastName}
              </strong>
              . They'll be notified by email.
            </p>

            <div className={styles.successCard}>
              <div className={styles.successCat}>
                {success.category?.icon} {success.category?.name}
              </div>
              <div className={styles.successTitleSmall}>{success.title}</div>

              <div className={styles.successMeta}>
                <FiMapPin size={12} />{" "}
                {success.locationType === "REMOTE"
                  ? "Remote"
                  : success.address || "—"}
              </div>
              <div className={styles.successMeta}>
                <FiDollarSign size={12} />{" "}
                {formatMoney(success.agreedRate, success.currency)}
                {success.isNegotiated && " · Negotiated"}
              </div>
              {success.scheduledAt && (
                <div className={styles.successMeta}>
                  <FiCalendar size={12} />{" "}
                  {new Date(success.scheduledAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className={styles.successActions}>
              <Link to={`/bookings/${success.id}`} className={styles.submitBtn}>
                View Booking
              </Link>
              <Link to="/bookings" className={styles.resetBtn}>
                All Bookings
              </Link>
            </div>
          </div>
        </div>
      </HirerLayout>
    );
  }

  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skeleton} style={{ height: 40, width: 140 }} />
          <div className={styles.skeleton} style={{ height: 100 }} />
          <div className={styles.skeleton} style={{ height: 260 }} />
          <div className={styles.skeleton} style={{ height: 200 }} />
        </div>
      </HirerLayout>
    );
  }

  if (!draft) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.notFound}>
            <FiSearch size={48} className={styles.notFoundIcon} />
            <h2 className={styles.notFoundTitle}>
              {error || "Booking draft not found"}
            </h2>
            <Link
              to="/dashboard/hirer/jobs-management"
              className={styles.backLink}
            >
              <FiChevronLeft size={14} /> Back to Jobs
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  const { worker, category, lockedFields, priceOptions, jobTitle } = draft;
  const LocationIcon = LOCATION_TYPE_ICON[lockedFields.locationType];
  const languageLabel = lockedFields.languageRequirement
    ? ALL_LANGUAGES[lockedFields.languageRequirement] ||
      lockedFields.languageRequirement.toUpperCase()
    : null;
  const educationLabel = lockedFields.educationLevel
    ? EDUCATION_LEVEL_LABEL[lockedFields.educationLevel] ||
      lockedFields.educationLevel
    : null;

  // Notes-derived duration (used both in the locked grid and breakdown)
  const recurringLabel = parseRecurring(lockedFields.notes);
  const customDurationLabel = parseCustomDuration(lockedFields.notes);
  const cleanNotes = stripSystemNotes(lockedFields.notes);
  const recurringDurationLabel = parseRecurringDurationLabel(recurringLabel);

  const hasRequirementsBlock = !!(
    lockedFields.minQualification ||
    lockedFields.experienceLevel ||
    lockedFields.experienceLength ||
    educationLabel ||
    lockedFields.workingHours ||
    lockedFields.applicantLocation
  );

  return (
    <HirerLayout>
      <div className={styles.page}>
        <Link
          to={`/jobs/${jobPostId}/applications`}
          className={styles.backLink}
        >
          <FiChevronLeft size={14} /> Back to Applications
        </Link>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Create Booking</p>
          <h1 className={styles.title}>From job post</h1>
          <p className={styles.subtitle}>
            Booking <strong>"{jobTitle}"</strong> with{" "}
            <strong>
              {worker?.firstName} {worker?.lastName}
            </strong>
            {worker?.workerProfile?.title && ` · ${worker.workerProfile.title}`}
          </p>
        </div>

        {error && (
          <div className={styles.alertError}>
            <FiAlertTriangle size={14} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              <FiX size={14} />
            </button>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* LOCKED FIELDS */}
          <div className={styles.lockHeader}>
            <FiLock size={14} />
            <span>
              These details come from the job post and cannot be edited
            </span>
          </div>

          <div className={styles.lockedGrid}>
            {category && (
              <LockedCard
                icon={<FiLayers size={14} />}
                label="Category"
                value={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
              />
            )}
            {lockedFields.jobType && (
              <LockedCard
                icon={<FiBriefcase size={14} />}
                label="Job Type"
                value={
                  JOB_TYPE_LABEL[lockedFields.jobType] || lockedFields.jobType
                }
              />
            )}
            {lockedFields.locationType && (
              <LockedCard
                icon={<FiMapPin size={14} />}
                label="Work Style"
                value={
                  LOCATION_TYPE_LABEL[lockedFields.locationType] ||
                  lockedFields.locationType
                }
              />
            )}
            {lockedFields.scheduledAt && (
              <LockedCard
                icon={<FiCalendar size={14} />}
                label="Scheduled"
                value={new Date(lockedFields.scheduledAt).toLocaleString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              />
            )}

            {lockedFields.estimatedValue && (
              <LockedCard
                icon={<FiClock size={14} />}
                label="Estimated Duration"
                value={
                  <>
                    {formatDurationLabel(
                      lockedFields.estimatedValue,
                      lockedFields.estimatedUnit,
                    )}
                    {lockedFields.estimatedHours &&
                      lockedFields.estimatedUnit !== "hours" && (
                        <span className={styles.lockedSub}>
                          {" "}
                          ≈ {formatNumber(lockedFields.estimatedHours)}h of work
                        </span>
                      )}
                  </>
                }
              />
            )}

            {!lockedFields.estimatedValue && recurringLabel && (
              <LockedCard
                icon={<FiRefreshCw size={14} />}
                label="Recurring Schedule"
                value={recurringLabel}
              />
            )}

            {lockedFields.durationValue && lockedFields.durationType && (
              <LockedCard
                icon={<FiClock size={14} />}
                label="Project Duration"
                value={`${lockedFields.durationValue} ${String(
                  lockedFields.durationType,
                ).toLowerCase()}`}
              />
            )}

            {lockedFields.locationType !== "REMOTE" && lockedFields.address && (
              <LockedCard
                icon={<FiMapPin size={14} />}
                label="Address"
                value={lockedFields.address}
                full
              />
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Job Title</label>
            <div className={styles.lockedValue}>{lockedFields.title}</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <div className={styles.lockedValueMultiline}>
              {lockedFields.description}
            </div>
          </div>

          {(lockedFields.providesAccommodation ||
            lockedFields.providesMeals) && (
            <div className={styles.field}>
              <label className={styles.label}>Work Conditions</label>
              <div className={styles.conditionRow}>
                {lockedFields.providesAccommodation && (
                  <span className={styles.conditionChip}>
                    <FiHome size={12} /> Accommodation provided
                  </span>
                )}
                {lockedFields.providesMeals && (
                  <span className={styles.conditionChip}>
                    <FiCoffee size={12} /> Meals provided
                  </span>
                )}
              </div>
            </div>
          )}

          {lockedFields.skills?.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Required Skills</label>
              <div className={styles.skillsWrap}>
                {lockedFields.skills.map((s, i) => (
                  <span key={i} className={styles.skillChip}>
                    <FiCheckSquare size={11} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {lockedFields.qualifications?.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Required Qualifications</label>
              <div className={styles.skillsWrap}>
                {lockedFields.qualifications.map((q, i) => (
                  <span key={i} className={styles.skillChip}>
                    <FiAward size={11} /> {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasRequirementsBlock && (
            <div className={styles.field}>
              <label className={styles.label}>Additional Requirements</label>
              <div className={styles.lockedGrid}>
                {lockedFields.minQualification && (
                  <LockedCard
                    icon={<FiAward size={14} />}
                    label="Minimum Qualification"
                    value={lockedFields.minQualification}
                  />
                )}
                {lockedFields.experienceLevel && (
                  <LockedCard
                    icon={<FiTrendingUp size={14} />}
                    label="Experience Level"
                    value={
                      lockedFields.experienceLength
                        ? `${lockedFields.experienceLevel} · ${lockedFields.experienceLength}`
                        : lockedFields.experienceLevel
                    }
                  />
                )}
                {educationLabel && (
                  <LockedCard
                    icon={<FiAward size={14} />}
                    label="Education Level"
                    value={educationLabel}
                  />
                )}
                {languageLabel && (
                  <LockedCard
                    icon={<FiGlobe size={14} />}
                    label="Language"
                    value={languageLabel}
                  />
                )}
                {lockedFields.workingHours && (
                  <LockedCard
                    icon={<FiClock size={14} />}
                    label="Working Hours"
                    value={lockedFields.workingHours}
                  />
                )}
                {lockedFields.applicantLocation && (
                  <LockedCard
                    icon={<FiMapPin size={14} />}
                    label="Preferred Applicant Location"
                    value={lockedFields.applicantLocation}
                  />
                )}
              </div>
            </div>
          )}

          {lockedFields.requirements && (
            <div className={styles.field}>
              <label className={styles.label}>Requirements</label>
              <div className={styles.lockedValueMultiline}>
                {lockedFields.requirements}
              </div>
            </div>
          )}
          {lockedFields.responsibilities && (
            <div className={styles.field}>
              <label className={styles.label}>Responsibilities</label>
              <div className={styles.lockedValueMultiline}>
                {lockedFields.responsibilities}
              </div>
            </div>
          )}

          {/* PAYMENT */}
          <div className={styles.sectionDivider}>
            <FiDollarSign size={14} />
            <span>Payment</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Select Payment Option <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              Pick the price that matches what you and the worker agreed. The
              full breakdown updates live below.
            </p>

            <div className={styles.rateOptions}>
              {priceOptions.map((option) => {
                const blocked =
                  option.canAutoCompute === false ||
                  option.estimatedTotal == null;
                const isSelected = selectedRateOption === option.key;
                const dimmed = hasNegotiated && !isSelected;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.rateOption} ${
                      isSelected ? styles.rateOptionActive : ""
                    } ${dimmed ? styles.rateOptionDim : ""} ${
                      blocked ? styles.rateOptionBlocked : ""
                    }`}
                    onClick={() => setSelectedRateOption(option.key)}
                  >
                    <span className={styles.rateOptionRadio}>
                      {isSelected ? "◉" : "○"}
                    </span>
                    <span className={styles.rateOptionBody}>
                      <span className={styles.rateOptionHeader}>
                        <span className={styles.rateOptionLabel}>
                          {RATE_OPTION_LABEL[option.key] || option.label}
                        </span>
                        {option.period && option.period !== "FIXED" && (
                          <span className={styles.rateOptionBadge}>
                            {BUDGET_TYPE_LABEL[option.period] || option.period}
                          </span>
                        )}
                      </span>
                      <span className={styles.rateOptionMeta}>
                        {option.description}
                      </span>

                      {!blocked ? (
                        <span className={styles.rateOptionTotal}>
                          {option.period && option.period !== "FIXED"
                            ? `Rate: ${formatMoney(option.amount, option.currency)} ${BUDGET_TYPE_PERIOD_LABEL[option.period] || ""} · Total: ${formatMoney(option.estimatedTotal, option.currency)}`
                            : `Total: ${formatMoney(option.estimatedTotal, option.currency)}`}
                        </span>
                      ) : (
                        <span className={styles.rateOptionBlockedNote}>
                          <FiInfo size={11} />{" "}
                          {OPTION_ERROR_LABEL[option.error] ||
                            "Enter a negotiated amount below"}
                        </span>
                      )}

                      {!blocked && option.explanation && (
                        <span className={styles.rateOptionAudit}>
                          {option.explanation}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              FULL PAYMENT BREAKDOWN
          ══════════════════════════════════════════════════════════ */}
          {breakdown && !selectedOptionBlocked && (
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownHeader}>
                <FiDollarSign size={16} />
                <span>Payment Breakdown</span>
                <span className={styles.breakdownBadge}>
                  {breakdown.isNegotiated
                    ? "Negotiated"
                    : breakdown.budgetTypeLabel}
                </span>
              </div>

              <div className={styles.breakdownBody}>
                {/* Rate row */}
                {!breakdown.isFixed && !breakdown.isNegotiated && (
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>
                      {breakdown.periodLabel ? "Rate" : "Agreed Rate"}
                    </span>
                    <span className={styles.breakdownValue}>
                      {formatMoney(breakdown.rate, breakdown.rateCurrency)}
                      {breakdown.periodLabel && (
                        <span className={styles.breakdownSub}>
                          {" "}
                          {breakdown.periodLabel}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Duration row for recurring/numeric types */}
                {breakdown.isRecurring && breakdown.multiplierLabel && (
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>
                      Duration ({breakdown.budgetTypeLabel})
                    </span>
                    <span className={styles.breakdownValue}>
                      {breakdown.multiplierLabel}
                      {breakdown.estimatedHours &&
                        breakdown.estimatedHours > 0 && (
                          <span className={styles.breakdownSub}>
                            {" "}
                            ≈ {formatNumber(breakdown.estimatedHours)}h
                          </span>
                        )}
                    </span>
                  </div>
                )}

                {breakdown.isCustom &&
                  breakdown.durationLabel &&
                  !breakdown.isRecurring && (
                    <div className={styles.breakdownRow}>
                      <span className={styles.breakdownLabel}>Duration</span>
                      <span className={styles.breakdownValue}>
                        {breakdown.durationLabel}
                      </span>
                    </div>
                  )}

                {/* ★ The multiplier line — "NGN 200,000 per month × 1 month = NGN 200,000" */}
                {breakdown.calculationText && (
                  <div className={styles.breakdownCalc}>
                    <FiInfo size={12} />
                    <span>{breakdown.calculationText}</span>
                  </div>
                )}

                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Subtotal</span>
                  <span className={styles.breakdownValue}>
                    {formatMoney(breakdown.subtotal, breakdown.rateCurrency)}
                  </span>
                </div>

                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Platform fee ({breakdown.platformFeePct * 100}%)
                    <span className={styles.breakdownHint}>
                      {" "}
                      — covers escrow, support, and payment processing
                    </span>
                  </span>
                  <span className={styles.breakdownValue}>
                    +{" "}
                    {formatMoney(breakdown.platformFee, breakdown.rateCurrency)}
                  </span>
                </div>

                <div className={styles.breakdownDivider} />

                <div className={styles.breakdownTotal}>
                  <span className={styles.breakdownTotalLabel}>
                    {breakdown.isNegotiated ? "Negotiated Total" : "You Pay"}
                  </span>
                  <span className={styles.breakdownTotalValue}>
                    {formatMoney(breakdown.grandTotal, breakdown.rateCurrency)}
                  </span>
                </div>

                <div className={styles.breakdownNotes}>
                  {breakdown.isFixed && (
                    <p>
                      <FiInfo size={11} /> Fixed-price booking. The agreed
                      amount is the total, plus the platform fee.
                    </p>
                  )}
                  {breakdown.isRecurring && (
                    <p>
                      <FiInfo size={11} />{" "}
                      {formatMoney(breakdown.rate, breakdown.rateCurrency)}{" "}
                      {breakdown.periodLabel} × {breakdown.multiplierLabel}. The
                      worker is paid per {breakdown.budgetType.toLowerCase()}{" "}
                      for the full {breakdown.multiplierLabel} engagement.
                    </p>
                  )}
                  {breakdown.isCustom && (
                    <p>
                      <FiInfo size={11} /> Custom rate — the total was estimated
                      from the duration you described.
                    </p>
                  )}
                  {breakdown.isNegotiated && (
                    <p>
                      <FiInfo size={11} /> You and the worker agreed on a custom
                      amount. This overrides the job post's rate.
                    </p>
                  )}
                  <p>
                    <FiInfo size={11} /> Referral bonuses from your wallet can
                    be applied at the payment step to reduce the total.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Negotiated override */}
          <div className={styles.negotiatedBox}>
            <div className={styles.negotiatedHeader}>
              <FiTrendingUp size={14} />
              <span>Negotiated amount (optional)</span>
            </div>
            <p className={styles.negotiatedHint}>
              If you and the worker agreed on a different amount after
              discussion, enter it here. It will{" "}
              <strong>override the calculated total</strong> and is required for
              options marked above.
            </p>

            <div className={styles.row2}>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 85000"
                value={negotiatedRate}
                onChange={(e) => setNegotiatedRate(e.target.value)}
              />
              <div className={styles.currencyLabel}>{finalCurrency}</div>
            </div>

            {hasNegotiated && (
              <>
                <input
                  className={styles.input}
                  style={{ marginTop: 10 }}
                  type="text"
                  maxLength={500}
                  placeholder="Reason / note about the negotiation (optional)"
                  value={negotiationNote}
                  onChange={(e) => setNegotiationNote(e.target.value)}
                />
                <p className={styles.negotiatedSummary}>
                  ✓ Final amount:{" "}
                  <strong>{formatMoney(negotiatedRate, finalCurrency)}</strong>{" "}
                  · overrides the selected option
                </p>
              </>
            )}
          </div>

          {/* BOOKING NOTES */}
          <div className={styles.field}>
            <label className={styles.label}>
              Booking Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={3}
              maxLength={1000}
              placeholder="Access instructions, tools needed, or any notes specific to this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <Link
              to={`/jobs/${jobPostId}/applications`}
              className={styles.cancelBtn}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} /> Creating...
                </>
              ) : (
                <>
                  <FiCheckCircle size={16} />
                  {breakdown
                    ? `Create Booking · ${formatMoney(breakdown.grandTotal, breakdown.rateCurrency)}`
                    : "Create Booking"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </HirerLayout>
  );
}

function LockedCard({ icon, label, value, full }) {
  return (
    <div
      className={`${styles.lockedCard} ${full ? styles.lockedCardFull : ""}`}
    >
      <span className={styles.lockedIcon}>{icon}</span>
      <div>
        <p className={styles.lockedLabel}>{label}</p>
        <p className={styles.lockedVal}>{value}</p>
      </div>
    </div>
  );
}
