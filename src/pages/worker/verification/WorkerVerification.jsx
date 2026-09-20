// src/pages/worker/verification/Verification.jsx
import { useState, useEffect } from "react";
import {
  FiShield,
  FiFileText,
  FiUploadCloud,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiUnlock,
  FiX,
} from "react-icons/fi";
import { ShieldCheck } from "lucide-react";
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

function StatusIcon({ status }) {
  if (status === "VERIFIED") return <ShieldCheck size={34} />;
  if (status === "PENDING") return <FiClock size={32} />;
  if (status === "REJECTED") return <FiXCircle size={32} />;
  return <FiUnlock size={32} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader — mirrors the real page structure
// ─────────────────────────────────────────────────────────────────────────────
function VerificationSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Status card skeleton */}
      <div className={styles.skStatusCard}>
        <div className={`${styles.skBlock} ${styles.skStatusIcon}`} />
        <div className={styles.skStatusBody}>
          <div className={styles.skStatusRow}>
            <div className={`${styles.skBlock} ${styles.skLabelSm}`} />
            <div className={`${styles.skBlock} ${styles.skBadgePill}`} />
          </div>
          <div className={`${styles.skBlock} ${styles.skTextLine}`} />
          <div className={`${styles.skBlock} ${styles.skTextShort}`} />
        </div>
      </div>

      {/* Info box skeleton */}
      <div className={styles.skInfoBox}>
        <div className={`${styles.skBlock} ${styles.skInfoTitle}`} />
        <div className={`${styles.skBlock} ${styles.skInfoItem}`} />
        <div className={`${styles.skBlock} ${styles.skInfoItem}`} />
        <div className={`${styles.skBlock} ${styles.skInfoItem}`} />
      </div>

      {/* Form fields skeleton */}
      <div className={styles.skFormGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skField}>
            <div className={`${styles.skBlock} ${styles.skFieldLabel}`} />
            <div className={`${styles.skBlock} ${styles.skFieldInput}`} />
          </div>
        ))}
      </div>

      {/* Dropzone skeleton */}
      <div className={`${styles.skBlock} ${styles.skDropzone}`} />

      {/* Submit button skeleton */}
      <div className={`${styles.skBlock} ${styles.skSubmitBtn}`} />
    </div>
  );
}

export default function WorkerVerification() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // ID form state
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [submittingId, setSubmittingId] = useState(false);
  const [idSuccess, setIdSuccess] = useState("");
  const [idError, setIdError] = useState("");

  useEffect(() => {
    api
      .get("/verification/status")
      .then((res) => setStatus(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refetchStatus = async () => {
    const res = await api.get("/verification/status");
    setStatus(res.data.data);
  };

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
      await api.post("/verification/submit-id", form);
      setIdSuccess(
        "ID submitted successfully. We'll review within 24–48 hours.",
      );
      await refetchStatus();
    } catch (err) {
      setIdError(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmittingId(false);
    }
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header — always visible */}
        <div className={styles.pageHeader}>
          <div className={styles.badge2}>
            <FiShield size={12} />
            Identity Verification
          </div>
          <h1 className={styles.title}>Verification</h1>
          <p className={styles.sub}>
            Verified workers get more bookings and appear higher in search
            results.
          </p>
        </div>

        {/* Loading — skeleton mirrors real layout */}
        {loading ? (
          <VerificationSkeleton />
        ) : (
          <>
            {/* Status card */}
            {status && (
              <div className={styles.statusCard}>
                <div className={styles.statusLeft}>
                  <div className={styles.statusIcon}>
                    <StatusIcon status={status.verificationStatus} />
                  </div>
                  <div className={styles.statusInfo}>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>
                        Identity Status
                      </span>
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
                      <span className={styles.checkIcon}>
                        <FiShield size={14} />
                      </span>
                      <span className={styles.checkLabel}>
                        Background Check Cleared
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className={styles.tabContent}>
              {status?.verificationStatus === "VERIFIED" ? (
                <div className={styles.alreadyVerified}>
                  <span className={styles.bigIcon}>
                    <ShieldCheck size={50} />
                  </span>
                  <h3>Your identity is verified</h3>
                  <p>Your profile shows the Verified badge to hirers.</p>
                </div>
              ) : status?.verificationStatus === "PENDING" ? (
                <div className={styles.pendingBox}>
                  <span className={styles.bigIcon}>
                    <FiClock size={50} />
                  </span>
                  <h3>Verification under review</h3>
                  <p>
                    We&apos;ve received your documents and our team is reviewing
                    them. This usually takes 24–48 hours.
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.infoBox}>
                    <h3 className={styles.infoTitle}>What you need</h3>
                    <ul className={styles.infoList}>
                      <li>
                        A valid government-issued ID (National ID, Passport,
                        etc.)
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
                      <label className={styles.label}>
                        Upload ID Document *
                      </label>
                      <div
                        className={`${styles.dropzone} ${
                          idFile ? styles.dropzoneHasFile : ""
                        }`}
                        onClick={() =>
                          document.getElementById("idFileInput")?.click()
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            document.getElementById("idFileInput")?.click();
                          }
                        }}
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
                            <span className={styles.fileIcon}>
                              <FiFileText size={18} />
                            </span>
                            <span className={styles.fileName}>
                              {idFile.name}
                            </span>
                            <button
                              type="button"
                              className={styles.removeFile}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIdFile(null);
                              }}
                              aria-label="Remove file"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className={styles.dropzoneInner}>
                            <span className={styles.dropzoneIcon}>
                              <FiUploadCloud size={28} />
                            </span>
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
                        <FiAlertCircle size={15} />
                        <span>{idError}</span>
                      </div>
                    )}
                    {idSuccess && (
                      <div className={styles.successBox}>
                        <FiCheckCircle size={15} />
                        <span>{idSuccess}</span>
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
          </>
        )}
      </div>
    </WorkerLayout>
  );
}
