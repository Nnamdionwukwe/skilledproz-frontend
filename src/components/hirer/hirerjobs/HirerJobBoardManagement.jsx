import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./HirerJobBoardManagement.module.css";
import api from "../../../lib/api";
import HirerLayout from "../../layout/HirerLayout";
import { formatJobDuration } from "../../utils/formatDuration";
import DurationBadge from "../../common/DurationBadge";

const STATUS_TABS = ["ALL", "OPEN", "FILLED", "CANCELLED"];

const STATUS_META = {
  OPEN: { label: "Open", color: "green" },
  FILLED: { label: "Filled", color: "indigo" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

export default function HirerJobBoardManagement() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(null); // jobId being acted on
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [filter, page]);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (filter !== "ALL") params.status = filter;
      const res = await api.get("/jobs/hirer/me", { params });
      setJobs(res.data.data.jobPosts);
      setTotal(res.data.data.total);
      setPages(res.data.data.pages);
    } catch {
      setError("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(jobId, status) {
    setActing(jobId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/jobs/${jobId}/status`, { status });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
      );
      setSuccess(`Job marked as ${status.toLowerCase()}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update job status.");
    } finally {
      setActing(null);
    }
  }

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const filledCount = jobs.filter((j) => j.status === "FILLED").length;
  const cancelledCount = jobs.filter((j) => j.status === "CANCELLED").length;

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>My Jobs</p>
            <h1 className={styles.title}>Job Board</h1>
          </div>
          <Link to="/dashboard/hirer/post-job" className={styles.postBtn}>
            <span>+</span> Post New Job
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        {/* Summary pills */}
        <div className={styles.summaryRow}>
          <SummaryPill label="Open" value={openCount} color="green" />
          <SummaryPill label="Filled" value={filledCount} color="indigo" />
          <SummaryPill label="Cancelled" value={cancelledCount} color="red" />
          <SummaryPill label="Total" value={total} color="dim" />
        </div>

        {/* Filter tabs */}
        <div className={styles.filterBar}>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ""}`}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
            >
              {s === "ALL" ? "All Jobs" : STATUS_META[s]?.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Empty filter={filter} />
        ) : (
          <div className={styles.grid}>
            {jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                delay={i * 0.04}
                acting={acting === job.id}
                onStatusChange={updateStatus}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} / {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </HirerLayout>
  );
}

// ── Job card ──────────────────────────────────────────────────
function JobCard({ job, delay, acting, onStatusChange }) {
  const [showConfirm, setShowConfirm] = useState(null); // "FILLED" | "CANCELLED" | null
  const meta = STATUS_META[job.status] || STATUS_META.OPEN;
  const isOpen = job.status === "OPEN";
  const scheduled = new Date(job.scheduledAt);
  const applicantCount = job._count?.applications || 0;
  const recentApplicants = job.applications?.slice(0, 3) || [];

  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }}>
      {/* Accent bar */}
      <div
        className={`${styles.accentBar} ${styles[`accent_${meta.color}`]}`}
      />

      {/* Top row */}
      <div className={styles.cardTop}>
        <div className={styles.categoryChip}>
          {job.category?.icon && <span>{job.category.icon}</span>}
          <span>{job.category?.name || "General"}</span>
        </div>
        <span className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}>
          {meta.label}
        </span>
      </div>

      {/* Title & description */}
      <h3 className={styles.cardTitle}>{job.title}</h3>
      <p className={styles.cardDesc}>{job.description}</p>

      {/* Meta */}
      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          📅{" "}
          {scheduled.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className={styles.metaItem}>📍 {job.address}</span>

        <DurationBadge job={job} size="sm" />
      </div>

      {/* Budget + applicants */}
      <div className={styles.cardStats}>
        <span className={styles.budget}>
          {job.currency} {parseFloat(job.budget).toLocaleString()}
        </span>
        <Link
          to={`/jobs/${job.id}/applications`}
          className={styles.applicantsLink}
        >
          👥 {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
        </Link>
      </div>

      {/* Recent applicants preview */}
      {recentApplicants.length > 0 && (
        <div className={styles.applicantPreviews}>
          {recentApplicants.map((app) => (
            <div
              key={app.id}
              className={styles.applicantThumb}
              title={`${app.worker?.firstName} ${app.worker?.lastName}`}
            >
              {app.worker?.avatar ? (
                <img src={app.worker.avatar} alt="" />
              ) : (
                <span>
                  {app.worker?.firstName?.[0]}
                  {app.worker?.lastName?.[0]}
                </span>
              )}
            </div>
          ))}
          {applicantCount > 3 && (
            <div className={styles.applicantMore}>+{applicantCount - 3}</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.cardActions}>
        <Link to={`/jobs/${job.id}`} className={styles.viewBtn}>
          View Details
        </Link>
        <Link to={`/jobs/${job.id}/applications`} className={styles.appsBtn}>
          Applications
        </Link>

        {isOpen && !showConfirm && (
          <div className={styles.statusActions}>
            <button
              className={styles.fillBtn}
              onClick={() => setShowConfirm("FILLED")}
              disabled={acting}
            >
              Mark Filled
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowConfirm("CANCELLED")}
              disabled={acting}
            >
              Cancel
            </button>
          </div>
        )}

        {showConfirm && (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>
              {showConfirm === "FILLED"
                ? "Mark job as filled?"
                : "Cancel this job?"}
            </span>
            <button
              className={`${styles.confirmYes} ${showConfirm === "CANCELLED" ? styles.confirmYesRed : ""}`}
              disabled={acting}
              onClick={() => {
                onStatusChange(job.id, showConfirm);
                setShowConfirm(null);
              }}
            >
              {acting ? <span className={styles.spinner} /> : "Yes"}
            </button>
            <button
              className={styles.confirmNo}
              onClick={() => setShowConfirm(null)}
            >
              No
            </button>
          </div>
        )}

        {!isOpen && job.status === "CANCELLED" && (
          <button
            className={styles.reopenBtn}
            disabled={acting}
            onClick={() => onStatusChange(job.id, "OPEN")}
          >
            {acting ? <span className={styles.spinner} /> : "Reopen Job"}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }) {
  return (
    <div className={`${styles.summaryPill} ${styles[`pill_${color}`]}`}>
      <span className={styles.pillValue}>{value}</span>
      <span className={styles.pillLabel}>{label}</span>
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

function Empty({ filter }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>📋</span>
      <p className={styles.emptyTitle}>
        {filter === "ALL"
          ? "No jobs posted yet"
          : `No ${filter.toLowerCase()} jobs`}
      </p>
      <p className={styles.emptyText}>
        {filter === "ALL"
          ? "Post your first job and start receiving applications from skilled workers."
          : `You don't have any ${filter.toLowerCase()} jobs right now.`}
      </p>
      {filter === "ALL" && (
        <Link to="/dashboard/hirer/post-job" className={styles.emptyBtn}>
          Post a Job
        </Link>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className={styles.skeleton} />;
}
