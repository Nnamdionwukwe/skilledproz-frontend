import { useState, useEffect } from "react";
import styles from "./PostJob.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import AIJobAssistant from "./AIJobAssistant";

export default function PostJob() {
  const [categories, setCategories] = useState([]);
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
    estimatedHours: "",
    budget: "",
    currency: "NGN",
    notes: "",
  });

  useEffect(() => {
    api.get("/categories").then((res) => {
      const data = res.data.data;
      setCategories(Array.isArray(data) ? data : data?.categories || []);
    });
  }, []);

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
    setLoading(true);
    try {
      // ✅ POST to /api/jobs — saves to DB and appears in worker job board
      const res = await api.post("/jobs", form);
      setPostedJob(res.data.data.jobPost);
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to post job. Please try again.",
      );
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
      estimatedHours: "",
      budget: "",
      currency: "NGN",
      notes: "",
    });
  }

  if (submitted && postedJob) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>🎯</div>
            <h2 className={styles.successTitle}>Job Posted!</h2>
            <p className={styles.successText}>
              Your job <strong>"{postedJob.title}"</strong> is now live and
              visible to all skilled workers on the platform.
            </p>

            <div
              style={{
                background: "var(--orange-dim)",
                border: "1px solid var(--orange-glow)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
                marginTop: "1.5rem",
                textAlign: "left",
                maxWidth: 480,
                width: "100%",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--orange)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.5rem",
                }}
              >
                {postedJob.category?.name || "Job"}
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "0.25rem",
                }}
              >
                {postedJob.title}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
                📍 {postedJob.address}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-dim)",
                  marginTop: "0.25rem",
                }}
              >
                💰 {postedJob.currency}{" "}
                {Number(postedJob.budget).toLocaleString()}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "2rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <a
                href="/dashboard/hirer/jobs"
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "var(--orange)",
                  color: "#fff",
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                View My Jobs
              </a>
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
            Describe what you need and we'll match you with the right skilled
            worker.
          </p>
        </div>

        <AIJobAssistant
          onApply={(result) => {
            set("title", result.title);
            set("description", result.description);
          }}
        />

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Category */}
          <div className={styles.field}>
            <label className={styles.label}>
              Category <span className={styles.req}>*</span>
            </label>
            <select
              className={styles.select}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
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

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>
              Description <span className={styles.req}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Describe the job in detail — what needs to be done, any special requirements..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
          </div>

          {/* Address */}
          <div className={styles.field}>
            <label className={styles.label}>
              Service Address <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="Full address where the work will be done"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          {/* Row: date + hours */}
          <div className={styles.row2}>
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
            <div className={styles.field}>
              <label className={styles.label}>Estimated Hours</label>
              <input
                className={styles.input}
                type="number"
                placeholder="e.g. 3"
                min="0.5"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => set("estimatedHours", e.target.value)}
              />
            </div>
          </div>

          {/* Row: budget + currency */}
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
                {["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "INR"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.field}>
            <label className={styles.label}>Additional Notes</label>
            <textarea
              className={styles.textarea}
              placeholder="Any other details, access instructions, preferences..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} /> Posting Job...
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
