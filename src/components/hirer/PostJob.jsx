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
  FiAward,
  FiBookOpen,
  FiLink,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiTrendingUp,
  FiCheckSquare,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";

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

const DURATION_UNITS = [
  { value: "hours", label: "Hours", hint: "e.g. 3" },
  { value: "days", label: "Days", hint: "e.g. 2" },
  { value: "weeks", label: "Weeks", hint: "e.g. 1" },
  { value: "months", label: "Months", hint: "e.g. 3" },
  { value: "custom", label: "Custom", hint: "e.g. Full project" },
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
  { value: "FIXED", label: "Fixed" },
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

const DURATION_TYPES = [
  { value: "HOURS", label: "Hours" },
  { value: "DAYS", label: "Days" },
  { value: "WEEKS", label: "Weeks" },
  { value: "MONTHS", label: "Months" },
  { value: "CUSTOM", label: "Custom" },
];

const SALARY_PERIODS = [
  { value: "HOURLY", label: "Per Hour" },
  { value: "DAILY", label: "Per Day" },
  { value: "WEEKLY", label: "Per Week" },
  { value: "MONTHLY", label: "Per Month" },
  { value: "YEARLY", label: "Per Year" },
];

const EDUCATION_LEVELS = [
  { value: "HIGH_SCHOOL", label: "High School" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "BACHELOR", label: "Bachelor's Degree" },
  { value: "MASTER", label: "Master's Degree" },
  { value: "DOCTORATE", label: "Doctorate" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "OTHER", label: "Other" },
];

const EXPERIENCE_LEVELS = [
  { value: "Entry level", label: "Entry Level" },
  { value: "Mid level", label: "Mid Level" },
  { value: "Senior level", label: "Senior Level" },
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

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    // core
    categoryId: "",
    title: "",
    description: "",

    // location
    locationType: "REMOTE",
    address: "",
    latitude: "",
    longitude: "",

    // job meta
    jobType: "FULL_TIME",
    scheduledAt: "",
    estimatedValue: "",
    durationUnit: "hours",

    // payment / duration
    budget: "",
    currency: "NGN",
    budgetType: "FIXED",
    durationType: "HOURS",
    durationValue: "",

    // extras
    skills: [],
    notes: "",

    // external-style display
    companyName: "",
    salaryText: "",

    // salary range
    salaryAmount: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "",
    salaryPeriod: "",

    // requirements
    minQualification: "",
    experienceLevel: "",
    experienceLength: "",
    languageRequirement: "",
    workingHours: "",
    applicantLocation: "",
    responsibilities: "",
    requirements: "",

    // education / misc
    educationLevel: "",
    sourcePlatform: "",
    expiryDate: "",

    // application channels
    applicationUrl: "",
    applicationEmail: "",
    applicationWhatsApp: "",
    applicationPhone: "",
  });

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.postJob.view", {
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get("/categories?limit=1000")
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  // ── Auto-sync base form → advanced panel ─────────────────────────────
  useEffect(() => {
    setForm((f) => {
      const next = { ...f };
      let changed = false;

      if (!f.salaryCurrency && f.currency) {
        next.salaryCurrency = f.currency;
        changed = true;
      }

      const derivedPeriod = {
        HOURLY: "HOURLY",
        DAILY: "DAILY",
        WEEKLY: "WEEKLY",
        MONTHLY: "MONTHLY",
      }[f.budgetType];
      if (!f.salaryPeriod && derivedPeriod) {
        next.salaryPeriod = derivedPeriod;
        changed = true;
      }

      if (!f.durationValue && f.estimatedValue) {
        next.durationValue = f.estimatedValue;
        changed = true;
      }

      const upperUnit = (f.durationUnit || "").toUpperCase();
      if (
        upperUnit &&
        upperUnit !== "CUSTOM" &&
        f.durationType === "HOURS" &&
        upperUnit !== "HOURS"
      ) {
        next.durationType = upperUnit;
        changed = true;
      }

      const isPeriodBased = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"].includes(
        f.budgetType,
      );
      if (isPeriodBased && !f.salaryAmount && f.budget) {
        next.salaryAmount = f.budget;
        changed = true;
      }

      return changed ? next : f;
    });
  }, [
    form.currency,
    form.budgetType,
    form.budget,
    form.durationUnit,
    form.estimatedValue,
  ]);

  const filteredCats = categories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);

    // ── ANALYTICS: custom category attempt ───────────────────────────────
    tracker.action("postJob.customCategory.attempt", {
      name: customCatName.trim(),
    });

    try {
      const res = await api.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const newCat = res.data.data.category;
      setCategories((prev) => [...prev, newCat]);
      setForm((f) => ({ ...f, categoryId: newCat.id }));
      setCustomCatName("");
      setShowCustomCat(false);
      setCatSearch("");

      // ── ANALYTICS: custom category created ─────────────────────────────
      tracker.action("postJob.customCategory.created", {
        categoryId: newCat.id,
        categoryName: newCat.name,
      });
    } catch {
      setError("Failed to add custom category");

      // ── ANALYTICS: custom category failed ──────────────────────────────
      tracker.action("postJob.customCategory.failed", {
        name: customCatName.trim(),
      });
    } finally {
      setAddingCat(false);
    }
  }

  function toEstimatedHours(unit, value) {
    const v = parseFloat(value) || 0;
    if (unit === "hours") return v;
    if (unit === "days") return v * 8;
    if (unit === "weeks") return v * 40;
    if (unit === "months") return v * 160;
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

    // ── ANALYTICS: skill added ───────────────────────────────────────────
    tracker.track("postJob.skill.added", {
      skill: trimmed,
      totalSkills: form.skills.length + 1,
    });
  }

  function removeSkill(skill) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

    // ── ANALYTICS: skill removed ─────────────────────────────────────────
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.categoryId) {
      setError("Please select a category.");
      tracker.action("postJob.submit.blocked", {
        reason: "no_category",
      });
      return;
    }
    if (!form.title) {
      setError("Job title is required.");
      tracker.action("postJob.submit.blocked", {
        reason: "no_title",
      });
      return;
    }
    if (!form.description) {
      setError("Description is required.");
      tracker.action("postJob.submit.blocked", {
        reason: "no_description",
      });
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
      tracker.action("postJob.submit.blocked", {
        reason: "no_schedule",
      });
      return;
    }

    const hasBudget = form.budget !== "" && form.budget !== null;
    const hasSalary =
      form.salaryAmount !== "" ||
      form.salaryMin !== "" ||
      form.salaryMax !== "";
    if (!hasBudget && !hasSalary) {
      setError(
        "Please enter a budget, or provide a salary range (amount / min / max).",
      );
      tracker.action("postJob.submit.blocked", {
        reason: "no_budget_or_salary",
      });
      return;
    }

    if (
      form.salaryMin !== "" &&
      form.salaryMax !== "" &&
      parseFloat(form.salaryMax) < parseFloat(form.salaryMin)
    ) {
      setError("Salary maximum must be greater than or equal to minimum.");
      tracker.action("postJob.submit.blocked", {
        reason: "invalid_salary_range",
      });
      return;
    }

    setLoading(true);

    // ── ANALYTICS: submit attempt with full context ──────────────────────
    tracker.action("postJob.submit.attempt", {
      categoryId: form.categoryId,
      jobType: form.jobType,
      locationType: form.locationType,
      budgetType: form.budgetType,
      durationType: form.durationType,
      durationUnit: form.durationUnit,
      currency: form.currency,
      hasBudget: !!form.budget,
      hasSalaryRange: hasSalary,
      hasSalaryText: !!form.salaryText,
      hasCompanyName: !!form.companyName,
      hasSkills: form.skills.length > 0,
      skillCount: form.skills.length,
      hasApplicationUrl: !!form.applicationUrl,
      hasApplicationEmail: !!form.applicationEmail,
      hasApplicationWhatsApp: !!form.applicationWhatsApp,
      hasApplicationPhone: !!form.applicationPhone,
      advancedFieldsShown: showAdvanced,
    });

    try {
      const estimatedHours = toEstimatedHours(
        form.durationUnit,
        form.estimatedValue,
      );

      const clean = (v) =>
        v === "" || v === null || v === undefined ? undefined : v;

      const payload = {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,

        locationType: form.locationType,
        address: form.locationType !== "REMOTE" ? form.address : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,

        jobType: form.jobType,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : undefined,
        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: clean(form.durationUnit),
        estimatedValue: clean(form.estimatedValue),

        budget: hasBudget ? parseFloat(form.budget) : undefined,
        currency: clean(form.currency),
        budgetType: clean(form.budgetType),
        durationType: clean(form.durationType),
        durationValue: clean(form.durationValue),

        skills: form.skills,
        notes: clean(form.notes),

        companyName: clean(form.companyName),
        salaryText: clean(form.salaryText),

        salaryAmount:
          form.salaryAmount !== "" ? parseFloat(form.salaryAmount) : undefined,
        salaryMin:
          form.salaryMin !== "" ? parseFloat(form.salaryMin) : undefined,
        salaryMax:
          form.salaryMax !== "" ? parseFloat(form.salaryMax) : undefined,
        salaryCurrency: clean(form.salaryCurrency),
        salaryPeriod: clean(form.salaryPeriod),

        minQualification: clean(form.minQualification),
        experienceLevel: clean(form.experienceLevel),
        experienceLength: clean(form.experienceLength),
        languageRequirement: clean(form.languageRequirement),
        workingHours: clean(form.workingHours),
        applicantLocation: clean(form.applicantLocation),
        responsibilities: clean(form.responsibilities),
        requirements: clean(form.requirements),

        educationLevel: clean(form.educationLevel),
        sourcePlatform: clean(form.sourcePlatform),
        expiryDate: form.expiryDate
          ? new Date(form.expiryDate).toISOString()
          : undefined,

        applicationUrl: clean(form.applicationUrl),
        applicationEmail: clean(form.applicationEmail),
        applicationWhatsApp: clean(form.applicationWhatsApp),
        applicationPhone: clean(form.applicationPhone),
      };

      const res = await api.post("/jobs", payload);
      setPostedJob(res.data.data.jobPost);
      setSubmitted(true);

      // ── ANALYTICS: job posted successfully ─────────────────────────────
      tracker.action("postJob.success", {
        jobPostId: res.data.data.jobPost.id,
        categoryId: form.categoryId,
        jobType: form.jobType,
        locationType: form.locationType,
        budgetType: form.budgetType,
        currency: form.currency,
        budget: hasBudget ? parseFloat(form.budget) : null,
        skillCount: form.skills.length,
        hadAdvancedFields: showAdvanced,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job.");

      // ── ANALYTICS: job post failed ─────────────────────────────────────
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
    setShowAdvanced(false);

    // ── ANALYTICS: post another job ──────────────────────────────────────
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
      estimatedValue: "",
      durationUnit: "hours",
      budget: "",
      currency: "NGN",
      budgetType: "FIXED",
      durationType: "HOURS",
      durationValue: "",
      skills: [],
      notes: "",
      companyName: "",
      salaryText: "",
      salaryAmount: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "",
      salaryPeriod: "",
      minQualification: "",
      experienceLevel: "",
      experienceLength: "",
      languageRequirement: "",
      workingHours: "",
      applicantLocation: "",
      responsibilities: "",
      requirements: "",
      educationLevel: "",
      sourcePlatform: "",
      expiryDate: "",
      applicationUrl: "",
      applicationEmail: "",
      applicationWhatsApp: "",
      applicationPhone: "",
    });
    setSkillInput("");
  }

  const selectedCat = categories.find((c) => c.id === form.categoryId);

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

              {postedJob.companyName && (
                <div className={styles.successMeta}>
                  <FiUser size={12} /> {postedJob.companyName}
                </div>
              )}

              {hirer && !postedJob.companyName && (
                <div className={styles.successMeta}>
                  <FiUser size={12} />
                  {hirer.firstName} {hirer.lastName}
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

              {postedJob.salaryText ? (
                <div className={styles.successMeta}>
                  <FiDollarSign size={12} /> {postedJob.salaryText}
                </div>
              ) : (
                <div className={styles.successMeta}>
                  <FiDollarSign size={12} /> {postedJob.currency}{" "}
                  {Number(postedJob.budget).toLocaleString()}
                  {postedJob.budgetType &&
                    ` · ${
                      BUDGET_TYPES.find((t) => t.value === postedJob.budgetType)
                        ?.label
                    }`}
                </div>
              )}

              {postedJob.estimatedHours && (
                <div className={styles.successMeta}>
                  <FiClock size={12} /> Est. {postedJob.estimatedHours}h
                  {postedJob.estimatedUnit &&
                    ` (${postedJob.estimatedValue} ${postedJob.estimatedUnit})`}
                </div>
              )}

              {postedJob.durationType && postedJob.durationValue && (
                <div className={styles.successMeta}>
                  <FiCalendar size={12} /> Duration: {postedJob.durationValue}{" "}
                  {postedJob.durationType.toLowerCase()}
                </div>
              )}

              {postedJob.jobType && (
                <div className={styles.successMeta}>
                  <FiBriefcase size={12} />{" "}
                  {JOB_TYPES.find((t) => t.value === postedJob.jobType)?.label}
                </div>
              )}

              {postedJob.experienceLevel && (
                <div className={styles.successMeta}>
                  <FiTrendingUp size={12} /> {postedJob.experienceLevel}
                  {postedJob.experienceLength &&
                    ` · ${postedJob.experienceLength}`}
                </div>
              )}

              {postedJob.educationLevel && (
                <div className={styles.successMeta}>
                  <FiBookOpen size={12} />{" "}
                  {EDUCATION_LEVELS.find(
                    (t) => t.value === postedJob.educationLevel,
                  )?.label || postedJob.educationLevel}
                </div>
              )}

              {postedJob.scheduledAt && (
                <div className={styles.successMeta}>
                  <FiCalendar size={12} />{" "}
                  {new Date(postedJob.scheduledAt).toLocaleString()}
                </div>
              )}

              {postedJob.skills?.length > 0 && (
                <div className={styles.successMeta}>
                  <FiTag size={12} /> {postedJob.skills.length} skill
                  {postedJob.skills.length !== 1 ? "s" : ""} required
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
                className={styles.submitBtn}
                data-track-id="postJob.success.viewMyJobs"
              >
                View My Jobs
              </Link>
              <button
                className={styles.resetBtn}
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

            // ── ANALYTICS: AI assistant result applied ─────────────────────
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

            <input
              className={styles.input}
              placeholder="Search categories..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              style={{ marginBottom: 6 }}
              data-track-id="postJob.category.search"
            />

            <select
              className={styles.select}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              size={catSearch ? Math.min(filteredCats.length + 1, 8) : 1}
              data-track-id="postJob.category.select"
            >
              {!catSearch && <option value="">Select a category</option>}
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                  {c.isUserSubmitted ? " (custom)" : ""}
                </option>
              ))}
            </select>

            {selectedCat && (
              <div className={styles.selectedCat}>
                <FiCheckCircle size={13} /> Selected:{" "}
                <strong>
                  {selectedCat.icon} {selectedCat.name}
                </strong>
                <button
                  type="button"
                  className={styles.clearCat}
                  onClick={() => {
                    set("categoryId", "");
                    setCatSearch("");
                    tracker.track("postJob.category.cleared");
                  }}
                  data-track-id="postJob.category.clear"
                >
                  <FiX size={14} />
                </button>
              </div>
            )}

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
                <FiPlus size={13} /> Can't find your category? Add a custom one
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

          {/* ── Estimated Duration ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Estimated Duration <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              How long will the actual work take to complete? Choose a unit
              (hours / days / weeks / months), then enter the number. This is
              used to calculate a rough hourly breakdown and helps workers judge
              whether they can fit the job in.
            </p>
            <div className={styles.durationRow}>
              <div className={styles.unitPills}>
                {DURATION_UNITS.map((u) => (
                  <button
                    type="button"
                    key={u.value}
                    className={`${styles.unitPill} ${
                      form.durationUnit === u.value ? styles.unitPillActive : ""
                    }`}
                    onClick={() => set("durationUnit", u.value)}
                    data-track-id={`postJob.durationUnit.${u.value}`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <input
                className={styles.input}
                type={form.durationUnit === "custom" ? "text" : "number"}
                min={form.durationUnit !== "custom" ? "" : undefined}
                step={
                  form.durationUnit === "hours"
                    ? "0.5"
                    : form.durationUnit === "custom"
                      ? undefined
                      : "1"
                }
                placeholder={
                  DURATION_UNITS.find((u) => u.value === form.durationUnit)
                    ?.hint || ""
                }
                value={form.estimatedValue}
                onChange={(e) => set("estimatedValue", e.target.value)}
                style={{ marginTop: 8 }}
                data-track-id="postJob.estimatedValue"
              />
              {form.estimatedValue && form.durationUnit !== "custom" && (
                <p className={styles.durationSummary}>
                  ✓ Est. {form.estimatedValue} {form.durationUnit} = approx.{" "}
                  {toEstimatedHours(form.durationUnit, form.estimatedValue)}h of
                  work
                </p>
              )}
            </div>
          </div>

          {/* ── Project Duration ── */}
          <div className={styles.field}>
            <label className={styles.label}>Project Duration</label>
            <p className={styles.fieldHint}>
              How long the whole engagement is expected to run — this often
              differs from the actual work time. Example: a 4-hour painting job
              spread over 2 days (2 hours/day) has an estimated duration of{" "}
              <strong>4 hours</strong> but a project duration of{" "}
              <strong>2 days</strong>. If the whole job runs in one sitting,
              leave this blank or match it to the estimated duration.
            </p>
            <div className={styles.row2} style={{ marginTop: 4 }}>
              <select
                className={styles.select}
                value={form.durationType}
                onChange={(e) => set("durationType", e.target.value)}
                data-track-id="postJob.durationType"
              >
                {DURATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                type={form.durationType === "CUSTOM" ? "text" : "number"}
                min="0"
                placeholder={
                  form.durationType === "CUSTOM"
                    ? "Describe the duration"
                    : "e.g. 2"
                }
                value={form.durationValue}
                onChange={(e) => set("durationValue", e.target.value)}
                data-track-id="postJob.durationValue"
              />
            </div>
            {form.durationValue && form.durationType && (
              <p className={styles.durationSummary}>
                ✓ Project runs for {form.durationValue}{" "}
                {form.durationType.toLowerCase()}
              </p>
            )}
          </div>

          {/* ── Budget + Currency + Budget Type ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Budget <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              Pick a payment style: <strong>Fixed</strong> for one total amount,
              or <strong>Hourly / Daily / Weekly / Monthly</strong> if you want
              to pay per unit of time. For richer salary options (like a rate
              range with min/max), open the advanced panel below — anything you
              set here carries over automatically.
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
            <div className={styles.unitPills} style={{ marginTop: 8 }}>
              {BUDGET_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  className={`${styles.unitPill} ${
                    form.budgetType === t.value ? styles.unitPillActive : ""
                  }`}
                  onClick={() => set("budgetType", t.value)}
                  data-track-id={`postJob.budgetType.${t.value}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {form.budget && form.budgetType && (
              <p className={styles.durationSummary}>
                ✓ You're offering{" "}
                <strong>
                  {form.currency}{" "}
                  {parseFloat(form.budget || 0).toLocaleString()}
                </strong>{" "}
                {form.budgetType === "FIXED"
                  ? "as the total project budget"
                  : `per ${form.budgetType.toLowerCase().replace("ly", "")}`}
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

          {/* ── Advanced / External-Style Fields (collapsible) ── */}
          <div className={styles.field} style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.addCatBtn}
              style={{ padding: 12, fontSize: 13 }}
              onClick={() => {
                const next = !showAdvanced;
                setShowAdvanced(next);
                tracker.track("postJob.advancedPanel.toggled", {
                  opened: next,
                });
              }}
              data-track-id="postJob.advancedPanel.toggle"
            >
              {showAdvanced ? (
                <>
                  <FiX size={14} /> Hide advanced fields
                </>
              ) : (
                <>
                  <FiPlus size={14} /> Add advanced fields (company, salary
                  range, experience, application link, etc.)
                </>
              )}
            </button>
          </div>

          {showAdvanced && (
            <>
              {/* ── Company + Salary Text ── */}
              <div className={styles.field}>
                <label className={styles.label}>Company Name</label>
                <input
                  className={styles.input}
                  placeholder="e.g. SkilledProz Farms Ltd"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  data-track-id="postJob.advanced.companyName"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Salary Text</label>
                <p className={styles.fieldHint}>
                  Optional human-readable headline shown on job cards (e.g.
                  "₦250,000 a month"). If you fill this, it takes priority over
                  the numeric salary fields in the public listing.
                </p>
                <input
                  className={styles.input}
                  placeholder="e.g. ₦250,000 a month"
                  value={form.salaryText}
                  onChange={(e) => set("salaryText", e.target.value)}
                  data-track-id="postJob.advanced.salaryText"
                />
              </div>

              {/* ── Salary Range ── */}
              <div className={styles.field}>
                <label className={styles.label}>Salary Range</label>
                <p className={styles.fieldHint}>
                  Optional. Use this when you want to publish a{" "}
                  <strong>rate range</strong> (min–max) instead of a single
                  figure. When filled, the platform treats this as the primary
                  salary and makes the budget field optional. The currency and
                  cadence carry over from the base form above.
                </p>
                <div className={styles.row2}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Fixed amount (optional)"
                    value={form.salaryAmount}
                    onChange={(e) => set("salaryAmount", e.target.value)}
                    data-track-id="postJob.advanced.salaryAmount"
                  />
                  <select
                    className={styles.select}
                    value={form.salaryCurrency}
                    onChange={(e) => set("salaryCurrency", e.target.value)}
                    data-track-id="postJob.advanced.salaryCurrency"
                  >
                    <option value="">Salary Currency</option>
                    {ALL_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.row2} style={{ marginTop: 8 }}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min (optional)"
                    value={form.salaryMin}
                    onChange={(e) => set("salaryMin", e.target.value)}
                    data-track-id="postJob.advanced.salaryMin"
                  />
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max (optional)"
                    value={form.salaryMax}
                    onChange={(e) => set("salaryMax", e.target.value)}
                    data-track-id="postJob.advanced.salaryMax"
                  />
                </div>
                <div className={styles.unitPills} style={{ marginTop: 8 }}>
                  {SALARY_PERIODS.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      className={`${styles.unitPill} ${
                        form.salaryPeriod === p.value
                          ? styles.unitPillActive
                          : ""
                      }`}
                      onClick={() =>
                        set(
                          "salaryPeriod",
                          form.salaryPeriod === p.value ? "" : p.value,
                        )
                      }
                      data-track-id={`postJob.advanced.salaryPeriod.${p.value}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {(form.salaryAmount || form.salaryMin || form.salaryMax) && (
                  <p className={styles.durationSummary}>
                    ✓ Salary range set
                    {form.salaryPeriod &&
                      ` · per ${form.salaryPeriod.toLowerCase()}`}
                    {form.salaryCurrency && ` · ${form.salaryCurrency}`}
                  </p>
                )}
              </div>

              {/* ── Experience / Education ── */}
              <div className={styles.field}>
                <label className={styles.label}>Experience Level</label>
                <div className={styles.unitPills}>
                  {EXPERIENCE_LEVELS.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      className={`${styles.unitPill} ${
                        form.experienceLevel === t.value
                          ? styles.unitPillActive
                          : ""
                      }`}
                      onClick={() =>
                        set(
                          "experienceLevel",
                          form.experienceLevel === t.value ? "" : t.value,
                        )
                      }
                      data-track-id={`postJob.advanced.experienceLevel.${t.value}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <input
                  className={styles.input}
                  style={{ marginTop: 8 }}
                  placeholder="e.g. 2 years"
                  value={form.experienceLength}
                  onChange={(e) => set("experienceLength", e.target.value)}
                  data-track-id="postJob.advanced.experienceLength"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Education Level</label>
                <select
                  className={styles.select}
                  value={form.educationLevel}
                  onChange={(e) => set("educationLevel", e.target.value)}
                  data-track-id="postJob.advanced.educationLevel"
                >
                  <option value="">Select education level</option>
                  {EDUCATION_LEVELS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Requirements ── */}
              <div className={styles.field}>
                <label className={styles.label}>Minimum Qualification</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Diploma in Agriculture"
                  value={form.minQualification}
                  onChange={(e) => set("minQualification", e.target.value)}
                  data-track-id="postJob.advanced.minQualification"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Language Requirement</label>
                <input
                  className={styles.input}
                  placeholder="e.g. English, Yoruba"
                  value={form.languageRequirement}
                  onChange={(e) => set("languageRequirement", e.target.value)}
                  data-track-id="postJob.advanced.languageRequirement"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Working Hours</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Full time — Mon–Sat, 8am–5pm"
                  value={form.workingHours}
                  onChange={(e) => set("workingHours", e.target.value)}
                  data-track-id="postJob.advanced.workingHours"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Applicant Location</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Lagos, Nigeria"
                  value={form.applicantLocation}
                  onChange={(e) => set("applicantLocation", e.target.value)}
                  data-track-id="postJob.advanced.applicantLocation"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Responsibilities</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Day-to-day responsibilities of the role..."
                  value={form.responsibilities}
                  onChange={(e) => set("responsibilities", e.target.value)}
                  data-track-id="postJob.advanced.responsibilities"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Requirements</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Must-haves, tools, certifications..."
                  value={form.requirements}
                  onChange={(e) => set("requirements", e.target.value)}
                  data-track-id="postJob.advanced.requirements"
                />
              </div>

              {/* ── Application Channels ── */}
              <div className={styles.field}>
                <label className={styles.label}>Application Channels</label>
                <p className={styles.fieldHint}>
                  Optional for internal jobs. Required only if you're posting an
                  external-style job (with company name / salary text).
                </p>

                <div className={styles.applyChannelList}>
                  <div className={styles.applyChannelRow}>
                    <FiLink size={16} className={styles.applyChannelIcon} />
                    <input
                      className={styles.input}
                      type="url"
                      placeholder="Application URL (https://…)"
                      value={form.applicationUrl}
                      onChange={(e) => set("applicationUrl", e.target.value)}
                      data-track-id="postJob.advanced.applicationUrl"
                    />
                  </div>
                  <div className={styles.applyChannelRow}>
                    <FiMail size={16} className={styles.applyChannelIcon} />
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="Application email"
                      value={form.applicationEmail}
                      onChange={(e) => set("applicationEmail", e.target.value)}
                      data-track-id="postJob.advanced.applicationEmail"
                    />
                  </div>
                  <div className={styles.applyChannelRow}>
                    <FiMessageCircle
                      size={16}
                      className={styles.applyChannelIcon}
                    />
                    <input
                      className={styles.input}
                      placeholder="WhatsApp number (e.g. +2348012345678)"
                      value={form.applicationWhatsApp}
                      onChange={(e) =>
                        set("applicationWhatsApp", e.target.value)
                      }
                      data-track-id="postJob.advanced.applicationWhatsApp"
                    />
                  </div>
                  <div className={styles.applyChannelRow}>
                    <FiPhone size={16} className={styles.applyChannelIcon} />
                    <input
                      className={styles.input}
                      placeholder="Phone number (e.g. +2348012345678)"
                      value={form.applicationPhone}
                      onChange={(e) => set("applicationPhone", e.target.value)}
                      data-track-id="postJob.advanced.applicationPhone"
                    />
                  </div>
                </div>
              </div>

              {/* ── Misc ── */}
              <div className={styles.field}>
                <label className={styles.label}>Source Platform</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Indeed, LinkedIn (for external jobs)"
                  value={form.sourcePlatform}
                  onChange={(e) => set("sourcePlatform", e.target.value)}
                  data-track-id="postJob.advanced.sourcePlatform"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.expiryDate}
                  onChange={(e) => set("expiryDate", e.target.value)}
                  data-track-id="postJob.advanced.expiryDate"
                />
              </div>
            </>
          )}

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
