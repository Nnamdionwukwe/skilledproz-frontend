// src/components/hirer/PostJob.jsx
import { useState, useEffect } from "react";
import styles from "./PostJob.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import AIJobAssistant from "./AIJobAssistant";
import { Link } from "react-router-dom";
import {
  FiBriefcase,
  FiClock,
  FiFileText,
  FiMapPin,
  FiGlobe,
  FiShuffle,
  FiDollarSign,
  FiCheckCircle,
  FiPlus,
  FiX,
  FiTarget,
  FiZap,
  FiTag,
  FiUser,
  FiUsers,
  FiCalendar,
  FiAlignLeft,
  FiRefreshCw,
  FiHome,
  FiCoffee,
  FiAward,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";

// ─── Constants ─────────────────────────────────────────────────────────────

const ALL_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "BRL",
  "MXN",
  "EGP",
  "TZS",
  "UGX",
  "RWF",
  "XOF",
  "MAD",
  "PHP",
  "IDR",
  "VND",
  "THB",
  "BDT",
  "PKR",
  "AED",
  "SAR",
  "QAR",
  "MYR",
  "SGD",
  "HKD",
];

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

const DURATION_UNITS = [
  { value: "hours", label: "Hours", hint: "e.g. 3" },
  { value: "days", label: "Days", hint: "e.g. 2" },
  { value: "weeks", label: "Weeks", hint: "e.g. 1" },
  { value: "months", label: "Months", hint: "e.g. 2" },
  { value: "years", label: "Years", hint: "e.g. 1" },
  { value: "custom", label: "Custom", hint: "e.g. Full project" },
];

const RECURRENCE_INTERVALS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const RECURRENCE_DURATIONS = [
  { value: "2_WEEKS", label: "For 2 weeks" },
  { value: "1_MONTH", label: "For 1 month" },
  { value: "3_MONTHS", label: "For 3 months" },
  { value: "6_MONTHS", label: "For 6 months" },
  { value: "1_YEAR", label: "For 1 year" },
  { value: "ONGOING", label: "Ongoing" },
];

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", icon: FiBriefcase },
  { value: "PART_TIME", label: "Part-time", icon: FiClock },
  { value: "CONTRACT", label: "Contract", icon: FiFileText },
  { value: "TEMPORARY", label: "Temporary", icon: FiClock },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", icon: FiGlobe },
  { value: "ON_SITE", label: "On-site", icon: FiMapPin },
  { value: "HYBRID", label: "Hybrid", icon: FiShuffle },
];

const BUDGET_TYPES = [
  { value: "HOURLY", label: "Per Hour" },
  { value: "DAILY", label: "Per Day" },
  { value: "WEEKLY", label: "Per Week" },
  { value: "MONTHLY", label: "Per Month" },
  { value: "YEARLY", label: "Per Year" },
  { value: "CUSTOM", label: "Custom" },
];

const SKILL_SUGGESTIONS = [
  "Communication",
  "Time Management",
  "Problem Solving",
  "Customer Service",
  "Teamwork",
  "Attention to Detail",
  "Physical Stamina",
  "Technical Skills",
  "Safety Awareness",
  "Driving License",
  "Own Tools",
  "Own Transport",
];

const WORK_CONDITION_OPTIONS = [
  {
    key: "providesAccommodation",
    label: "Accommodation provided",
    icon: FiHome,
  },
  { key: "providesMeals", label: "Meals provided", icon: FiCoffee },
];

