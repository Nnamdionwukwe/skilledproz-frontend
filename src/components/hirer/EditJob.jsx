// src/components/hirer/EditJob.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "./PostJob.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
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
  FiSave,
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
  FiArrowLeft,
  FiAlertTriangle,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";

// ─── Constants (mirror PostJob.jsx) ────────────────────────────────────────
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

// ─── Recurring pricing helpers (mirror PostJob.jsx) ───────────────────────
const PERIODS_PER_RECURRENCE = {
  "2_WEEKS": {
    HOURLY: 14 * 8,
    DAILY: 14,
    WEEKLY: 2,
    MONTHLY: 14 / 30.44,
    YEARLY: 14 / 365,
  },
  "1_MONTH": {
    HOURLY: 30.44 * 8,
    DAILY: 30.44,
    WEEKLY: 4.33,
    MONTHLY: 1,
    YEARLY: 1 / 12,
  },
  "3_MONTHS": {
    HOURLY: 91.31 * 8,
    DAILY: 91.31,
    WEEKLY: 13,
    MONTHLY: 3,
    YEARLY: 0.25,
  },
  "6_MONTHS": {
    HOURLY: 182.62 * 8,
    DAILY: 182.62,
    WEEKLY: 26,
    MONTHLY: 6,
    YEARLY: 0.5,
  },
  "1_YEAR": {
    HOURLY: 365 * 8,
    DAILY: 365,
    WEEKLY: 52,
    MONTHLY: 12,
    YEARLY: 1,
  },
};

const DURATION_UNIT_FOR_BUDGET_TYPE = {
  HOURLY: "hours",
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};

