import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./BookingDetail.module.css";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import HirerLayout from "../../layout/HirerLayout";
import WorkerLayout from "../../layout/WorkerLayout";
import RaiseDisputeModal from "../../disputes/RaiseDisputeModal";
import BookingDetailPayment from "./BookingDetailPayment";
import BookingDetailMain from "./BookingDetailMain";
import BookingDetailSidebar from "./BookingDetailSidebar";
import { calcPricing } from "../../utils/pricing";
import WorkerPaymentPreview from "./WorkerPaymentPreview";
import ConfirmationModal from "../../context/ConfirmationModal";
import { RefundRequest, RefundStatus, RefundHistory } from "../Refund";
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaExclamationCircle,
  FaSpinner,
  FaBriefcase,
  FaMapMarkerAlt,
  FaGlobe,
  FaRandom,
  FaCalendarAlt,
  FaClock,
  FaTag,
  FaAward,
  FaHome,
  FaCoffee,
  FaListAlt,
  FaClipboardCheck,
  FaDollarSign,
  FaLink,
  FaEnvelope,
  FaWhatsapp,
  FaPhone,
  FaFileAlt,
} from "react-icons/fa";
import tracker from "../../../lib/analytics/tracker";

// ── Helpers ──────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatDuration(booking) {
  if (!booking) return null;

  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue;
  const hours = booking.estimatedHours;
  const quantity = booking.quantity || 1;

  if (!value && !hours) return null;

  if (unit === "custom") {
    const quantityNum = booking.quantity || 1;
    const customLabel = booking.customLabel || "Custom";
    return {
      main: `${quantityNum} ${customLabel}`,
      sub: null,
      unit: "custom",
      label: `${quantityNum} ${customLabel}`,
    };
  }

  if (value) {
    const unitMap = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
    };

    const unitLabel = unitMap[unit] || unit;
    const num = parseFloat(value);

    if (isNaN(num) || num <= 0) {
      return {
        main: value,
        sub: null,
        unit: unit,
        label: `${value} ${unit}`,
      };
    }

    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;

    return {
      main: `${num} ${label}`,
      sub: eqv,
      unit: unit,
      label: `${num} ${label}`,
    };
  }

  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) {
      return {
        main: `${hours} hours`,
        sub: null,
        unit: "hours",
        label: `${hours} hours`,
      };
    }
    return {
      main: `${num} hours`,
      sub: null,
      unit: "hours",
      label: `${num} hours`,
    };
  }

  return null;
}

function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
}

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};

// ── Lookup maps for job-post fields ─────────────────────────────────────
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

const LOCATION_TYPE_ICON = {
  REMOTE: FaGlobe,
  ON_SITE: FaMapMarkerAlt,
  HYBRID: FaRandom,
};

const BUDGET_TYPE_LABEL = {
  FIXED: "Fixed Price",
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
};

// ── Inlined components ──────────────────────────────────────────────
function Skeleton() {
  return (
    <>
      <div className={styles.skBack} />
      <div className={styles.layout}>
        <div className={styles.skMain} />
        <div className={styles.skSide} />
      </div>
    </>
  );
}

function NotFound({ backTo = "/bookings" }) {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>
          <FaExclamationCircle size={48} />
        </span>
        <h2 className={styles.notFoundTitle}>Booking not found</h2>
        <Link
          to={backTo}
          className={styles.back}
          data-track-id="bookingDetail.notFound.back"
        >
          <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Bookings
        </Link>
      </div>
    </div>
  );
}

