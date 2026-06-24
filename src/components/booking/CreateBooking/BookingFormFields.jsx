import {
  Briefcase,
  Clock,
  FileText,
  Hourglass,
  Globe,
  MapPin,
  ArrowLeftRight,
  DollarSign,
  Sun,
  CalendarDays,
  Pencil,
  Calendar,
  Check,
} from "lucide-react";
import styles from "./CreateBooking.module.css";

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", icon: Briefcase },
  { value: "PART_TIME", label: "Part-time", icon: Clock },
  { value: "CONTRACT", label: "Contract", icon: FileText },
  { value: "TEMPORARY", label: "Temporary", icon: Hourglass },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", icon: Globe },
  { value: "ON_SITE", label: "On-site", icon: MapPin },
  { value: "HYBRID", label: "Hybrid", icon: ArrowLeftRight },
];

const BUDGET_TYPES = [
  {
    value: "FIXED",
    label: "Fixed Price",
    sub: "Pay a set total",
    icon: DollarSign,
  },
  { value: "HOURLY", label: "Per Hour", sub: "Billed hourly", icon: Clock },
  { value: "DAILY", label: "Per Day", sub: "Billed daily", icon: Sun },
  {
    value: "WEEKLY",
    label: "Per Week",
    sub: "Billed weekly",
    icon: CalendarDays,
  },
  {
    value: "MONTHLY",
    label: "Per Month",
    sub: "Billed monthly",
    icon: CalendarDays,
  },
  { value: "CUSTOM", label: "Custom", sub: "Define your own", icon: Pencil },
];

const DURATION_TYPES_LIST = [
  { value: "HOURS", label: "Hours", icon: Clock },
  { value: "DAYS", label: "Days", icon: Sun },
  { value: "WEEKS", label: "Weeks", icon: CalendarDays },
  { value: "MONTHS", label: "Months", icon: CalendarDays },
  { value: "CUSTOM", label: "Custom", icon: Pencil },
];

export default function BookingFormFields({
  worker,
  jobType,
  setJobType,
  locationType,
  setLocationType,
  budgetType,
  setBudgetType,
  durationType,
  setDurationType,
  durationValue,
  setDurationValue,
  form,
  set,
  minDate,
}) {
  const currentDuration = DURATION_TYPES_LIST.find(
    (d) => d.value === durationType,
  );

  return (
    <>
      {worker && (
        <>
          {/* ── Job Type ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Job Type</legend>
            <div className={styles.jobTypeGrid}>
              {JOB_TYPES.map((jt) => {
                const Icon = jt.icon;
                return (
                  <button
                    type="button"
                    key={jt.value}
                    className={`${styles.jobTypeCard} ${jobType === jt.value ? styles.jobTypeCardActive : ""}`}
                    onClick={() => setJobType(jt.value)}
                  >
                    {jobType === jt.value && (
                      <span className={styles.activeDot} />
                    )}
                    <Icon size={26} className={styles.jobTypeIcon} />
                    <span className={styles.jobTypeLabel}>{jt.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Location Type ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Location Type</legend>
            <div className={styles.locationGrid}>
              {LOCATION_TYPES.map((lt) => {
                const Icon = lt.icon;
                return (
                  <button
                    type="button"
                    key={lt.value}
                    className={`${styles.locationCard} ${locationType === lt.value ? styles.locationCardActive : ""}`}
                    onClick={() => setLocationType(lt.value)}
                  >
                    {locationType === lt.value && (
                      <span className={styles.activeDot} />
                    )}
                    <Icon size={22} className={styles.locationIcon} />
                    <span className={styles.locationLabel}>{lt.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Payment Type ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Payment Type</legend>
            <div className={styles.typeList}>
              {BUDGET_TYPES.map((bt) => {
                const Icon = bt.icon;
                return (
                  <button
                    type="button"
                    key={bt.value}
                    className={`${styles.typeListRow} ${budgetType === bt.value ? styles.typeListRowActive : ""}`}
                    onClick={() => setBudgetType(bt.value)}
                  >
                    <div
                      className={`${styles.typeListIcon} ${budgetType === bt.value ? styles.typeListIconActive : ""}`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className={styles.typeListContent}>
                      <span className={styles.typeListLabel}>{bt.label}</span>
                      <span className={styles.typeListSub}>{bt.sub}</span>
                    </div>
                    {budgetType === bt.value && (
                      <Check size={18} className={styles.typeListCheck} />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Job Duration ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Job Duration</legend>
            <div className={styles.typeList}>
              {DURATION_TYPES_LIST.map((dt) => {
                const Icon = dt.icon;
                return (
                  <button
                    type="button"
                    key={dt.value}
                    className={`${styles.typeListRow} ${durationType === dt.value ? styles.typeListRowActive : ""}`}
                    onClick={() => setDurationType(dt.value)}
                  >
                    <div
                      className={`${styles.typeListIcon} ${durationType === dt.value ? styles.typeListIconActive : ""}`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className={styles.typeListLabel}>{dt.label}</span>
                    {durationType === dt.value && (
                      <Check size={18} className={styles.typeListCheck} />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Category ── */}
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
                  <span className={styles.lockedBadge}>
                    <Lock size={12} /> Locked
                  </span>
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
        </>
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
          <label className={styles.label}>Requirements (optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="e.g. Must have 3+ years of React experience"
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            rows={2}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Responsibilities (optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="e.g. Design UI mockups, conduct user tests"
            value={form.responsibilities}
            onChange={(e) => set("responsibilities", e.target.value)}
            rows={2}
          />
        </div>
        {locationType !== "REMOTE" && (
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
        )}
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
            <Calendar size={18} className={styles.iconInputIcon} />
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
    </>
  );
}
