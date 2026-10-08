// src/components/hirer/CreateBookingFromJob.jsx
import { useState, useEffect } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import HirerLayout from "../layout/HirerLayout";
import api from "../../lib/api";
import styles from "./CreateBookingFromJob.module.css";
import {
  FiChevronLeft,
  FiLock,
  FiFileText,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiGlobe,
  FiShuffle,
  FiBriefcase,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiTag,
  FiDollarSign,
  FiTrendingUp,
  FiLayers,
  FiCheckSquare,
  FiSearch,
  FiInfo,
} from "react-icons/fi";

// ── Static lookups (mirror backend enums) ──────────────────────────────────
const JOB_TYPE_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
};

const LOCATION_TYPE_LABEL = {
  REMOTE: "Remote",
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
};

const BUDGET_TYPE_LABEL = {
  FIXED: "Fixed",
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
};

// Friendly labels for the server error codes
const OPTION_ERROR_LABEL = {
  MISSING_RATE: "No amount set for this option",
  MISSING_DURATION:
    "This rate needs a duration — enter a negotiated total below",
  CUSTOM_UNSUPPORTED:
    "Custom rate — enter the agreed total as a negotiated amount below",
  SALARY_TEXT_UNSUPPORTED:
    "Salary headline only — enter a negotiated amount below",
};

function formatMoney(amount, currency) {
  if (amount == null) return "—";
  return `${currency || ""} ${Number(amount).toLocaleString()}`.trim();
}

