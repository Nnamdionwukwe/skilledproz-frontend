// src/pages/worker/certifications/CertificationsPage.jsx
import { useEffect, useState } from "react";
import {
  FiAward,
  FiUploadCloud,
  FiPlus,
  FiFileText,
  FiImage,
  FiAlertCircle,
  FiCheckCircle,
  FiX,
  FiMaximize2,
  FiExternalLink,
  FiCalendar,
  FiUser,
  FiTrash2,
} from "react-icons/fi";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import styles from "./Certifications.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const isExpired = (d) => d && new Date(d) < new Date();

const isImageUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)$/.test(clean);
};

const isPdfUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.pdf$/.test(clean);
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader — mirrors the real certification card layout
// ─────────────────────────────────────────────────────────────────────────────
function CertificationsSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skCertCard}>
          {/* Icon block */}
          <div className={`${styles.skBlock} ${styles.skCertIcon}`} />

          {/* Body — title + meta rows */}
          <div className={styles.skCertBody}>
            <div className={`${styles.skBlock} ${styles.skCertTitle}`} />
            <div className={styles.skCertMeta}>
              <div className={`${styles.skBlock} ${styles.skMetaShort}`} />
              <div className={`${styles.skBlock} ${styles.skMetaShort}`} />
            </div>
          </div>

          {/* Actions — two pill buttons */}
          <div className={styles.skCertActions}>
            <div className={`${styles.skBlock} ${styles.skActionBtn}`} />
            <div className={`${styles.skBlock} ${styles.skActionBtn}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function CertificationsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    issuedBy: "",
    issueDate: "",
    expiryDate: "",
    file: null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { url, name }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchData = () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    api
      .get(`/workers/${user.id}`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Escape key closes the lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  const certs = data?.worker?.certifications || [];

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.files ? e.target.files[0] : e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("issuedBy", form.issuedBy);
      if (form.issueDate) fd.append("issueDate", form.issueDate);
      if (form.expiryDate) fd.append("expiryDate", form.expiryDate);
      if (form.file) fd.append("document", form.file);

      await api.post("/workers/certifications", fd);

      setForm({
        name: "",
        issuedBy: "",
        issueDate: "",
        expiryDate: "",
        file: null,
      });
      setMsg({ type: "success", text: "Certification added!" });
      fetchData();
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.message || err.message || "Upload failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      await api.delete(`/workers/certifications/${id}`);
      setMsg({ type: "success", text: "Certification removed." });
      fetchData();
    } catch {
      setMsg({ type: "error", text: "Delete failed. Please try again." });
    }
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Certifications</h1>
            <p className={styles.pageSub}>
              Add your trade certifications to build trust with clients
            </p>
          </div>
        </div>

        {/* ── Add form ── */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>
            <FiPlus className={styles.sectionIcon} />
            Add Certification
          </h3>

          {msg && (
            <div
              className={`${styles.alert} ${
                msg.type === "success" ? styles.alertSuccess : styles.alertError
              }`}
              role="status"
            >
              {msg.type === "success" ? (
                <FiCheckCircle size={16} />
              ) : (
                <FiAlertCircle size={16} />
              )}
              <span>{msg.text}</span>
              <button
                type="button"
                className={styles.alertClose}
                onClick={() => setMsg(null)}
                aria-label="Dismiss"
              >
                <FiX size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label}>
                  Certification Name <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  required
                  placeholder="e.g. City & Guilds Electrical"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>
                  Issued By <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  required
                  placeholder="e.g. City & Guilds UK"
                  value={form.issuedBy}
                  onChange={set("issuedBy")}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Issue Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.issueDate}
                  onChange={set("issueDate")}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.expiryDate}
                  onChange={set("expiryDate")}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>
                Certificate Document (optional)
              </label>
              <label className={styles.fileDrop}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className={styles.hiddenInput}
                  onChange={set("file")}
                />
                <FiUploadCloud size={22} className={styles.fileIcon} />
                <span className={styles.fileText}>
                  {form.file
                    ? form.file.name
                    : "Click to upload PDF, JPG, or PNG"}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={saving}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <FiPlus size={16} /> Add Certification
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── List ── */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>
            <FiAward className={styles.sectionIcon} />
            My Certifications
            <span className={styles.count}>({certs.length})</span>
          </h3>

          {loading ? (
            <CertificationsSkeleton />
          ) : certs.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <FiAward />
              </span>
              <p className={styles.emptyTitle}>No certifications added</p>
              <p className={styles.emptySub}>
                Add your trade certifications to build trust with clients
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {certs.map((c) => {
                const expired = isExpired(c.expiryDate);
                const hasDoc = !!c.documentUrl;
                const img = hasDoc && isImageUrl(c.documentUrl);
                const pdf = hasDoc && isPdfUrl(c.documentUrl);

                return (
                  <div key={c.id} className={styles.certCard}>
                    <div
                      className={`${styles.certIcon} ${
                        expired ? styles.certIconExpired : ""
                      }`}
                    >
                      <FiAward size={22} />
                    </div>

                    <div className={styles.certBody}>
                      <div className={styles.certTitleRow}>
                        <span className={styles.certName}>{c.name}</span>
                        {expired && (
                          <span className={styles.badgeExpired}>Expired</span>
                        )}
                      </div>

                      <div className={styles.certMeta}>
                        <span className={styles.metaItem}>
                          <FiUser size={12} /> {c.issuedBy || "—"}
                        </span>
                        {c.issueDate && (
                          <span className={styles.metaItem}>
                            <FiCalendar size={12} /> {fmtDate(c.issueDate)}
                          </span>
                        )}
                        {c.expiryDate && (
                          <span
                            className={`${styles.metaItem} ${
                              expired ? styles.metaItemExpired : ""
                            }`}
                          >
                            <FiCalendar size={12} /> Expires{" "}
                            {fmtDate(c.expiryDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.certActions}>
                      {hasDoc && img && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() =>
                            setLightbox({
                              url: c.documentUrl,
                              name: c.name,
                              type: "image",
                            })
                          }
                          aria-label={`View ${c.name} full screen`}
                        >
                          <FiMaximize2 size={15} />
                          <span className={styles.btnLabel}>View</span>
                        </button>
                      )}

                      {hasDoc && pdf && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() =>
                            setLightbox({
                              url: c.documentUrl,
                              name: c.name,
                              type: "pdf",
                            })
                          }
                          aria-label={`View ${c.name} full screen`}
                        >
                          <FiFileText size={15} />
                          <span className={styles.btnLabel}>View</span>
                        </button>
                      )}

                      {hasDoc && !img && !pdf && (
                        <a
                          href={c.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.iconBtn}
                          aria-label={`Open ${c.name}`}
                        >
                          <FiExternalLink size={15} />
                          <span className={styles.btnLabel}>Open</span>
                        </a>
                      )}

                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => setConfirmDeleteId(c.id)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen viewer ── */}
      {lightbox && (
        <div
          className={styles.lightbox}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.name}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label="Close"
          >
            <FiX size={22} />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "pdf" ? (
              <iframe
                src={lightbox.url}
                title={lightbox.name}
                className={styles.lightboxPdf}
              />
            ) : (
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className={styles.lightboxImg}
              />
            )}

            {lightbox.name && (
              <div className={styles.lightboxCaption}>
                <p className={styles.lightboxTitle}>{lightbox.name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      <ConfirmationModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete certification?"
        message="This certification and its document will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </WorkerLayout>
  );
}