const QUALIFICATION_PRESETS = [
  "High School Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate (PhD)",
  "Trade Certification",
  "Professional License",
  "Vocational Training",
  "Driving License",
  "Food Handling Certificate",
  "Safety Certification",
  "First Aid / CPR",
  "Teaching Certificate",
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function PostJob() {
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [postedJob, setPostedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");
  const [showQualificationPresets, setShowQualificationPresets] =
    useState(false);

  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description: "",
    locationType: "REMOTE",
    address: "",
    latitude: "",
    longitude: "",
    jobType: "FULL_TIME",
    scheduledAt: "",
    languageRequirement: "en",
    scheduleMode: "ONE_OFF",
    durationUnit: "hours",
    durationCustomLabel: "",
    estimatedValue: "",
    recurrenceInterval: "WEEKLY",
    recurrenceDuration: "1_MONTH",
    budget: "",
    currency: "NGN",
    showRateOptions: false,
    budgetType: "HOURLY",
    budgetCustomLabel: "",
    providesAccommodation: false,
    providesMeals: false,
    qualifications: [],
    skills: [],
    notes: "",
  });

  // ── ANALYTICS: page view on mount ───────────────────────────────────────
  useEffect(() => {
    tracker.track("page.postJob.view", {
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load categories ─────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/categories?all=true")
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  // ── Filtered + displayed categories ─────────────────────────────────────
  // Custom categories added via the "Add custom" flow are already merged
  // into `categories`, so they flow through the same filter and appear in
  // the dropdown. The search box above the dropdown narrows the list.
  const normalizedSearch = catSearch.trim().toLowerCase();
  const filteredCats = categories.filter(
    (c) => !normalizedSearch || c.name.toLowerCase().includes(normalizedSearch),
  );

  const displayedCats = filteredCats;
  const totalCats = categories.length;
  const isTruncated = displayedCats.length < totalCats;

  const selectedCat = categories.find((c) => c.id === form.categoryId);
  const isSearching = normalizedSearch.length > 0;
  const showSearchResults = isSearching && !selectedCat;

  // ── Custom category ─────────────────────────────────────────────────────
  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);

    tracker.action("postJob.customCategory.attempt", {
      name: customCatName.trim(),
    });

    try {
      const res = await api.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const newCat = res.data.data.category;

      // Merge into the local list if not already there (dedupe by id).
      setCategories((prev) =>
        prev.some((c) => c.id === newCat.id) ? prev : [...prev, newCat],
      );

      // Select it immediately so the user doesn't have to pick it again.
      setForm((f) => ({ ...f, categoryId: newCat.id }));
      setCustomCatName("");
      setShowCustomCat(false);

      // Clear the search so the collapsed selected-category chip is what
      // shows next, not a stale filtered dropdown.
      setCatSearch("");

      tracker.action("postJob.customCategory.created", {
        categoryId: newCat.id,
        categoryName: newCat.name,
      });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to add custom category";
      setError(msg);
      tracker.action("postJob.customCategory.failed", {
        name: customCatName.trim(),
        reason: msg,
      });
    } finally {
      setAddingCat(false);
    }
  }

  // ── Category selection ──────────────────────────────────────────────────
  // Called from the <select> when the user picks an option. Clears the
  // search box so the select collapses back to the "selected chip" view.
  function handleCategoryChange(e) {
    set("categoryId", e.target.value);
    setCatSearch("");
    tracker.track("postJob.category.selected", {
      categoryId: e.target.value,
    });
  }

  function clearCategory() {
    set("categoryId", "");
    setCatSearch("");
    tracker.track("postJob.category.cleared");
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function toEstimatedHours(unit, value) {
    if (unit === "custom") return null;
    const v = parseFloat(value) || 0;
    if (unit === "hours") return v;
    if (unit === "days") return v * 8;
    if (unit === "weeks") return v * 40;
    if (unit === "months") return v * 160;
    if (unit === "years") return v * 2000;
    return null;
  }

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  function addSkill(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    if (form.skills.length >= 20) {
      setError("Maximum 20 skills");
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    setSkillInput("");
    setError("");

    tracker.track("postJob.skill.added", {
      skill: trimmed,
      totalSkills: form.skills.length + 1,
    });
  }

  function removeSkill(skill) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

    tracker.track("postJob.skill.removed", {
      skill,
      totalSkills: form.skills.length - 1,
    });
  }

  function handleSkillKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === "Backspace" && !skillInput && form.skills.length) {
      removeSkill(form.skills[form.skills.length - 1]);
    }
  }

  // ── Qualifications ──────────────────────────────────────────────────────
  function addQualification(qual) {
    const trimmed = qual.trim();
    if (!trimmed) return;
    if (form.qualifications.includes(trimmed)) {
      setQualificationInput("");
      return;
    }
    if (form.qualifications.length >= 10) {
      setError("Maximum 10 qualifications");
      return;
    }
    setForm((f) => ({ ...f, qualifications: [...f.qualifications, trimmed] }));
    setQualificationInput("");
    setError("");

    tracker.track("postJob.qualification.added", {
      qualification: trimmed,
      totalQualifications: form.qualifications.length + 1,
    });
  }

  function removeQualification(qual) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.filter((q) => q !== qual),
    }));

    tracker.track("postJob.qualification.removed", {
      qualification: qual,
      totalQualifications: form.qualifications.length - 1,
    });
  }

  function handleQualificationKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addQualification(qualificationInput);
    } else if (
      e.key === "Backspace" &&
      !qualificationInput &&
      form.qualifications.length
    ) {
      removeQualification(form.qualifications[form.qualifications.length - 1]);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.categoryId) {
      setError("Please select a category.");
      tracker.action("postJob.submit.blocked", { reason: "no_category" });
      return;
    }
    if (!form.title) {
      setError("Job title is required.");
      tracker.action("postJob.submit.blocked", { reason: "no_title" });
      return;
    }
    if (!form.description) {
      setError("Description is required.");
      tracker.action("postJob.submit.blocked", { reason: "no_description" });
      return;
    }
    if (form.locationType !== "REMOTE" && !form.address) {
      setError("Please enter a service address for on-site or hybrid jobs.");
      tracker.action("postJob.submit.blocked", {
        reason: "no_address",
        locationType: form.locationType,
      });
      return;
    }
    if (!form.scheduledAt) {
      setError("Please choose a scheduled date and time.");
      tracker.action("postJob.submit.blocked", { reason: "no_schedule" });
      return;
    }
    if (form.scheduleMode === "ONE_OFF" && !form.estimatedValue) {
      setError(
        form.durationUnit === "custom"
          ? "Please describe the duration."
          : "Please estimate how long the job will take.",
      );
      tracker.action("postJob.submit.blocked", { reason: "no_duration" });
      return;
    }
    if (!form.budget) {
      setError("Please enter a budget.");
      tracker.action("postJob.submit.blocked", { reason: "no_budget" });
      return;
    }
    if (
      form.showRateOptions &&
      form.budgetType === "CUSTOM" &&
      !form.budgetCustomLabel.trim()
    ) {
      setError("Please describe your custom pay rate.");
      tracker.action("postJob.submit.blocked", {
        reason: "no_custom_budget_label",
      });
      return;
    }

    const finalSkills = skillInput.trim()
      ? [...form.skills, skillInput.trim()].slice(0, 20)
      : form.skills;

    const finalQualifications = qualificationInput.trim()
      ? [...form.qualifications, qualificationInput.trim()].slice(0, 10)
      : form.qualifications;

    setLoading(true);

    tracker.action("postJob.submit.attempt", {
      categoryId: form.categoryId,
      jobType: form.jobType,
      locationType: form.locationType,
      scheduleMode: form.scheduleMode,
      durationUnit: form.durationUnit,
      budgetType: form.showRateOptions ? form.budgetType : "FIXED",
      currency: form.currency,
      hasBudget: !!form.budget,
      hasSkills: finalSkills.length > 0,
      skillCount: finalSkills.length,
      languageRequirement: form.languageRequirement,
      qualificationCount: finalQualifications.length,
      providesAccommodation: form.providesAccommodation,
      providesMeals: form.providesMeals,
    });

    try {
      const estimatedHours =
        form.scheduleMode === "ONE_OFF"
          ? toEstimatedHours(form.durationUnit, form.estimatedValue)
          : null;

      const noteParts = [];
      if (form.scheduleMode === "RECURRING") {
        const intervalLabel =
          RECURRENCE_INTERVALS.find((i) => i.value === form.recurrenceInterval)
            ?.label || form.recurrenceInterval;
        const durationLabel =
          RECURRENCE_DURATIONS.find(
            (d) => d.value === form.recurrenceDuration,
          )?.label?.toLowerCase() || form.recurrenceDuration;
        noteParts.push(`Recurring: ${intervalLabel} ${durationLabel}.`);
      } else if (form.durationUnit === "custom" && form.estimatedValue) {
        noteParts.push(`Duration: ${form.estimatedValue.trim()}.`);
      }
      if (form.notes) noteParts.push(form.notes);
      const finalNotes = noteParts.join(" ");

      const clean = (v) =>
        v === "" || v === null || v === undefined ? undefined : v;

      const resolvedEstimatedUnit =
        form.scheduleMode === "ONE_OFF"
          ? form.durationUnit === "custom"
            ? "custom"
            : form.durationUnit
          : undefined;

      const resolvedEstimatedValue =
        form.scheduleMode === "ONE_OFF"
          ? form.durationUnit === "custom"
            ? form.estimatedValue.trim()
            : clean(form.estimatedValue)
          : undefined;

      const payload = {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,

        locationType: form.locationType,
        address: form.locationType !== "REMOTE" ? form.address : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,

        jobType: form.jobType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),

        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: resolvedEstimatedUnit,
        estimatedValue: resolvedEstimatedValue,

        budget: parseFloat(form.budget),
        currency: clean(form.currency),
        budgetType: form.showRateOptions ? form.budgetType : "FIXED",

        skills: finalSkills,
        notes: clean(finalNotes),

        languageRequirement: form.languageRequirement || "en",
        qualifications: finalQualifications,

        providesAccommodation: form.providesAccommodation,
        providesMeals: form.providesMeals,
      };

      const res = await api.post("/jobs", payload);
      setPostedJob(res.data.data.jobPost);
      setSubmitted(true);

      tracker.action("postJob.success", {
        jobPostId: res.data.data.jobPost.id,
        categoryId: form.categoryId,
        jobType: form.jobType,
        locationType: form.locationType,
        scheduleMode: form.scheduleMode,
        budgetType: form.showRateOptions ? form.budgetType : "FIXED",
        currency: form.currency,
        budget: parseFloat(form.budget),
        skillCount: finalSkills.length,
        languageRequirement: form.languageRequirement,
        qualificationCount: finalQualifications.length,
        providesAccommodation: form.providesAccommodation,
        providesMeals: form.providesMeals,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job.");

      tracker.action("postJob.failed", {
        categoryId: form.categoryId,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setPostedJob(null);
    setError("");

    tracker.action("postJob.postAnother.clicked");

    setForm({
      categoryId: "",
      title: "",
      description: "",
      locationType: "REMOTE",
      address: "",
      latitude: "",
      longitude: "",
      jobType: "FULL_TIME",
      scheduledAt: "",
      languageRequirement: "en",
      scheduleMode: "ONE_OFF",
      durationUnit: "hours",
      durationCustomLabel: "",
      estimatedValue: "",
      recurrenceInterval: "WEEKLY",
      recurrenceDuration: "1_MONTH",
      budget: "",
      currency: "NGN",
      showRateOptions: false,
      budgetType: "HOURLY",
      budgetCustomLabel: "",
      providesAccommodation: false,
      providesMeals: false,
      qualifications: [],
      skills: [],
      notes: "",
    });
    setSkillInput("");
    setQualificationInput("");
    setCatSearch("");
    setShowQualificationPresets(false);
    setShowCustomCat(false);
    setCustomCatName("");
  }

  const selectedLanguageLabel =
    ALL_LANGUAGES.find((l) => l.code === form.languageRequirement)?.label ||
    "English";

  // ── Success state ───────────────────────────────────────────────────────
  if (submitted && postedJob) {
    const hirer = postedJob.hirer;
    const applicationsCount = postedJob._count?.applications ?? 0;

    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <FiTarget size={56} />
            </div>
            <h2 className={styles.successTitle}>Job Posted!</h2>
            <p className={styles.successText}>
              Your job <strong>"{postedJob.title}"</strong> is now live on the
              platform.
            </p>

            <div className={styles.successCard}>
              <div className={styles.successCat}>
                {postedJob.category?.icon} {postedJob.category?.name}
              </div>

              <div className={styles.successJobTitle}>{postedJob.title}</div>

              {hirer && (
                <div className={styles.successMeta}>
                  <FiUser size={12} /> {hirer.firstName} {hirer.lastName}
                </div>
              )}

              <div className={styles.successMeta}>
                <FiMapPin size={12} />
                {postedJob.locationType === "REMOTE"
                  ? "Remote"
                  : postedJob.address || "—"}
                {postedJob.locationType &&
                  postedJob.locationType !== "REMOTE" &&
                  ` · ${
                    LOCATION_TYPES.find(
                      (t) => t.value === postedJob.locationType,
                    )?.label
                  }`}
              </div>

              <div className={styles.successMeta}>
                <FiDollarSign size={12} /> {postedJob.currency}{" "}
                {Number(postedJob.budget).toLocaleString()}
                {postedJob.budgetType === "FIXED" || !postedJob.budgetType
                  ? " total"
                  : ` · ${
                      BUDGET_TYPES.find((t) => t.value === postedJob.budgetType)
                        ?.label
                    }`}
              </div>

              {postedJob.estimatedValue && (
                <div className={styles.successMeta}>
                  <FiClock size={12} /> Est.{" "}
                  {postedJob.estimatedHours
                    ? `${postedJob.estimatedHours}h`
                    : postedJob.estimatedValue}{" "}
                  {postedJob.estimatedUnit &&
                    postedJob.estimatedHours &&
                    `(${postedJob.estimatedValue} ${postedJob.estimatedUnit})`}
                </div>
              )}

              {postedJob.jobType && (
                <div className={styles.successMeta}>
                  <FiBriefcase size={12} />{" "}
                  {JOB_TYPES.find((t) => t.value === postedJob.jobType)?.label}
                </div>
              )}

              {postedJob.scheduledAt && (
                <div className={styles.successMeta}>
                  <FiCalendar size={12} />{" "}
                  {new Date(postedJob.scheduledAt).toLocaleString()}
                </div>
              )}

              {postedJob.languageRequirement && (
                <div className={styles.successMeta}>
                  <FiGlobe size={12} />{" "}
                  {ALL_LANGUAGES.find(
                    (l) => l.code === postedJob.languageRequirement,
                  )?.label || postedJob.languageRequirement}
                </div>
              )}

              {postedJob.qualifications?.length > 0 && (
                <div className={styles.successMeta}>
                  <FiAward size={12} /> {postedJob.qualifications.length}{" "}
                  qualification
                  {postedJob.qualifications.length !== 1 ? "s" : ""} required
                </div>
              )}

              {postedJob.skills?.length > 0 && (
                <div className={styles.successMeta}>
                  <FiTag size={12} /> {postedJob.skills.length} skill
                  {postedJob.skills.length !== 1 ? "s" : ""} required
                </div>
              )}

              {postedJob.providesAccommodation && (
                <div className={styles.successMeta}>
                  <FiHome size={12} /> Accommodation provided
                </div>
              )}

              {postedJob.providesMeals && (
                <div className={styles.successMeta}>
                  <FiCoffee size={12} /> Meals provided
                </div>
              )}

              <div className={styles.successMeta}>
                <FiUsers size={12} /> {applicationsCount} applicant
                {applicationsCount !== 1 ? "s" : ""} so far
              </div>

              {postedJob.notes && (
                <div className={styles.successMeta}>
                  <FiAlignLeft size={12} /> {postedJob.notes}
                </div>
              )}
            </div>

            <div className={styles.successActions}>
              <Link
                to="/dashboard/hirer/jobs-management"
                className={styles.successPrimaryBtn}
                data-track-id="postJob.success.viewMyJobs"
              >
                View My Jobs
              </Link>
              <button
                type="button"
                className={styles.successSecondaryBtn}
                onClick={resetForm}
                data-track-id="postJob.success.postAnother"
              >
                Post Another Job
              </button>
            </div>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Hiring</p>
          <h1 className={styles.title}>Post a Job</h1>
          <p className={styles.subtitle}>
            Describe what you need and connect with skilled workers.
          </p>
        </div>

        <AIJobAssistant
          onApply={(result) => {
            set("title", result.title);
            set("description", result.description);

            tracker.action("postJob.aiAssistant.applied", {
              titleLength: (result.title || "").length,
              descriptionLength: (result.description || "").length,
            });
          }}
        />

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ── Category ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Category <span className={styles.req}>*</span>
            </label>

            {/* When a category is already selected, show the chip and hide
                the search + dropdown. This makes the section collapse once
                the user has made a choice. */}
            {selectedCat ? (
              <div className={styles.selectedCat}>
                <FiCheckCircle size={13} /> Selected:{" "}
                <strong>
                  {selectedCat.icon} {selectedCat.name}
                </strong>
                <button
                  type="button"
                  className={styles.clearCat}
                  onClick={clearCategory}
                  data-track-id="postJob.category.clear"
                >
                  <FiX size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  className={styles.input}
                  placeholder="Search categories..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  style={{ marginBottom: 6 }}
                  data-track-id="postJob.category.search"
                />

                {/* A native dropdown — behaves normally now. `size` stays
                    at 1 so picking an option closes the list. */}
                <select
                  className={styles.select}
                  value={form.categoryId}
                  onChange={handleCategoryChange}
                  data-track-id="postJob.category.select"
                >
                  <option value="">
                    {displayedCats.length === 0
                      ? "No matching categories"
                      : isSearching
                        ? `${displayedCats.length} match${displayedCats.length === 1 ? "" : "es"} — pick one`
                        : "Select a category"}
                  </option>
                  {displayedCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                      {c.isUserSubmitted ? " (custom)" : ""}
                    </option>
                  ))}
                </select>

                {showSearchResults && (
                  <p className={styles.fieldHint} style={{ marginTop: 4 }}>
                    Showing {displayedCats.length} of {totalCats} categories
                    matching "{catSearch.trim()}".
                  </p>
                )}
              </>
            )}

            {/* Custom category flow — hidden once a category is selected */}
            {!selectedCat && (
              <>
                {!showCustomCat ? (
                  <button
                    type="button"
                    className={styles.addCatBtn}
                    onClick={() => {
                      setShowCustomCat(true);
                      tracker.track("postJob.customCategory.opened");
                    }}
                    data-track-id="postJob.customCategory.open"
                  >
                    <FiPlus size={13} /> Can't find your category? Add a custom
                    one
                  </button>
                ) : (
                  <div className={styles.customCatBox}>
                    <input
                      className={styles.input}
                      placeholder="Category name e.g. Solar Panel Installation"
                      value={customCatName}
                      onChange={(e) => setCustomCatName(e.target.value)}
                      autoFocus
                      data-track-id="postJob.customCategory.input"
                    />
                    <div className={styles.customCatActions}>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        style={{ height: 36, fontSize: 13 }}
                        onClick={handleAddCustomCategory}
                        disabled={addingCat || !customCatName.trim()}
                        data-track-id="postJob.customCategory.submit"
                      >
                        {addingCat ? "Adding..." : "Add Category"}
                      </button>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        style={{ height: 36, fontSize: 13 }}
                        onClick={() => {
                          setShowCustomCat(false);
                          setCustomCatName("");
                          tracker.track("postJob.customCategory.cancelled");
                        }}
                        data-track-id="postJob.customCategory.cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Title ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Job Title <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="e.g. Fix leaking bathroom pipe"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              data-track-id="postJob.title"
            />
          </div>

          {/* ── Description ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Description <span className={styles.req}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Describe the job in detail..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              data-track-id="postJob.description"
            />
          </div>

          {/* ── Job Type ── */}
          <div className={styles.field}>
            <label className={styles.label}>Job Type</label>
            <div className={styles.optionGrid}>
              {JOB_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    type="button"
                    key={t.value}
                    className={`${styles.optionCard} ${
                      form.jobType === t.value ? styles.optionCardActive : ""
                    }`}
                    onClick={() => set("jobType", t.value)}
                    data-track-id={`postJob.jobType.${t.value}`}
                  >
                    <Icon size={18} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Location Type ── */}
          <div className={styles.field}>
            <label className={styles.label}>Work Location</label>
            <div className={styles.optionGrid}>
              {LOCATION_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    type="button"
                    key={t.value}
                    className={`${styles.optionCard} ${
                      form.locationType === t.value
                        ? styles.optionCardActive
                        : ""
                    }`}
                    onClick={() => set("locationType", t.value)}
                    data-track-id={`postJob.locationType.${t.value}`}
                  >
                    <Icon size={18} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Address ── */}
          {form.locationType !== "REMOTE" && (
            <div className={styles.field}>
              <label className={styles.label}>
                Service Address <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                placeholder="Full address where work will be done"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                data-track-id="postJob.address"
              />
              <div className={styles.row2} style={{ marginTop: 8 }}>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="Latitude (optional)"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                  data-track-id="postJob.latitude"
                />
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="Longitude (optional)"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                  data-track-id="postJob.longitude"
                />
              </div>
            </div>
          )}

          {/* ── Schedule ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Scheduled Date & Time <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
              data-track-id="postJob.scheduledAt"
            />
          </div>

          {/* ── Language Requirement ── */}
          <div className={styles.field}>
            <label className={styles.label}>Language Requirement</label>
            <p className={styles.fieldHint}>
              What language should the worker speak fluently?
            </p>
            <select
              className={styles.select}
              value={form.languageRequirement}
              onChange={(e) => set("languageRequirement", e.target.value)}
              data-track-id="postJob.languageRequirement"
            >
              {ALL_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className={styles.durationSummary}>
              ✓ Workers must speak <strong>{selectedLanguageLabel}</strong>
            </p>
          </div>

          {/* ── Schedule Mode: One-off vs Recurring ── */}
          <div className={styles.field}>
            <label className={styles.label}>Schedule</label>
            <p className={styles.fieldHint}>
              Is this a one-off job, or something that repeats?
            </p>

            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${
                  form.scheduleMode === "ONE_OFF" ? styles.optionCardActive : ""
                }`}
                onClick={() => set("scheduleMode", "ONE_OFF")}
                data-track-id="postJob.scheduleMode.ONE_OFF"
              >
                <FiTarget size={18} />
                <span>One-off job</span>
              </button>
              <button
                type="button"
                className={`${styles.optionCard} ${
                  form.scheduleMode === "RECURRING"
                    ? styles.optionCardActive
                    : ""
                }`}
                onClick={() => set("scheduleMode", "RECURRING")}
                data-track-id="postJob.scheduleMode.RECURRING"
              >
                <FiRefreshCw size={18} />
                <span>Recurring</span>
              </button>
            </div>

            {form.scheduleMode === "ONE_OFF" ? (
              <>
                <p className={styles.fieldHint} style={{ marginTop: 10 }}>
                  Roughly how long will it take?
                </p>
                <div className={styles.durationRow}>
                  <div className={styles.unitPills}>
                    {DURATION_UNITS.map((u) => (
                      <button
                        type="button"
                        key={u.value}
                        className={`${styles.unitPill} ${
                          form.durationUnit === u.value
                            ? styles.unitPillActive
                            : ""
                        }`}
                        onClick={() => {
                          set("durationUnit", u.value);
                          if (u.value !== "custom") {
                            set("durationCustomLabel", "");
                          }
                        }}
                        data-track-id={`postJob.durationUnit.${u.value}`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>

                  {form.durationUnit === "custom" ? (
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Describe the duration (e.g. 'a full weekend', 'till handover')"
                      value={form.estimatedValue}
                      onChange={(e) => set("estimatedValue", e.target.value)}
                      style={{ marginTop: 8 }}
                      data-track-id="postJob.estimatedValue.custom"
                    />
                  ) : (
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step={form.durationUnit === "hours" ? "0.5" : "1"}
                      placeholder={
                        DURATION_UNITS.find(
                          (u) => u.value === form.durationUnit,
                        )?.hint || ""
                      }
                      value={form.estimatedValue}
                      onChange={(e) => set("estimatedValue", e.target.value)}
                      style={{ marginTop: 8 }}
                      data-track-id="postJob.estimatedValue"
                    />
                  )}

                  {form.estimatedValue && form.durationUnit !== "custom" && (
                    <p className={styles.durationSummary}>
                      ✓ Est. {form.estimatedValue} {form.durationUnit} = approx.{" "}
                      {toEstimatedHours(form.durationUnit, form.estimatedValue)}
                      h of work
                    </p>
                  )}
                  {form.estimatedValue && form.durationUnit === "custom" && (
                    <p className={styles.durationSummary}>
                      ✓ Duration: {form.estimatedValue}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className={styles.fieldHint} style={{ marginTop: 10 }}>
                  How often, and for how long?
                </p>
                <div className={styles.row2}>
                  <select
                    className={styles.select}
                    value={form.recurrenceInterval}
                    onChange={(e) => set("recurrenceInterval", e.target.value)}
                    data-track-id="postJob.recurrenceInterval"
                  >
                    {RECURRENCE_INTERVALS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.select}
                    value={form.recurrenceDuration}
                    onChange={(e) => set("recurrenceDuration", e.target.value)}
                    data-track-id="postJob.recurrenceDuration"
                  >
                    {RECURRENCE_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className={styles.durationSummary}>
                  ✓ Repeats{" "}
                  {RECURRENCE_INTERVALS.find(
                    (i) => i.value === form.recurrenceInterval,
                  )?.label?.toLowerCase()}{" "}
                  {RECURRENCE_DURATIONS.find(
                    (d) => d.value === form.recurrenceDuration,
                  )?.label?.toLowerCase()}
                </p>
              </>
            )}
          </div>

          {/* ── Budget ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Budget <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              How much are you offering for this job?
            </p>

            <div className={styles.row2}>
              <input
                className={styles.input}
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                data-track-id="postJob.budget"
              />
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                data-track-id="postJob.currency"
              >
                {ALL_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {!form.showRateOptions ? (
              <button
                type="button"
                className={styles.addCatBtn}
                onClick={() => {
                  set("showRateOptions", true);
                  tracker.track("postJob.rateOptions.opened");
                }}
                data-track-id="postJob.rateOptions.open"
              >
                <FiPlus size={13} /> Pay by the hour / day instead
              </button>
            ) : (
              <div style={{ marginTop: 8 }}>
                <p className={styles.fieldHint}>Pay rate:</p>
                <div className={styles.unitPills}>
                  {BUDGET_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      className={`${styles.unitPill} ${
                        form.budgetType === t.value ? styles.unitPillActive : ""
                      }`}
                      onClick={() => {
                        set("budgetType", t.value);
                        if (t.value !== "CUSTOM") {
                          set("budgetCustomLabel", "");
                        }
                      }}
                      data-track-id={`postJob.budgetType.${t.value}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {form.budgetType === "CUSTOM" && (
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Describe your rate (e.g. 'Per session', 'Per delivery')"
                    value={form.budgetCustomLabel}
                    onChange={(e) => set("budgetCustomLabel", e.target.value)}
                    style={{ marginTop: 8 }}
                    data-track-id="postJob.budgetType.CUSTOM.label"
                  />
                )}

                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => {
                    set("showRateOptions", false);
                    set("budgetType", "HOURLY");
                    set("budgetCustomLabel", "");
                    tracker.track("postJob.rateOptions.closed");
                  }}
                  style={{ marginTop: 8 }}
                  data-track-id="postJob.rateOptions.close"
                >
                  <FiX size={13} /> Back to total budget
                </button>
              </div>
            )}

            {form.budget && (
              <p className={styles.durationSummary}>
                ✓ You're offering{" "}
                <strong>
                  {form.currency}{" "}
                  {parseFloat(form.budget || 0).toLocaleString()}
                </strong>{" "}
                {form.showRateOptions && form.budgetType !== "FIXED"
                  ? form.budgetType === "CUSTOM" &&
                    form.budgetCustomLabel.trim()
                    ? `· ${form.budgetCustomLabel.trim()}`
                    : `per ${form.budgetType.toLowerCase()}`
                  : "as the total budget"}
              </p>
            )}
          </div>

          {/* ── Work Conditions ── */}
          <div className={styles.field}>
            <label className={styles.label}>Work Conditions</label>
            <p className={styles.fieldHint}>
              Does this job come with accommodation or meals?
            </p>

            <div className={styles.optionGrid}>
              {WORK_CONDITION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form[opt.key];
                return (
                  <button
                    type="button"
                    key={opt.key}
                    className={`${styles.optionCard} ${
                      active ? styles.optionCardActive : ""
                    }`}
                    onClick={() => set(opt.key, !active)}
                    data-track-id={`postJob.${opt.key}`}
                  >
                    <Icon size={18} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {(form.providesAccommodation || form.providesMeals) && (
              <p className={styles.durationSummary}>
                ✓ Job includes{" "}
                {[
                  form.providesAccommodation && "accommodation",
                  form.providesMeals && "meals",
                ]
                  .filter(Boolean)
                  .join(" and ")}
              </p>
            )}
          </div>

          {/* ── Qualifications ── */}
          <div className={styles.field}>
            <label className={styles.label}>Required Qualifications</label>
            <p className={styles.fieldHint}>
              Add any specific qualifications this job requires. Press Enter or
              comma to add. Optional — leave blank if not needed.
            </p>

            <div className={styles.skillBox}>
              {form.qualifications.map((qual) => (
                <span key={qual} className={styles.skillTag}>
                  <FiAward size={11} />
                  {qual}
                  <button
                    type="button"
                    className={styles.skillRemove}
                    onClick={() => removeQualification(qual)}
                    data-track-id={`postJob.qualification.remove.${qual}`}
                  >
                    <FiX size={12} />
                  </button>
                </span>
              ))}
              <input
                className={styles.skillInput}
                placeholder={
                  form.qualifications.length === 0
                    ? "Type a qualification or pick from below..."
                    : ""
                }
                value={qualificationInput}
                onChange={(e) => setQualificationInput(e.target.value)}
                onKeyDown={handleQualificationKeyDown}
                onBlur={() => {
                  if (qualificationInput.trim())
                    addQualification(qualificationInput);
                }}
                data-track-id="postJob.qualification.input"
              />
            </div>

            {form.qualifications.length < 10 && (
              <>
                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => {
                    setShowQualificationPresets((v) => !v);
                    tracker.track("postJob.qualificationPresets.toggled", {
                      opened: !showQualificationPresets,
                    });
                  }}
                  data-track-id="postJob.qualificationPresets.toggle"
                >
                  {showQualificationPresets ? (
                    <>
                      <FiChevronUp size={13} /> Hide common qualifications
                    </>
                  ) : (
                    <>
                      <FiChevronDown size={13} /> Show common qualifications
                    </>
                  )}
                </button>

                {showQualificationPresets && (
                  <div className={styles.skillSuggestions}>
                    {QUALIFICATION_PRESETS.filter(
                      (q) => !form.qualifications.includes(q),
                    )
                      .slice(0, 12)
                      .map((q) => (
                        <button
                          type="button"
                          key={q}
                          className={styles.skillSuggestion}
                          onClick={() => addQualification(q)}
                          data-track-id={`postJob.qualification.preset.${q}`}
                        >
                          <FiPlus size={11} /> {q}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}

            {form.qualifications.length > 0 && (
              <p className={styles.durationSummary}>
                ✓ {form.qualifications.length} qualification
                {form.qualifications.length !== 1 ? "s" : ""} required
              </p>
            )}
          </div>

          {/* ── Skills ── */}
          <div className={styles.field}>
            <label className={styles.label}>Required Skills</label>
            <p className={styles.fieldHint}>
              Add skills the worker should have. Press Enter or comma to add.
            </p>

            <div className={styles.skillBox}>
              {form.skills.map((skill) => (
                <span key={skill} className={styles.skillTag}>
                  {skill}
                  <button
                    type="button"
                    className={styles.skillRemove}
                    onClick={() => removeSkill(skill)}
                    data-track-id={`postJob.skill.remove.${skill}`}
                  >
                    <FiX size={12} />
                  </button>
                </span>
              ))}
              <input
                className={styles.skillInput}
                placeholder={
                  form.skills.length === 0
                    ? "Type a skill and press Enter..."
                    : ""
                }
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => {
                  if (skillInput.trim()) addSkill(skillInput);
                }}
                data-track-id="postJob.skill.input"
              />
            </div>

            {form.skills.length < 20 && (
              <div className={styles.skillSuggestions}>
                {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s))
                  .slice(0, 8)
                  .map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={styles.skillSuggestion}
                      onClick={() => addSkill(s)}
                      data-track-id={`postJob.skill.suggestion.${s}`}
                    >
                      <FiPlus size={11} /> {s}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div className={styles.field}>
            <label className={styles.label}>Additional Notes</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Access instructions, tools needed, preferences..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              data-track-id="postJob.notes"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            data-track-id="postJob.submit"
          >
            {loading ? (
              <>
                <span className={styles.spinner} /> Posting...
              </>
            ) : (
              <>
                <FiZap size={16} /> Post Job
              </>
            )}
          </button>
        </form>
      </div>
    </HirerLayout>
  );
}
