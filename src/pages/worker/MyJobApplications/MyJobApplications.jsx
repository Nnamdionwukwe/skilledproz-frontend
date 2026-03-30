import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./MyJobApplications.module.css";
import api from "../../../lib/api";
import WorkerLayout from "../../../components/layout/WorkerLayout";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const STATUS_META = {
  PENDING: { label: "Pending", cls: "pending" },
  ACCEPTED: { label: "Accepted", cls: "accepted" },
  REJECTED: { label: "Rejected", cls: "rejected" },
};

const JOB_STATUS_META = {
  OPEN: { label: "Open", cls: "jobOpen" },
  FILLED: { label: "Filled", cls: "jobFilled" },
  CANCELLED: { label: "Cancelled", cls: "jobCancelled" },
};

function SkeletonCard() {
  return <div className={styles.skCard} />;
}

function EmptyState({ filtered }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>📋</div>
      <h3 className={styles.emptyTitle}>
        {filtered ? "No applications match this filter" : "No applications yet"}
      </h3>
      <p className={styles.emptyText}>
        {filtered
          ? "Try a different status filter."
          : "Browse the job board and apply to jobs that match your skills."}
      </p>
      {!filtered && (
        <Link to="/jobs" className={styles.browseBtn}>
          Browse Jobs →
        </Link>
      )}
    </div>
  );
}

export default function MyJobApplications() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const LIMIT = 10;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = { page, limit: LIMIT };
    if (statusFilter !== "ALL") params.status = statusFilter;

    api
      .get("/jobs/worker/my-applications", { params })
      .then((res) => {
        const d = res.data.data;
        setApplications(d.applications || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => setError("Failed to load your applications."))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  // Derived counts for tab badges — shown from loaded data
  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>My Applications</h1>
            <p className={styles.pageSubtitle}>
              {total} application{total !== 1 ? "s" : ""} submitted
            </p>
          </div>
          <Link to="/jobs" className={styles.browseLink}>
            Browse Jobs →
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className={styles.tabs}>
          {["ALL", "PENDING", "ACCEPTED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`${styles.tab} ${statusFilter === s ? styles.tabActive : ""}`}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s === "ALL" ? "All" : STATUS_META[s].label}
              {s !== "ALL" && counts[s] > 0 && (
                <span className={`${styles.tabBadge} ${styles[`badge_${s}`]}`}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {error ? (
          <div className={styles.errorState}>{error}</div>
        ) : loading ? (
          <div className={styles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <EmptyState filtered={statusFilter !== "ALL"} />
        ) : (
          <div className={styles.list}>
            {applications.map((app, idx) => {
              const job = app.jobPost;
              const hirer = job?.hirer;
              const appMeta = STATUS_META[app.status] ?? {
                label: app.status,
                cls: "pending",
              };
              const jobMeta = JOB_STATUS_META[job?.status] ?? {
                label: job?.status,
                cls: "jobOpen",
              };

              return (
                <div
                  key={app.id}
                  className={`${styles.card} ${app.status === "ACCEPTED" ? styles.cardAccepted : ""}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Accepted glow strip */}
                  {app.status === "ACCEPTED" && (
                    <div className={styles.acceptedStrip} />
                  )}

                  <div className={styles.cardBody}>
                    {/* Left — job info */}
                    <div className={styles.jobInfo}>
                      {/* Category + job status */}
                      <div className={styles.cardTopRow}>
                        <div className={styles.catChip}>
                          {job?.category?.icon && (
                            <span>{job.category.icon}</span>
                          )}
                          {job?.category?.name ?? "—"}
                        </div>
                        <span
                          className={`${styles.jobStatusBadge} ${styles[jobMeta.cls]}`}
                        >
                          {jobMeta.label}
                        </span>
                      </div>

                      {/* Job title */}
                      <h3 className={styles.jobTitle}>
                        {job?.title ?? "Job removed"}
                      </h3>

                      {/* Meta row */}
                      <div className={styles.metaRow}>
                        {job?.address && (
                          <span className={styles.metaItem}>
                            📍 {job.address.split(",")[0]}
                          </span>
                        )}
                        {job?.scheduledAt && (
                          <span className={styles.metaItem}>
                            🗓️ {fmtDate(job.scheduledAt)}
                          </span>
                        )}
                        {job?.budget && (
                          <span className={styles.metaItem}>
                            💰 {job.currency}{" "}
                            {Number(job.budget).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Hirer */}
                      {hirer && (
                        <div className={styles.hirerRow}>
                          <div className={styles.hirerAvatar}>
                            {hirer.avatar ? (
                              <img src={hirer.avatar} alt="" />
                            ) : (
                              <span>
                                {hirer.firstName?.[0]}
                                {hirer.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <span className={styles.hirerName}>
                            {hirer.hirerProfile?.companyName ||
                              `${hirer.firstName} ${hirer.lastName}`}
                          </span>
                        </div>
                      )}

                      {/* Your message */}
                      {app.message && (
                        <div className={styles.yourMessage}>
                          <span className={styles.yourMessageLabel}>
                            Your message
                          </span>
                          <p className={styles.yourMessageText}>
                            "{app.message}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right — application status + actions */}
                    <div className={styles.cardRight}>
                      <div
                        className={`${styles.appStatusBadge} ${styles[appMeta.cls]}`}
                      >
                        {app.status === "ACCEPTED" && "🎉 "}
                        {appMeta.label}
                      </div>

                      <div className={styles.appliedDate}>
                        Applied {timeAgo(app.createdAt)}
                      </div>

                      <div className={styles.cardActions}>
                        {job?.id && (
                          <Link
                            to={`/jobs/${job.id}`}
                            className={styles.viewJobBtn}
                          >
                            View Job →
                          </Link>
                        )}
                        {app.status === "ACCEPTED" && hirer?.id && (
                          <Link
                            to={`/messages?with=${hirer.id}`}
                            className={styles.messageBtn}
                          >
                            💬 Message Hirer
                          </Link>
                        )}
                        {app.status === "ACCEPTED" && (
                          <Link
                            to={`/hirers/${hirer?.id}`}
                            className={styles.hirerProfileBtn}
                          >
                            Hirer Profile
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
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
