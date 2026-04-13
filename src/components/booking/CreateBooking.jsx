// src/components/booking/CreateBooking.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import styles from "./CreateBooking.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import { ShieldCheck } from "lucide-react";

const DURATION_OPTIONS = [
  {
    unit: "hours",
    label: "Hourly",
    rateKey: "hourlyRate",
    suffix: "/hr",
    inputLabel: "Hours",
    inputType: "number",
    step: "0.5",
  },
  {
    unit: "days",
    label: "Daily",
    rateKey: "dailyRate",
    suffix: "/day",
    inputLabel: "Days",
    inputType: "number",
    step: "1",
  },
  {
    unit: "weeks",
    label: "Weekly",
    rateKey: "weeklyRate",
    suffix: "/wk",
    inputLabel: "Weeks",
    inputType: "number",
    step: "1",
  },
  {
    unit: "months",
    label: "Monthly",
    rateKey: "monthlyRate",
    suffix: "/mo",
    inputLabel: "Months",
    inputType: "number",
    step: "1",
  },
  {
    unit: "custom",
    label: "Custom",
    rateKey: "customRate",
    suffix: "",
    inputLabel: "Description",
    inputType: "text",
    step: null,
  },
];

export default function CreateBooking({ workerId: propWorkerId, onSuccess }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const initialWorkerId = propWorkerId || searchParams.get("workerId") || "";

  // ── Worker data fetched from API ─────────────────────────────────────────
  const [worker, setWorker] = useState(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");

  // ── Job-sourced values (locked when fromJob is set) ──────────────────────
  const [jobPost, setJobPost] = useState(null);
  const [jobLoading, setJobLoading] = useState(false);

  const fromJobId = searchParams.get("fromJob") || null; // ← new

  // ── Selected pricing unit ────────────────────────────────────────────────
  const [selectedUnit, setSelectedUnit] = useState(null); // null until worker loaded

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    workerId: initialWorkerId,
    categoryId: "",
    title: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    scheduledAt: "",
    estimatedValue: "", // hours/days/weeks/months or custom text
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // ── Hirer guard ──────────────────────────────────────────────────────────
  if (user?.role !== "HIRER") {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.restrictedMsg}>
            <h2>📋 Only Hirers Can Post Jobs</h2>
            <p>
              Workers can accept and complete jobs, but only Hirers can post
              them.
            </p>
            <button
              onClick={() => navigate("/bookings")}
              className={styles.submitBtn}
            >
              Back to Bookings
            </button>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── Fetch worker when workerId is known ──────────────────────────────────
  useEffect(() => {
    const id = form.workerId?.trim();
    if (!id) {
      setWorker(null);
      return;
    }

    setWorkerLoading(true);
    setWorkerError("");

    api
      .get(`/workers/${id}`)
      .then((res) => {
        const w = res.data.data.worker;
        setWorker(w);

        // Auto-select the first available pricing unit
        const available = DURATION_OPTIONS.filter((o) => {
          if (o.rateKey === "customRate") return w.customRate > 0;
          return w[o.rateKey] > 0;
        });
        const first = available[0] || DURATION_OPTIONS[0];
        setSelectedUnit(first.unit);

        // Lock category to worker's primary (or first) category
        const primaryCat =
          w.categories?.find((c) => c.isPrimary) || w.categories?.[0];
        if (primaryCat) {
          setForm((f) => ({ ...f, categoryId: primaryCat.category.id }));
        }
      })
      .catch(() =>
        setWorkerError("Worker not found. Check the ID and try again."),
      )
      .finally(() => setWorkerLoading(false));
  }, [form.workerId]);

  // ── Fetch job post when fromJob is present ───────────────────────────────────
  useEffect(() => {
    if (!fromJobId) return;
    setJobLoading(true);
    api
      .get(`/jobs/${fromJobId}`)
      .then((res) => {
        const jp = res.data.data.jobPost;
        setJobPost(jp);
        // Pre-fill form fields from the job post
        setForm((f) => ({
          ...f,
          categoryId: jp.categoryId || f.categoryId,
          title: jp.title || f.title,
          description: jp.description || f.description,
          address: jp.address || f.address,
          estimatedValue:
            jp.estimatedValue ||
            (jp.estimatedHours ? String(jp.estimatedHours) : f.estimatedValue),
        }));
        // Set duration unit from the job post
        if (jp.estimatedUnit) setSelectedUnit(jp.estimatedUnit);
      })
      .catch(() => {}) // silently fail — form still usable
      .finally(() => setJobLoading(false));
  }, [fromJobId]);

  const isFromJob = !!fromJobId && !!jobPost;

  // ── Derived values from worker + selected unit ───────────────────────────
  const currentOption = DURATION_OPTIONS.find((o) => o.unit === selectedUnit);

  const lockedRate = isFromJob
    ? jobPost?.budget || 0
    : worker && currentOption
      ? worker[currentOption.rateKey] || 0
      : 0;

  // const lockedRate =
  //   worker && currentOption ? worker[currentOption.rateKey] || 0 : 0;

  // const lockedCurrency = worker?.currency || "USD";

  const lockedCurrency = isFromJob
    ? jobPost?.currency || "USD"
    : worker?.currency || "USD";

  const availableUnits = worker
    ? DURATION_OPTIONS.filter((o) => {
        if (o.rateKey === "customRate") return worker.customRate > 0;
        return worker[o.rateKey] > 0;
      })
    : [];

  // If worker has no set pricing for an option show hourly as fallback
  const displayUnits =
    availableUnits.length > 0 ? availableUnits : [DURATION_OPTIONS[0]];

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!worker) {
      setError("Please enter a valid Worker ID first.");
      return;
    }

    const required = [
      "workerId",
      "categoryId",
      "title",
      "description",
      "address",
      "scheduledAt",
    ];
    for (const k of required) {
      if (!form[k]) {
        setError(
          `Please fill in: ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        return;
      }
    }
    if (lockedRate <= 0 && currentOption?.unit !== "custom") {
      setError(
        "This worker has not set a rate for the selected duration. Please choose another option.",
      );
      return;
    }

    setLoading(true);
    try {
      // Build estimatedHours from the selected unit + value
      let estimatedHours = null;
      const val = parseFloat(form.estimatedValue) || 1;
      if (currentOption?.unit === "hours") estimatedHours = val;
      if (currentOption?.unit === "days") estimatedHours = val * 8;
      if (currentOption?.unit === "weeks") estimatedHours = val * 40;
      if (currentOption?.unit === "months") estimatedHours = val * 160;
      // custom → no numeric conversion
      const payload = {
        workerId: form.workerId,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours || undefined,
        estimatedUnit: currentOption?.unit || "hours",
        estimatedValue: form.estimatedValue
          ? form.estimatedValue.toString()
          : undefined,
        agreedRate: lockedRate,
        currency: lockedCurrency,
        notes: form.notes,
      };

      const res = await api.post("/bookings", payload);
      if (onSuccess) {
        onSuccess(res.data.data.booking);
      } else {
        navigate(`/bookings/${res.data.data.booking.id}`);
      }
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
    <HirerLayout>
      <Link to="/bookings" className={styles.back}>
        ← Back to Bookings
      </Link>
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>New Job</p>
          <h1 className={styles.title}>Create Booking</h1>
          <p className={styles.subtitle}>
            Fill in the details and the worker will be notified immediately.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ── Worker Selection ── */}
          {!propWorkerId && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Worker</legend>
              <div className={styles.field}>
                <label className={styles.label}>
                  Worker ID <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="Paste the worker's user ID"
                  value={form.workerId}
                  onChange={(e) => set("workerId", e.target.value)}
                />
                <p className={styles.hint}>
                  Browse workers on the{" "}
                  <Link to="/search" className={styles.hintLink}>
                    search page
                  </Link>{" "}
                  and copy their ID.
                </p>
              </div>
            </fieldset>
          )}

          {/* ── Worker Profile Card (auto-loaded) ── */}
          {workerLoading && (
            <div className={styles.workerCardSkeleton}>
              <div className={styles.skAvatar} />
              <div style={{ flex: 1 }}>
                <div className={styles.skLine} style={{ width: "60%" }} />
                <div
                  className={styles.skLine}
                  style={{ width: "40%", marginTop: 6 }}
                />
              </div>
            </div>
          )}

          {workerError && (
            <div className={styles.workerError}>⚠️ {workerError}</div>
          )}

          {worker && !workerLoading && (
            <div className={styles.workerCard}>
              <div className={styles.workerCardAvatar}>
                {worker.user?.avatar ? (
                  <img src={worker.user.avatar} alt="" />
                ) : (
                  <span>
                    {worker.user?.firstName?.[0]}
                    {worker.user?.lastName?.[0]}
                  </span>
                )}
                {worker.isAvailable && (
                  <div className={styles.workerOnlineDot} />
                )}
              </div>
              <div className={styles.workerCardInfo}>
                <p className={styles.workerCardName}>
                  {worker.user?.firstName} {worker.user?.lastName}
                  {worker.verificationStatus === "VERIFIED" && (
                    <ShieldCheck size={18} />
                  )}
                </p>
                <p className={styles.workerCardTitle}>{worker.title}</p>
                <div className={styles.workerCardMeta}>
                  {worker.avgRating > 0 && (
                    <span>
                      ⭐ {worker.avgRating.toFixed(1)} ({worker.totalReviews}{" "}
                      reviews)
                    </span>
                  )}
                  {(worker.user?.city || worker.user?.country) && (
                    <span>
                      📍{" "}
                      {[worker.user.city, worker.user.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                  <span>✅ {worker.completedJobs} jobs done</span>
                </div>
                {worker.categories?.length > 0 && (
                  <div className={styles.workerCardCats}>
                    {worker.categories.slice(0, 3).map((wc) => (
                      <span key={wc.id} className={styles.catChip}>
                        {wc.category.icon} {wc.category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.workerCardLock}>
                <span className={styles.lockIcon}>🔒</span>
                <span className={styles.lockText}>
                  Details locked from worker's profile
                </span>
              </div>
            </div>
          )}

          {/* ── Pricing / Duration Selection ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Pricing & Duration</legend>

              {/* If from job — show locked budget, don't show unit picker */}
              {isFromJob ? (
                <>
                  <div className={styles.rateLockedRow}>
                    <div className={styles.rateLockedBox}>
                      <span className={styles.rateLockedLabel}>
                        Agreed Budget (from job)
                      </span>
                      <span className={styles.rateLockedValue}>
                        {lockedCurrency} {Number(lockedRate).toLocaleString()}
                      </span>
                      <span className={styles.rateLockedNote}>
                        🔒 Set from the job post budget
                      </span>
                    </div>
                    <div className={styles.rateLockedBox}>
                      <span className={styles.rateLockedLabel}>Currency</span>
                      <span className={styles.rateLockedValue}>
                        {lockedCurrency}
                      </span>
                      <span className={styles.rateLockedNote}>
                        🔒 Job's currency
                      </span>
                    </div>
                  </div>
                  {/* Duration from job — locked */}
                  <div
                    className={styles.rateLockedBox}
                    style={{ marginTop: 8 }}
                  >
                    <span className={styles.rateLockedLabel}>
                      Duration (from job)
                    </span>
                    <span className={styles.rateLockedValue}>
                      {jobPost?.estimatedValue
                        ? `${jobPost.estimatedValue} ${jobPost.estimatedUnit || "hours"}`
                        : jobPost?.estimatedHours
                          ? `${jobPost.estimatedHours} hours`
                          : "Not specified"}
                    </span>
                    <span className={styles.rateLockedNote}>
                      🔒 From job post
                    </span>
                  </div>
                </>
              ) : (
                // Normal worker-based pricing
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Engagement Type <span className={styles.req}>*</span>
                    </label>

                    <p className={styles.fieldHint}>
                      Select how you want to engage this worker. The rate is set
                      by the worker and cannot be modified.
                    </p>
                    <div className={styles.unitGrid}>
                      {(availableUnits.length > 0
                        ? availableUnits
                        : [DURATION_OPTIONS[0]]
                      ).map((opt) => {
                        const rate = worker[opt.rateKey];
                        const hasRate = rate > 0;
                        return (
                          <button
                            type="button"
                            key={opt.unit}
                            className={`${styles.unitCard} ${selectedUnit === opt.unit ? styles.unitCardActive : ""} ${!hasRate ? styles.unitCardDisabled : ""}`}
                            onClick={() => hasRate && setSelectedUnit(opt.unit)}
                            disabled={!hasRate}
                          >
                            <span className={styles.unitCardLabel}>
                              {opt.label}
                            </span>
                            {hasRate ? (
                              <span className={styles.unitCardRate}>
                                {lockedCurrency} {Number(rate).toLocaleString()}
                                {opt.suffix}
                              </span>
                            ) : (
                              <span className={styles.unitCardNoRate}>
                                Not offered
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.rateLockedRow}>
                    <div className={styles.rateLockedBox}>
                      <span className={styles.rateLockedLabel}>
                        Agreed Rate
                      </span>
                      <span className={styles.rateLockedValue}>
                        {lockedCurrency} {Number(lockedRate).toLocaleString()}
                        {currentOption?.suffix}
                      </span>
                      <span className={styles.rateLockedNote}>
                        🔒 Worker's rate
                      </span>
                    </div>
                    <div className={styles.rateLockedBox}>
                      <span className={styles.rateLockedLabel}>Currency</span>
                      <span className={styles.rateLockedValue}>
                        {lockedCurrency}
                      </span>
                      <span className={styles.rateLockedNote}>
                        🔒 Worker's currency
                      </span>
                    </div>
                  </div>
                  {currentOption && (
                    <div className={styles.field}>
                      <label className={styles.label}>
                        {currentOption.unit === "custom"
                          ? "Describe the engagement"
                          : `Number of ${currentOption.inputLabel}`}
                        <span className={styles.req}> *</span>
                      </label>
                      <input
                        className={styles.input}
                        type={currentOption.inputType}
                        step={currentOption.step || undefined}
                        min={
                          currentOption.inputType === "number" ? "" : undefined
                        }
                        placeholder={
                          currentOption.inputType === "text"
                            ? "e.g. Full build"
                            : "e.g. 4"
                        }
                        value={form.estimatedValue}
                        onChange={(e) => set("estimatedValue", e.target.value)}
                      />
                      {/* Duration label */}
                      {form.estimatedValue &&
                        currentOption.inputType === "number" && (
                          <p className={styles.durationLabel}>
                            📅 {form.estimatedValue}{" "}
                            {currentOption.inputLabel.toLowerCase()}
                            {currentOption.unit !== "hours" && (
                              <span className={styles.durationEqv}>
                                {" "}
                                ≈{" "}
                                {currentOption.unit === "days"
                                  ? `${parseFloat(form.estimatedValue) * 8}h`
                                  : currentOption.unit === "weeks"
                                    ? `${parseFloat(form.estimatedValue) * 40}h`
                                    : currentOption.unit === "months"
                                      ? `${parseFloat(form.estimatedValue) * 160}h`
                                      : ""}
                              </span>
                            )}
                          </p>
                        )}
                      {form.estimatedValue &&
                        currentOption.inputType === "number" &&
                        lockedRate > 0 && (
                          <p className={styles.totalEstimate}>
                            Estimated total:{" "}
                            <strong>
                              {lockedCurrency}{" "}
                              {(
                                Number(form.estimatedValue) * lockedRate
                              ).toLocaleString()}
                            </strong>
                          </p>
                        )}

                      {/* Pricing note from worker */}
                      {worker.pricingNote && (
                        <div className={styles.pricingNoteBox}>
                          💬 Worker's pricing note:{" "}
                          <em>{worker.pricingNote}</em>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </fieldset>
          )}

          {/* ── Category — locked from worker ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Category</legend>
              <div className={styles.field}>
                <label className={styles.label}>Service Category</label>
                <p className={styles.fieldHint}>
                  Auto-filled from the worker's registered categories. Select if
                  multiple are available.
                </p>
                {worker.categories?.length === 1 ? (
                  <div className={styles.lockedField}>
                    <span>
                      {worker.categories[0].category.icon}{" "}
                      {worker.categories[0].category.name}
                    </span>
                    <span className={styles.lockedBadge}>🔒 Locked</span>
                  </div>
                ) : (
                  <select
                    className={styles.select}
                    value={form.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    {worker.categories?.map((wc) => (
                      <option key={wc.id} value={wc.category.id}>
                        {wc.category.icon} {wc.category.name}
                        {wc.isPrimary ? " (Primary)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </fieldset>
          )}

          {/* ── Job Information ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Job Information</legend>

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
                placeholder="Describe exactly what needs to be done..."
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

          {/* ── Location ── */}
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
                <label className={styles.label}>Latitude (optional)</label>
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
                <label className={styles.label}>Longitude (optional)</label>
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

          {/* ── Schedule ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Schedule</legend>
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
          </fieldset>

          {error && <p className={styles.error}>⚠️ {error}</p>}

          {/* ── Booking Summary ── */}
          {worker && form.title && form.address && form.scheduledAt && (
            <div className={styles.bookingSummary}>
              <p className={styles.summaryTitle}>📋 Booking Summary</p>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Worker</span>
                  <span className={styles.summaryValue}>
                    {worker.user?.firstName} {worker.user?.lastName}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Category</span>
                  <span className={styles.summaryValue}>
                    {worker.categories?.find(
                      (c) => c.category.id === form.categoryId,
                    )?.category.name || "—"}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Rate</span>
                  <span
                    className={styles.summaryValue}
                    style={{ color: "var(--orange)", fontWeight: 700 }}
                  >
                    {lockedCurrency} {Number(lockedRate).toLocaleString()}
                    {currentOption?.suffix}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Duration</span>
                  <span className={styles.summaryValue}>
                    {form.estimatedValue
                      ? `${form.estimatedValue} ${currentOption?.inputLabel?.toLowerCase() || currentOption?.unit}`
                      : "—"}
                  </span>
                </div>
                {form.estimatedValue &&
                  currentOption?.inputType === "number" &&
                  lockedRate > 0 && (
                    <div
                      className={styles.summaryItem}
                      style={{ gridColumn: "1/-1" }}
                    >
                      <span className={styles.summaryLabel}>
                        Estimated Total
                      </span>
                      <span
                        className={styles.summaryValue}
                        style={{
                          color: "var(--green)",
                          fontWeight: 800,
                          fontSize: "1.1rem",
                        }}
                      >
                        {lockedCurrency}{" "}
                        {(
                          Number(form.estimatedValue) * lockedRate
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
              </div>
              <p className={styles.summaryNote}>
                ⚠️ Final amount depends on actual time. Payment is only charged
                after the worker accepts.
              </p>
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !worker}
          >
            {loading ? (
              <>
                <span className={styles.spinner} /> Creating booking...
              </>
            ) : (
              <>📋 Create Booking</>
            )}
          </button>

          <p className={styles.disclaimer}>
            The worker will be notified immediately. Payment is only charged
            after the worker accepts and you approve it.
          </p>
        </form>
      </div>
    </HirerLayout>
  );
}
