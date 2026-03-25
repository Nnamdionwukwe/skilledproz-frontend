import { useState, useEffect } from "react";
import styles from "./PostJob.module.css";
import api from "../../lib/api";

export default function PostJob() {
  const [categories, setCategories] = useState([]);
  const [matched, setMatched] = useState([]);
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
    currency: "USD",
    notes: "",
  });

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data.data || []));
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
      const res = await api.post("/hirers/me/post-job", form);
      setMatched(res.data.data.matchedWorkers || []);
      setSubmitted(true);
    } catch {
      setError("Failed to post job. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.successState}>
          <div className={styles.successIcon}>🎯</div>
          <h2 className={styles.successTitle}>Job Posted!</h2>
          <p className={styles.successText}>
            We found <strong>{matched.length}</strong> available worker
            {matched.length !== 1 ? "s" : ""} in your category.
          </p>

          {matched.length > 0 && (
            <div className={styles.matchedGrid}>
              {matched.map((w) => (
                <a
                  key={w.user.id}
                  href={`/workers/${w.user.id}`}
                  className={styles.matchedCard}
                >
                  <div className={styles.matchedAvatar}>
                    {w.user.avatar ? (
                      <img src={w.user.avatar} alt="" />
                    ) : (
                      <span>
                        {w.user.firstName?.[0]}
                        {w.user.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.matchedInfo}>
                    <p className={styles.matchedName}>
                      {w.user.firstName} {w.user.lastName}
                    </p>
                    <p className={styles.matchedTitle}>{w.title}</p>
                    <div className={styles.matchedMeta}>
                      <span className={styles.matchedRate}>
                        {w.currency} {w.hourlyRate}/hr
                      </span>
                      <span className={styles.matchedRating}>
                        ★ {w.avgRating?.toFixed(1) || "New"}
                      </span>
                    </div>
                  </div>
                  <span className={styles.viewArrow}>→</span>
                </a>
              ))}
            </div>
          )}

          <button
            className={styles.resetBtn}
            onClick={() => {
              setSubmitted(false);
              setMatched([]);
              setForm({
                categoryId: "",
                title: "",
                description: "",
                address: "",
                scheduledAt: "",
                estimatedHours: "",
                budget: "",
                currency: "USD",
                notes: "",
              });
            }}
          >
            Post Another Job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Hiring</p>
        <h1 className={styles.title}>Post a Job</h1>
        <p className={styles.subtitle}>
          Describe what you need and we'll match you with the right skilled
          worker.
        </p>
      </div>

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
              {["USD", "NGN", "GBP", "EUR", "GHS", "KES", "ZAR", "INR"].map(
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
              <span className={styles.spinner} /> Finding Workers...
            </>
          ) : (
            <>🎯 Post Job &amp; Find Workers</>
          )}
        </button>
      </form>
    </div>
  );
}
