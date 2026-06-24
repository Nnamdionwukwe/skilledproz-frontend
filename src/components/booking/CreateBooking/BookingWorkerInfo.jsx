import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Check,
  Handshake,
  Lock,
  Star,
  MapPin,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react";
import styles from "./CreateBooking.module.css";
import { useState, useEffect } from "react";

// ── Currency symbol map ──────────────────────────────────────────────────
const CURRENCY_SYMBOLS = {
  NGN: "#",
  USD: "$",
  EUR: "€",
  GBP: "£",
  // add more as needed
};

// ── Format price with symbol and 2 decimals ────────────────────────────
function formatPrice(amount, currency = "NGN") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${Number(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// ── Duration options ────────────────────────────────────────────────────
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
    unit: "years", // ← NEW – yearly option
    label: "Yearly",
    rateKey: "yearlyRate",
    suffix: "/yr",
    inputLabel: "Years",
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
  // Format helper using the current currency
  const format = (amount) => formatPrice(amount, lockedCurrency);

  // Get currency symbol for display (used in price formatting)
  const currencySymbol = CURRENCY_SYMBOLS[lockedCurrency] || lockedCurrency;

  // ── Local state for custom quantity input ──
  const [quantityInput, setQuantityInput] = useState(
    String(form.quantity || 1),
  );

  // Sync local input when form.quantity changes from outside
  useEffect(() => {
    setQuantityInput(String(form.quantity || 1));
  }, [form.quantity]);

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
                  {format(lockedRate)}
                </span>
                <span className={styles.rateLockedNote}>
                  <Lock size={12} /> Set from the job post budget
                </span>
              </div>
              <div className={styles.rateLockedBox}>
                <span className={styles.rateLockedLabel}>Currency</span>
                <span className={styles.rateLockedValue}>
                  {lockedCurrency} {/* ← code, not symbol */}
                </span>
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
                            {format(rate)}
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
                    {format(lockedRate)}
                    {currentOption?.suffix}
                  </span>
                  <span className={styles.rateLockedNote}>
                    <Lock size={12} /> Worker's rate
                  </span>
                </div>
                <div className={styles.rateLockedBox}>
                  <span className={styles.rateLockedLabel}>Currency</span>
                  <span className={styles.rateLockedValue}>
                    {lockedCurrency} {/* ← code, not symbol */}
                  </span>
                  <span className={styles.rateLockedNote}>
                    <Lock size={12} /> Worker's currency
                  </span>
                </div>
              </div>

              {/* ── Custom Engagement ── */}
              {selectedUnit === "custom" && (
                <div className={styles.customEngagement}>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Rate per {currentOption?.label?.toLowerCase()}{" "}
                        <span className={styles.req}>*</span>
                      </label>
                      <div className={styles.iconInputWrap}>
                        <span className={styles.iconInputIcon}>
                          {currencySymbol}
                        </span>
                        <input
                          className={styles.iconInput}
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.rate || worker.customRate || 0}
                          disabled
                          readOnly
                        />
                      </div>
                      <span className={styles.hint}>
                        Rate set by worker – cannot be modified
                      </span>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Custom Label</label>
                      <div
                        className={`${styles.input} ${styles.customLabelDisplay}`}
                        style={{
                          height: "auto",
                          minHeight: "48px",
                          padding: "10px 14px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          display: "flex",
                          alignItems: "center",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          color: "var(--text)",
                          fontSize: "15px",
                          fontFamily: "var(--font-body)",
                          width: "100%",
                          outline: "none",
                          cursor: "default",
                          opacity: 0.8,
                        }}
                      >
                        {form.customLabel ||
                          worker.customRateLabel ||
                          "No custom label provided"}
                      </div>
                      <span className={styles.hint}>
                        Label provided by the worker
                      </span>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Number of {currentOption?.label?.toLowerCase()}{" "}
                      <span className={styles.req}>*</span>
                    </label>
                    <input
                      className={styles.input}
                      type="number"
                      min="1"
                      step="1"
                      value={quantityInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuantityInput(val);
                        // Only update form if it's a valid number >= 1
                        if (val === "") {
                          // Leave form.quantity unchanged
                          return;
                        }
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 1) {
                          set("quantity", num);
                        }
                      }}
                      onBlur={() => {
                        if (
                          quantityInput === "" ||
                          parseFloat(quantityInput) < 1
                        ) {
                          setQuantityInput("1");
                          set("quantity", 1);
                        }
                      }}
                    />
                  </div>

                  <div className={styles.estimatedTotalBox}>
                    <span className={styles.estimatedTotalLabel}>
                      Estimated Total
                    </span>
                    <span className={styles.estimatedTotalValue}>
                      {format(
                        (form.rate || worker.customRate || 0) *
                          (form.quantity || 1),
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Non‑custom duration input ── */}
              {selectedUnit !== "custom" && currentOption && (
                <div className={styles.field}>
                  <label className={styles.label}>
                    Number of {currentOption.inputLabel}
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
                        placeholder={format(lockedRate)}
                        value={negotiatedRate}
                        onChange={(e) => setNegotiatedRate(e.target.value)}
                      />
                      <span className={styles.negotiatedCurrency}>
                        {currencySymbol}
                      </span>
                    </div>
                    <span className={styles.hint}>
                      Enter the agreed rate (e.g., for discounts)
                    </span>
                    {lockedRate > 0 && negotiatedRate && (
                      <p className={styles.negotiatedDiff}>
                        {parseFloat(negotiatedRate) < lockedRate
                          ? `🟢 ${format(lockedRate - parseFloat(negotiatedRate))} below listed rate`
                          : parseFloat(negotiatedRate) > lockedRate
                            ? `🟡 ${format(parseFloat(negotiatedRate) - lockedRate)} above listed rate`
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
                    Make sure the worker agreed to this price before booking.
                    This replaces the listed rate of{" "}
                    <strong>{format(lockedRate)}</strong> for this booking only.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estimated total for non‑custom */}
          {estFees && (
            <div className={styles.estimatedTotalBox}>
              <span className={styles.estimatedTotalLabel}>
                Estimated Total
              </span>
              <span className={styles.estimatedTotalValue}>
                {format(estFees.subtotal)}
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