export default function CreateBookingFromJob() {
  const { jobPostId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workerId = searchParams.get("workerId");

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  // ── Form state ──
  const [selectedRateOption, setSelectedRateOption] = useState("");
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");
  const [notes, setNotes] = useState("");

  // ── Load the draft ───────────────────────────────────────────────────
  useEffect(() => {
    if (!jobPostId) return;

    const url = workerId
      ? `/bookings/from-job/${jobPostId}/draft?workerId=${workerId}`
      : `/bookings/from-job/${jobPostId}/draft`;

    api
      .get(url)
      .then((res) => {
        const data = res.data.data;
        setDraft(data);

        // Auto-select the first *computable* option. If none is
        // computable, leave the selection empty so the hirer is
        // prompted to negotiate.
        const firstComputable = data.priceOptions?.find(
          (o) => o.canAutoCompute !== false && o.estimatedTotal != null,
        );
        if (firstComputable) {
          setSelectedRateOption(firstComputable.key);
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Failed to load the job post. Try again.",
        );
      })
      .finally(() => setLoading(false));
  }, [jobPostId, workerId]);

  // ── Derived values ──────────────────────────────────────────────────
  const hasNegotiated = negotiatedRate !== "" && parseFloat(negotiatedRate) > 0;

  const selectedPriceOption = draft?.priceOptions?.find(
    (p) => p.key === selectedRateOption,
  );

  // The selected option must be computable by the server UNLESS a
  // negotiated amount has been entered.
  const selectedOptionBlocked =
    !hasNegotiated &&
    selectedPriceOption &&
    (selectedPriceOption.canAutoCompute === false ||
      selectedPriceOption.estimatedTotal == null);

  // Final displayed total = negotiated amount > server-computed total
  const finalAmount = hasNegotiated
    ? parseFloat(negotiatedRate)
    : (selectedPriceOption?.estimatedTotal ??
      selectedPriceOption?.amount ??
      null);

  const finalCurrency =
    selectedPriceOption?.currency || draft?.lockedFields?.currency || "NGN";

  const canSubmit =
    !submitting &&
    selectedRateOption &&
    finalAmount != null &&
    (!selectedOptionBlocked || hasNegotiated);

  // ── Submit ──────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!workerId && !draft?.lockedFields?.workerId) {
      setError("Missing worker. Reload the page and try again.");
      return;
    }
    if (!selectedRateOption) {
      setError("Please select a payment option.");
      return;
    }
    if (selectedOptionBlocked && !hasNegotiated) {
      setError(
        "This option has no automatic total. Please enter a negotiated amount.",
      );
      return;
    }

    const resolvedWorkerId = workerId || draft?.lockedFields?.workerId;

    setSubmitting(true);
    try {
      const payload = {
        workerId: resolvedWorkerId,
        selectedRateOption,
        notes: notes.trim() || undefined,
      };
      if (hasNegotiated) {
        payload.negotiatedRate = parseFloat(negotiatedRate);
        if (negotiationNote.trim()) {
          payload.negotiationNote = negotiationNote.trim();
        }
      }
      const res = await api.post(`/bookings/from-job/${jobPostId}`, payload);
      setSuccess(res.data.data.booking);
      // Navigate after we've captured the booking so the success screen
      // has the data it needs. We do this in the next tick to avoid a
      // flash.
      setTimeout(() => {
        navigate(`/bookings/${res.data.data.booking.id}`);
      }, 50);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create booking. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────
  if (success) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <FiCheckCircle size={56} />
            </div>
            <h2 className={styles.successTitle}>Booking Created!</h2>
            <p className={styles.successText}>
              A booking request has been sent to{" "}
              <strong>
                {success.worker?.firstName} {success.worker?.lastName}
              </strong>
              . They'll be notified by email.
            </p>

            <div className={styles.successCard}>
              <div className={styles.successCat}>
                {success.category?.icon} {success.category?.name}
              </div>
              <div className={styles.successTitleSmall}>{success.title}</div>

              <div className={styles.successMeta}>
                <FiMapPin size={12} />{" "}
                {success.locationType === "REMOTE"
                  ? "Remote"
                  : success.address || "—"}
              </div>
              <div className={styles.successMeta}>
                <FiDollarSign size={12} />{" "}
                {formatMoney(success.agreedRate, success.currency)}
                {success.isNegotiated && " · Negotiated"}
              </div>
              {success.scheduledAt && (
                <div className={styles.successMeta}>
                  <FiCalendar size={12} />{" "}
                  {new Date(success.scheduledAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className={styles.successActions}>
              <Link to={`/bookings/${success.id}`} className={styles.submitBtn}>
                View Booking
              </Link>
              <Link to="/bookings" className={styles.resetBtn}>
                All Bookings
              </Link>
            </div>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.skeleton} style={{ height: 40, width: 140 }} />
          <div className={styles.skeleton} style={{ height: 100 }} />
          <div className={styles.skeleton} style={{ height: 260 }} />
          <div className={styles.skeleton} style={{ height: 200 }} />
        </div>
      </HirerLayout>
    );
  }

  // ── Error state (nothing loaded) ────────────────────────────────────
  if (!draft) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.notFound}>
            <FiSearch size={48} className={styles.notFoundIcon} />
            <h2 className={styles.notFoundTitle}>
              {error || "Booking draft not found"}
            </h2>
            <Link
              to="/dashboard/hirer/jobs-management"
              className={styles.backLink}
            >
              <FiChevronLeft size={14} /> Back to Jobs
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  const { worker, category, lockedFields, priceOptions, jobTitle } = draft;

  // ── Main form ───────────────────────────────────────────────────────
  return (
    <HirerLayout>
      <div className={styles.page}>
        <Link
          to={`/jobs/${jobPostId}/applications`}
          className={styles.backLink}
        >
          <FiChevronLeft size={14} /> Back to Applications
        </Link>

        {/* Header */}
        <div className={styles.header}>
          <p className={styles.eyebrow}>Create Booking</p>
          <h1 className={styles.title}>From job post</h1>
          <p className={styles.subtitle}>
            Booking <strong>"{jobTitle}"</strong> with{" "}
            <strong>
              {worker?.firstName} {worker?.lastName}
            </strong>
            {worker?.workerProfile?.title && ` · ${worker.workerProfile.title}`}
          </p>
        </div>

        {error && (
          <div className={styles.alertError}>
            <FiAlertTriangle size={14} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              <FiX size={14} />
            </button>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ══════════════════════════════════════════════════════════
              LOCKED FIELDS (from the job post)
          ══════════════════════════════════════════════════════════ */}
          <div className={styles.lockHeader}>
            <FiLock size={14} />
            <span>
              These details come from the job post and cannot be edited
            </span>
          </div>

          <div className={styles.lockedGrid}>
            {category && (
              <LockedCard
                icon={<FiLayers size={14} />}
                label="Category"
                value={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
              />
            )}
            {lockedFields.jobType && (
              <LockedCard
                icon={<FiBriefcase size={14} />}
                label="Job Type"
                value={
                  JOB_TYPE_LABEL[lockedFields.jobType] || lockedFields.jobType
                }
              />
            )}
            {lockedFields.locationType && (
              <LockedCard
                icon={<FiMapPin size={14} />}
                label="Work Style"
                value={
                  LOCATION_TYPE_LABEL[lockedFields.locationType] ||
                  lockedFields.locationType
                }
              />
            )}
            {lockedFields.scheduledAt && (
              <LockedCard
                icon={<FiCalendar size={14} />}
                label="Scheduled"
                value={new Date(lockedFields.scheduledAt).toLocaleString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              />
            )}
            {lockedFields.estimatedValue && (
              <LockedCard
                icon={<FiClock size={14} />}
                label="Estimated Duration"
                value={`${lockedFields.estimatedValue} ${
                  lockedFields.estimatedUnit || "hours"
                }`}
              />
            )}
            {lockedFields.durationValue && lockedFields.durationType && (
              <LockedCard
                icon={<FiClock size={14} />}
                label="Project Duration"
                value={`${lockedFields.durationValue} ${lockedFields.durationType.toLowerCase()}`}
              />
            )}
            {lockedFields.locationType !== "REMOTE" && lockedFields.address && (
              <LockedCard
                icon={<FiMapPin size={14} />}
                label="Address"
                value={lockedFields.address}
                full
              />
            )}
          </div>

          {/* Title + Description */}
          <div className={styles.field}>
            <label className={styles.label}>Job Title</label>
            <div className={styles.lockedValue}>{lockedFields.title}</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <div className={styles.lockedValueMultiline}>
              {lockedFields.description}
            </div>
          </div>

          {/* Skills */}
          {lockedFields.skills?.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Required Skills</label>
              <div className={styles.skillsWrap}>
                {lockedFields.skills.map((s, i) => (
                  <span key={i} className={styles.skillChip}>
                    <FiCheckSquare size={11} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Requirements / Responsibilities */}
          {lockedFields.requirements && (
            <div className={styles.field}>
              <label className={styles.label}>Requirements</label>
              <div className={styles.lockedValueMultiline}>
                {lockedFields.requirements}
              </div>
            </div>
          )}
          {lockedFields.responsibilities && (
            <div className={styles.field}>
              <label className={styles.label}>Responsibilities</label>
              <div className={styles.lockedValueMultiline}>
                {lockedFields.responsibilities}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAYMENT SELECTION
          ══════════════════════════════════════════════════════════ */}
          <div className={styles.sectionDivider}>
            <FiDollarSign size={14} />
            <span>Payment</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Select Payment Option <span className={styles.req}>*</span>
            </label>
            <p className={styles.fieldHint}>
              Pick the price the hirer will pay for this booking. The total is
              calculated by the server based on the job's rate and duration.
            </p>

            <div className={styles.rateOptions}>
              {priceOptions.map((option) => {
                const blocked =
                  option.canAutoCompute === false ||
                  option.estimatedTotal == null;
                const isSelected = selectedRateOption === option.key;
                const dimmed = hasNegotiated && !isSelected;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.rateOption} ${
                      isSelected ? styles.rateOptionActive : ""
                    } ${dimmed ? styles.rateOptionDim : ""} ${
                      blocked ? styles.rateOptionBlocked : ""
                    }`}
                    onClick={() => setSelectedRateOption(option.key)}
                  >
                    <span className={styles.rateOptionRadio}>
                      {isSelected ? "◉" : "○"}
                    </span>
                    <span className={styles.rateOptionBody}>
                      <span className={styles.rateOptionLabel}>
                        {option.label}
                      </span>
                      <span className={styles.rateOptionMeta}>
                        {option.description}
                        {option.period &&
                          option.period !== "FIXED" &&
                          ` · ${
                            BUDGET_TYPE_LABEL[option.period] || option.period
                          }`}
                      </span>

                      {/* Server-computed total for this option */}
                      {!blocked ? (
                        <span className={styles.rateOptionTotal}>
                          Total:{" "}
                          {formatMoney(option.estimatedTotal, option.currency)}
                        </span>
                      ) : (
                        <span className={styles.rateOptionBlockedNote}>
                          <FiInfo size={11} />{" "}
                          {OPTION_ERROR_LABEL[option.error] ||
                            "Enter a negotiated amount below"}
                        </span>
                      )}

                      {/* Show the audit trail when the server gives one */}
                      {!blocked && option.explanation && (
                        <span className={styles.rateOptionAudit}>
                          {option.explanation}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Negotiated override */}
          <div className={styles.negotiatedBox}>
            <div className={styles.negotiatedHeader}>
              <FiTrendingUp size={14} />
              <span>Negotiated amount (optional)</span>
            </div>
            <p className={styles.negotiatedHint}>
              If you and the worker agreed on a different amount after
              discussion, enter it here. It will{" "}
              <strong>override the calculated total</strong> and is required for
              options marked above.
            </p>

            <div className={styles.row2}>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 85000"
                value={negotiatedRate}
                onChange={(e) => setNegotiatedRate(e.target.value)}
              />
              <div className={styles.currencyLabel}>{finalCurrency}</div>
            </div>

            {hasNegotiated && (
              <>
                <input
                  className={styles.input}
                  style={{ marginTop: 10 }}
                  type="text"
                  maxLength={500}
                  placeholder="Reason / note about the negotiation (optional)"
                  value={negotiationNote}
                  onChange={(e) => setNegotiationNote(e.target.value)}
                />
                <p className={styles.negotiatedSummary}>
                  ✓ Final amount:{" "}
                  <strong>{formatMoney(negotiatedRate, finalCurrency)}</strong>{" "}
                  · overrides the selected option
                </p>
              </>
            )}
          </div>

          {/* Final rate summary */}
          {finalAmount != null && (
            <div className={styles.rateSummary}>
              <FiCheckCircle size={14} />
              <span>
                Final amount:{" "}
                <strong>{formatMoney(finalAmount, finalCurrency)}</strong>
                {!hasNegotiated &&
                  selectedPriceOption?.period &&
                  selectedPriceOption.period !== "FIXED" &&
                  ` (${
                    BUDGET_TYPE_LABEL[selectedPriceOption.period] ||
                    selectedPriceOption.period
                  })`}
                {hasNegotiated && " · negotiated"}
              </span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              BOOKING NOTES (hirer-editable)
          ══════════════════════════════════════════════════════════ */}
          <div className={styles.field}>
            <label className={styles.label}>
              Booking Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={3}
              maxLength={1000}
              placeholder="Access instructions, tools needed, or any notes specific to this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link
              to={`/jobs/${jobPostId}/applications`}
              className={styles.cancelBtn}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} /> Creating...
                </>
              ) : (
                <>
                  <FiCheckCircle size={16} /> Create Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </HirerLayout>
  );
}

// ── Sub-component: read-only card ──────────────────────────────────────────
function LockedCard({ icon, label, value, full }) {
  return (
    <div
      className={`${styles.lockedCard} ${full ? styles.lockedCardFull : ""}`}
    >
      <span className={styles.lockedIcon}>{icon}</span>
      <div>
        <p className={styles.lockedLabel}>{label}</p>
        <p className={styles.lockedVal}>{value}</p>
      </div>
    </div>
  );
}
