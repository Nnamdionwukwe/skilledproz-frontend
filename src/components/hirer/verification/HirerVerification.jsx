import { useState, useEffect } from "react";
import HirerLayout from "../../../components/layout/HirerLayout";
import api from "../../../lib/api";
import styles from "../../../pages/worker/verification/Verification.module.css";

function StatusBadge({ status }) {
  const map = {
    UNVERIFIED: { label: "Unverified", cls: "badgeDefault" },
    PENDING: { label: "Pending Review", cls: "badgePending" },
    VERIFIED: { label: "Verified ✓", cls: "badgeVerified" },
    REJECTED: { label: "Rejected", cls: "badgeRejected" },
  };
  const s = map[status] || map.UNVERIFIED;
  return <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>;
}

export default function HirerVerification() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verType, setVerType] = useState("INDIVIDUAL");

  // Individual fields
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");

  // Business fields
  const [companyName, setCompanyName] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [website, setWebsite] = useState("");

  const [docFile, setDocFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/verification/hirer/status")
      .then((res) => setStatus(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!docFile) {
      setError("Please upload a verification document.");
      return;
    }
    if (verType === "INDIVIDUAL" && (!idType || !idNumber)) {
      setError(
        "ID type and ID number are required for individual verification.",
      );
      return;
    }
    if (verType === "BUSINESS" && (!companyName || !companyReg)) {
      setError("Company name and registration number are required.");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append("verificationType", verType);
    form.append("file", docFile);
    if (verType === "INDIVIDUAL") {
      form.append("idType", idType);
      form.append("idNumber", idNumber);
    } else {
      form.append("companyName", companyName);
      form.append("companyRegNumber", companyReg);
      form.append("companyCountry", companyCountry);
      form.append("website", website);
    }

    try {
      await api.post("/verification/hirer/submit", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(
        "Verification submitted. Our team will review within 24–48 hours.",
      );
      const res = await api.get("/verification/hirer/status");
      setStatus(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = status?.currentStatus || "UNVERIFIED";
  const isVerified = currentStatus === "VERIFIED";
  const isPending = currentStatus === "PENDING";

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.badge2}>Trust & Safety</div>
          <h1 className={styles.title}>Account Verification</h1>
          <p className={styles.sub}>
            Verified hirers attract better workers and unlock higher booking
            limits.
          </p>
        </div>

        {/* Status card */}
        {!loading && status && (
          <div className={styles.statusCard}>
            <div className={styles.statusLeft}>
              <div className={styles.statusIcon}>
                {isVerified
                  ? "✅"
                  : isPending
                    ? "⏳"
                    : currentStatus === "REJECTED"
                      ? "❌"
                      : "🔓"}
              </div>
              <div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Account Status</span>
                  <StatusBadge status={currentStatus} />
                </div>
                <p className={styles.statusMsg}>{status.statusMessage}</p>
                {status.latestSubmission?.submittedAt && (
                  <p className={styles.statusDate}>
                    Submitted:{" "}
                    {new Date(
                      status.latestSubmission.submittedAt,
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
                {status.latestReview?.rejectionReason && (
                  <p className={styles.rejectionReason}>
                    Reason: {status.latestReview.rejectionReason}
                  </p>
                )}
              </div>
            </div>
            {status.latestSubmission && (
              <div className={styles.statusRight}>
                <div className={styles.checkItem}>
                  <span className={styles.checkIcon}>
                    {status.latestSubmission.verificationType === "BUSINESS"
                      ? "🏢"
                      : "🪪"}
                  </span>
                  <span className={styles.checkLabel}>
                    {status.latestSubmission.verificationType === "BUSINESS"
                      ? `Business: ${status.latestSubmission.companyName || "—"}`
                      : "Individual Verification"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form — hide if verified or pending */}
        {!isVerified && !isPending && (
          <div className={styles.tabContent}>
            <div className={styles.infoBox}>
              <h3 className={styles.infoTitle}>Why verify?</h3>
              <ul className={styles.infoList}>
                <li>Workers trust verified hirers and respond faster</li>
                <li>Your profile shows a Verified badge in search</li>
                <li>Unlock higher booking frequency and limits</li>
                <li>Disputes are resolved faster for verified accounts</li>
              </ul>
            </div>

            {/* Type selector */}
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={`${styles.typeBtn} ${verType === "INDIVIDUAL" ? styles.typeBtnActive : ""}`}
                onClick={() => setVerType("INDIVIDUAL")}
              >
                <span className={styles.typeBtnIcon}>🪪</span>
                <span className={styles.typeBtnLabel}>Individual</span>
                <span className={styles.typeBtnSub}>
                  Personal ID verification
                </span>
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${verType === "BUSINESS" ? styles.typeBtnActive : ""}`}
                onClick={() => setVerType("BUSINESS")}
              >
                <span className={styles.typeBtnIcon}>🏢</span>
                <span className={styles.typeBtnLabel}>Business</span>
                <span className={styles.typeBtnSub}>Company registration</span>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {verType === "INDIVIDUAL" ? (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>ID Type *</label>
                    <select
                      className={styles.input}
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                    >
                      <option value="">Select ID type</option>
                      <option value="NATIONAL_ID">National ID Card</option>
                      <option value="PASSPORT">International Passport</option>
                      <option value="DRIVERS_LICENSE">Driver's License</option>
                      <option value="VOTERS_CARD">Voter's Card</option>
                      <option value="RESIDENCE_PERMIT">Residence Permit</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>ID Number *</label>
                    <input
                      className={styles.input}
                      placeholder="e.g. A123456789"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Company Name *</label>
                    <input
                      className={styles.input}
                      placeholder="e.g. Acme Services Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Registration Number *
                    </label>
                    <input
                      className={styles.input}
                      placeholder="e.g. RC1234567"
                      value={companyReg}
                      onChange={(e) => setCompanyReg(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Country of Registration
                    </label>
                    <input
                      className={styles.input}
                      placeholder="e.g. Nigeria"
                      value={companyCountry}
                      onChange={(e) => setCompanyCountry(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Website</label>
                    <input
                      className={styles.input}
                      placeholder="https://yourcompany.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>
                  Upload{" "}
                  {verType === "BUSINESS"
                    ? "CAC / Registration Document"
                    : "ID Document"}{" "}
                  *
                </label>
                <div
                  className={`${styles.dropzone} ${docFile ? styles.dropzoneHasFile : ""}`}
                  onClick={() =>
                    document.getElementById("docFileInput").click()
                  }
                >
                  <input
                    id="docFileInput"
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => setDocFile(e.target.files[0])}
                  />
                  {docFile ? (
                    <div className={styles.fileSelected}>
                      <span className={styles.fileIcon}>📄</span>
                      <span className={styles.fileName}>{docFile.name}</span>
                      <button
                        type="button"
                        className={styles.removeFile}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocFile(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dropzoneInner}>
                      <span className={styles.dropzoneIcon}>📁</span>
                      <p className={styles.dropzoneText}>
                        Click to upload or drag and drop
                      </p>
                      <p className={styles.dropzoneHint}>
                        JPG, PNG or PDF — max 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <span>⚠️</span> {error}
                </div>
              )}
              {success && (
                <div className={styles.successBox}>
                  <span>✅</span> {success}
                </div>
              )}

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className={styles.spinner} /> Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </button>
            </form>
          </div>
        )}

        {/* Already verified */}
        {isVerified && (
          <div className={styles.alreadyVerified}>
            <span className={styles.bigIcon}>✅</span>
            <h3>Your account is fully verified</h3>
            <p>
              Workers can see your Verified badge when browsing your profile.
            </p>
          </div>
        )}

        {/* Pending */}
        {isPending && (
          <div className={styles.pendingBox}>
            <span className={styles.bigIcon}>⏳</span>
            <h3>Verification under review</h3>
            <p>
              Your documents have been submitted and are being reviewed by our
              team. This usually takes 24–48 hours. You'll receive a
              notification once the review is complete.
            </p>
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
