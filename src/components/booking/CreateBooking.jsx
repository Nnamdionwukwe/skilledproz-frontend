import { useState, useEffect } from "react";
import styles from "./CreateBooking.module.css";
import api from "../../lib/api";

export default function CreateBooking({ workerId: propWorkerId, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    workerId: propWorkerId || "",
    categoryId: "",
    title: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    scheduledAt: "",
    estimatedHours: "",
    agreedRate: "",
    currency: "USD",
    notes: "",
  });

  // Min datetime = now
  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data.data || []));
  }, []);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const required = [
      "workerId",
      "categoryId",
      "title",
      "description",
      "address",
      "scheduledAt",
      "agreedRate",
    ];
    for (const k of required) {
      if (!form[k]) {
        setError(
          `Please fill in: ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        return;
      }
    }
    setLoading(true);
    try {
      const res = await api.post("/bookings", {
        ...form,
        agreedRate: parseFloat(form.agreedRate),
        estimatedHours: form.estimatedHours
          ? parseFloat(form.estimatedHours)
          : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      });
      if (onSuccess) onSuccess(res.data.data.booking);
      else window.location.href = `/bookings/${res.data.data.booking.id}`;
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>New Job</p>
        <h1 className={styles.title}>Create Booking</h1>
        <p className={styles.subtitle}>
          Fill in the details and the worker will be notified immediately.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Section: Job Info */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Job Information</legend>

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

          <div className={styles.field}>
            <label className={styles.label}>
              Job Title <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="e.g. Fix leaking kitchen pipe"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={120}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Description <span className={styles.req}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Describe exactly what needs to be done, any relevant background..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Additional Notes</label>
            <textarea
              className={styles.textarea}
              placeholder="Access instructions, parking, tools to bring..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>
        </fieldset>

        {/* Section: Location */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Location</legend>

          <div className={styles.field}>
            <label className={styles.label}>
              Service Address <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="Full address where the job will take place"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Latitude</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                placeholder="e.g. 6.5244"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Longitude</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                placeholder="e.g. 3.3792"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Schedule & Rate */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Schedule & Rate</legend>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Date & Time <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                type="datetime-local"
                min={minDate}
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Estimated Hours</label>
              <input
                className={styles.input}
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="e.g. 3"
                value={form.estimatedHours}
                onChange={(e) => set("estimatedHours", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Agreed Rate <span className={styles.req}>*</span>
              </label>
              <div className={styles.rateWrap}>
                <span className={styles.rateCurrency}>{form.currency}</span>
                <input
                  className={`${styles.input} ${styles.rateInput}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.agreedRate}
                  onChange={(e) => set("agreedRate", e.target.value)}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Currency</label>
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {[
                  "USD",
                  "NGN",
                  "GBP",
                  "EUR",
                  "GHS",
                  "KES",
                  "ZAR",
                  "INR",
                  "CAD",
                  "AUD",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Worker ID (hidden if pre-set) */}
        {!propWorkerId && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Worker</legend>
            <div className={styles.field}>
              <label className={styles.label}>
                Worker ID <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                placeholder="Worker's user ID"
                value={form.workerId}
                onChange={(e) => set("workerId", e.target.value)}
              />
              <p className={styles.hint}>
                Browse workers on the{" "}
                <a href="/search" className={styles.hintLink}>
                  search page
                </a>{" "}
                to find the right person.
              </p>
            </div>
          </fieldset>
        )}

        {error && <p className={styles.error}>⚠️ {error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <span className={styles.spinner} /> Creating booking...
            </>
          ) : (
            <>📋 Create Booking</>
          )}
        </button>

        <p className={styles.disclaimer}>
          The worker will be notified by email immediately. Funds are not
          charged until you pay after the worker accepts.
        </p>
      </form>
    </div>
  );
}
