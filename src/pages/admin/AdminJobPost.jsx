// src/pages/admin/AdminJobPost.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminJobPost.module.css";

// ─── Constants ──────────────────────────────────────────────────────────────
const CURRENCIES = [
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

const SALARY_PERIODS = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const EDUCATION_LEVELS = [
  "HIGH_SCHOOL",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
  "CERTIFICATION",
  "OTHER",
];
const LOCATION_TYPES = ["REMOTE", "ON_SITE", "HYBRID"];
const JOB_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
];
const EXPERIENCE_LEVELS = ["Entry level", "Mid level", "Senior level"];

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// ─── Toast Component ──────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
      {toast.msg}
      <button className={s.toastClose} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

export default function AdminJobPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ── New category state ──────────────────────────────────────────────────
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [addingCategory, setAddingCategory] = useState(false);

  const [form, setForm] = useState({
    title: "",
    companyName: "",
    location: "",
    jobType: "FULL_TIME",
    salaryText: "",
    salaryAmount: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    salaryPeriod: "MONTHLY",
    educationLevel: "BACHELOR",
    locationType: "REMOTE",
    description: "",
    responsibilities: "",
    requirements: "",
    minQualification: "",
    experienceLevel: "Entry level",
    experienceLength: "",
    languageRequirement: "English",
    workingHours: "",
    applicantLocation: "",
    applicationUrl: "",
    applicationEmail: "",
    applicationWhatsApp: "",
    applicationPhone: "",
    skills: "",
    sourcePlatform: "",
    categoryIds: [],
    expiryDate: "",
    isActive: true,
  });

  function showToast(msg, type = "success") {
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    setToast({ msg, type });
    window.toastTimeout = setTimeout(() => setToast(null), 3500);
  }

  function closeToast() {
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    setToast(null);
  }

  // ── Load categories (public endpoint) ──────────────────────────────────
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      // Use the public endpoint – it has a higher limit (1000) and returns all categories
      const res = await api.get("/categories", {
        params: { limit: 1000 },
      });
      const cats = res.data.data?.categories || [];
      setCategories(cats);
      return cats;
    } catch (err) {
      console.error("Failed to load categories:", err);
      showToast("Failed to load categories", "error");
      return [];
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // ── If editing, load job data ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/admin/external/jobs/${id}`)
      .then((res) => {
        const job = res.data.data?.job || res.data;
        setForm({
          title: job.title || "",
          companyName: job.companyName || "",
          location: job.address || job.location || "",
          jobType: job.jobType || "FULL_TIME",
          salaryText: job.salaryText || "",
          salaryAmount: job.salaryAmount || "",
          salaryMin: job.salaryMin || "",
          salaryMax: job.salaryMax || "",
          salaryCurrency: job.salaryCurrency || "NGN",
          salaryPeriod: job.salaryPeriod || "MONTHLY",
          educationLevel: job.educationLevel || "OTHER",
          locationType: job.locationType || "REMOTE",
          description: job.description || "",
          responsibilities: job.responsibilities || "",
          requirements: job.requirements || "",
          minQualification: job.minQualification || "",
          experienceLevel: job.experienceLevel || "Entry level",
          experienceLength: job.experienceLength || "",
          languageRequirement: job.languageRequirement || "English",
          workingHours: job.workingHours || "",
          applicantLocation: job.applicantLocation || "",
          applicationUrl: job.applicationUrl || "",
          applicationEmail: job.applicationEmail || "",
          applicationWhatsApp: job.applicationWhatsApp || "",
          applicationPhone: job.applicationPhone || "",
          skills: job.skills ? job.skills.join(", ") : "",
          sourcePlatform: job.sourcePlatform || "",
          categoryIds: job.categories?.map((c) => c.categoryId || c.id) || [],
          expiryDate: formatDateForInput(job.expiryDate),
          isActive: job.status === "OPEN",
        });
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load job"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoryToggle = (catId) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  };

  // ── Add new category ──────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    setAddingCategory(true);
    setError("");
    try {
      const res = await api.post("/categories/suggest", {
        name: newCategory.name.trim(),
        description:
          newCategory.description.trim() ||
          `${newCategory.name.trim()} category`,
      });
      const data = res.data.data;

      if (data.alreadyExists) {
        const cat = data.category;
        if (!form.categoryIds.includes(cat.id)) {
          setForm((prev) => ({
            ...prev,
            categoryIds: [...prev.categoryIds, cat.id],
          }));
        }
        showToast(`✅ "${cat.name}" already exists – selected`, "info");
        setNewCategory({ name: "", description: "" });
      } else {
        const newCat = data.category;
        // Reload categories to include the new one
        await loadCategories();
        // Select the new category
        setForm((prev) => ({
          ...prev,
          categoryIds: [...prev.categoryIds, newCat.id],
        }));
        showToast(`✅ "${newCat.name}" added successfully!`, "success");
        setNewCategory({ name: "", description: "" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add category.");
      showToast("❌ Failed to add category. Please try again.", "error");
    } finally {
      setAddingCategory(false);
    }
  };

  // ── Submit form ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (
      !form.title ||
      !form.companyName ||
      !form.location ||
      (!form.applicationUrl &&
        !form.applicationEmail &&
        !form.applicationWhatsApp &&
        !form.applicationPhone)
    ) {
      setError(
        "Title, Company, Location, and at least one application method are required.",
      );
      setSubmitting(false);
      return;
    }

    const payload = {
      ...form,
      salaryAmount: form.salaryAmount ? parseFloat(form.salaryAmount) : null,
      salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : null, // ← ADD THIS
      salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : null, // ← ADD THIS
      expiryDate: form.expiryDate
        ? new Date(form.expiryDate).toISOString() // → "2026-06-22T00:00:00.000Z"
        : null,
      isActive: form.isActive,
      skills: form.skills
        ? form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    try {
      const url = id ? `/admin/external/jobs/${id}` : "/admin/external/jobs";
      const method = id ? "put" : "post";
      await api[method](url, payload);
      navigate("/admin/external/jobs");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${id ? "update" : "create"} job`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={s.page}>
          <div className={s.loader}>Loading job data…</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={s.page}>
        <Toast toast={toast} onClose={closeToast} />

        <div className={s.header}>
          <h1 className={s.title}>
            {id ? "Edit External Job" : "Create New External Job"}
          </h1>
          <button
            className={s.cancelBtn}
            onClick={() => navigate("/admin/external/jobs")}
          >
            ← Back
          </button>
        </div>

        {error && <div className={s.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={s.form}>
          {/* ── Row 1: Basic info ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Job Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Social Media Manager"
                required
              />
            </div>
            <div className={s.field}>
              <label>Company Name *</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="e.g. Leading Edge Insperogel"
                required
              />
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Location *</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Nigeria"
                required
              />
            </div>
            <div className={s.field}>
              <label>Location Type</label>
              <select
                name="locationType"
                value={form.locationType}
                onChange={handleChange}
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Row 2: Job Type & Experience Level ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Job Type</label>
              <select
                name="jobType"
                value={form.jobType}
                onChange={handleChange}
              >
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label>Experience Level</label>
              <select
                name="experienceLevel"
                value={form.experienceLevel}
                onChange={handleChange}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Salary Section ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Salary Min</label>
              <input
                name="salaryMin"
                type="number"
                step="0.01"
                value={form.salaryMin}
                onChange={handleChange}
                placeholder="e.g. 200"
              />
            </div>
            <div className={s.field}>
              <label>Salary Max (optional)</label>
              <input
                name="salaryMax"
                type="number"
                step="0.01"
                value={form.salaryMax}
                onChange={handleChange}
                placeholder="e.g. 300"
              />
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Currency</label>
              <select
                name="salaryCurrency"
                value={form.salaryCurrency}
                onChange={handleChange}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label>Salary Period</label>
              <select
                name="salaryPeriod"
                value={form.salaryPeriod}
                onChange={handleChange}
              >
                {SALARY_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Salary Text (optional)</label>
              <input
                name="salaryText"
                value={form.salaryText}
                onChange={handleChange}
                placeholder="e.g. ₦350,000 a month"
              />
            </div>
          </div>

          {/* ── Row 4: Education & Language ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Education Level</label>
              <select
                name="educationLevel"
                value={form.educationLevel}
                onChange={handleChange}
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label>Language Requirement</label>
              <input
                name="languageRequirement"
                value={form.languageRequirement}
                onChange={handleChange}
                placeholder="e.g. English, French"
              />
            </div>
          </div>

          {/* ── Row 5: Experience Length & Working Hours ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Experience Length</label>
              <input
                name="experienceLength"
                value={form.experienceLength}
                onChange={handleChange}
                placeholder="e.g. 1 year"
              />
            </div>
            <div className={s.field}>
              <label>Working Hours</label>
              <input
                name="workingHours"
                value={form.workingHours}
                onChange={handleChange}
                placeholder="e.g. Part Time - Flexible Hours"
              />
            </div>
          </div>

          {/* ── Row 6: Applicant Location & Min Qualification ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Applicant Location</label>
              <input
                name="applicantLocation"
                value={form.applicantLocation}
                onChange={handleChange}
                placeholder="e.g. Nigeria"
              />
            </div>
            <div className={s.field}>
              <label>Min Qualification (free text)</label>
              <input
                name="minQualification"
                value={form.minQualification}
                onChange={handleChange}
                placeholder="e.g. High School (S.S.C.E)"
              />
            </div>
          </div>

          {/* ── Row 7: URL & Source ── */}
          {/* ── Row 7: Application Methods ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Application URL</label>
              <input
                name="applicationUrl"
                value={form.applicationUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
              <small className={s.helperText}>
                (At least one application method is required)
              </small>
            </div>
            <div className={s.field}>
              <label>Application Email</label>
              <input
                name="applicationEmail"
                value={form.applicationEmail}
                onChange={handleChange}
                placeholder="jobs@company.com"
              />
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label>Application WhatsApp</label>
              <input
                name="applicationWhatsApp"
                value={form.applicationWhatsApp}
                onChange={handleChange}
                placeholder="+2348012345678"
              />
            </div>
            <div className={s.field}>
              <label>Application Phone</label>
              <input
                name="applicationPhone"
                value={form.applicationPhone}
                onChange={handleChange}
                placeholder="+2348012345678"
              />
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label>Skills (comma separated)</label>
              <input
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="React, Node.js, PostgreSQL"
              />
            </div>
            <div className={s.field}>
              <label>Source Platform</label>
              <input
                name="sourcePlatform"
                value={form.sourcePlatform}
                onChange={handleChange}
                placeholder="e.g. Indeed, LinkedIn"
              />
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>
            <div className={s.field}>
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Full job description"
              />
            </div>
          </div>

          {/* ── Responsibilities & Requirements ── */}
          <div className={s.row}>
            <div className={s.field}>
              <label>Responsibilities</label>
              <textarea
                name="responsibilities"
                value={form.responsibilities}
                onChange={handleChange}
                rows={4}
                placeholder="List responsibilities (one per line)"
              />
            </div>
            <div className={s.field}>
              <label>Requirements</label>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                rows={4}
                placeholder="List requirements (one per line)"
              />
            </div>
          </div>

          {/* ── Categories ── */}
          <div className={s.field}>
            <label>Categories</label>
            {categoriesLoading ? (
              <div className={s.loadingCategories}>Loading categories…</div>
            ) : (
              <>
                <div className={s.categoryGrid}>
                  {categories.map((cat) => (
                    <label key={cat.id} className={s.categoryChip}>
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                      />
                      {cat.icon || "📁"} {cat.name}
                    </label>
                  ))}
                  {categories.length === 0 && (
                    <span className={s.noCategories}>No categories found</span>
                  )}
                </div>

                {/* ── Add New Category ── */}
                <div className={s.addCategoryRow}>
                  <input
                    className={s.addCategoryInput}
                    placeholder="New category name..."
                    value={newCategory.name}
                    onChange={(e) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    disabled={addingCategory}
                  />
                  <input
                    className={s.addCategoryInput}
                    placeholder="Description (optional)"
                    value={newCategory.description}
                    onChange={(e) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={addingCategory}
                  />
                  <button
                    type="button"
                    className={s.addCategoryBtn}
                    onClick={handleAddCategory}
                    disabled={addingCategory || !newCategory.name.trim()}
                  >
                    {addingCategory ? "Adding..." : "＋ Add"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Active toggle ── */}
          <div className={s.field}>
            <label className={s.checkboxLabel}>
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              Job is active (visible to workers)
            </label>
          </div>

          {/* ── Submit ── */}
          <div className={s.actions}>
            <button
              type="button"
              className={s.cancelBtn}
              onClick={() => navigate("/admin/external/jobs")}
            >
              Cancel
            </button>
            <button type="submit" className={s.submitBtn} disabled={submitting}>
              {submitting ? "Saving…" : id ? "Update Job" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
