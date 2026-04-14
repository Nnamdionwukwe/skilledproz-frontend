import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./HirerJobBoard.module.css";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../layout/WorkerLayout";
import { formatJobDuration } from "../../utils/formatDuration";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function HirerJobBoard() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get(`/categories?limit=1000`)
      .then((res) => {
        const cats = res.data.data;
        setCategories(Array.isArray(cats) ? cats : cats?.categories || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (q) params.set("q", q);
    if (category) params.set("category", category);

    api
      .get(`/jobs?${params}`)
      .then((res) => {
        setJobs(res.data.data.jobPosts || []);
        setTotal(res.data.data.total || 0);
        setPages(res.data.data.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [q, category, page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Search bar */}
        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="Search jobs by title or description..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>

        {/* Results header */}
        <div className={styles.resultsHeader}>
          <p className={styles.resultsCount}>
            {loading
              ? "Searching..."
              : `${total} open job${total !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Job grid */}
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyTitle}>No jobs found</p>
            <p className={styles.emptyText}>
              Try different keywords or check back later.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isWorker={user?.role === "WORKER"}
              />
            ))}
          </div>
        )}

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

function JobCard({ job, isWorker }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.catChip}>
          {job.category.icon} {job.category.name}
        </div>
        <span className={styles.timeAgo}>{timeAgo(job.createdAt)}</span>
      </div>

      <h3 className={styles.cardTitle}>{job.title}</h3>
      <p className={styles.cardDesc}>
        {job.description.slice(0, 100)}
        {job.description.length > 100 ? "..." : ""}
      </p>

      {/* Hirer info */}
      <div className={styles.hirerRow}>
        <div className={styles.hirerAvatar}>
          {job.hirer.avatar ? (
            <img src={job.hirer.avatar} alt="" />
          ) : (
            <span>
              {job.hirer.firstName?.[0]}
              {job.hirer.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className={styles.hirerName}>
            {job.hirer.hirerProfile?.companyName ||
              `${job.hirer.firstName} ${job.hirer.lastName}`}
          </p>
          {(job.hirer.city || job.hirer.country) && (
            <p className={styles.hirerLocation}>
              📍{" "}
              {[job.hirer.city, job.hirer.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        {job.hirer.hirerProfile?.avgRating > 0 && (
          <span className={styles.hirerRating}>
            ★ {job.hirer.hirerProfile.avgRating.toFixed(1)}
          </span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.budget}>
          {job.currency} {Number(job.budget).toLocaleString()}
        </span>
        <div className={styles.footerRight}>
          {(() => {
            const dur = formatJobDuration(job);
            return dur ? <span className={styles.durPill}>⏱ {dur}</span> : null;
          })()}
          <span className={styles.apps}>{job._count.applications} applied</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <Link to={`/jobs/${job.id}`} className={styles.viewBtn}>
          View & Apply →
        </Link>
        <Link to={`/hirers/${job.hirer.id}`} className={styles.profileBtn}>
          Hirer Profile
        </Link>
      </div>
    </div>
  );
}
