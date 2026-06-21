// src/pages/admin/AdminExternalJobs.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminExternalJobs.module.css";

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "FILLED", label: "Filled" },
  { key: "CANCELLED", label: "Cancelled" },
];

const JOB_STATUS_META = {
  OPEN: { label: "Open", color: "green" },
  FILLED: { label: "Filled", color: "indigo" },
  CANCELLED: { label: "Cancelled", color: "dim" },
};

const SALARY_PERIOD_LABELS = {
  HOURLY: "/hr",
  DAILY: "/day",
  WEEKLY: "/wk",
  MONTHLY: "/mo",
  YEARLY: "/yr",
};

const EDUCATION_LABELS = {
  HIGH_SCHOOL: "High School",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's",
  MASTER: "Master's",
  DOCTORATE: "Doctorate",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function truncate(str, n = 120) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function formatSalary(job) {
  if (job.salaryAmount && job.salaryCurrency && job.salaryPeriod) {
    const periodLabel = SALARY_PERIOD_LABELS[job.salaryPeriod] || "";
    return `${job.salaryCurrency} ${Number(job.salaryAmount).toLocaleString()}${periodLabel}`;
  }
  return job.salaryText || "—";
}

function formatEducation(level) {
  return EDUCATION_LABELS[level] || level || "—";
}

function initials(user) {
  return (
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?"
  );
}

// ─── Sub‑Components ──────────────────────────────────────────────────────────
function Badge({ status, meta }) {
  const m = meta[status] ?? { label: status, color: "dim" };
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>{m.label}</span>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}>
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

// ─── External Detail Modal ──────────────────────────────────────────────────
function ExternalDetailModal({ jobId, onClose, onStatusChange, onDelete }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/external/jobs/${jobId}`)
      .then((r) => setJob(r.data.data?.job || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalHeader}>
            <h3 className={s.modalTitle}>Loading…</h3>
            <button className={s.modalClose} onClick={onClose}>
              ✕
            </button>
          </div>
          <div className={s.modalBody}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={s.skCard} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalHeader}>
            <h3 className={s.modalTitle}>Job Detail</h3>
            <button className={s.modalClose} onClick={onClose}>
              ✕
            </button>
          </div>
          <div className={s.modalBody}>
            <p className={s.noData}>Failed to load job details.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modalLg} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleRow}>
            <h3 className={s.modalTitle}>{job.title}</h3>
            <Badge status={job.status} meta={JOB_STATUS_META} />
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Company & Platform */}
          <div className={s.externalMeta}>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>🏢 Company</span>
              <span className={s.metaValue}>{job.companyName || "—"}</span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>📍 Location</span>
              <span className={s.metaValue}>
                {job.address || job.location || "—"}
                {job.locationType && ` (${job.locationType})`}
              </span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>🔗 Source</span>
              <span className={s.metaValue}>
                {job.sourcePlatform || "—"}
                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.externalLink}
                  >
                    &nbsp;↗ Apply
                  </a>
                )}
              </span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>💰 Salary</span>
              <span className={s.metaValue}>{formatSalary(job)}</span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>🎓 Education</span>
              <span className={s.metaValue}>
                {formatEducation(job.educationLevel)}
              </span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>🌐 Language</span>
              <span className={s.metaValue}>
                {job.languageRequirement || "—"}
              </span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>📍 Applicant Location</span>
              <span className={s.metaValue}>
                {job.applicantLocation || "—"}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className={s.descBox}>
            <span className={s.descLabel}>Description</span>
            <p className={s.descText}>
              {job.description || "No description provided."}
            </p>
          </div>

          {job.responsibilities && (
            <div className={s.descBox}>
              <span className={s.descLabel}>Responsibilities</span>
              <p className={s.descText} style={{ whiteSpace: "pre-wrap" }}>
                {job.responsibilities}
              </p>
            </div>
          )}

          {job.requirements && (
            <div className={s.descBox}>
              <span className={s.descLabel}>Requirements</span>
              <p className={s.descText} style={{ whiteSpace: "pre-wrap" }}>
                {job.requirements}
              </p>
            </div>
          )}

          {/* Additional meta */}
          <div className={s.chipRow}>
            {job.jobType && <span className={s.chip}>💼 {job.jobType}</span>}
            {job.experienceLevel && (
              <span className={s.chip}>📊 {job.experienceLevel}</span>
            )}
            {job.experienceLength && (
              <span className={s.chip}>📅 {job.experienceLength}</span>
            )}
            {job.minQualification && (
              <span className={s.chip}>🎓 {job.minQualification}</span>
            )}
            {job.workingHours && (
              <span className={s.chip}>⏰ {job.workingHours}</span>
            )}
            {job.expiryDate && (
              <span className={`${s.chip} ${s.chipRed}`}>
                ⏳ Expires {fmtDate(job.expiryDate)}
              </span>
            )}
          </div>

          {/* Stats mini row */}
          <div className={s.miniStats}>
            <div className={s.miniStat}>
              <span className={s.miniStatVal}>{fmtDate(job.createdAt)}</span>
              <span className={s.miniStatLabel}>Posted</span>
            </div>
            <div className={s.miniStat}>
              <span className={s.miniStatVal}>{job.sourcePlatform || "—"}</span>
              <span className={s.miniStatLabel}>Platform</span>
            </div>
            <div className={s.miniStat}>
              <span className={s.miniStatVal}>
                {job.isExternal ? "External" : "Platform"}
              </span>
              <span className={s.miniStatLabel}>Type</span>
            </div>
          </div>

          {/* Actions */}
          <div className={s.detailActions}>
            <Link
              to={`/admin/external/jobs/edit/${job.id}`}
              className={s.btnEdit}
            >
              ✏️ Edit
            </Link>
            {job.status === "OPEN" && (
              <>
                <button
                  className={s.btnStatusFill}
                  onClick={() => {
                    onClose();
                    onStatusChange(job, "FILLED");
                  }}
                >
                  ✅ Mark Filled
                </button>
                <button
                  className={s.btnStatusCancel}
                  onClick={() => {
                    onClose();
                    onStatusChange(job, "CANCELLED");
                  }}
                >
                  🚫 Cancel Job
                </button>
              </>
            )}
            {job.status !== "OPEN" && (
              <button
                className={s.btnStatusReopen}
                onClick={() => {
                  onClose();
                  onStatusChange(job, "OPEN");
                }}
              >
                🔄 Re‑open
              </button>
            )}
            <button
              className={s.btnDelete}
              onClick={() => {
                onClose();
                onDelete(job);
              }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal ──────────────────────────────────────────────────────
function StatusModal({ job, targetStatus, onClose, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const meta = {
    OPEN: { label: "Re-open", icon: "🔄", btn: s.btnStatusReopen },
    FILLED: { label: "Fill", icon: "✅", btn: s.btnStatusFill },
    CANCELLED: { label: "Cancel", icon: "🚫", btn: s.btnStatusCancel },
  }[targetStatus] ?? { label: targetStatus, icon: "⚡", btn: s.btnSubmit };

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/external/jobs/${job.id}/status`, {
        status: targetStatus,
        notes,
      });
      onSuccess(`Job marked as ${targetStatus.toLowerCase()}.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update job status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>{meta.icon} Change Job Status</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.jobSummaryCard}>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Job</span>
              <span className={s.summaryVal}>{truncate(job.title, 50)}</span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Company</span>
              <span className={s.summaryVal}>{job.companyName || "—"}</span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Current Status</span>
              <Badge status={job.status} meta={JOB_STATUS_META} />
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>New Status</span>
              <Badge status={targetStatus} meta={JOB_STATUS_META} />
            </div>
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Reason / Notes (optional)</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="Reason for changing status…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className={s.inlineError}>{error}</p>}
          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={meta.btn}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                `${meta.icon} Confirm`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ job, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/admin/external/jobs/${job.id}`, { data: { reason } });
      onSuccess("Job post deleted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete job post.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>🗑 Delete Job</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <span className={s.deleteWarningIcon}>⚠️</span>
            <p className={s.deleteWarningText}>
              This will permanently delete this external job listing.
            </p>
          </div>
          <div className={s.jobSummaryCard}>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Title</span>
              <span className={s.summaryVal}>{truncate(job.title, 50)}</span>
            </div>
            <div className={s.jobSummaryRow}>
              <span className={s.summaryLabel}>Company</span>
              <span className={s.summaryVal}>{job.companyName || "—"}</span>
            </div>
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Reason (optional)</label>
            <textarea
              className={s.textarea}
              rows={2}
              placeholder="Reason for deletion…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
            />
          </div>
          {error && <p className={s.inlineError}>{error}</p>}
          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Keep
            </button>
            <button
              className={s.btnDeleteConfirm}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <span className={s.spinner} /> : "🗑 Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function JobRow({ job, index, onDetail, onStatusChange, onDelete }) {
  return (
    <div className={s.tableRow} style={{ animationDelay: `${index * 0.025}s` }}>
      <div className={s.tdJob}>
        <div className={s.tdJobTitle}>{job.title}</div>
        <div className={s.tdJobMeta}>
          <span className={s.typeChip}>💼 {job.jobType || "N/A"}</span>
          {job.locationType && (
            <span className={s.typeChip}>📍 {job.locationType}</span>
          )}
        </div>
      </div>
      <div className={s.tdCompany}>
        <div className={s.companyName}>{job.companyName || "—"}</div>
        <div className={s.companyLocation}>
          {job.applicantLocation || job.location || "—"}
        </div>
      </div>
      <div className={s.tdPlatform}>
        {job.sourcePlatform ? (
          <span className={s.platformBadge}>{job.sourcePlatform}</span>
        ) : (
          "—"
        )}
        {job.applicationUrl && (
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={s.applyLink}
            title="Apply on external site"
          >
            🔗
          </a>
        )}
      </div>
      <div className={s.tdMeta}>
        <span className={s.salaryChip}>{formatSalary(job)}</span>
        {job.educationLevel && (
          <span className={s.eduChip}>
            {formatEducation(job.educationLevel)}
          </span>
        )}
      </div>
      <div className={s.tdStatus}>
        <Badge status={job.status} meta={JOB_STATUS_META} />
        <span className={s.tdRelative}>{fmtRelative(job.createdAt)}</span>
      </div>
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(job.id)}
          title="View details"
        >
          👁
        </button>
        <Link
          to={`/admin/external/jobs/edit/${job.id}`}
          className={s.editBtn}
          title="Edit job"
        >
          ✏️
        </Link>
        {job.status === "OPEN" ? (
          <>
            <button
              className={s.fillBtn}
              onClick={() => onStatusChange(job, "FILLED")}
              title="Mark as Filled"
            >
              ✅
            </button>
            <button
              className={s.cancelBtn}
              onClick={() => onStatusChange(job, "CANCELLED")}
              title="Cancel"
            >
              🚫
            </button>
          </>
        ) : (
          <button
            className={s.reopenBtn}
            onClick={() => onStatusChange(job, "OPEN")}
            title="Re‑open"
          >
            🔄
          </button>
        )}
        <button
          className={s.deleteBtn}
          onClick={() => onDelete(job)}
          title="Delete"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [detailJobId, setDetailJobId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const searchTimer = useRef(null);

  const load = useCallback(
    async (pg = 1, tab = filter, q = search, cat = categoryId) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT, isExternal: "true" };
        if (tab !== "ALL") params.status = tab;
        if (q.trim()) params.search = q.trim();
        if (cat) params.categoryId = cat;
        const res = await api.get("/admin/external/jobs", { params });
        const d = res.data.data;
        setJobs(d.jobs);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);
      } catch (err) {
        showToast(
          "error",
          err?.response?.data?.message || "Failed to load external jobs.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filter, search, categoryId],
  );

  useEffect(() => {
    api
      .get("/admin/categories", { params: { limit: 100 } })
      .then((r) => setCategories(r.data.data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(1, filter, search, categoryId);
  }, [filter, categoryId]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => load(1, filter, val, categoryId),
      380,
    );
  }

  function handleTabChange(key) {
    setFilter(key);
    setSearch("");
    setPage(1);
  }

  function handleActionSuccess(msg) {
    showToast("success", msg);
    load(page, filter, search, categoryId);
    setDetailJobId(null);
    setStatusTarget(null);
    setDeleteTarget(null);
  }

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const filledCount = jobs.filter((j) => j.status === "FILLED").length;
  const uniqueSources = new Set(
    jobs.map((j) => j.sourcePlatform).filter(Boolean),
  ).size;

  return (
    <AdminLayout>
      <div className={s.page}>
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Job Aggregation</p>
            <h1 className={s.pageTitle}>
              External Jobs{" "}
              {total > 0 && <span className={s.countPill}>{total}</span>}
            </h1>
            <p className={s.pageSubtitle}>
              Admin‑posted job listings that link to external application sites
            </p>
          </div>
          <Link to="/admin/external/jobs/create" className={s.primaryBtn}>
            ＋ Add External Job
          </Link>
        </div>
        <div className={s.statsGrid}>
          <StatCard
            icon="💼"
            label="Total External Jobs"
            value={total}
            accent="orange"
          />
          <StatCard icon="🟢" label="Open" value={openCount} accent="green" />
          <StatCard
            icon="✅"
            label="Filled"
            value={filledCount}
            accent="indigo"
          />
          <StatCard
            icon="🔗"
            label="External Sources"
            value={uniqueSources}
            accent="blue"
          />
        </div>
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={s.toolRight}>
            <select
              className={s.select}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className={s.searchBar}>
              <span className={s.searchIcon}>🔍</span>
              <input
                className={s.searchInput}
                placeholder="Search job title, company…"
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  className={s.searchClear}
                  onClick={() => {
                    setSearch("");
                    load(1, filter, "", categoryId);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <span>Job Title</span>
            <span>Company</span>
            <span>Platform</span>
            <span>Salary / Education</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <div className={s.tableBody}>
            {loading ? (
              Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} className={s.skRow} />
              ))
            ) : jobs.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>🔗</span>
                <p className={s.emptyTitle}>
                  {filter === "ALL" && !search
                    ? "No external jobs added yet"
                    : "No external jobs match your filters"}
                </p>
                <p className={s.emptySub}>
                  Click "Add External Job" to create a new listing.
                </p>
                {(filter !== "ALL" || search || categoryId) && (
                  <button
                    className={s.emptyReset}
                    onClick={() => {
                      handleTabChange("ALL");
                      setCategoryId("");
                      setSearch("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              jobs.map((job, i) => (
                <JobRow
                  key={job.id}
                  job={job}
                  index={i}
                  onDetail={setDetailJobId}
                  onStatusChange={(j, ts) =>
                    setStatusTarget({ job: j, targetStatus: ts })
                  }
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>
        </div>
        {pages > 1 && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
      {detailJobId && (
        <ExternalDetailModal
          jobId={detailJobId}
          onClose={() => setDetailJobId(null)}
          onStatusChange={(j, ts) =>
            setStatusTarget({ job: j, targetStatus: ts })
          }
          onDelete={setDeleteTarget}
        />
      )}
      {statusTarget && (
        <StatusModal
          job={statusTarget.job}
          targetStatus={statusTarget.targetStatus}
          onClose={() => setStatusTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          job={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </AdminLayout>
  );
}