function computeRecurringEstimated(recurrenceDuration, budgetType) {
  const table = PERIODS_PER_RECURRENCE[recurrenceDuration];
  const unit = DURATION_UNIT_FOR_BUDGET_TYPE[budgetType];
  if (!table || !unit) return null;
  const count = table[budgetType];
  if (!Number.isFinite(count) || count <= 0) return null;
  const rounded =
    unit === "hours" ? Math.round(count) : Number(count.toFixed(2));
  return { count: rounded, unit };
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function stripSystemNotes(notes) {
  if (!notes) return "";
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
}

function toEstimatedHours(unit, value) {
  if (unit === "custom") return null;
  const v = parseFloat(value) || 0;
  if (unit === "hours") return v;
  if (unit === "days") return v * 8;
  if (unit === "weeks") return v * 56;
  if (unit === "months") return v * 242.5;
  if (unit === "years") return v * 2910;
  return null;
}

function toLocalDatetimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function EditJob() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [skillInput, setSkillInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");
  const [showQualificationPresets, setShowQualificationPresets] =
    useState(false);

  const [form, setForm] = useState(null);
  const [originalJob, setOriginalJob] = useState(null);

  useEffect(() => {
    tracker.track("page.editJob.view", { jobPostId: jobId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get("/categories?all=true")
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      setLoadError("Invalid job id.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get(`/jobs/${jobId}`)
      .then((res) => {
        if (cancelled) return;
        const job = res.data.data?.jobPost || res.data.data;

        setOriginalJob(job);

        const hasRecurringNote = /Recurring:/i.test(job.notes || "");
        const inferredScheduleMode =
          job.scheduleMode || (hasRecurringNote ? "RECURRING" : "ONE_OFF");

        setForm({
          categoryId: job.categoryId || job.category?.id || "",
          title: job.title || "",
          description: job.description || "",
          locationType: job.locationType || "REMOTE",
          address: job.address || "",
          latitude: job.latitude != null ? String(job.latitude) : "",
          longitude: job.longitude != null ? String(job.longitude) : "",
          jobType: job.jobType || "FULL_TIME",
          scheduledAt: toLocalDatetimeInput(job.scheduledAt),
          languageRequirement: job.languageRequirement || "en",
          scheduleMode: inferredScheduleMode,
          durationUnit: job.estimatedUnit || "hours",
          durationCustomLabel: "",
          estimatedValue:
            job.estimatedUnit === "custom"
              ? job.estimatedValue || ""
              : job.estimatedValue != null
                ? String(job.estimatedValue)
                : "",
          recurrenceInterval: job.recurrenceInterval || "WEEKLY",
          recurrenceDuration: job.recurrenceDuration || "1_MONTH",
          budget: job.budget != null ? String(parseFloat(job.budget)) : "",
          currency: job.currency || "NGN",
          showRateOptions: job.budgetType && job.budgetType !== "FIXED",
          budgetType:
            job.budgetType && job.budgetType !== "FIXED"
              ? job.budgetType
              : "HOURLY",
          budgetCustomLabel: job.budgetCustomLabel || "",
          providesAccommodation: !!job.providesAccommodation,
          providesMeals: !!job.providesMeals,
          qualifications: Array.isArray(job.qualifications)
            ? job.qualifications
            : [],
          skills: Array.isArray(job.skills) ? job.skills : [],
          notes: stripSystemNotes(job.notes || ""),
        });

        if (job.category && job.category.id) {
          setCategories((prev) =>
            prev.some((c) => c.id === job.category.id)
              ? prev
              : [...prev, job.category],
          );
        }

        setLoading(false);
        tracker.action("editJob.loaded", { jobPostId: jobId });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.response?.data?.message || "Failed to load job.");
        setLoading(false);
        tracker.action("editJob.loadFailed", {
          jobPostId: jobId,
          reason: err.response?.data?.message || "unknown",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const normalizedSearch = catSearch.trim().toLowerCase();
  const filteredCats = categories.filter(
    (c) => !normalizedSearch || c.name.toLowerCase().includes(normalizedSearch),
  );
  const displayedCats = filteredCats;
  const totalCats = categories.length;
  const selectedCat = form
    ? categories.find((c) => c.id === form.categoryId)
    : null;
  const isSearching = normalizedSearch.length > 0;
  const showSearchResults = isSearching && !selectedCat;

  const selectedLanguageLabel = form
    ? ALL_LANGUAGES.find((l) => l.code === form.languageRequirement)?.label ||
      "English"
    : "English";

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  function handleCategoryChange(e) {
    set("categoryId", e.target.value);
    setCatSearch("");
    tracker.track("editJob.category.selected", { categoryId: e.target.value });
  }

  function clearCategory() {
    set("categoryId", "");
    setCatSearch("");
    tracker.track("editJob.category.cleared");
  }

  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await api.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const newCat = res.data.data.category;

      setCategories((prev) =>
        prev.some((c) => c.id === newCat.id) ? prev : [...prev, newCat],
      );
      setForm((f) => ({ ...f, categoryId: newCat.id }));
      setCustomCatName("");
      setShowCustomCat(false);
      setCatSearch("");

      tracker.action("editJob.customCategory.created", {
        categoryId: newCat.id,
        categoryName: newCat.name,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add custom category");
    } finally {
      setAddingCat(false);
    }
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
  }

  function removeSkill(skill) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  function handleSkillKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === "Backspace" && !skillInput && form.skills.length) {
      removeSkill(form.skills[form.skills.length - 1]);
    }
  }

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
    setForm((f) => ({
      ...f,
      qualifications: [...f.qualifications, trimmed],
    }));
    setQualificationInput("");
    setError("");
  }

  function removeQualification(qual) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.filter((q) => q !== qual),
    }));
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.categoryId) return setError("Please select a category.");
    if (!form.title) return setError("Job title is required.");
    if (!form.description) return setError("Description is required.");
    if (form.locationType !== "REMOTE" && !form.address)
      return setError(
        "Please enter a service address for on-site or hybrid jobs.",
      );
    if (!form.scheduledAt)
      return setError("Please choose a scheduled date and time.");

    if (form.scheduleMode === "ONE_OFF" && !form.estimatedValue) {
      const originalHasEstimated =
        originalJob?.estimatedHours != null ||
        (originalJob?.estimatedValue != null &&
          originalJob?.estimatedValue !== "");
      if (!originalHasEstimated) {
        return setError(
          form.durationUnit === "custom"
            ? "Please describe the duration."
            : "Please estimate how long the job will take.",
        );
      }
    }

    if (!form.budget) return setError("Please enter a budget.");
    if (
      form.showRateOptions &&
      form.budgetType === "CUSTOM" &&
      !form.budgetCustomLabel.trim()
    )
      return setError("Please describe your custom pay rate.");

    const finalSkills = skillInput.trim()
      ? [...form.skills, skillInput.trim()].slice(0, 20)
      : form.skills;

    const finalQualifications = qualificationInput.trim()
      ? [...form.qualifications, qualificationInput.trim()].slice(0, 10)
      : form.qualifications;

    setSaving(true);
    setError("");

    tracker.action("editJob.submit.attempt", { jobPostId: jobId });

    try {
      const clean = (v) =>
        v === "" || v === null || v === undefined ? undefined : v;

      // ── Duration resolution ────────────────────────────────────────────
      let estimatedHours = null;
      let resolvedEstimatedUnit = undefined;
      let resolvedEstimatedValue = undefined;

      if (form.scheduleMode === "ONE_OFF") {
        estimatedHours = toEstimatedHours(
          form.durationUnit,
          form.estimatedValue,
        );
        resolvedEstimatedUnit =
          form.durationUnit === "custom" ? "custom" : form.durationUnit;
        resolvedEstimatedValue =
          form.durationUnit === "custom"
            ? form.estimatedValue.trim()
            : clean(form.estimatedValue);
      } else {
        const effectiveBudgetType = form.showRateOptions
          ? form.budgetType
          : "FIXED";
        const recurring = computeRecurringEstimated(
          form.recurrenceDuration,
          effectiveBudgetType,
        );
        if (recurring) {
          estimatedHours = recurring.unit === "hours" ? recurring.count : null;
          resolvedEstimatedUnit = recurring.unit;
          resolvedEstimatedValue = String(recurring.count);
        }
      }

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

      await api.put(`/jobs/${jobId}`, payload);

      tracker.action("editJob.success", { jobPostId: jobId });
      navigate(`/jobs/${jobId}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update job.");
      tracker.action("editJob.failed", {
        jobPostId: jobId,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <HirerLayout>
        <EditJobSkeleton />
      </HirerLayout>
    );
  }

  if (loadError) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Editing</p>
            <h1 className={styles.title}>Edit Job</h1>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <FiAlertTriangle size={40} style={{ color: "var(--orange)" }} />
            <p style={{ color: "var(--text)", fontSize: 15 }}>{loadError}</p>
            <Link
              to="/dashboard/hirer/jobs-management"
              className={styles.resetBtn}
            >
              <FiArrowLeft size={14} /> Back to My Jobs
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Editing</p>
          <h1 className={styles.title}>Edit Job</h1>
          <p className={styles.subtitle}>
            Update the details of your job posting.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ── Category ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Category <span className={styles.req}>*</span>
            </label>

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
                />
                <select
                  className={styles.select}
                  value={form.categoryId}
                  onChange={handleCategoryChange}
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

            {!selectedCat && (
              <>
                {!showCustomCat ? (
                  <button
                    type="button"
                    className={styles.addCatBtn}
                    onClick={() => setShowCustomCat(true)}
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
                    />
                    <div className={styles.customCatActions}>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        style={{ height: 36, fontSize: 13 }}
                        onClick={handleAddCustomCategory}
                        disabled={addingCat || !customCatName.trim()}
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
                        }}
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
              />
              <div className={styles.row2} style={{ marginTop: 8 }}>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="Latitude (optional)"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                />
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="Longitude (optional)"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Schedule ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Scheduled Date &amp; Time <span className={styles.req}>*</span>
            </label>
            <input
              className={`${styles.input} ${styles.datetimeInput}`}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
            />
          </div>

          {/* ── Language ── */}
          <div className={styles.field}>
            <label className={styles.label}>Language Requirement</label>
            <p className={styles.fieldHint}>
              What language should the worker speak fluently?
            </p>
            <select
              className={styles.select}
              value={form.languageRequirement}
              onChange={(e) => set("languageRequirement", e.target.value)}
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

          {/* ── Schedule Mode ── */}
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
                        onClick={() => set("durationUnit", u.value)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>

                  {form.durationUnit === "custom" ? (
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Describe the duration (e.g. 'a full weekend')"
                      value={form.estimatedValue}
                      onChange={(e) => set("estimatedValue", e.target.value)}
                      style={{ marginTop: 8 }}
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
                    />
                  )}

                  {form.estimatedValue && form.durationUnit !== "custom" && (
                    <p className={styles.durationSummary}>
                      ✓ Est. {form.estimatedValue} {form.durationUnit} = approx.{" "}
                      {toEstimatedHours(form.durationUnit, form.estimatedValue)}
                      h of work
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
                  >
                    {RECURRENCE_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
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
              />
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
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
                onClick={() => set("showRateOptions", true)}
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
                      onClick={() => set("budgetType", t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {form.budgetType === "CUSTOM" && (
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Describe your rate (e.g. 'Per session')"
                    value={form.budgetCustomLabel}
                    onChange={(e) => set("budgetCustomLabel", e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                )}

                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => {
                    set("showRateOptions", false);
                    set("budgetType", "HOURLY");
                    set("budgetCustomLabel", "");
                  }}
                  style={{ marginTop: 8 }}
                >
                  <FiX size={13} /> Back to total budget
                </button>
              </div>
            )}

            {/* ── Recurring total preview ── */}
            {form.scheduleMode === "RECURRING" &&
              form.showRateOptions &&
              form.budgetType !== "CUSTOM" &&
              form.budget &&
              (() => {
                const recurring = computeRecurringEstimated(
                  form.recurrenceDuration,
                  form.budgetType,
                );
                if (!recurring) return null;
                const rate = parseFloat(form.budget);
                if (!Number.isFinite(rate) || rate <= 0) return null;
                const total = rate * recurring.count;
                const unitLabel =
                  recurring.unit === "hours"
                    ? `${recurring.count} hours`
                    : `${recurring.count} ${recurring.unit}`;
                const periodLabel =
                  {
                    HOURLY: "per hour",
                    DAILY: "per day",
                    WEEKLY: "per week",
                    MONTHLY: "per month",
                    YEARLY: "per year",
                  }[form.budgetType] || `per ${form.budgetType.toLowerCase()}`;
                return (
                  <p className={styles.durationSummary}>
                    ✓ Total:{" "}
                    <strong>
                      {form.currency} {Math.round(total).toLocaleString()}
                    </strong>{" "}
                    ({form.currency} {rate.toLocaleString()} {periodLabel} ×{" "}
                    {unitLabel})
                  </p>
                );
              })()}
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
                  >
                    <Icon size={18} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
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
              />
            </div>

            {form.qualifications.length < 10 && (
              <>
                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => setShowQualificationPresets((v) => !v)}
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
                    >
                      <FiPlus size={11} /> {s}
                    </button>
                  ))}
              </div>
            )}

            {form.skills.length > 0 && (
              <p className={styles.durationSummary}>
                ✓ {form.skills.length} skill
                {form.skills.length !== 1 ? "s" : ""} required
              </p>
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
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? (
              <>
                <span className={styles.spinner} /> Saving...
              </>
            ) : (
              <>
                <FiSave size={16} /> Save Changes
              </>
            )}
          </button>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => navigate(`/jobs/${jobId}`)}
            style={{ marginTop: 8 }}
          >
            <FiArrowLeft size={14} /> Cancel and go back
          </button>
        </form>
      </div>
    </HirerLayout>
  );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────
function EditJobSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.skLine} style={{ width: 80, height: 12 }} />
        <div
          className={styles.skLine}
          style={{ width: 180, height: 28, marginTop: 8 }}
        />
        <div
          className={styles.skLine}
          style={{ width: 260, height: 14, marginTop: 8 }}
        />
      </div>

      <div className={styles.form}>
        <SkField>
          <div className={styles.skLine} style={{ width: 90, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 42, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 80, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 42, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 100, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 100, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 70, height: 12 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              marginTop: 8,
            }}
          >
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
          </div>
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 100, height: 12 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginTop: 8,
            }}
          >
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
          </div>
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 140, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 42, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 140, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 42, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 70, height: 12 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px",
              gap: 10,
              marginTop: 8,
            }}
          >
            <div className={styles.skBlock} style={{ height: 42 }} />
            <div className={styles.skBlock} style={{ height: 42 }} />
          </div>
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 120, height: 12 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              marginTop: 8,
            }}
          >
            <div className={styles.skBlock} style={{ height: 60 }} />
            <div className={styles.skBlock} style={{ height: 60 }} />
          </div>
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 160, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 52, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 120, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 52, marginTop: 8 }}
          />
        </SkField>

        <SkField>
          <div className={styles.skLine} style={{ width: 130, height: 12 }} />
          <div
            className={styles.skBlock}
            style={{ height: 80, marginTop: 8 }}
          />
        </SkField>

        <div className={styles.skBlock} style={{ height: 48, marginTop: 8 }} />
      </div>
    </div>
  );
}

function SkField({ children }) {
  return <div className={styles.field}>{children}</div>;
}
