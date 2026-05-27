import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import styles from "./CreateBooking.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import { ShieldCheck } from "lucide-react";

// ── Engagement type options ────────────────────────────────────────────────────
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

// ── New booking type constants ─────────────────────────────────────────────────
const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", icon: "💼" },
  { value: "PART_TIME", label: "Part-time", icon: "⏰" },
  { value: "CONTRACT", label: "Contract", icon: "📄" },
  { value: "TEMPORARY", label: "Temporary", icon: "⏳" },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", icon: "🌐" },
  { value: "ON_SITE", label: "On-site", icon: "📍" },
  { value: "HYBRID", label: "Hybrid", icon: "🔀" },
];

const BUDGET_TYPES = [
  { value: "FIXED", label: "Fixed Price", sub: "Pay a set total", icon: "💵" },
  { value: "HOURLY", label: "Per Hour", sub: "Billed hourly", icon: "🕐" },
  { value: "DAILY", label: "Per Day", sub: "Billed daily", icon: "🌤" },
  { value: "WEEKLY", label: "Per Week", sub: "Billed weekly", icon: "📅" },
  { value: "MONTHLY", label: "Per Month", sub: "Billed monthly", icon: "📆" },
  { value: "CUSTOM", label: "Custom", sub: "Define your own", icon: "✏️" },
];

const DURATION_TYPES_LIST = [
  { value: "HOURS", label: "Hours", icon: "🕐" },
  { value: "DAYS", label: "Days", icon: "🌤" },
  { value: "WEEKS", label: "Weeks", icon: "📅" },
  { value: "MONTHS", label: "Months", icon: "📆" },
  { value: "CUSTOM", label: "Custom", icon: "✏️" },
];

// ── Fee config ─────────────────────────────────────────────────────────────────
const HIRER_FEE_RATE = 0.05;
const WORKER_FEE_RATE = 0.0;

function computeFees(agreedRate, qty = 1) {
  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const totalToPay = parseFloat((subtotal + hirerFee).toFixed(2));
  const workerGets = subtotal;
  return { subtotal, hirerFee, totalToPay, workerGets };
}

