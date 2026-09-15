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
  FiCreditCard,
  FiCalendar,
  FiEdit3,
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiX,
  FiTarget,
  FiZap,
  FiTag,
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

// ── New: Job type options (matches backend JobType enum) ────────────────────
const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", icon: FiBriefcase },
  { value: "PART_TIME", label: "Part-time", icon: FiClock },
  { value: "CONTRACT", label: "Contract", icon: FiFileText },
  { value: "TEMPORARY", label: "Temporary", icon: FiClock },
];

// ── New: Location type options (matches backend LocationType enum) ──────────
const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", icon: FiGlobe },
  { value: "ON_SITE", label: "On-site", icon: FiMapPin },
  { value: "HYBRID", label: "Hybrid", icon: FiShuffle },
];

// ── New: Budget type options (matches backend BudgetType enum) ──────────────
const BUDGET_TYPES = [
  { value: "FIXED", label: "Fixed" },
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

// ── New: Duration type options (matches backend DurationType enum) ──────────
const DURATION_TYPES = [
  { value: "HOURS", label: "Hours" },
  { value: "DAYS", label: "Days" },
  { value: "WEEKS", label: "Weeks" },
  { value: "MONTHS", label: "Months" },
  { value: "CUSTOM", label: "Custom" },
];

// ── New: Common skill suggestions ───────────────────────────────────────────
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

  // ── New: skill input state ───────────────────────────────────────────────
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description: "",
    address: "",
    scheduledAt: "",
    durationUnit: "hours",
    durationValue: "",
    budget: "",
    currency: "NGN",
    notes: "",
    // ── New backend fields ──────────────────────────────────────────────
    jobType: "FULL_TIME",
    locationType: "REMOTE",
    budgetType: "FIXED",
    durationType: "HOURS",
    durationValue2: "", // ← the DurationType's numeric value, separate from estimate
    skills: [],
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

  // ── New: skill management ────────────────────────────────────────────────
  function addSkill(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    if (form.skills.length >= 15) {
      setError("Maximum 15 skills");
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    setSkillInput("");
    setError("");
  }

  function removeSkill(skill) {
    setForm((f) => ({
      ...f,
      skills: f.skills.filter((s) => s !== skill),
    }));
  }

  function handleSkillKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === "Backspace" && !skillInput && form.skills.length) {
      // Remove last skill on backspace when input is empty
      removeSkill(form.skills[form.skills.length - 1]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // ── Validation ─────────────────────────────────────────────────────────
    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!form.title || !form.description) {
      setError("Title and description are required.");
      return;
    }
    // Address only required for ON_SITE or HYBRID
    if (form.locationType !== "REMOTE" && !form.address) {
      setError("Please enter a service address for on-site or hybrid jobs.");
      return;
    }
    if (!form.scheduledAt) {
      setError("Please choose a scheduled date and time.");
      return;
    }
    if (!form.budget) {
      setError("Please enter a budget.");
      return;
    }
    if (!form.durationValue) {
      setError("Please enter an estimated duration.");
      return;
    }

    setLoading(true);
    try {
      const estimatedHours = toEstimatedHours(
        form.durationUnit,
        form.durationValue,
      );
      const payload = {
        // Existing fields
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: form.locationType === "REMOTE" ? undefined : form.address,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours || undefined,
        estimatedUnit: form.durationUnit,
        estimatedValue: form.durationValue,
        budget: parseFloat(form.budget),
        currency: form.currency,
        notes: form.notes,
        // ── New fields ───────────────────────────────────────────────────
        jobType: form.jobType,
        locationType: form.locationType,
        budgetType: form.budgetType,
        durationType: form.durationType,
        durationValue: form.durationValue2 || undefined,
        skills: form.skills,
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
    setForm({
      categoryId: "",
      title: "",
      description: "",
      address: "",
      scheduledAt: "",
      durationUnit: "hours",
      durationValue: "",
      budget: "",
      currency: "NGN",
      notes: "",
      jobType: "FULL_TIME",
      locationType: "REMOTE",
      budgetType: "FIXED",
      durationType: "HOURS",
      durationValue2: "",
      skills: [],
    });
    setSkillInput("");
  }

  const selectedCat = categories.find((c) => c.id === form.categoryId);

  // ── Success state ──────────────────────────────────────────────────────
  if (submitted && postedJob) {
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
              <div className={styles.successMeta}>
                <FiMapPin size={12} /> {postedJob.address || "Remote"}
              </div>
              <div className={styles.successMeta}>
                <FiDollarSign size={12} /> {postedJob.currency}{" "}
                {Number(postedJob.budget).toLocaleString()}
              </div>
              {postedJob.estimatedHours && (
                <div className={styles.successMeta}>
                  <FiClock size={12} /> Est. {postedJob.estimatedHours}h
                </div>
              )}
              {postedJob.jobType && (
                <div className={styles.successMeta}>
                  <FiBriefcase size={12} />{" "}
                  {JOB_TYPES.find((t) => t.value === postedJob.jobType)?.label}
                </div>
              )}
              {postedJob.skills?.length > 0 && (
                <div className={styles.successMeta}>
                  <FiTag size={12} /> {postedJob.skills.length} skill
                  {postedJob.skills.length !== 1 ? "s" : ""} required
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

          {/* ── NEW: Job Type ── */}
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

          {/* ── NEW: Location Type ── */}
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

          {/* ── Address (only when not Remote) ── */}
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
                value={form.durationValue}
                onChange={(e) => set("durationValue", e.target.value)}
                style={{ marginTop: 8 }}
              />
              {form.durationValue && form.durationUnit !== "custom" && (
                <p className={styles.durationSummary}>
                  Est. {form.durationValue} {form.durationUnit} = approx.{" "}
                  {toEstimatedHours(form.durationUnit, form.durationValue)}h
                </p>
              )}
            </div>
          </div>

          {/* ── NEW: Job Duration (backend durationType + durationValue) ── */}
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
                value={form.durationValue2}
                onChange={(e) => set("durationValue2", e.target.value)}
              />
            </div>
          </div>

          {/* ── Budget + Currency + Budget Type ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Budget <span className={styles.req}>*</span>
            </label>
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
            {/* Budget type pills */}
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

          {/* ── NEW: Skills ── */}
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

            {/* Quick-add suggestions */}
            {form.skills.length < 15 && (
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
