import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import s from "./ExternalJobDetail.module.css";

// ─── Disclaimer Modal ──────────────────────────────────────────────────────
function DisclaimerModal({ job, method, platformName, onConfirm, onClose }) {
  const methodLabels = {
    url: { action: "visit the job listing", button: "Proceed to Website" },
    email: { action: "send your application via email", button: "Open Email" },
    whatsapp: { action: "chat on WhatsApp", button: "Open WhatsApp" },
    phone: { action: "call the hiring team", button: "Make Call" },
  };

  const label = methodLabels[method] || methodLabels.url;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            ⚠️ Leaving SkilledProz to {platformName}
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <p className={s.disclaimerText}>
            You are about to leave <strong>SkilledProz</strong> to{" "}
            {label.action}
            on <strong>{platformName}</strong>.
          </p>
          <div className={s.disclaimerBox}>
            <ul className={s.disclaimerList}>
              <li>
                🔹 This job is <strong>not</strong> managed or hosted by
                SkilledProz.
              </li>
              <li>
                🔹 All applications, communications, and payments are handled{" "}
                <strong>by {platformName}</strong>.
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
            By clicking <strong>“{label.button}”</strong>, you acknowledge that
            SkilledProz is not liable for any issues arising from this external
            job.
          </p>
          <div className={s.modalActions}>
            <button className={s.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button className={s.btnProceed} onClick={onConfirm}>
              🚀 {label.button}
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
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    api
      .get(`/external-jobs/${id}`)
      .then((res) => setJob(res.data.data.job))
      .catch((err) => setError(err.response?.data?.message || "Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Copy to clipboard ────────────────────────────────────────────────────
  const copyToClipboard = (text, field) => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedField(field);
          setTimeout(() => setCopiedField(null), 2000);
        })
        .catch(() => {
          // Fallback
          fallbackCopy(text, field);
        });
    } else {
      fallbackCopy(text, field);
    }
  };

  const fallbackCopy = (text, field) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
    document.body.removeChild(textarea);
  };

  // ── Track clicks ────────────────────────────────────────────────────────
  const trackApplyClick = async () => {
    try {
      await api.post(`/external-jobs/${id}/click`, { type: "APPLY_CLICK" });
    } catch (err) {}
  };

  const trackProceedClick = async () => {
    try {
      await api.post(`/external-jobs/${id}/click`, { type: "PROCEED_CLICK" });
    } catch (err) {}
  };

  const handleMethodClick = (method) => {
    setSelectedMethod(method);
    trackApplyClick();
    setShowDisclaimer(true);
  };

  const handleProceed = async () => {
    await trackProceedClick();
    if (selectedMethod === "url") {
      window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
    } else if (selectedMethod === "email") {
      window.location.href = `mailto:${job.applicationEmail}`;
    } else if (selectedMethod === "whatsapp") {
      const number = job.applicationWhatsApp.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer");
    } else if (selectedMethod === "phone") {
      window.location.href = `tel:${job.applicationPhone}`;
    }
    setShowDisclaimer(false);
    setSelectedMethod(null);
  };

  const handleModalClose = () => {
    setShowDisclaimer(false);
    setSelectedMethod(null);
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.loader}>Loading job details…</div>
      </div>
    );
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
  const platformName = job.sourcePlatform || "External Site";

  return (
    <div className={s.page}>
      <Link to="/external-jobs" className={s.backLink}>
        ← Back to jobs
      </Link>

      <div className={s.content}>
        {/* Header */}
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

        {/* Details Grid */}
        <div className={s.detailsGrid}>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>📍 Location</span>
            <span>{job.address || job.location || "Remote"}</span>
          </div>
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
          <div className={s.detailItem}>
            <span className={s.detailLabel}>📜 Min Qualification</span>
            <span>{job.minQualification || "Not specified"}</span>
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

        {/* Description */}
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

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className={s.section}>
            <h3>Skills Required</h3>
            <div className={s.skillsList}>
              {job.skills.map((skill, idx) => (
                <span key={idx} className={s.skillTag}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── Application Methods ──────────────────────────────────────────── */}
        <div className={s.applicationMethods}>
          <h3>How to Apply</h3>
          <div className={s.methodsGrid}>
            {job.applicationUrl && (
              <div className={s.methodCard}>
                <span className={s.methodIcon}>🔗</span>
                <span className={s.methodLabel}>Website</span>
                <button
                  className={s.methodBtn}
                  onClick={() => handleMethodClick("url")}
                >
                  Apply Online
                </button>
              </div>
            )}

            {job.applicationEmail && (
              <div className={s.methodCard}>
                <span className={s.methodIcon}>📧</span>
                <span className={s.methodLabel}>Email</span>
                <div className={s.methodValueRow}>
                  <span className={s.methodValue}>{job.applicationEmail}</span>
                  <button
                    className={s.copyBtn}
                    onClick={() =>
                      copyToClipboard(job.applicationEmail, "email")
                    }
                    title="Copy email address"
                  >
                    {copiedField === "email" ? "✅" : "📋"}
                  </button>
                </div>
                <button
                  className={s.methodBtn}
                  onClick={() => handleMethodClick("email")}
                >
                  Send Email
                </button>
              </div>
            )}

            {job.applicationWhatsApp && (
              <div className={s.methodCard}>
                <span className={s.methodIcon}>💬</span>
                <span className={s.methodLabel}>WhatsApp</span>
                <button
                  className={s.methodBtn}
                  onClick={() => handleMethodClick("whatsapp")}
                >
                  Chat on WhatsApp
                </button>
              </div>
            )}

            {job.applicationPhone && (
              <div className={s.methodCard}>
                <span className={s.methodIcon}>📞</span>
                <span className={s.methodLabel}>Phone</span>
                <div className={s.methodValueRow}>
                  <span className={s.methodValue}>{job.applicationPhone}</span>
                  <button
                    className={s.copyBtn}
                    onClick={() =>
                      copyToClipboard(job.applicationPhone, "phone")
                    }
                    title="Copy phone number"
                  >
                    {copiedField === "phone" ? "✅" : "📋"}
                  </button>
                </div>
                <button
                  className={s.methodBtn}
                  onClick={() => handleMethodClick("phone")}
                >
                  Call Now
                </button>
              </div>
            )}
          </div>
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
          method={selectedMethod}
          platformName={platformName}
          onConfirm={handleProceed}
          onClose={handleModalClose}
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
s;