// ── Sync map: engagement unit → budget/duration types ─────────────────────────
const UNIT_TO_TYPES = {
  hours: { budget: "HOURLY", duration: "HOURS" },
  days: { budget: "DAILY", duration: "DAYS" },
  weeks: { budget: "WEEKLY", duration: "WEEKS" },
  months: { budget: "MONTHLY", duration: "MONTHS" },
  custom: { budget: "CUSTOM", duration: "CUSTOM" },
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CreateBooking({ workerId: propWorkerId, onSuccess }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const initialWorkerId = propWorkerId || searchParams.get("workerId") || "";

  // ── 1. All useState declarations ─────────────────────────────────────────
  const [worker, setWorker] = useState(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [jobPost, setJobPost] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [jobType, setJobType] = useState("FULL_TIME");
  const [locationType, setLocationType] = useState("REMOTE");
  const [budgetType, setBudgetType] = useState("HOURLY");
  const [durationType, setDurationType] = useState("HOURS");
  const [durationValue, setDurationValue] = useState("");

  const [isNegotiated, setIsNegotiated] = useState(false);
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");

  const [form, setForm] = useState({
    workerId: initialWorkerId,
    categoryId: "",
    title: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    scheduledAt: "",
    estimatedValue: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── 2. Simple derived values that don't depend on other derived values ────
  const fromJobId = searchParams.get("fromJob") || null;
  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // ── 3. All useEffect hooks ────────────────────────────────────────────────
  // Sync budgetType / durationType when engagement unit changes
  useEffect(() => {
    if (selectedUnit && UNIT_TO_TYPES[selectedUnit]) {
      setBudgetType(UNIT_TO_TYPES[selectedUnit].budget);
      setDurationType(UNIT_TO_TYPES[selectedUnit].duration);
    }
  }, [selectedUnit]);

  // Fetch worker when ID changes
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
        const available = DURATION_OPTIONS.filter((o) =>
          o.rateKey === "customRate" ? w.customRate > 0 : w[o.rateKey] > 0,
        );
        setSelectedUnit((available[0] || DURATION_OPTIONS[0]).unit);
        const primaryCat =
          w.categories?.find((c) => c.isPrimary) || w.categories?.[0];
        if (primaryCat)
          setForm((f) => ({ ...f, categoryId: primaryCat.category.id }));
      })
      .catch(() =>
        setWorkerError("Worker not found. Check the ID and try again."),
      )
      .finally(() => setWorkerLoading(false));
  }, [form.workerId]); // eslint-disable-line

  // Fetch job post if fromJob param is present
  useEffect(() => {
    if (!fromJobId) return;
    api
      .get(`/jobs/${fromJobId}`)
      .then((res) => {
        const jp = res.data.data.jobPost;
        setJobPost(jp);
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
        if (jp.estimatedUnit) setSelectedUnit(jp.estimatedUnit);
      })
      .catch(() => {});
  }, [fromJobId]); // eslint-disable-line

  // ── 4. Derived values — order matters: each must come after its dependencies
  const isFromJob = !!fromJobId && !!jobPost;

  const currentOption = DURATION_OPTIONS.find((o) => o.unit === selectedUnit);

  // lockedRate must be declared BEFORE finalRate uses it
  const lockedRate = isFromJob
    ? jobPost?.budget || 0
    : worker && currentOption
      ? worker[currentOption.rateKey] || 0
      : 0;

  const lockedCurrency = isFromJob
    ? jobPost?.currency || "USD"
    : worker?.currency || "USD";

  const availableUnits = worker
    ? DURATION_OPTIONS.filter((o) =>
        o.rateKey === "customRate"
          ? worker.customRate > 0
          : worker[o.rateKey] > 0,
      )
    : [];

  // finalRate comes AFTER lockedRate — this was the source of the crash
  const finalRate =
    isNegotiated && negotiatedRate ? parseFloat(negotiatedRate) : lockedRate;

  const estQty = parseFloat(form.estimatedValue) || 1;
  const estFees =
    lockedRate > 0 &&
    form.estimatedValue &&
    currentOption?.inputType === "number"
      ? computeFees(finalRate, estQty)
      : null;

  const durationTypeItem = DURATION_TYPES_LIST.find(
    (d) => d.value === durationType,
  );

  // ── 5. Early returns (after ALL hooks — React rules of hooks) ─────────────
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

  // ── 6. Event handlers ─────────────────────────────────────────────────────
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
      setError("This worker has not set a rate for the selected duration.");
      return;
    }

    setLoading(true);
    try {
      let estimatedHours = null;
      const rawVal = form.estimatedValue
        ? parseFloat(form.estimatedValue)
        : null;
      if (rawVal !== null) {
        if (currentOption?.unit === "hours") estimatedHours = rawVal;
        if (currentOption?.unit === "days") estimatedHours = rawVal * 8;
        if (currentOption?.unit === "weeks") estimatedHours = rawVal * 40;
        if (currentOption?.unit === "months") estimatedHours = rawVal * 160;
      }

      const res = await api.post("/bookings", {
        workerId: form.workerId,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: currentOption?.unit || "hours",
        estimatedValue: form.estimatedValue || undefined,
        agreedRate: finalRate,
        isNegotiated,
        negotiatedRate: isNegotiated ? parseFloat(negotiatedRate) : undefined,
        negotiationNote:
          isNegotiated && negotiationNote ? negotiationNote : undefined,
        currency: lockedCurrency,
        notes: form.notes || undefined,
        jobType: jobType || undefined,
        locationType: locationType || undefined,
        budgetType: budgetType || undefined,
        durationType: durationType || undefined,
      });

      const { booking } = res.data.data;
      if (onSuccess) onSuccess(booking);
      else navigate(`/bookings/${booking.id}/pay`);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── 7. JSX return ─────────────────────────────────────────────────────────
  // ... rest of your JSX stays exactly the same

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
          {/* ── Worker ID ── */}
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

          {/* Worker card / skeleton / error */}
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
                    {worker.categories.slice(0, 4).map((wc) => (
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

          {/* ── Job Type ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Job Type</legend>
              <div className={styles.jobTypeGrid}>
                {JOB_TYPES.map((jt) => (
                  <button
                    type="button"
                    key={jt.value}
                    className={`${styles.jobTypeCard} ${jobType === jt.value ? styles.jobTypeCardActive : ""}`}
                    onClick={() => setJobType(jt.value)}
                  >
                    {jobType === jt.value && (
                      <span className={styles.activeDot} />
                    )}
                    <span className={styles.jobTypeIcon}>{jt.icon}</span>
                    <span className={styles.jobTypeLabel}>{jt.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Location Type ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Location Type</legend>
              <div className={styles.locationGrid}>
                {LOCATION_TYPES.map((lt) => (
                  <button
                    type="button"
                    key={lt.value}
                    className={`${styles.locationCard} ${locationType === lt.value ? styles.locationCardActive : ""}`}
                    onClick={() => setLocationType(lt.value)}
                  >
                    {locationType === lt.value && (
                      <span className={styles.activeDot} />
                    )}
                    <span className={styles.locationIcon}>{lt.icon}</span>
                    <span className={styles.locationLabel}>{lt.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Pricing & Duration ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Pricing &amp; Duration</legend>

              {isFromJob ? (
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
              ) : (
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
                      <div className={styles.iconInputWrap}>
                        <span className={styles.iconInputIcon}>⏳</span>
                        <input
                          className={styles.iconInput}
                          type={currentOption.inputType}
                          step={currentOption.step || undefined}
                          placeholder={
                            currentOption.inputType === "text"
                              ? "e.g. Full build"
                              : "e.g. 4"
                          }
                          value={form.estimatedValue}
                          onChange={(e) =>
                            set("estimatedValue", e.target.value)
                          }
                        />
                      </div>
                      {form.estimatedValue &&
                        currentOption.inputType === "number" && (
                          <p className={styles.durationLabel}>
                            📅 {form.estimatedValue}{" "}
                            {currentOption.inputLabel.toLowerCase()}
                            {currentOption.unit !== "hours" && (
                              <span className={styles.durationEqv}>
                                {" ≈ "}
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
                    </div>
                  )}
                </>
              )}

              {/* ── Negotiated Rate Toggle ── */}
              {worker && (
                <div className={styles.negotiatedWrap}>
                  <button
                    type="button"
                    className={`${styles.negotiatedToggle} ${isNegotiated ? styles.negotiatedToggleActive : ""}`}
                    onClick={() => {
                      setIsNegotiated((v) => !v);
                      if (isNegotiated) {
                        setNegotiatedRate("");
                        setNegotiationNote("");
                      }
                    }}
                  >
                    <span className={styles.negotiatedToggleIcon}>
                      {isNegotiated ? "✅" : "🤝"}
                    </span>
                    <div className={styles.negotiatedToggleText}>
                      <span className={styles.negotiatedToggleLabel}>
                        {isNegotiated
                          ? "Using negotiated rate"
                          : "We agreed on a different rate"}
                      </span>
                      <span className={styles.negotiatedToggleSub}>
                        {isNegotiated
                          ? "Tap to go back to worker's listed rate"
                          : "Override the worker's listed price with your agreed amount"}
                      </span>
                    </div>
                    <div
                      className={`${styles.negotiatedDot} ${isNegotiated ? styles.negotiatedDotOn : ""}`}
                    />
                  </button>

                  {isNegotiated && (
                    <div className={styles.negotiatedFields}>
                      <div className={styles.field}>
                        <label className={styles.label}>
                          Negotiated Rate ({lockedCurrency}){" "}
                          <span className={styles.req}>*</span>
                        </label>
                        <div className={styles.iconInputWrap}>
                          <span className={styles.iconInputIcon}>💬</span>
                          <input
                            className={styles.iconInput}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={`e.g. ${lockedRate > 0 ? lockedRate : "5000"}`}
                            value={negotiatedRate}
                            onChange={(e) => {
                              setNegotiatedRate(e.target.value);
                              setError("");
                            }}
                          />
                          <span className={styles.negotiatedCurrency}>
                            {lockedCurrency}
                          </span>
                        </div>
                        {lockedRate > 0 && negotiatedRate && (
                          <p className={styles.negotiatedDiff}>
                            {parseFloat(negotiatedRate) < lockedRate
                              ? `🟢 ${lockedCurrency} ${(lockedRate - parseFloat(negotiatedRate)).toLocaleString()} below listed rate`
                              : parseFloat(negotiatedRate) > lockedRate
                                ? `🟡 ${lockedCurrency} ${(parseFloat(negotiatedRate) - lockedRate).toLocaleString()} above listed rate`
                                : "✅ Same as listed rate"}
                          </p>
                        )}
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label}>
                          Negotiation Note (optional)
                        </label>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          placeholder="e.g. Agreed 10% discount for repeat booking, confirmed via WhatsApp"
                          value={negotiationNote}
                          onChange={(e) => setNegotiationNote(e.target.value)}
                        />
                      </div>

                      <div className={styles.negotiatedBanner}>
                        🔒 Both you and the worker agreed to this rate in the
                        platform chat. This replaces the listed rate of{" "}
                        <strong>
                          {lockedCurrency} {Number(lockedRate).toLocaleString()}
                          {currentOption?.suffix}
                        </strong>{" "}
                        for this booking only.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estimated total */}
              {estFees && (
                <div className={styles.estimatedTotalBox}>
                  <span className={styles.estimatedTotalLabel}>
                    Estimated Total
                  </span>
                  <span className={styles.estimatedTotalValue}>
                    {lockedCurrency} {estFees.subtotal.toLocaleString()}
                  </span>
                </div>
              )}

              {worker.pricingNote && (
                <div className={styles.pricingNoteBox}>
                  💬 Worker's pricing note: <em>{worker.pricingNote}</em>
                </div>
              )}
            </fieldset>
          )}

          {/* ── Payment Type ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Payment Type</legend>
              <div className={styles.typeList}>
                {BUDGET_TYPES.map((bt) => (
                  <button
                    type="button"
                    key={bt.value}
                    className={`${styles.typeListRow} ${budgetType === bt.value ? styles.typeListRowActive : ""}`}
                    onClick={() => setBudgetType(bt.value)}
                  >
                    <div
                      className={`${styles.typeListIcon} ${budgetType === bt.value ? styles.typeListIconActive : ""}`}
                    >
                      <span>{bt.icon}</span>
                    </div>
                    <div className={styles.typeListContent}>
                      <span className={styles.typeListLabel}>{bt.label}</span>
                      <span className={styles.typeListSub}>{bt.sub}</span>
                    </div>
                    {budgetType === bt.value && (
                      <div className={styles.typeListCheck}>✓</div>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Job Duration ── */}
          {worker && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Job Duration</legend>
              <div className={styles.typeList}>
                {DURATION_TYPES_LIST.map((dt) => (
                  <button
                    type="button"
                    key={dt.value}
                    className={`${styles.typeListRow} ${durationType === dt.value ? styles.typeListRowActive : ""}`}
                    onClick={() => setDurationType(dt.value)}
                  >
                    <div
                      className={`${styles.typeListIcon} ${durationType === dt.value ? styles.typeListIconActive : ""}`}
                    >
                      <span>{dt.icon}</span>
                    </div>
                    <span className={styles.typeListLabel}>{dt.label}</span>
                    {durationType === dt.value && (
                      <div className={styles.typeListCheck}>✓</div>
                    )}
                  </button>
                ))}
              </div>
              <div className={styles.field} style={{ marginTop: "0.75rem" }}>
                <label className={styles.label}>
                  Number of {durationTypeItem?.label || "Units"}
                </label>
                <div className={styles.iconInputWrap}>
                  <span className={styles.iconInputIcon}>⏳</span>
                  <input
                    className={styles.iconInput}
                    type="number"
                    step="1"
                    placeholder="e.g. 5"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          )}

          {/* ── Category ── */}
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

          {/* ── Schedule ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Schedule</legend>
            <div className={styles.field}>
              <label className={styles.label}>
                Date &amp; Time <span className={styles.req}>*</span>
              </label>
              <div className={styles.iconInputWrap}>
                <span className={styles.iconInputIcon}>📅</span>
                <input
                  className={styles.iconInput}
                  type="datetime-local"
                  min={minDate}
                  value={form.scheduledAt}
                  onChange={(e) => set("scheduledAt", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {error && <p className={styles.error}>⚠️ {error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !worker}
          >
            {loading ? (
              <>
                <span className={styles.spinner} /> Creating booking…
              </>
            ) : (
              <>
                <span className={styles.submitBtnPlus}>+</span> Create Booking
              </>
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
