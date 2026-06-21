// src/pages/worker/ExternalJobBoard.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import s from "./ExternalJobBoard.module.css";

const LIMIT = 12;

export default function ExternalJobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const searchTimer = useRef(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      const res = await api.get("/external-jobs", { params });
      const data = res.data.data;
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to load external jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data.data?.categories || []))
      .catch(() => {});
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <h1 className={s.heroTitle}>External Job Opportunities</h1>
        <p className={s.heroSub}>
          Discover jobs posted by our partners across various platforms.
          <br />
          <span className={s.heroNote}>
            ⚠️ These jobs are not managed by SkilledProz – apply at your own
            discretion.
          </span>
        </p>
      </div>

      {/* ── Filters ── */}
      <div className={s.filters}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            placeholder="Search jobs, companies..."
            value={search}
            onChange={handleSearchChange}
          />
          {search && (
            <button
              className={s.clearBtn}
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              ✕
            </button>
          )}
        </div>
        <select
          className={s.categorySelect}
          value={category}
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon || "📁"} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Stats ── */}
      <div className={s.stats}>
        <span>
          {total} job{total !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* ── Job Grid ── */}
      {loading ? (
        <div className={s.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.skeleton} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>🔍</span>
          <p className={s.emptyTitle}>No external jobs found</p>
          <p className={s.emptySub}>
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <>
          <div className={s.grid}>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className={s.pager}>
              <button
                className={s.pageBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className={s.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                className={s.pageBtn}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ job }) {
  const salaryDisplay = formatSalary(job);
  const category = job.categories?.[0]?.category;

  return (
    <Link to={`/external-jobs/${job.id}`} className={s.card}>
      <div className={s.cardTop}>
        <div className={s.cardCompany}>
          <span className={s.cardCompanyIcon}>🏢</span>
          <span className={s.cardCompanyName}>
            {job.companyName || "Unknown"}
          </span>
        </div>
        {job.sourcePlatform && (
          <span className={s.cardPlatform}>{job.sourcePlatform}</span>
        )}
      </div>
      <h3 className={s.cardTitle}>{job.title}</h3>
      <p className={s.cardDesc}>{truncate(job.description || "", 100)}</p>
      <div className={s.cardMeta}>
        <span className={s.cardLocation}>
          📍 {job.address || job.location || "Remote"}
        </span>
        {job.jobType && <span className={s.cardType}>{job.jobType}</span>}
      </div>
      <div className={s.cardFooter}>
        <div className={s.cardTags}>
          {category && <span className={s.tag}>{category.name}</span>}
          {job.experienceLevel && (
            <span className={s.tag}>{job.experienceLevel}</span>
          )}
          {job.salaryCurrency && salaryDisplay && (
            <span className={`${s.tag} ${s.tagSalary}`}>{salaryDisplay}</span>
          )}
        </div>
        <span className={s.cardDate}>{timeAgo(job.createdAt)}</span>
      </div>
    </Link>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSalary(job) {
  const periodMap = {
    HOURLY: "/hr",
    DAILY: "/day",
    WEEKLY: "/wk",
    MONTHLY: "/mo",
    YEARLY: "/yr",
  };
  if (
    job.salaryMin != null &&
    job.salaryMax != null &&
    job.salaryCurrency &&
    job.salaryPeriod
  ) {
    const period = periodMap[job.salaryPeriod] || "";
    return `${job.salaryCurrency} ${job.salaryMin} – ${job.salaryMax}${period}`;
  }
  if (job.salaryAmount && job.salaryCurrency && job.salaryPeriod) {
    const period = periodMap[job.salaryPeriod] || "";
    return `${job.salaryCurrency} ${job.salaryAmount}${period}`;
  }
  return job.salaryText || "";
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}
