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
                      delay={i * 0.06}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
  decided,
  delay,
}) {
  const { worker } = app;
  const wp = worker?.workerProfile;
  const statusInfo = APP_STATUS[app.status] || APP_STATUS.PENDING;
  const StatusIcon = statusInfo.Icon;

  return (
    <div className={styles.appCard} style={{ animationDelay: `${delay}s` }}>
      {/* Worker info */}
      <div className={styles.appTop}>
        <div className={styles.workerLeft}>
          <div className={styles.workerAvatar}>
            {worker?.avatar ? (
              <img src={worker.avatar} alt="" />
            ) : (
              <span>
                {worker?.firstName?.[0]}
                {worker?.lastName?.[0]}
              </span>
            )}
          </div>
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

      {/* Actions */}
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

      {/* Interview section — offered to the hirer while the application is
          still pending. Lets them meet the worker face-to-face before
          committing to a hire. */}
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

      {/* Decided state */}
      {decided && app.status === "ACCEPTED" && (
        <div className={styles.acceptedNote}>
          <FaCheckCircle /> Accepted —{" "}
          <Link
            to={`/dashboard/hirer/bookings/new/from-job/${app.jobPostId}?workerId=${worker?.id}`}
            className={styles.bookLink}
          >
            Create Booking →
          </Link>
        </div>
      )}
    </div>
  );
}
