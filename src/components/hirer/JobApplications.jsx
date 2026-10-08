import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import HirerLayout from "../layout/HirerLayout";
import api from "../../lib/api";
import styles from "./HirerJobs.module.css";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaStar,
  FaRegStar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBriefcase,
  FaTrophy,
  FaMoneyBillWave,
  FaInbox,
  FaExclamationTriangle,
  FaClipboardList,
  FaQuoteLeft,
  FaTimes,
  FaExpand,
  FaUndo,
  FaBan,
} from "react-icons/fa";
import InterviewCallButton from "../video/InterviewCallButton";

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function Stars({ rating = 0, total = 5 }) {
  const rounded = Math.round(rating);
  return (
    <span className={styles.stars} aria-label={`${rating} out of 5`}>
      {Array.from({ length: total }).map((_, i) =>
        i < rounded ? (
          <FaStar key={i} className={styles.starOn} />
        ) : (
          <FaRegStar key={i} className={styles.starOff} />
        ),
      )}
    </span>
  );
}

const APP_STATUS = {
  PENDING: { label: "Pending", cls: "appPending", Icon: FaClock },
  ACCEPTED: { label: "Accepted", cls: "appAccepted", Icon: FaCheckCircle },
  REJECTED: { label: "Rejected", cls: "appRejected", Icon: FaTimesCircle },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function JobApplications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Full-screen avatar viewer ──
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // ── Cancel confirmation state ──
  // Shape: { applicationId, workerName, hasBooking } | null
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [jobRes, appsRes] = await Promise.all([
          api.get(`/jobs/${id}`),
          api.get(`/jobs/${id}/applications`),
        ]);
        setJob(jobRes.data.data.jobPost);
        setApplications(appsRes.data.data.applications || []);
      } catch {
        setError("Failed to load applications.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  // ── Escape closes the lightbox ──
  useEffect(() => {
    if (!lightboxSrc) return;
    function onKey(e) {
      if (e.key === "Escape") setLightboxSrc(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  // ── Accept / reject a pending application ──
  const handleDecision = async (applicationId, status) => {
    setUpdating(applicationId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/jobs/${id}/applications/${applicationId}/status`, {
        status,
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      );
      if (status === "ACCEPTED") {
        setJob((prev) => ({ ...prev, status: "FILLED" }));
        setSuccess("Application accepted! The job has been marked as filled.");
      } else {
        setSuccess("Application rejected.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update application.");
    } finally {
      setUpdating(null);
    }
  };

  // ── Unaccept / cancel booking ──
  // Two outcomes depending on whether a booking exists for this application:
  //
  //   a) No booking yet → PATCH the application back to PENDING and
  //      set the job to OPEN again.
  //   b) Booking exists  → PATCH the booking to CANCELLED, then reset
  //      the application to PENDING and the job to OPEN.
  //
  // The backend endpoint is `/jobs/:id/applications/:appId/status` for
  // (a). For (b) we call `/bookings/:bookingId/cancel` — adjust if your
  // route is named differently.
  const handleUnaccept = async ({ applicationId }) => {
    setUpdating(applicationId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/jobs/${id}/applications/${applicationId}/unaccept`);

      // Update local state — flip the application back to PENDING
      // and mark the job as OPEN again.
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? { ...a, status: "PENDING", booking: undefined, bookingId: null }
            : a,
        ),
      );
      setJob((prev) => ({ ...prev, status: "OPEN" }));
      setSuccess(
        "Acceptance undone. The application is back in Pending Review and any booking has been cancelled.",
      );
      setCancelTarget(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to cancel. Please try again or contact support.",
      );
    } finally {
      setUpdating(null);
    }
  };

  const pending = applications.filter((a) => a.status === "PENDING");
  const decided = applications.filter((a) => a.status !== "PENDING");

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Back */}
        <button
          className={styles.backBtn}
          onClick={() => navigate("/dashboard/hirer/jobs-management")}
        >
          <FaArrowLeft /> Back to Jobs
        </button>

        {/* Job summary */}
        {loading ? (
          <div
            className={styles.skeleton}
            style={{ height: 100, marginBottom: "1.5rem" }}
          />
        ) : (
          job && (
            <div className={styles.jobSummary}>
              <div className={styles.summaryLeft}>
                <span className={styles.summaryIcon}>
                  {job.category?.icon || <FaClipboardList />}
                </span>
                <div>
                  <h2 className={styles.summaryTitle}>{job.title}</h2>
                  <p className={styles.summaryMeta}>
                    {job.category?.name} · {job.address} ·{" "}
                    {new Date(job.scheduledAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className={styles.summaryRight}>
                <div className={styles.appCount}>
                  <span className={styles.appCountNum}>
                    {applications.length}
                  </span>
                  <span className={styles.appCountLabel}>Total</span>
                </div>
                <div className={styles.appCount}>
                  <span className={styles.appCountNum}>{pending.length}</span>
                  <span className={styles.appCountLabel}>Pending</span>
                </div>
                <div className={styles.appCount}>
                  <span
                    className={styles.appCountNum}
                    style={{ color: "var(--green)" }}
                  >
                    {applications.filter((a) => a.status === "ACCEPTED").length}
                  </span>
                  <span className={styles.appCountLabel}>Accepted</span>
                </div>
              </div>
            </div>
          )
        )}

        {/* Alerts */}
        {error && (
          <div className={styles.errorBox}>
            <FaExclamationTriangle />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        {success && (
          <div className={styles.successBox}>
            <FaCheckCircle />
            <span>{success}</span>
            <button onClick={() => setSuccess("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {/* Applications */}
        {loading ? (
          <div className={styles.appList}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ height: 140 }}
              />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <FaInbox />
            </span>
            <p className={styles.emptyTitle}>No applications yet</p>
            <p className={styles.emptySub}>
              Workers haven't applied to this job yet. Share it to get more
              visibility.
            </p>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div className={styles.appSection}>
                <h3 className={styles.appSectionTitle}>
                  Pending Review
                  <span className={styles.appSectionCount}>
                    {pending.length}
                  </span>
                </h3>
                <div className={styles.appList}>
                  {pending.map((app, i) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      jobId={id}
                      jobTitle={job?.title}
                      updating={updating}
                      onAccept={() => handleDecision(app.id, "ACCEPTED")}
                      onReject={() => handleDecision(app.id, "REJECTED")}
                      onUnacceptRequest={() =>
                        setCancelTarget({
                          applicationId: app.id,
                          workerName:
                            `${app.worker?.firstName || ""} ${app.worker?.lastName || ""}`.trim(),
                          hasBooking: !!(app.booking || app.bookingId),
                          bookingId: app.booking?.id || app.bookingId || null,
                        })
                      }
                      onAvatarClick={setLightboxSrc}
                      delay={i * 0.06}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Decided */}
            {decided.length > 0 && (
              <div className={styles.appSection}>
                <h3 className={styles.appSectionTitle}>
                  Reviewed
                  <span className={styles.appSectionCount}>
                    {decided.length}
                  </span>
                </h3>
                <div className={styles.appList}>
                  {decided.map((app, i) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      jobId={id}
                      jobTitle={job?.title}
                      updating={updating}
                      decided
                      onUnacceptRequest={() =>
                        setCancelTarget({
                          applicationId: app.id,
                          workerName:
                            `${app.worker?.firstName || ""} ${app.worker?.lastName || ""}`.trim(),
                          hasBooking: !!(app.booking || app.bookingId),
                          bookingId: app.booking?.id || app.bookingId || null,
                        })
                      }
                      onAvatarClick={setLightboxSrc}
                      delay={i * 0.06}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Confirm cancel / unaccept modal ─────────────────────────── */}
      {cancelTarget && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setCancelTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm cancellation"
        >
          <div
            className={styles.confirmBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmIcon}>
              {cancelTarget.hasBooking ? (
                <FaBan size={26} />
              ) : (
                <FaUndo size={26} />
              )}
            </div>
            <h3 className={styles.confirmTitle}>
              {cancelTarget.hasBooking
                ? "Cancel this booking?"
                : "Undo this acceptance?"}
            </h3>
            <p className={styles.confirmText}>
              {cancelTarget.hasBooking ? (
                <>
                  This will cancel the booking with{" "}
                  <strong>{cancelTarget.workerName || "the worker"}</strong> and
                  return the job to <strong>Open</strong>. The worker will be
                  notified and their application will go back to{" "}
                  <strong>Pending Review</strong>.
                </>
              ) : (
                <>
                  This will return{" "}
                  <strong>{cancelTarget.workerName || "the worker"}</strong>'s
                  application to <strong>Pending Review</strong> and set the job
                  back to <strong>Open</strong>. You can accept a different
                  applicant afterwards.
                </>
              )}
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setCancelTarget(null)}
                disabled={updating === cancelTarget.applicationId}
              >
                Keep it
              </button>
              <button
                className={styles.confirmDangerBtn}
                onClick={() => handleUnaccept(cancelTarget)}
                disabled={updating === cancelTarget.applicationId}
              >
                {updating === cancelTarget.applicationId ? (
                  <>
                    <span className={styles.spinner} /> Cancelling...
                  </>
                ) : cancelTarget.hasBooking ? (
                  <>
                    <FaBan size={13} /> Cancel Booking
                  </>
                ) : (
                  <>
                    <FaUndo size={13} /> Undo Acceptance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen avatar viewer ───────────────────────────────── */}
      {lightboxSrc && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo"
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightboxSrc(null)}
            aria-label="Close photo"
          >
            <FaTimes size={22} />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </HirerLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  jobId,
  jobTitle,
  updating,
  onAccept,
  onReject,
  onUnacceptRequest,
  onAvatarClick,
  decided,
  delay,
}) {
  const { worker } = app;
  const wp = worker?.workerProfile;
  const statusInfo = APP_STATUS[app.status] || APP_STATUS.PENDING;
  const StatusIcon = statusInfo.Icon;

  const hasAvatar = !!worker?.avatar;
  const hasBooking = !!(app.booking || app.bookingId);
  const bookingId = app.booking?.id || app.bookingId;

  return (
    <div className={styles.appCard} style={{ animationDelay: `${delay}s` }}>
      {/* Worker info */}
      <div className={styles.appTop}>
        <div className={styles.workerLeft}>
          {/* Avatar — clickable when a photo exists, opens the lightbox */}
          <button
            type="button"
            className={`${styles.workerAvatar} ${
              hasAvatar ? styles.workerAvatarClickable : ""
            }`}
            onClick={() => {
              if (hasAvatar && onAvatarClick) onAvatarClick(worker.avatar);
            }}
            disabled={!hasAvatar}
            aria-label={
              hasAvatar
                ? `View ${worker?.firstName || "worker"}'s photo full screen`
                : undefined
            }
            title={hasAvatar ? "View full photo" : undefined}
          >
            {hasAvatar ? (
              <>
                <img src={worker.avatar} alt="" />
                <span className={styles.avatarExpandBadge}>
                  <FaExpand size={9} />
                </span>
              </>
            ) : (
              <span>
                {worker?.firstName?.[0]}
                {worker?.lastName?.[0]}
              </span>
            )}
          </button>
          <div>
            <p className={styles.workerName}>
              {worker?.firstName} {worker?.lastName}
            </p>
            <p className={styles.workerTitle}>{wp?.title || "Worker"}</p>
            {(worker?.city || worker?.country) && (
              <p className={styles.workerLocation}>
                <FaMapMarkerAlt />{" "}
                {[worker.city, worker.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <span className={`${styles.appStatusBadge} ${styles[statusInfo.cls]}`}>
          <StatusIcon /> {statusInfo.label}
        </span>
      </div>

      {/* Worker stats */}
      <div className={styles.workerStats}>
        {wp?.avgRating > 0 && (
          <div className={styles.workerStat}>
            <Stars rating={wp.avgRating} />
            <span className={styles.statVal}>{wp.avgRating.toFixed(1)}</span>
            {wp.totalReviews > 0 && (
              <span className={styles.statMuted}>({wp.totalReviews})</span>
            )}
          </div>
        )}
        {wp?.completedJobs > 0 && (
          <div className={styles.workerStat}>
            <FaBriefcase className={styles.statLabel} />
            <span className={styles.statVal}>{wp.completedJobs} jobs done</span>
          </div>
        )}
        {wp?.hourlyRate && (
          <div className={styles.workerStat}>
            <FaMoneyBillWave className={styles.statLabel} />
            <span className={styles.statVal}>
              {wp.currency} {wp.hourlyRate?.toLocaleString()}/hr
            </span>
          </div>
        )}
        {wp?.yearsExperience > 0 && (
          <div className={styles.workerStat}>
            <FaTrophy className={styles.statLabel} />
            <span className={styles.statVal}>{wp.yearsExperience} yrs exp</span>
          </div>
        )}
      </div>

      {/* Application message */}
      {app.message && (
        <div className={styles.appMessage}>
          <p className={styles.appMessageLabel}>
            <FaQuoteLeft className={styles.quoteIcon} /> Cover note
          </p>
          <p className={styles.appMessageText}>"{app.message}"</p>
        </div>
      )}

      {/* Applied date */}
      <p className={styles.appDate}>
        Applied{" "}
        {new Date(app.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        at{" "}
        {new Date(app.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      {/* Actions — pending state */}
      {!decided && (
        <div className={styles.appActions}>
          <Link to={`/workers/${worker?.id}`} className={styles.viewProfileBtn}>
            View Profile →
          </Link>
          <div className={styles.decisionBtns}>
            <button
              className={styles.rejectBtn}
              disabled={updating === app.id}
              onClick={onReject}
            >
              {updating === app.id ? (
                <span className={styles.spinner} />
              ) : (
                "Decline"
              )}
            </button>
            <button
              className={styles.acceptBtn}
              disabled={updating === app.id}
              onClick={onAccept}
            >
              {updating === app.id ? (
                <span className={styles.spinner} />
              ) : (
                "Accept"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Interview section — only while pending */}
      {!decided && (
        <div className={styles.interviewSection}>
          <div className={styles.interviewHeader}>
            <p className={styles.interviewTitle}>Interview this worker</p>
            <p className={styles.interviewSub}>
              Start a quick face-to-face video call before you decide. You can
              also send the room link as a message.
            </p>
          </div>
          <InterviewCallButton
            jobPostId={jobId}
            workerId={worker?.id}
            workerName={`${worker?.firstName || ""} ${worker?.lastName || ""}`.trim()}
            jobTitle={jobTitle}
          />
        </div>
      )}

      {/* Accepted state — booking management row */}
      {decided && app.status === "ACCEPTED" && (
        <div className={styles.acceptedRow}>
          <div className={styles.acceptedNote}>
            <FaCheckCircle />
            <span>Accepted</span>
          </div>

          <div className={styles.acceptedActions}>
            {hasBooking ? (
              <>
                <Link to={`/bookings/${bookingId}`} className={styles.bookLink}>
                  View Booking →
                </Link>
                <button
                  className={styles.unacceptBtn}
                  disabled={updating === app.id}
                  onClick={onUnacceptRequest}
                  title="Cancel the booking and return this application to Pending Review"
                >
                  {updating === app.id ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <FaBan size={12} /> Cancel Booking
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <Link
                  to={`/dashboard/hirer/bookings/new/from-job/${app.jobPostId}?workerId=${worker?.id}`}
                  className={styles.bookLink}
                >
                  Create Booking →
                </Link>
                <button
                  className={styles.unacceptBtn}
                  disabled={updating === app.id}
                  onClick={onUnacceptRequest}
                  title="Undo the acceptance and return this application to Pending Review"
                >
                  {updating === app.id ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <FaUndo size={12} /> Undo Acceptance
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