function Toast({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`}>
      <span className={styles.toastIcon}>
        {isError ? (
          <FaExclamationTriangle size={18} />
        ) : (
          <FaCheckCircle size={18} />
        )}
      </span>
      <span className={styles.toastMessage}>{message}</span>
      <button
        className={styles.toastClose}
        onClick={onClose}
        data-track-id="bookingDetail.toast.close"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
}

/**
 * JobPostDetails — renders the full job-post payload on a booking that
 * originated from a job post. Uses the same field set that PostJob /
 * EditJob sends, so nothing the hirer entered is hidden.
 */
function JobPostDetails({ booking }) {
  const snapshot = booking.jobRateSnapshot || {};
  const job = booking.jobPost || {};

  // Prefer live values from `booking` — they were copied from the job at
  // creation time. Fall back to the live job record or the snapshot if
  // the booking row is older.
  const fields = {
    jobType: booking.jobType || job.jobType,
    locationType: booking.locationType || job.locationType,
    scheduledAt: booking.scheduledAt || job.scheduledAt,
    address: booking.address || job.address,
    estimatedValue: booking.estimatedValue || job.estimatedValue,
    estimatedUnit: booking.estimatedUnit || job.estimatedUnit || "hours",
    estimatedHours: booking.estimatedHours ?? job.estimatedHours,
    durationValue: booking.durationValue || job.durationValue,
    durationType: booking.durationType || job.durationType,
    languageRequirement: job.languageRequirement,
    qualifications: job.qualifications || [],
    skills: booking.skills || job.skills || [],
    requirements: booking.requirements || job.requirements,
    responsibilities: booking.responsibilities || job.responsibilities,
    providesAccommodation:
      job.providesAccommodation ?? snapshot.providesAccommodation,
    providesMeals: job.providesMeals ?? snapshot.providesMeals,
    applicationUrl: job.applicationUrl,
    applicationEmail: job.applicationEmail,
    applicationWhatsApp: job.applicationWhatsApp,
    applicationPhone: job.applicationPhone,
    companyName: job.companyName,
    sourcePlatform: job.sourcePlatform,
  };

  const LocationIcon = LOCATION_TYPE_ICON[fields.locationType];

  const hasAnyJobMeta =
    fields.jobType ||
    fields.locationType ||
    fields.scheduledAt ||
    fields.address ||
    fields.estimatedValue ||
    fields.durationValue;

  const hasRequirementsList =
    fields.skills?.length > 0 ||
    fields.qualifications?.length > 0 ||
    fields.requirements ||
    fields.responsibilities;

  const hasWorkConditions =
    fields.providesAccommodation || fields.providesMeals;

  const hasApplyChannels =
    fields.applicationUrl ||
    fields.applicationEmail ||
    fields.applicationWhatsApp ||
    fields.applicationPhone;

  if (
    !hasAnyJobMeta &&
    !hasRequirementsList &&
    !hasWorkConditions &&
    !hasApplyChannels
  ) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <FaBriefcase
          size={14}
          style={{ marginRight: 6, verticalAlign: "-2px" }}
        />
        Job Post Details
      </h2>

      {/* ── Meta grid ── */}
      <div className={styles.detailGrid}>
        {fields.jobType && (
          <JobDetailCard
            icon={<FaBriefcase size={14} />}
            label="Job Type"
            value={JOB_TYPE_LABEL[fields.jobType] || fields.jobType}
          />
        )}

        {fields.locationType && LocationIcon && (
          <JobDetailCard
            icon={<LocationIcon size={14} />}
            label="Work Style"
            value={
              LOCATION_TYPE_LABEL[fields.locationType] || fields.locationType
            }
          />
        )}

        {fields.scheduledAt && (
          <JobDetailCard
            icon={<FaCalendarAlt size={14} />}
            label="Scheduled"
            value={new Date(fields.scheduledAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}

        {fields.estimatedValue && (
          <JobDetailCard
            icon={<FaClock size={14} />}
            label="Estimated Duration"
            value={`${fields.estimatedValue} ${fields.estimatedUnit}`}
          />
        )}

        {fields.durationValue && fields.durationType && (
          <JobDetailCard
            icon={<FaClock size={14} />}
            label="Project Duration"
            value={`${fields.durationValue} ${String(
              fields.durationType,
            ).toLowerCase()}`}
          />
        )}

        {fields.languageRequirement && (
          <JobDetailCard
            icon={<FaGlobe size={14} />}
            label="Language Required"
            value={String(fields.languageRequirement).toUpperCase()}
          />
        )}

        {fields.address &&
          fields.locationType &&
          fields.locationType !== "REMOTE" && (
            <JobDetailCard
              icon={<FaMapMarkerAlt size={14} />}
              label="Location"
              value={fields.address}
              full
            />
          )}
      </div>

      {/* ── Work Conditions ── */}
      {hasWorkConditions && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>Work Conditions</h3>
          <div className={styles.pillRow}>
            {fields.providesAccommodation && (
              <span className={styles.featurePill}>
                <FaHome size={11} /> Accommodation provided
              </span>
            )}
            {fields.providesMeals && (
              <span className={styles.featurePill}>
                <FaCoffee size={11} /> Meals provided
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Required Skills ── */}
      {fields.skills?.length > 0 && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>
            <FaTag
              size={12}
              style={{ marginRight: 5, verticalAlign: "-1px" }}
            />
            Required Skills
          </h3>
          <div className={styles.pillRow}>
            {fields.skills.map((s, i) => (
              <span key={i} className={styles.skillPill}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Required Qualifications ── */}
      {fields.qualifications?.length > 0 && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>
            <FaAward
              size={12}
              style={{ marginRight: 5, verticalAlign: "-1px" }}
            />
            Required Qualifications
          </h3>
          <div className={styles.pillRow}>
            {fields.qualifications.map((q, i) => (
              <span key={i} className={styles.qualificationPill}>
                <FaAward size={10} style={{ marginRight: 4 }} />
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Requirements (rich text) ── */}
      {fields.requirements && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>
            <FaClipboardCheck
              size={12}
              style={{ marginRight: 5, verticalAlign: "-1px" }}
            />
            Requirements
          </h3>
          <p className={styles.richText}>{fields.requirements}</p>
        </div>
      )}

      {/* ── Responsibilities (rich text) ── */}
      {fields.responsibilities && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>
            <FaListAlt
              size={12}
              style={{ marginRight: 5, verticalAlign: "-1px" }}
            />
            Responsibilities
          </h3>
          <p className={styles.richText}>{fields.responsibilities}</p>
        </div>
      )}

      {/* ── Additional Application Channels ── */}
      {hasApplyChannels && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>
            <FaFileAlt
              size={12}
              style={{ marginRight: 5, verticalAlign: "-1px" }}
            />
            Additional Application Channels
          </h3>
          <div className={styles.channelRow}>
            {fields.applicationUrl && (
              <a
                href={fields.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelPill}
              >
                <FaLink size={12} /> Apply link
              </a>
            )}
            {fields.applicationEmail && (
              <a
                href={`mailto:${fields.applicationEmail}`}
                className={styles.channelPill}
              >
                <FaEnvelope size={12} /> {fields.applicationEmail}
              </a>
            )}
            {fields.applicationWhatsApp && (
              <a
                href={`https://wa.me/${String(
                  fields.applicationWhatsApp,
                ).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelPill}
              >
                <FaWhatsapp size={12} /> {fields.applicationWhatsApp}
              </a>
            )}
            {fields.applicationPhone && (
              <a
                href={`tel:${fields.applicationPhone}`}
                className={styles.channelPill}
              >
                <FaPhone size={12} /> {fields.applicationPhone}
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function JobDetailCard({ icon, label, value, full }) {
  return (
    <div
      className={`${styles.detailCard} ${full ? styles.detailCardFull : ""}`}
    >
      <span className={styles.detailCardIcon}>{icon}</span>
      <div className={styles.detailCardBody}>
        <p className={styles.detailCardLabel}>{label}</p>
        <p className={styles.detailCardValue}>{value}</p>
      </div>
    </div>
  );
}

/**
 * JobRateSummary — shows exactly how the booking's agreedRate was
 * derived: rate × units = total, or fixed, or negotiated override. Pulls
 * from `jobRateSnapshot` which is written by the backend at creation
 * time so the hirer can see the calculation.
 */
function JobRateSummary({ booking, payment }) {
  const snapshot = booking.jobRateSnapshot || {};

  const selectedOption =
    booking.selectedRateOption || snapshot.selectedRateOption;
  const agreedRate = booking.agreedRate;
  const currency = booking.currency || "NGN";
  const isNegotiated =
    booking.isNegotiated || snapshot.negotiatedOverride != null;
  const budgetType = snapshot.budgetType || "FIXED";

  const value = booking.estimatedValue || snapshot.estimatedValue;
  const unit = booking.estimatedUnit || snapshot.estimatedUnit || "hours";

  const rate =
    selectedOption === "budget"
      ? snapshot.budget
      : selectedOption === "salaryAmount"
        ? snapshot.salaryAmount
        : selectedOption === "salaryMin"
          ? snapshot.salaryMin
          : selectedOption === "salaryMax"
            ? snapshot.salaryMax
            : selectedOption === "salaryText"
              ? null
              : snapshot.budget;

  const rateLabel = selectedOption
    ? {
        budget: "Job budget",
        salaryAmount: "Salary amount",
        salaryMin: "Salary (min)",
        salaryMax: "Salary (max)",
        salaryText: "Salary headline",
      }[selectedOption] || selectedOption
    : "Rate";

  // Build the explanation line, preferring the server-written audit
  // trail, else constructing a simple one from available data.
  let explanation = snapshot.explanation || null;
  if (!explanation) {
    if (isNegotiated) {
      explanation = "Negotiated amount — overrides the job's rate";
    } else if (budgetType === "FIXED") {
      explanation = `Fixed total: ${currency} ${Number(agreedRate).toLocaleString()}`;
    } else if (rate && value) {
      const rateStr = `${currency} ${Number(rate).toLocaleString()}`;
      explanation = `${rateStr} × ${value} ${unit} = ${currency} ${Number(
        agreedRate,
      ).toLocaleString()}`;
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <FaDollarSign
          size={14}
          style={{ marginRight: 6, verticalAlign: "-2px" }}
        />
        Payment Calculation
      </h2>

      <div className={styles.rateSummaryGrid}>
        {rate != null && (
          <div className={styles.rateSummaryRow}>
            <span className={styles.rateSummaryLabel}>{rateLabel}</span>
            <span className={styles.rateSummaryValue}>
              {currency} {Number(rate).toLocaleString()}
              {budgetType && budgetType !== "FIXED" && rate != null && (
                <span className={styles.rateSummaryUnit}>
                  {" "}
                  · {BUDGET_TYPE_LABEL[budgetType] || budgetType}
                </span>
              )}
            </span>
          </div>
        )}

        {value && budgetType !== "FIXED" && !isNegotiated && (
          <div className={styles.rateSummaryRow}>
            <span className={styles.rateSummaryLabel}>Duration</span>
            <span className={styles.rateSummaryValue}>
              {value} {unit}
              {booking.estimatedHours && (
                <span className={styles.rateSummaryUnit}>
                  {" "}
                  · ≈ {booking.estimatedHours}h
                </span>
              )}
            </span>
          </div>
        )}

        <div className={styles.rateSummaryRow}>
          <span className={styles.rateSummaryLabel}>Payment type</span>
          <span className={styles.rateSummaryValue}>
            {isNegotiated
              ? "Negotiated"
              : BUDGET_TYPE_LABEL[budgetType] || budgetType}
          </span>
        </div>

        <div className={`${styles.rateSummaryRow} ${styles.rateSummaryTotal}`}>
          <span className={styles.rateSummaryLabel}>Final amount</span>
          <span className={styles.rateSummaryTotalValue}>
            {currency} {Number(agreedRate).toLocaleString()}
          </span>
        </div>

        {isNegotiated && booking.negotiationNote && (
          <div className={styles.rateSummaryRow}>
            <span className={styles.rateSummaryLabel}>Negotiation note</span>
            <span className={styles.rateSummaryValueSmall}>
              {booking.negotiationNote}
            </span>
          </div>
        )}
      </div>

      {explanation && !isNegotiated && (
        <p className={styles.rateSummaryAudit}>{explanation}</p>
      )}
    </section>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showPayOptions, setShowPayOptions] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);

  // ── Refund state ──
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  // ── Referral wallet state ──
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const userId = user?.id;

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.bookingDetail.view", {
      bookingId: id || null,
      viewerRole: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToastMessage = (type, message) => {
    setToast({ type, message });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  const refetch = useCallback(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch(() => {});
  }, [id]);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        const b = res.data.data.booking;

        setBooking(b);
        if (b.emergencyContact) {
          try {
            const ec =
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact;
            setEmergencyContact(ec);
          } catch {}
        }
        api
          .get(`/payments/${b.id}`)
          .then((pr) => setPayment(pr.data.data))
          .catch(() => {});
        if (b.status === "COMPLETED") {
          api
            .get(`/reviews/check/${id}`)
            .then((r) => setHasReviewed(r.data.data.hasReviewed))
            .catch(() => setHasReviewed(false))
            .finally(() => setReviewCheckDone(true));
        } else {
          setReviewCheckDone(true);
        }

        if (user?.role === "HIRER") {
          api
            .get("/referral/wallet")
            .then((res) => {
              const bal = res.data.data?.balance || 0;
              setWalletBalance(bal);
              setReferralPercent(0);
              setReferralAmount(0);
              setReferralApplied(false);
            })
            .catch(() => {});
        }

        // ── Fetch refunds for this booking ──
        setRefundsLoading(true);
        api
          .get(`/refunds/my?bookingId=${id}`)
          .then((res) => {
            setRefunds(res.data.data?.refunds || []);
          })
          .catch(() => {
            setRefunds([]);
          })
          .finally(() => {
            setRefundsLoading(false);
          });

        // ── ANALYTICS: booking detail loaded ─────────────────────────────
        tracker.track("bookingDetail.loaded", {
          bookingId: id,
          status: b.status,
          viewerRole: user?.role || "GUEST",
          viewerIsHirer: userId === b.hirerId,
          viewerIsWorker: userId === b.workerId,
          amount: b.agreedRate,
          currency: b.currency,
          categoryId: b.category?.id || null,
          hasPayment: !!b.payment,
          paymentStatus: b.payment?.status || null,
          isNegotiated: !!b.isNegotiated,
          jobType: b.jobType || null,
          locationType: b.locationType || null,
          isPast: b.scheduledAt ? new Date(b.scheduledAt) < new Date() : false,
          source: b.source || "DIRECT",
        });
      })
      .catch((e) => {
        // ── ANALYTICS: booking detail failed to load ─────────────────────
        tracker.track("bookingDetail.load.failed", {
          bookingId: id,
          viewerRole: user?.role || "GUEST",
          reason: e.response?.data?.message || "unknown",
        });
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  // ── Silent refresh ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(refetch, 600000);
    return () => clearInterval(timer);
  }, [id, refetch]);

  // ── Recalculate referral amount ──────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    setReferralAmount(final);
  }, [referralPercent, walletBalance, booking]);

  // ── Status update ────────────────────────────────────────────────────
  async function updateStatus(status, extra = {}) {
    setActing(true);

    // ── ANALYTICS: status change attempt ─────────────────────────────────
    tracker.action("bookingDetail.status.attempt", {
      bookingId: id,
      fromStatus: booking?.status || null,
      toStatus: status,
      viewerRole: user?.role || "GUEST",
      viewerIsHirer: userId === booking?.hirerId,
      viewerIsWorker: userId === booking?.workerId,
      hasCancelReason: !!extra.cancelReason,
    });

    try {
      const res = await api.patch(`/bookings/${id}/status`, {
        status,
        ...extra,
      });
      setBooking(res.data.data.booking);
      showToastMessage(
        "success",
        `Booking ${status.toLowerCase().replace("_", " ")} successfully.`,
      );
      setShowCancel(false);
      setCancelReason("");
      setCancelError("");

      // ── ANALYTICS: status change succeeded ───────────────────────────
      tracker.action("bookingDetail.status.changed", {
        bookingId: id,
        fromStatus: booking?.status || null,
        toStatus: status,
        viewerRole: user?.role || "GUEST",
      });
    } catch (e) {
      showToastMessage(
        "error",
        e.response?.data?.message || "Action failed. Please try again.",
      );

      // ── ANALYTICS: status change failed ──────────────────────────────
      tracker.action("bookingDetail.status.failed", {
        bookingId: id,
        fromStatus: booking?.status || null,
        toStatus: status,
        viewerRole: user?.role || "GUEST",
        reason: e.response?.data?.message || "unknown",
      });
    } finally {
      setActing(false);
    }
  }

  function handleCancelSubmit() {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason.");
      // ── ANALYTICS: cancel blocked by missing reason ──────────────────
      tracker.action("bookingDetail.cancel.blocked", {
        bookingId: id,
        reason: "missing_reason",
      });
      return;
    }
    // ── ANALYTICS: cancel submitted ──────────────────────────────────────
    tracker.action("bookingDetail.cancel.submitted", {
      bookingId: id,
      reasonLength: cancelReason.trim().length,
    });
    updateStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  }

  // ── SOS resolve ──────────────────────────────────────────────────────
  const handleResolveSOS = async () => {
    setResolvingSOS(true);

    // ── ANALYTICS: SOS resolve attempt ───────────────────────────────────
    tracker.action("bookingDetail.sos.resolve.attempt", {
      bookingId: booking?.id,
      viewerRole: user?.role || "GUEST",
    });

    try {
      await api.patch(`/bookings/${booking.id}/sos/resolve`);
      showToastMessage("success", "SOS marked as resolved.");
      refetch();

      // ── ANALYTICS: SOS resolved ──────────────────────────────────────
      tracker.action("bookingDetail.sos.resolved", {
        bookingId: booking.id,
      });
    } catch (err) {
      showToastMessage(
        "error",
        err.response?.data?.message || "Failed to resolve SOS",
      );

      // ── ANALYTICS: SOS resolve failed ────────────────────────────────
      tracker.action("bookingDetail.sos.resolve.failed", {
        bookingId: booking?.id,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setResolvingSOS(false);
      setShowSOSConfirm(false);
    }
  };

  // ── Refund handlers ───────────────────────────────────────────────────
  const handleRefundRequest = async (refundData) => {
    setRefundLoading(true);

    // ── ANALYTICS: refund request attempt ────────────────────────────────
    tracker.action("bookingDetail.refund.attempt", {
      bookingId: id,
      amount: refundData?.amount,
      currency: refundData?.currency,
      refundType: refundData?.refundType || refundData?.type || null,
    });

    try {
      const response = await api.post("/refunds/request", refundData);
      showToastMessage("success", "Refund request submitted successfully!");
      refetch();
      // Refresh refunds
      const res = await api.get(`/refunds/my?bookingId=${id}`);
      setRefunds(res.data.data?.refunds || []);

      // ── ANALYTICS: refund request submitted ──────────────────────────
      tracker.action("bookingDetail.refund.submitted", {
        bookingId: id,
        refundId: response.data?.data?.refund?.id || null,
        amount: refundData?.amount,
        currency: refundData?.currency,
      });
    } catch (error) {
      showToastMessage(
        "error",
        error.response?.data?.message || "Failed to submit refund request",
      );

      // ── ANALYTICS: refund request failed ─────────────────────────────
      tracker.action("bookingDetail.refund.failed", {
        bookingId: id,
        reason: error.response?.data?.message || "unknown",
      });
    } finally {
      setRefundLoading(false);
    }
  };

  // ── Invoice ──────────────────────────────────────────────────────────
  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);

    // ── ANALYTICS: invoice download attempt ──────────────────────────────
    tracker.action("bookingDetail.invoice.download.attempt", {
      bookingId: booking.id,
    });

    try {
      const res = await api.get(`/payments/invoice/${booking.id}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${booking.id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      // ── ANALYTICS: invoice downloaded ────────────────────────────────
      tracker.action("bookingDetail.invoice.downloaded", {
        bookingId: booking.id,
      });
    } catch {
      showToastMessage("error", "Failed to download invoice");

      // ── ANALYTICS: invoice download failed ───────────────────────────
      tracker.action("bookingDetail.invoice.failed", {
        bookingId: booking?.id,
      });
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  if (!booking) return <NotFound backTo="/bookings" />;

  // ── Derived data ─────────────────────────────────────────────────────
  const meta = STATUS_META[booking.status] || {};
  const step = meta.step ?? 0;
  const isHirer = userId === booking.hirerId;
  const isWorker = userId === booking.workerId;
  const other = isHirer ? booking.worker : booking.hirer;
  const dur = formatDuration(booking);
  const sosActive = !!booking.sosActivatedAt && !booking.sosResolvedAt;
  const isJobSourced = booking.source === "JOB_POST";

  const hasCheckInGps =
    booking.checkInLat != null && booking.checkInLng != null;
  const hasCheckOutGps =
    booking.checkOutLat != null && booking.checkOutLng != null;
  const checkInDistKm =
    hasCheckInGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkInLat,
          booking.checkInLng,
          booking.latitude,
          booking.longitude,
        )
      : null;
  const checkOutDistKm =
    hasCheckOutGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkOutLat,
          booking.checkOutLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  const p = calcPricing(booking);

  const feeBreakdown = {
    label: "Payment Breakdown",
    subtotal: p.subtotal,
    total: p.grossTotal,
    platformFee: p.hirerFee,
    workerPayout: p.workerPayout,
    currency: p.currency,
    isActual: false,
    agreedRate: p.agreedRate,
    estimatedUnit: p.unit,
    hasQty: p.hasQty,
    qty: p.qty,
    unitLabel: p.unitLabel,
    suffix: p.unitSuffix,
    noDuration: !p.hasQty,
  };

  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking.status) &&
    (!payment || payment.status === "PENDING");

  // ── Handlers for referral slider ──────────────────────────────────
  const handlePercentChange = (pct) => {
    const subtotal = feeBreakdown.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (pct / 100) * subtotal;
    const amount = Math.round(rawAmount);
    const final = Math.min(amount, maxDiscount);

    setReferralPercent(pct);
    setReferralAmount(final);
    setReferralApplied(final > 0);

    // ── ANALYTICS: referral slider changed ───────────────────────────────
    tracker.action("bookingDetail.referral.slider.changed", {
      bookingId: id,
      percent: pct,
      amount: final,
      walletBalance,
      applied: final > 0,
    });
  };

  const handleReferralToggle = () => {
    const next = !referralApplied;
    setReferralApplied(next);

    // ── ANALYTICS: referral toggle changed ───────────────────────────────
    tracker.action("bookingDetail.referral.toggle.changed", {
      bookingId: id,
      applied: next,
      percent: referralPercent,
      amount: referralAmount,
    });
  };

  // ── Get refunds for this specific booking ──────────────────────────────
  const bookingRefunds = refunds.filter(
    (r) => r.bookingId === id || r.booking?.id === id,
  );

  const activeRefund = bookingRefunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  const showRefundForm =
    booking.status === "COMPLETED" &&
    payment?.status === "RELEASED" &&
    !activeRefund;

  const showRefundStatus = !!activeRefund;

  return (
    <Layout>
      <div className={styles.page}>
        <Link
          to="/bookings"
          className={styles.back}
          data-track-id="bookingDetail.back"
        >
          <FaArrowLeft style={{ marginRight: "6px" }} /> Back to Bookings
        </Link>

        {showToast && toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setShowToast(false)}
          />
        )}

        {sosActive && (
          <div className={styles.sosBanner}>
            <span className={styles.sosBannerIcon}>
              <FaExclamationTriangle />
            </span>
            <div className={styles.sosBannerBody}>
              <p className={styles.sosBannerTitle}>SOS Alert Active</p>
              <p className={styles.sosBannerDesc}>
                The worker has triggered an emergency alert.
                {booking.sosActivatedAt && (
                  <>
                    {" "}
                    Activated{" "}
                    {new Date(booking.sosActivatedAt).toLocaleTimeString()}
                  </>
                )}
              </p>
            </div>
            {(isHirer || user?.role === "ADMIN") && (
              <button
                className={styles.sosResolveBtn}
                onClick={() => setShowSOSConfirm(true)}
                disabled={resolvingSOS}
                data-track-id="bookingDetail.sos.resolve.open"
              >
                {resolvingSOS ? "Resolving..." : "Mark Resolved"}
              </button>
            )}
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.main}>
            <BookingDetailMain
              booking={booking}
              step={step}
              dur={dur}
              mapsUrl={mapsUrl}
              calcDuration={calcDuration}
              hasCheckInGps={hasCheckInGps}
              hasCheckOutGps={hasCheckOutGps}
              checkInDistKm={checkInDistKm}
              checkOutDistKm={checkOutDistKm}
              reviewCheckDone={reviewCheckDone}
              hasReviewed={hasReviewed}
              bookingId={booking.id}
              invoiceLoading={invoiceLoading}
              onDownloadInvoice={handleDownloadInvoice}
              isHirer={isHirer}
              payment={payment}
              paymentStatus={payment?.status}
              isWorker={isWorker}
              workerName={booking.worker?.firstName}
              onRefundRequest={handleRefundRequest}
              refundLoading={refundLoading}
              hasActiveRefund={!!activeRefund}
            />

            {/* ── Job Post Details — only for job-sourced bookings ── */}
            {isJobSourced && <JobPostDetails booking={booking} />}

            {/* ── Payment Calculation — full breakdown for job-sourced bookings ── */}
            {isJobSourced && (
              <JobRateSummary booking={booking} payment={payment} />
            )}

            {isWorker && booking.status === "PENDING" && (
              <WorkerPaymentPreview booking={booking} isWorker={isWorker} />
            )}

            {booking.payment && (
              <BookingDetailPayment
                booking={booking}
                payment={booking.payment}
                feeBreakdown={feeBreakdown}
                walletBalance={walletBalance}
                referralAmount={referralAmount}
                referralApplied={referralApplied}
                referralPercent={referralPercent}
                onPercentChange={handlePercentChange}
                onReferralToggle={handleReferralToggle}
                showPayOptions={showPayOptions}
                onTogglePayOptions={() => setShowPayOptions((v) => !v)}
                paymentRequired={paymentRequired}
                refetch={refetch}
                onSuccess={(msg) => showToastMessage("success", msg)}
                isHirer={isHirer}
                isWorker={isWorker}
              />
            )}
          </div>

          <div className={styles.sidebar}>
            {isHirer && paymentRequired && (
              <BookingDetailPayment
                booking={booking}
                payment={payment}
                feeBreakdown={feeBreakdown}
                walletBalance={walletBalance}
                referralAmount={referralAmount}
                referralApplied={referralApplied}
                referralPercent={referralPercent}
                onPercentChange={handlePercentChange}
                onReferralToggle={handleReferralToggle}
                showPayOptions={showPayOptions}
                onTogglePayOptions={() => setShowPayOptions((v) => !v)}
                paymentRequired={paymentRequired}
                refetch={refetch}
                onSuccess={(msg) => showToastMessage("success", msg)}
                isHirer={isHirer}
                isWorker={isWorker}
              />
            )}

            <BookingDetailSidebar
              booking={booking}
              payment={payment}
              isHirer={isHirer}
              isWorker={isWorker}
              other={other}
              userId={userId}
              acting={acting}
              emergencyContact={emergencyContact}
              showCancel={showCancel}
              cancelReason={cancelReason}
              cancelError={cancelError}
              onCancelOpen={() => {
                setShowCancel(true);
                setCancelError("");
                // ── ANALYTICS: cancel modal opened ───────────────────────
                tracker.action("bookingDetail.cancel.opened", {
                  bookingId: id,
                  status: booking.status,
                });
              }}
              onCancelClose={() => {
                setShowCancel(false);
                setCancelReason("");
                setCancelError("");
              }}
              onCancelReasonChange={(v) => {
                setCancelReason(v);
                setCancelError("");
              }}
              onCancelSubmit={handleCancelSubmit}
              onShowDispute={() => {
                setShowDispute(true);
                // ── ANALYTICS: dispute modal opened ──────────────────────
                tracker.action("bookingDetail.dispute.opened", {
                  bookingId: id,
                  status: booking.status,
                });
              }}
              onSuccess={(msg) => showToastMessage("success", msg)}
              refetch={refetch}
              updateStatus={updateStatus}
            />
          </div>
        </div>

        {/* ── Refund Section ────────────────────────────────────────────── */}
        {(showRefundForm || showRefundStatus) && (
          <div className={styles.refundSection}>
            <div className={styles.section}>
              {activeRefund && (
                <RefundStatus
                  refund={activeRefund}
                  onViewDetails={() => {
                    // ── ANALYTICS: refund details clicked ────────────────
                    tracker.action("bookingDetail.refund.details.clicked", {
                      bookingId: id,
                      refundId: activeRefund.id,
                      refundStatus: activeRefund.status,
                    });
                    navigate(`/refunds/${activeRefund.id}`);
                  }}
                  isHirer={isHirer}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showDispute && (
        <RaiseDisputeModal
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() =>
            showToastMessage(
              "success",
              "Dispute raised. Our team will review within 24–48 hours.",
            )
          }
        />
      )}

      {/* SOS Confirmation Modal */}
      {showSOSConfirm && (
        <ConfirmationModal
          isOpen={showSOSConfirm}
          onClose={() => setShowSOSConfirm(false)}
          onConfirm={handleResolveSOS}
          title="Resolve SOS Alert"
          message="Are you sure you want to mark this SOS alert as resolved?"
          confirmLabel="Yes, Resolve"
          cancelLabel="Cancel"
          confirmVariant="warning"
        />
      )}
    </Layout>
  );
}
