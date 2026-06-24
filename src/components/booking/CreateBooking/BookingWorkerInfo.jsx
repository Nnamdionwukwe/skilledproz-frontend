import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Check,
  Handshake,
  Lock,
  Star,
  MapPin,
  Circle,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  User,
  Building,
  Home,
} from "lucide-react";
import styles from "./CreateBooking.module.css";

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

export default function BookingWorkerInfo({
  propWorkerId,
  worker,
  workerLoading,
  workerError,
  selectedUnit,
  setSelectedUnit,
  availableUnits,
  currentOption,
  lockedRate,
  lockedCurrency,
  isFromJob,
  isNegotiated,
  setIsNegotiated,
  negotiatedRate,
  setNegotiatedRate,
  negotiationNote,
  setNegotiationNote,
  estFees,
  form,
  set,
}) {
  return (
    <>
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
        <div className={styles.workerError}>
          <AlertTriangle size={16} className={styles.iconInline} />{" "}
          {workerError}
        </div>
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
            {worker.isAvailable && <div className={styles.workerOnlineDot} />}
          </div>
          <div className={styles.workerCardInfo}>
            <p className={styles.workerCardName}>
              {worker.user?.firstName} {worker.user?.lastName}
              {worker.verificationStatus === "VERIFIED" && (
                <ShieldCheck
                  size={18}
                  strokeWidth={2}
                  className={styles.verifiedIcon}
                />
              )}
            </p>
            <p className={styles.workerCardTitle}>{worker.title}</p>
            <div className={styles.workerCardMeta}>
              {worker.avgRating > 0 && (
                <span>
                  <Star size={14} className={styles.iconInline} />{" "}
                  {worker.avgRating.toFixed(1)} ({worker.totalReviews} reviews)
                </span>
              )}
              {(worker.user?.city || worker.user?.country) && (
                <span>
                  <MapPin size={14} className={styles.iconInline} />{" "}
                  {[worker.user.city, worker.user.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
              <span>
                <Check size={14} className={styles.iconInline} />{" "}
                {worker.completedJobs} jobs done
              </span>
            </div>
            {/* ── ALL categories – removed slice(0,4) ── */}
            {worker.categories?.length > 0 && (
              <div className={styles.workerCardCats}>
                {worker.categories.map((wc) => (
                  <span key={wc.id} className={styles.catChip}>
                    {wc.category.icon} {wc.category.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.workerCardLock}>
            <Lock size={16} className={styles.iconInline} />
            <span className={styles.lockText}>
              Details locked from worker's profile
            </span>
          </div>
        </div>
      )}

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
                  <Lock size={12} /> Set from the job post budget
                </span>
              </div>
              <div className={styles.rateLockedBox}>
                <span className={styles.rateLockedLabel}>Currency</span>
                <span className={styles.rateLockedValue}>{lockedCurrency}</span>
                <span className={styles.rateLockedNote}>
                  <Lock size={12} /> Job's currency
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
                  Select how you want to engage this worker. The rate is set by
                  the worker and cannot be modified.
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
                  <span className={styles.rateLockedLabel}>Agreed Rate</span>
                  <span className={styles.rateLockedValue}>
                    {lockedCurrency} {Number(lockedRate).toLocaleString()}
                    {currentOption?.suffix}
                  </span>
                  <span className={styles.rateLockedNote}>
                    <Lock size={12} /> Worker's rate
                  </span>
                </div>
                <div className={styles.rateLockedBox}>
                  <span className={styles.rateLockedLabel}>Currency</span>
                  <span className={styles.rateLockedValue}>
                    {lockedCurrency}
                  </span>
                  <span className={styles.rateLockedNote}>
                    <Lock size={12} /> Worker's currency
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
                    <Clock size={18} className={styles.iconInputIcon} />
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
                      onChange={(e) => set("estimatedValue", e.target.value)}
                    />
                  </div>
                  {form.estimatedValue &&
                    currentOption.inputType === "number" && (
                      <p className={styles.durationLabel}>
                        <Calendar size={14} className={styles.iconInline} />{" "}
                        {form.estimatedValue}{" "}
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
                  {isNegotiated ? (
                    <Check size={22} strokeWidth={3} />
                  ) : (
                    <Handshake size={22} />
                  )}
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
                      <MessageSquare
                        size={18}
                        className={styles.iconInputIcon}
                      />
                      <input
                        className={styles.iconInput}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`e.g. ${lockedRate > 0 ? lockedRate : "5000"}`}
                        value={negotiatedRate}
                        onChange={(e) => setNegotiatedRate(e.target.value)}
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
                      placeholder="e.g. Agreed 10% discount for repeat booking, confirmed via platform Chat or WhatsApp"
                      value={negotiationNote}
                      onChange={(e) => setNegotiationNote(e.target.value)}
                    />
                  </div>

                  <div className={styles.negotiatedBanner}>
                    <Lock size={14} className={styles.iconInline} /> Both you
                    and the worker agreed to this rate in the platform Chat.
                    Make sure the worker aggreed to this price before booking.
                    This replaces the listed rate of{" "}
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
              <MessageSquare size={14} className={styles.iconInline} /> Worker's
              pricing note: <em>{worker.pricingNote}</em>
            </div>
          )}
        </fieldset>
      )}
    </>
  );
}
