import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./WorkerSavedJobs.module.css";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

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

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
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
    <Link to={`/jobs/${job.id}`} className={styles.card}>
      {/* Accent bar – blue for saved */}
      <div className={`${styles.accentBar} ${styles.accent_blue}`} />

      <div className={styles.cardTop}>
        <div className={styles.avatar}>
          {job.hirer?.avatar ? (
            <img src={job.hirer.avatar} alt="" />
          ) : (
            <span>{initials(job.hirer)}</span>
          )}
        </div>
        <span className={`${styles.badge} ${styles.badge_blue}`}>
          {job.status === "OPEN" ? "Open" : "Closed"}
        </span>
      </div>

      <h3 className={styles.cardTitle}>{job.title}</h3>

      <p className={styles.cardParty}>
        {job.hirer?.firstName} {job.hirer?.lastName}
        {job.category && (
          <>
            {" "}
            · <span className={styles.cat}>{job.category.name}</span>
          </>
        )}
      </p>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.detailIcon}>📍</span>
          <span className={`${styles.detailText} ${styles.detailTruncate}`}>
            {job.address || job.location || "Remote"}
          </span>
        </div>
        {job.jobType && (
          <div className={styles.detail}>
            <span className={styles.detailIcon}>💼</span>
            <span className={styles.detailText}>{job.jobType}</span>
          </div>
        )}
        <div className={styles.detail}>
          <span className={styles.detailIcon}>📅</span>
          <span className={styles.detailText}>
            Saved {timeAgo(job.savedAt)}
          </span>
        </div>
        {hasApplied && (
          <span className={`${styles.badge} ${styles.badgeApplied}`}>
            Applied
          </span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.rate}>
          {job.budget && job.currency
            ? formatCurrency(job.budget, job.currency)
            : job.salaryText || "—"}
        </span>
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
    </Link>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WorkerSavedJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;
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
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Bookmarks</p>
            <h1 className={styles.title}>
              Saved Jobs
              {total > 0 && <span className={styles.count}>{total}</span>}
            </h1>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyEmoji}>📂</span>
            <p className={styles.emptyTitle}>No saved jobs</p>
            <p className={styles.emptyText}>
              Browse the job board and save jobs you're interested in – they'll
              appear here.
            </p>
            <Link to="/jobs" className={styles.emptyBtn}>
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map((job) => (
              <SavedJobCard
                key={job.savedId}
                job={job}
                savedId={job.savedId}
                hasApplied={job.hasApplied || false}
                onUnsave={handleUnsave}
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

function Skeleton() {
  return <div className={styles.skeleton} />;
}
