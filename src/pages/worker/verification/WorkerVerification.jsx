import { useState, useEffect } from "react";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import styles from "./Verification.module.css";

const ID_TYPES = [
  { value: "NATIONAL_ID", label: "National ID Card" },
  { value: "PASSPORT", label: "International Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "VOTERS_CARD", label: "Voter's Card" },
  { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  { value: "WORK_PERMIT", label: "Work Permit" },
];

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

export default function WorkerVerification() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("id"); // 'id' | 'certifications'

  // ID form
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [submittingId, setSubmittingId] = useState(false);
  const [idSuccess, setIdSuccess] = useState("");
  const [idError, setIdError] = useState("");

  // Certification form
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certIssueDate, setCertIssueDate] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  const [certFile, setCertFile] = useState(null);
  const [submittingCert, setSubmittingCert] = useState(false);
  const [certSuccess, setCertSuccess] = useState("");
  const [certError, setCertError] = useState("");

  useEffect(() => {
    api
      .get("/verification/status")
      .then((res) => setStatus(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    setIdError("");
    setIdSuccess("");
    if (!idType || !idNumber || !idFile) {
      setIdError("ID type, ID number, and document image are required.");
      return;
    }
    setSubmittingId(true);
    const form = new FormData();
    form.append("idType", idType);
    form.append("idNumber", idNumber);
    form.append("dateOfBirth", dob);
    form.append("nationality", nationality);
    form.append("file", idFile);
    try {
      await api.post("/verification/submit-id", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIdSuccess(
        "ID submitted successfully. We'll review within 24–48 hours.",
      );
      const res = await api.get("/verification/status");
      setStatus(res.data.data);
    } catch (err) {
      setIdError(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmittingId(false);
    }
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    setCertError("");
    setCertSuccess("");
    if (!certName || !certIssuer) {
      setCertError("Certification name and issuing body are required.");
      return;
    }
    setSubmittingCert(true);
    const form = new FormData();
    form.append("name", certName);
    form.append("issuedBy", certIssuer);
    if (certIssueDate) form.append("issueDate", certIssueDate);
    if (certExpiry) form.append("expiryDate", certExpiry);
    if (certFile) form.append("file", certFile);
    try {
      await api.post("/verification/submit-certification", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCertSuccess("Certification submitted for review.");
      setCertName("");
      setCertIssuer("");
      setCertIssueDate("");
      setCertExpiry("");
      setCertFile(null);
      const res = await api.get("/verification/status");
      setStatus(res.data.data);
    } catch (err) {
      setCertError(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleDeleteCert = async (certId) => {
    if (!confirm("Delete this certification?")) return;
    try {
      await api.delete(`/verification/certifications/${certId}`);
      const res = await api.get("/verification/status");
      setStatus(res.data.data);
    } catch {}
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.badge2}>Identity & Credentials</div>
          <h1 className={styles.title}>Verification</h1>
          <p className={styles.sub}>
            Verified workers get more bookings and appear higher in search
            results.
          </p>
        </div>

        {/* Status card */}
        {!loading && status && (
          <div className={styles.statusCard}>
            <div className={styles.statusLeft}>
              <div className={styles.statusIcon}>
                {status.verificationStatus === "VERIFIED"
                  ? "✅"
                  : status.verificationStatus === "PENDING"
                    ? "⏳"
                    : status.verificationStatus === "REJECTED"
                      ? "❌"
                      : "🔓"}
              </div>
              <div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Identity Status</span>
                  <StatusBadge status={status.verificationStatus} />
                </div>
                <p className={styles.statusMsg}>{status.statusMessage}</p>
                {status.lastSubmittedAt && (
                  <p className={styles.statusDate}>
                    Submitted:{" "}
                    {new Date(status.lastSubmittedAt).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className={styles.statusRight}>
              {status.backgroundCheck && (
                <div className={styles.checkItem}>
                  <span className={styles.checkIcon}>🛡️</span>
                  <span className={styles.checkLabel}>
                    Background Check Cleared
                  </span>
                </div>
              )}
              <div className={styles.checkItem}>
                <span className={styles.checkIcon}>📜</span>
                <span className={styles.checkLabel}>
                  {status.certifications?.length || 0} Certification
                  {status.certifications?.length !== 1 ? "s" : ""} submitted
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "id" ? styles.tabActive : ""}`}
            onClick={() => setTab("id")}
          >
            🪪 Identity Verification
          </button>
          <button
            className={`${styles.tab} ${tab === "certifications" ? styles.tabActive : ""}`}
            onClick={() => setTab("certifications")}
          >
            📜 Certifications
            {status?.certifications?.length > 0 && (
              <span className={styles.tabBadge}>
                {status.certifications.length}
              </span>
            )}
          </button>
        </div>

        {/* ID Verification Tab */}
        {tab === "id" && (
          <div className={styles.tabContent}>
            {status?.verificationStatus === "VERIFIED" ? (
              <div className={styles.alreadyVerified}>
                <span className={styles.bigIcon}>✅</span>
                <h3>Your identity is verified</h3>
                <p>Your profile shows the Verified badge to hirers.</p>
              </div>
            ) : (
              <>
                <div className={styles.infoBox}>
                  <h3 className={styles.infoTitle}>What you need</h3>
                  <ul className={styles.infoList}>
                    <li>
                      A valid government-issued ID (National ID, Passport, etc.)
                    </li>
                    <li>A clear photo or scan of the document</li>
                    <li>Your ID number must be visible and legible</li>
                    <li>Accepted formats: JPG, PNG, PDF (max 10MB)</li>
                  </ul>
                </div>

                <form className={styles.form} onSubmit={handleIdSubmit}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>ID Type *</label>
                      <select
                        className={styles.input}
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                      >
                        <option value="">Select ID type</option>
                        {ID_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
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

                    <div className={styles.field}>
                      <label className={styles.label}>Date of Birth</label>
                      <input
                        className={styles.input}
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Nationality</label>
                      <input
                        className={styles.input}
                        placeholder="e.g. Nigerian"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Upload ID Document *</label>
                    <div
                      className={`${styles.dropzone} ${idFile ? styles.dropzoneHasFile : ""}`}
                      onClick={() =>
                        document.getElementById("idFileInput").click()
                      }
                    >
                      <input
                        id="idFileInput"
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: "none" }}
                        onChange={(e) => setIdFile(e.target.files[0])}
                      />
                      {idFile ? (
                        <div className={styles.fileSelected}>
                          <span className={styles.fileIcon}>📄</span>
                          <span className={styles.fileName}>{idFile.name}</span>
                          <button
                            type="button"
                            className={styles.removeFile}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdFile(null);
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

                  {idError && (
                    <div className={styles.errorBox}>
                      <span>⚠️</span> {idError}
                    </div>
                  )}
                  {idSuccess && (
                    <div className={styles.successBox}>
                      <span>✅</span> {idSuccess}
                    </div>
                  )}

                  <button
                    className={styles.submitBtn}
                    type="submit"
                    disabled={submittingId}
                  >
                    {submittingId ? (
                      <>
                        <span className={styles.spinner} /> Submitting...
                      </>
                    ) : (
                      "Submit for Verification"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Certifications Tab */}
        {tab === "certifications" && (
          <div className={styles.tabContent}>
            {/* Existing certs */}
            {status?.certifications?.length > 0 && (
              <div className={styles.certList}>
                <h3 className={styles.certListTitle}>Your Certifications</h3>
                {status.certifications.map((cert) => (
                  <div key={cert.id} className={styles.certCard}>
                    <div className={styles.certLeft}>
                      <span className={styles.certIcon}>📜</span>
                      <div>
                        <p className={styles.certName}>{cert.name}</p>
                        <p className={styles.certIssuer}>
                          Issued by {cert.issuedBy}
                        </p>
                        {cert.issueDate && (
                          <p className={styles.certDate}>
                            {new Date(cert.issueDate).toLocaleDateString(
                              "en-GB",
                              {
                                month: "short",
                                year: "numeric",
                              },
                            )}
                            {cert.expiryDate &&
                              ` – ${new Date(cert.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.certRight}>
                      {cert.verified ? (
                        <span
                          className={`${styles.badge} ${styles.badgeVerified}`}
                        >
                          ✓ Verified
                        </span>
                      ) : (
                        <span
                          className={`${styles.badge} ${styles.badgePending}`}
                        >
                          Pending
                        </span>
                      )}
                      {cert.documentUrl && (
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.viewLink}
                        >
                          View
                        </a>
                      )}
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteCert(cert.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add certification form */}
            <div className={styles.addCertSection}>
              <h3 className={styles.certListTitle}>Add Certification</h3>
              <form className={styles.form} onSubmit={handleCertSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Certification Name *</label>
                    <input
                      className={styles.input}
                      placeholder="e.g. Certified Electrician"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Issued By *</label>
                    <input
                      className={styles.input}
                      placeholder="e.g. COREN, City & Guilds"
                      value={certIssuer}
                      onChange={(e) => setCertIssuer(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Issue Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={certIssueDate}
                      onChange={(e) => setCertIssueDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Expiry Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={certExpiry}
                      onChange={(e) => setCertExpiry(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Upload Certificate (optional)
                  </label>
                  <div
                    className={`${styles.dropzone} ${certFile ? styles.dropzoneHasFile : ""}`}
                    onClick={() =>
                      document.getElementById("certFileInput").click()
                    }
                  >
                    <input
                      id="certFileInput"
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => setCertFile(e.target.files[0])}
                    />
                    {certFile ? (
                      <div className={styles.fileSelected}>
                        <span className={styles.fileIcon}>📄</span>
                        <span className={styles.fileName}>{certFile.name}</span>
                        <button
                          type="button"
                          className={styles.removeFile}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertFile(null);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className={styles.dropzoneInner}>
                        <span className={styles.dropzoneIcon}>📁</span>
                        <p className={styles.dropzoneText}>
                          Click to upload certificate
                        </p>
                        <p className={styles.dropzoneHint}>
                          JPG, PNG or PDF — max 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {certError && (
                  <div className={styles.errorBox}>
                    <span>⚠️</span> {certError}
                  </div>
                )}
                {certSuccess && (
                  <div className={styles.successBox}>
                    <span>✅</span> {certSuccess}
                  </div>
                )}

                <button
                  className={styles.submitBtn}
                  type="submit"
                  disabled={submittingCert}
                >
                  {submittingCert ? (
                    <>
                      <span className={styles.spinner} /> Adding...
                    </>
                  ) : (
                    "Add Certification"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
