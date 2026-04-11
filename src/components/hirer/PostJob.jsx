import { useState, useEffect } from "react";
import styles from "./PostJob.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import AIJobAssistant from "./AIJobAssistant";
import { Link } from "react-router-dom";

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
  });

  useEffect(() => {
    api
      .get("/categories?limit=500")
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

  // Convert duration to estimatedHours for DB
  function toEstimatedHours(unit, value) {
    const v = parseFloat(value) || 0;
    if (unit === "hours") return v;
    if (unit === "days") return v * 8;
    if (unit === "weeks") return v * 40;
    if (unit === "months") return v * 160;
    return null; // custom
  }

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (
      !form.categoryId ||
      !form.title ||
      !form.description ||
      !form.address ||
      !form.scheduledAt ||
      !form.budget
    ) {
      setError("Please fill in all required fields.");
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
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: form.address,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours || undefined,
        estimatedUnit: form.durationUnit,
        estimatedValue: form.durationValue,
        budget: parseFloat(form.budget),
        currency: form.currency,
        notes: form.notes,
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
    });
  }

  const selectedCat = categories.find((c) => c.id === form.categoryId);

  if (submitted && postedJob) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>🎯</div>
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
              <div className={styles.successMeta}>📍 {postedJob.address}</div>
              <div className={styles.successMeta}>
                💰 {postedJob.currency}{" "}
                {Number(postedJob.budget).toLocaleString()}
              </div>
              {postedJob.estimatedHours && (
                <div className={styles.successMeta}>
                  ⏱ Est. {postedJob.estimatedHours}h
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

            {/* Search filter */}
            <input
              className={styles.input}
              placeholder="🔍 Search categories..."
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
                ✅ Selected:{" "}
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
                  ×
                </button>
              </div>
            )}

            {/* Custom category option */}
            {!showCustomCat ? (
              <button
                type="button"
                className={styles.addCatBtn}
                onClick={() => setShowCustomCat(true)}
              >
                + Can't find your category? Add a custom one
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

          {/* ── Address ── */}
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

          {/* ── Duration ── */}
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
                    className={`${styles.unitPill} ${form.durationUnit === u.value ? styles.unitPillActive : ""}`}
                    onClick={() => set("durationUnit", u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <input
                className={styles.input}
                type={form.durationUnit === "custom" ? "text" : "number"}
                min={form.durationUnit !== "custom" ? "0.5" : undefined}
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
                  Est. {form.durationValue} {form.durationUnit}
                  {parseFloat(form.durationValue) !== 1 ? "" : ""} = approx.{" "}
                  {toEstimatedHours(form.durationUnit, form.durationValue)}h
                </p>
              )}
            </div>
          </div>

          {/* ── Budget + Currency ── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Budget <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Currency</label>
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
              <>🎯 Post Job</>
            )}
          </button>
        </form>
      </div>
    </HirerLayout>
  );
}
