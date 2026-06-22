// src/pages/worker/ExternalJobDetail.jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import s from "./ExternalJobDetail.module.css";

// ─── Disclaimer Modal ──────────────────────────────────────────────────────
function DisclaimerModal({ job, onConfirm, onClose }) {
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>⚠️ Leaving SkilledProz</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <p className={s.disclaimerText}>
            You are about to leave <strong>SkilledProz</strong> and visit an
            external job listing.
          </p>
          <div className={s.disclaimerBox}>
            <ul className={s.disclaimerList}>
              <li>
                🔹 This job is <strong>not</strong> managed or hosted by
                SkilledProz.
              </li>
              <li>
                🔹 All applications, communications, and payments are handled{" "}
                <strong>by the external platform or hirer</strong>.
              </li>
              <li>
                🔹 SkilledProz does <strong>not</strong> provide escrow or
                dispute resolution for this job.
              </li>
              <li>
                🔹 We do <strong>not</strong> verify the authenticity of the job
                or its terms.
              </li>
              <li>
                🔹 Proceed at your own risk and ensure you verify the job
                details.
              </li>
            </ul>
          </div>
          <p className={s.disclaimerFooter}>
            By clicking <strong>“Proceed to Job Site”</strong>, you acknowledge
            that SkilledProz is not liable for any issues arising from this
            external job.
          </p>
          <div className={s.modalActions}>
            <button className={s.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button className={s.btnProceed} onClick={onConfirm}>
              🚀 Proceed to Job Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function ExternalJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    api
      .get(`/external-jobs/${id}`)
      .then((res) => setJob(res.data.data.job))
      .catch((err) => setError(err.response?.data?.message || "Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApplyClick = () => {
    setShowDisclaimer(true);
  };

  const handleProceed = () => {
    window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
    setShowDisclaimer(false);
  };

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.loader}>Loading job details…</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={s.page}>
        <div className={s.error}>{error || "Job not found"}</div>
        <Link to="/external-jobs" className={s.backLink}>
          ← Back to jobs
        </Link>
      </div>
    );
  }

  const category = job.categories?.[0]?.category;

  return (
    <div className={s.page}>
      <Link to="/external-jobs" className={s.backLink}>
        ← Back to jobs
      </Link>

      <div className={s.content}>
        <div className={s.header}>
          <div className={s.headerTop}>
            <h1 className={s.title}>{job.title}</h1>
            <span className={s.statusBadge}>
              {job.status === "OPEN" ? "🟢 Open" : "🔴 Closed"}
            </span>
          </div>
          <div className={s.companyMeta}>
            <span className={s.companyName}>
              🏢 {job.companyName || "Unknown"}
            </span>
            {job.sourcePlatform && (
              <span className={s.source}>{job.sourcePlatform}</span>
            )}
          </div>
        </div>

        <div className={s.detailsGrid}>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>📍 Location</span>
            <span>{job.address || job.location || "Remote"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>💼 Job Type</span>
            <span>{job.jobType || "N/A"}</span>
          </div>
          <div className={s.detailsGrid}>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📍 Location</span>
              <span>{job.address || job.location || "Remote"}</span>
            </div>
            {/* ── NEW: Location Type ── */}
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📍 Location Type</span>
              <span>{job.locationType || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>💼 Job Type</span>
              <span>{job.jobType || "N/A"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📊 Experience</span>
              <span>{job.experienceLevel || "Not specified"}</span>
            </div>
            {/* ── NEW: Applicant Location ── */}
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📍 Applicant Location</span>
              <span>{job.applicantLocation || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>🎓 Education</span>
              <span>{job.educationLevel || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>🌐 Language</span>
              <span>{job.languageRequirement || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>🕒 Working Hours</span>
              <span>{job.workingHours || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📅 Experience Length</span>
              <span>{job.experienceLength || "Not specified"}</span>
            </div>
            {/* ── NEW: Min Qualification ── */}
            <div className={s.detailItem}>
              <span className={s.detailLabel}>📜 Min Qualification</span>
              <span>{job.minQualification || "Not specified"}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>💰 Salary</span>
              <span>{formatSalary(job)}</span>
            </div>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>📊 Experience</span>
            <span>{job.experienceLevel || "Not specified"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>🎓 Education</span>
            <span>{job.educationLevel || "Not specified"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>🌐 Language</span>
            <span>{job.languageRequirement || "Not specified"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>🕒 Working Hours</span>
            <span>{job.workingHours || "Not specified"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>📅 Experience Length</span>
            <span>{job.experienceLength || "Not specified"}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>💰 Salary</span>
            <span>{formatSalary(job)}</span>
          </div>
        </div>

        {category && (
          <div className={s.category}>
            <span className={s.categoryLabel}>Category:</span>
            <span className={s.categoryValue}>
              {category.icon || "📁"} {category.name}
            </span>
          </div>
        )}

        <div className={s.section}>
          <h3>Description</h3>
          <p className={s.descText}>
            {job.description || "No description provided."}
          </p>
        </div>

        {job.responsibilities && (
          <div className={s.section}>
            <h3>Responsibilities</h3>
            <p className={s.descText} style={{ whiteSpace: "pre-wrap" }}>
              {job.responsibilities}
            </p>
          </div>
        )}

        {job.requirements && (
          <div className={s.section}>
            <h3>Requirements</h3>
            <p className={s.descText} style={{ whiteSpace: "pre-wrap" }}>
              {job.requirements}
            </p>
          </div>
        )}

        <div className={s.actions}>
          {job.applicationUrl && job.status === "OPEN" ? (
            <button className={s.applyBtn} onClick={handleApplyClick}>
              🔗 Apply on External Site
            </button>
          ) : (
            <button className={s.applyBtn} disabled>
              This job is no longer open
            </button>
          )}
        </div>

        <div className={s.disclaimerNote}>
          ⚠️ This job is hosted on an external platform. SkilledProz does not
          manage applications or payments for this listing.
        </div>
      </div>

      {/* ── Disclaimer Modal ── */}
      {showDisclaimer && (
        <DisclaimerModal
          job={job}
          onConfirm={handleProceed}
          onClose={() => setShowDisclaimer(false)}
        />
      )}
    </div>
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
  return job.salaryText || "Not specified";
}
