import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./WorkerSavedJobs.module.css";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

// ─── Helper: format relative time ──────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Job Card ────────────────────────────────────────────────────────────────
function SavedJobCard({ job, savedId, onUnsave, hasApplied }) {
  const handleUnsave = async () => {
    if (!window.confirm("Remove this job from your saved list?")) return;
    try {
      await api.delete(`/jobs/${job.id}/save`);
      onUnsave(job.id);
    } catch (err) {
      console.error("Unsave failed", err);
    }
  };

  const canApply = job.status === "OPEN" && !hasApplied;

  return (
    <div className={styles.jobCard}>
      <div className={styles.jobCardHeader}>
        <h3 className={styles.jobTitle}>
          <Link to={`/jobs/${job.id}`} className={styles.jobLink}>
            {job.title}
          </Link>
        </h3>
        <span className={styles.savedDate}>Saved {timeAgo(job.savedAt)}</span>
      </div>

      <div className={styles.jobMeta}>
        <span className={styles.company}>
          🏢{" "}
          {job.hirer?.hirerProfile?.companyName || job.companyName || "Unknown"}
        </span>
        <span className={styles.location}>
          📍 {job.address || job.location || "Remote"}
        </span>
        {job.jobType && <span className={styles.badge}>{job.jobType}</span>}
        {job.status === "OPEN" ? (
          <span className={`${styles.badge} ${styles.badgeGreen}`}>Open</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeDim}`}>Closed</span>
        )}
        {hasApplied && (
          <span className={`${styles.badge} ${styles.badgeApplied}`}>
            Applied
          </span>
        )}
      </div>

      <div className={styles.jobFooter}>
        <div className={styles.salary}>
          {job.budget && job.currency && (
            <span>
              💰 {job.currency} {job.budget}
            </span>
          )}
          {job.salaryText && <span>{job.salaryText}</span>}
        </div>
        <div className={styles.actions}>
          {canApply && (
            <Link to={`/jobs/${job.id}`} className={styles.applyLink}>
              Apply Now
            </Link>
          )}
          <button className={styles.unsaveBtn} onClick={handleUnsave}>
            ✕ Unsave
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WorkerSavedJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;
  const pages = Math.ceil(total / limit);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api
      .get(`/jobs/saved?page=${page}&limit=${limit}`)
      .then((res) => {
        const data = res.data.data;
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error("Failed to load saved jobs", err))
      .finally(() => setLoading(false));
  }, [user?.id, page]);

  const handleUnsave = (jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setTotal((prev) => prev - 1);
  };

  return (
    <WorkerLayout>
      <div className={styles.dashPage}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Saved Jobs</h1>
          <p className={styles.pageSubtitle}>
            {total} job{total !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* Job List */}
        <div className={styles.jobList}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))
          ) : jobs.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📂</span>
              <p className={styles.emptyTitle}>No saved jobs yet</p>
              <p className={styles.emptyText}>
                Browse the job board and save jobs you're interested in –
                they'll appear here.
              </p>
              <Link to="/jobs" className={styles.browseBtn}>
                Browse Jobs
              </Link>
            </div>
          ) : (
            jobs.map((job) => (
              <SavedJobCard
                key={job.savedId}
                job={job}
                savedId={job.savedId}
                hasApplied={job.hasApplied || false}
                onUnsave={handleUnsave}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
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
    </WorkerLayout>
  );
}
