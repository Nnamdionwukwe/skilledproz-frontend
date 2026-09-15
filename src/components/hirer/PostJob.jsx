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

  useEffect(() => {
    api
      .get("/categories?limit=1000")
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  const filteredCats = categories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
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
    } catch {
      setError("Failed to add custom category");
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

    const hasBudget = form.budget !== "" && form.budget !== null;
    const hasSalary =
      form.salaryAmount !== "" ||
      form.salaryMin !== "" ||
      form.salaryMax !== "";
    if (!hasBudget && !hasSalary) {
      return setError(
        "Please enter a budget, or provide a salary range (amount / min / max).",
      );
    }

    if (
      form.salaryMin !== "" &&
      form.salaryMax !== "" &&
      parseFloat(form.salaryMax) < parseFloat(form.salaryMin)
    ) {
      return setError(
        "Salary maximum must be greater than or equal to minimum.",
      );
    }

    setLoading(true);
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
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setPostedJob(null);
    setError("");
    setShowAdvanced(false);
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
              >
                View My Jobs
              </Link>
              <button className={styles.resetBtn} onClick={resetForm}>
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
            />

            <select
              className={styles.select}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              size={catSearch ? Math.min(filteredCats.length + 1, 8) : 1}
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
                  }}
                >
                  <FiX size={14} />
                </button>
              </div>
            )}

            {!showCustomCat ? (
              <button
                type="button"
                className={styles.addCatBtn}
                onClick={() => setShowCustomCat(true)}
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
              Scheduled Date & Time <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
            />
          </div>

          {/* ── Estimated Duration ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Estimated Duration <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              Choose how long you expect the job to take.
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
              />
              {form.estimatedValue && form.durationUnit !== "custom" && (
                <p className={styles.durationSummary}>
                  Est. {form.estimatedValue} {form.durationUnit} = approx.{" "}
                  {toEstimatedHours(form.durationUnit, form.estimatedValue)}h
                </p>
              )}
            </div>
          </div>

          {/* ── Project Duration ── */}
          <div className={styles.field}>
            <label className={styles.label}>Project Duration</label>
            <p className={styles.fieldHint}>
              How long is the overall engagement expected to run?
            </p>
            <div className={styles.row2} style={{ marginTop: 4 }}>
              <select
                className={styles.select}
                value={form.durationType}
                onChange={(e) => set("durationType", e.target.value)}
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
                    : "Enter duration"
                }
                value={form.durationValue}
                onChange={(e) => set("durationValue", e.target.value)}
              />
            </div>
          </div>

          {/* ── Budget + Currency + Budget Type ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Budget <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              Enter a fixed budget, or scroll down to provide a salary range
              instead.
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
            <div className={styles.unitPills} style={{ marginTop: 8 }}>
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

          {/* ── Advanced / External-Style Fields (collapsible) ── */}
          <div className={styles.field} style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.addCatBtn}
              style={{ padding: 12, fontSize: 13 }}
              onClick={() => setShowAdvanced((v) => !v)}
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
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Salary Text</label>
                <p className={styles.fieldHint}>
                  Short human-readable salary, shown on job cards.
                </p>
                <input
                  className={styles.input}
                  placeholder="e.g. ₦250,000 a month"
                  value={form.salaryText}
                  onChange={(e) => set("salaryText", e.target.value)}
                />
              </div>

              {/* ── Salary Range ── */}
              <div className={styles.field}>
                <label className={styles.label}>Salary Range</label>
                <p className={styles.fieldHint}>
                  If provided, budget becomes optional. Currency must match the
                  platform-supported list.
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
                  />
                  <select
                    className={styles.select}
                    value={form.salaryCurrency}
                    onChange={(e) => set("salaryCurrency", e.target.value)}
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
                  />
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max (optional)"
                    value={form.salaryMax}
                    onChange={(e) => set("salaryMax", e.target.value)}
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
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
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
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Education Level</label>
                <select
                  className={styles.select}
                  value={form.educationLevel}
                  onChange={(e) => set("educationLevel", e.target.value)}
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
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Language Requirement</label>
                <input
                  className={styles.input}
                  placeholder="e.g. English, Yoruba"
                  value={form.languageRequirement}
                  onChange={(e) => set("languageRequirement", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Working Hours</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Full time — Mon–Sat, 8am–5pm"
                  value={form.workingHours}
                  onChange={(e) => set("workingHours", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Applicant Location</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Lagos, Nigeria"
                  value={form.applicantLocation}
                  onChange={(e) => set("applicantLocation", e.target.value)}
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
                    />
                  </div>
                  <div className={styles.applyChannelRow}>
                    <FiPhone size={16} className={styles.applyChannelIcon} />
                    <input
                      className={styles.input}
                      placeholder="Phone number (e.g. +2348012345678)"
                      value={form.applicationPhone}
                      onChange={(e) => set("applicationPhone", e.target.value)}
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
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.expiryDate}
                  onChange={(e) => set("expiryDate", e.target.value)}
                />
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
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
