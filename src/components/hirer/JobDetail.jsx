import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./JobDetail.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import DurationBadge from "../common/DurationBadge";
import { formatJobDurationParts } from "../utils/formatDuration";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isWorker = user?.role === "WORKER";
  const isHirer = user?.role === "HIRER";
  const isOwner = user?.id === job?.hirer?.id;

  useEffect(() => {
    api
      .get(`/jobs/${id}`)
      .then((res) => {
        setJob(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Job not found.");
        setLoading(false);
      });
  }, [id]);

  async function handleApply(e) {
    e.preventDefault();
    setApplying(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/jobs/${id}/apply`, { message });
      setJob((j) => ({ ...j, hasApplied: true }));
      setSuccess("Application submitted! The hirer will be notified.");
      setShowForm(false);
      setMessage("");
    } catch (e) {
      setError(
        e.response?.data?.message || "Failed to apply. Please try again.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleStatusUpdate(status) {
    try {
      await api.patch(`/jobs/${id}/status`, { status });
      setJob((j) => ({ ...j, jobPost: { ...j.jobPost, status } }));
      setSuccess(`Job marked as ${status.toLowerCase()}.`);
    } catch {
      setError("Failed to update status.");
    }
  }

  if (loading) return <JobSkeleton />;

  if (error && !job)
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <span className={styles.notFoundIcon}>🔍</span>
          <h2 className={styles.notFoundTitle}>Job not found</h2>
          <Link to="/jobs" className={styles.backLink}>
            ← Back to Jobs
          </Link>
        </div>
      </div>
    );

  const { jobPost, hasApplied } = job;
  const scheduled = new Date(jobPost.scheduledAt);
  const isOpen = jobPost.status === "OPEN";
  const statusMeta = {
    OPEN: { label: "Open", color: "green" },
    FILLED: { label: "Filled", color: "indigo" },
    CANCELLED: { label: "Cancelled", color: "red" },
  };
  const sm = statusMeta[jobPost.status] || statusMeta.OPEN;

  return (
    <div className={styles.page}>
      {/* Back */}
      <Link to="/jobs" className={styles.backLink}>
        ← Back to Jobs
      </Link>

      {/* Alerts */}
      {error && (
        <Alert type="error" text={error} onClose={() => setError("")} />
      )}
      {success && (
        <Alert type="success" text={success} onClose={() => setSuccess("")} />
      )}

      <div className={styles.layout}>
        {/* ── Main ── */}
        <div className={styles.main}>
          {/* Header card */}
          <div className={styles.headerCard}>
            <div className={styles.headerTop}>
              <div className={styles.categoryChip}>
                {jobPost.category?.icon && <span>{jobPost.category.icon}</span>}
                {jobPost.category?.name}
              </div>
              <span
                className={`${styles.statusBadge} ${styles[`status_${sm.color}`]}`}
              >
                {sm.label}
              </span>
            </div>

            <h1 className={styles.jobTitle}>{jobPost.title}</h1>

            <div className={styles.metaRow}>
              <MetaItem
                icon="📅"
                text={`${scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              />
              <MetaItem icon="📍" text={jobPost.address} />
              <DurationBadge job={jobPost} size="sm" />
              <MetaItem
                icon="🗓️"
                text={`Posted ${timeAgo(new Date(jobPost.createdAt))}`}
              />
            </div>

            {/* Budget hero */}
            <div className={styles.budgetBlock}>
              <span className={styles.budgetAmount}>
                {jobPost.currency} {parseFloat(jobPost.budget).toLocaleString()}
              </span>
              <span className={styles.budgetLabel}>Budget</span>
              <span className={styles.applicantCount}>
                👥 {jobPost._count?.applications || 0} applicant
                {jobPost._count?.applications !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Description */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Job Description</h2>
            <p className={styles.description}>{jobPost.description}</p>
            {jobPost.notes && (
              <div className={styles.notes}>
                <span>📝</span>
                <p>{jobPost.notes}</p>
              </div>
            )}
          </section>

          {/* Details grid */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Details</h2>
            <div className={styles.detailGrid}>
              <DetailCard
                icon="📂"
                label="Category"
                value={jobPost.category?.name || "—"}
              />
              <DetailCard
                icon="💰"
                label="Budget"
                value={`${jobPost.currency} ${parseFloat(jobPost.budget).toLocaleString()}`}
                accent
              />
              <DetailCard
                icon="📅"
                label="Scheduled"
                value={scheduled.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              {formatJobDurationParts(jobPost) && (
                <DetailCard
                  icon={formatJobDurationParts(jobPost).icon}
                  label="Est. Duration"
                  value={
                    <span>
                      {formatJobDurationParts(jobPost).primary}
                      {formatJobDurationParts(jobPost).equivalents.length >
                        0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 5,
                          }}
                        >
                          (
                          {formatJobDurationParts(jobPost)
                            .equivalents.map((e) => e.label)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              <DetailCard icon="📍" label="Location" value={jobPost.address} />
              <DetailCard icon="🏷️" label="Status" value={sm.label} />
            </div>
          </section>

          {/* Apply form */}
          {isWorker && isOpen && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Apply for this Job</h2>
              {hasApplied ? (
                <div className={styles.appliedBanner}>
                  <span>✅</span>
                  <p>
                    You've already applied to this job. The hirer will review
                    your application.
                  </p>
                </div>
              ) : showForm ? (
                <form className={styles.applyForm} onSubmit={handleApply}>
                  <label className={styles.applyLabel}>
                    Message to Hirer{" "}
                    <span className={styles.optional}>(optional)</span>
                  </label>
                  <textarea
                    className={styles.applyTextarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself, explain your experience with this type of job..."
                    rows={4}
                  />
                  <div className={styles.applyActions}>
                    <button
                      type="submit"
                      className={styles.applyBtn}
                      disabled={applying}
                    >
                      {applying ? (
                        <>
                          <span className={styles.spinner} /> Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.cancelApplyBtn}
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className={styles.applyTriggerBtn}
                  onClick={() => setShowForm(true)}
                >
                  🚀 Apply Now
                </button>
              )}
            </section>
          )}

          {/* Hirer manage actions */}
          {isOwner && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Manage Job</h2>
              <div className={styles.manageActions}>
                <Link
                  to={`/jobs/${id}/applications`}
                  className={styles.manageBtn}
                >
                  👥 View Applications ({jobPost._count?.applications || 0})
                </Link>
                {isOpen && (
                  <>
                    <button
                      className={styles.manageBtnFilled}
                      onClick={() => handleStatusUpdate("FILLED")}
                    >
                      Mark as Filled
                    </button>
                    <button
                      className={styles.manageBtnCancel}
                      onClick={() => handleStatusUpdate("CANCELLED")}
                    >
                      Cancel Job
                    </button>
                  </>
                )}
                {!isOpen && (
                  <button
                    className={styles.manageBtnReopen}
                    onClick={() => handleStatusUpdate("OPEN")}
                  >
                    Reopen Job
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          {/* Hirer card */}
          <div className={styles.hirerCard}>
            <p className={styles.hirerCardLabel}>Posted by</p>
            <div className={styles.hirerAvatar}>
              {jobPost.hirer?.avatar ? (
                <img src={jobPost.hirer.avatar} alt="" />
              ) : (
                <span>
                  {jobPost.hirer?.firstName?.[0]}
                  {jobPost.hirer?.lastName?.[0]}
                </span>
              )}
            </div>
            <p className={styles.hirerName}>
              {jobPost.hirer?.firstName} {jobPost.hirer?.lastName}
            </p>
            {jobPost.hirer?.hirerProfile?.companyName && (
              <p className={styles.hirerCompany}>
                {jobPost.hirer.hirerProfile.companyName}
              </p>
            )}
            {(jobPost.hirer?.city || jobPost.hirer?.country) && (
              <p className={styles.hirerLocation}>
                📍{" "}
                {[jobPost.hirer.city, jobPost.hirer.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <div className={styles.hirerStats}>
              {jobPost.hirer?.hirerProfile?.totalHires > 0 && (
                <span>{jobPost.hirer.hirerProfile.totalHires} hires</span>
              )}
              {jobPost.hirer?.hirerProfile?.avgRating > 0 && (
                <span>★ {jobPost.hirer.hirerProfile.avgRating.toFixed(1)}</span>
              )}
            </div>
            <Link
              to={`/hirers/${jobPost.hirer?.id}`}
              className={styles.viewHirerBtn}
            >
              View Profile →
            </Link>
          </div>

          {/* Quick facts */}
          <div className={styles.quickFacts}>
            <p className={styles.quickFactsTitle}>Quick Facts</p>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>Budget</span>
              <span
                className={styles.factValue}
                style={{ color: "var(--orange)" }}
              >
                {jobPost.currency} {parseFloat(jobPost.budget).toLocaleString()}
              </span>
            </div>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>Category</span>
              <span className={styles.factValue}>{jobPost.category?.name}</span>
            </div>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>Applicants</span>
              <span className={styles.factValue}>
                {jobPost._count?.applications || 0}
              </span>
            </div>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>Status</span>
              <span
                className={`${styles.factBadge} ${styles[`status_${sm.color}`]}`}
              >
                {sm.label}
              </span>
            </div>
            {formatJobDurationParts(jobPost) && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Duration</span>
                <span className={styles.factValue}>
                  {formatJobDurationParts(jobPost).primary}
                  {formatJobDurationParts(jobPost).equivalents[0] && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        marginLeft: 4,
                      }}
                    >
                      ({formatJobDurationParts(jobPost).equivalents[0].label})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* CTA if guest */}
          {!user && (
            <div className={styles.guestCta}>
              <p>Sign in as a worker to apply for this job.</p>
              <Link to="/login" className={styles.guestCtaBtn}>
                Sign In to Apply
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }) {
  return (
    <div className={styles.metaItem}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function DetailCard({ icon, label, value, accent }) {
  return (
    <div className={styles.detailCard}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <p className={styles.detailLabel}>{label}</p>
        <p
          className={`${styles.detailValue} ${accent ? styles.detailAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function timeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function JobSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skBack} />
      <div className={styles.layout}>
        <div className={styles.skMain} />
        <div className={styles.skSide} />
      </div>
    </div>
  );
}
