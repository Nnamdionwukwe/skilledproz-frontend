// src/pages/worker/portfolio/PortfolioPage.jsx
import { useState, useEffect, useRef } from "react";
import {
  FiVideo,
  FiUploadCloud,
  FiImage,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiPlus,
  FiRefreshCw,
  FiX,
  FiMaximize2,
} from "react-icons/fi";
import styles from "./Portfolio.module.css";
import api from "../../../../lib/api";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import ConfirmationModal from "../../../../components/ui/ConfirmationModal";
import { useAuthStore } from "../../../../store/authStore";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader — mirrors the full page layout
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* ── Video section skeleton ── */}
      <div className={styles.skVideoSection}>
        <div className={styles.skVideoHeader}>
          <div className={`${styles.skBlock} ${styles.skVideoIcon}`} />
          <div className={styles.skVideoHeaderText}>
            <div className={`${styles.skBlock} ${styles.skVideoTitle}`} />
            <div className={`${styles.skBlock} ${styles.skVideoSub}`} />
          </div>
        </div>
        <div className={`${styles.skBlock} ${styles.skVideoBox}`} />
      </div>

      {/* ── Upload form skeleton ── */}
      <div className={styles.skCard}>
        <div className={`${styles.skBlock} ${styles.skCardTitle}`} />

        <div className={styles.skFormRow}>
          <div className={styles.skField}>
            <div className={`${styles.skBlock} ${styles.skLabel}`} />
            <div className={`${styles.skBlock} ${styles.skInput}`} />
          </div>
          <div className={styles.skField}>
            <div className={`${styles.skBlock} ${styles.skLabel}`} />
            <div className={`${styles.skBlock} ${styles.skInput}`} />
          </div>
        </div>

        <div className={styles.skField}>
          <div className={`${styles.skBlock} ${styles.skLabel}`} />
          <div className={`${styles.skBlock} ${styles.skInput}`} />
        </div>

        <div className={`${styles.skBlock} ${styles.skBtn}`} />
      </div>

      {/* ── Portfolio grid skeleton ── */}
      <div className={styles.skCard}>
        <div className={`${styles.skBlock} ${styles.skCardTitle}`} />

        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skPortfolioCard}>
              <div className={`${styles.skBlock} ${styles.skPortfolioImg}`} />
              <div className={styles.skPortfolioBody}>
                <div className={`${styles.skBlock} ${styles.skItemTitle}`} />
                <div className={`${styles.skBlock} ${styles.skItemDesc}`} />
                <div className={`${styles.skBlock} ${styles.skItemBtn}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Intro sub-component
// ─────────────────────────────────────────────────────────────────────────────
function VideoIntro({ currentUrl, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB.");
      setSuccess("");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file (MP4, MOV, WebM).");
      setSuccess("");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    setSuccess("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/workers/video-intro", form);
      setSuccess("Video intro uploaded!");
      onUpdate?.(res.data.data.videoUrl);
    } catch {
      setError("Upload failed. Please try again.");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    try {
      await api.delete("/workers/video-intro");
      setPreview(null);
      setSuccess("Video intro removed.");
      setError("");
      onUpdate?.(null);
    } catch {
      setError("Failed to remove.");
    }
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FiVideo className={styles.sectionIcon} />
          Video Introduction
        </h3>
        <p className={styles.sectionSub}>
          Record a 60-second intro to stand out. Hirers love it.
        </p>
      </div>

      {preview ? (
        <div className={styles.videoWrap}>
          <video
            src={preview}
            className={styles.video}
            controls
            playsInline
            preload="metadata"
          />
          <div className={styles.videoActions}>
            <button
              type="button"
              className={styles.reuploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className={styles.spinner} /> Uploading...
                </>
              ) : (
                <>
                  <FiRefreshCw size={14} /> Replace Video
                </>
              )}
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setConfirmOpen(true)}
              disabled={uploading}
            >
              <FiTrash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={styles.dropzone}
          onClick={() => !uploading && fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!uploading) fileRef.current?.click();
            }
          }}
        >
          <span className={styles.dropIcon}>
            <FiUploadCloud />
          </span>
          <p className={styles.dropTitle}>
            {uploading ? "Uploading..." : "Upload your intro video"}
          </p>
          <p className={styles.dropSub}>
            MP4, MOV, WebM · Max 100MB · Under 60 seconds recommended
          </p>
          {uploading && (
            <span className={styles.spinner} style={{ marginTop: "0.5rem" }} />
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className={styles.hiddenInput}
        onChange={handleFile}
      />

      {error && (
        <p className={styles.videoError}>
          <FiAlertCircle size={14} /> {error}
        </p>
      )}
      {success && (
        <p className={styles.videoSuccess}>
          <FiCheckCircle size={14} /> {success}
        </p>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Remove video intro?"
        message="This will permanently delete your video introduction. Hirers will no longer see it on your profile."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        confirmVariant="danger"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Portfolio page
// ─────────────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user } = useAuthStore();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", file: null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);

  function fetchWorker() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    api
      .get(`/workers/${user.id}`)
      .then((res) => setWorker(res.data.data?.worker ?? null))
      .catch(() => setWorker(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchWorker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Escape key closes the lightbox
  useEffect(() => {
    if (!lightboxItem) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxItem(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxItem]);

  const portfolio = worker?.portfolio ?? [];
  const videoUrl = worker?.videoIntroUrl ?? null;

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.file) {
      setMsg({ type: "error", text: "Please select an image" });
      return;
    }
    setSaving(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append("image", form.file);
      fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);

      await api.post("/workers/portfolio", fd);

      setForm({ title: "", description: "", file: null });
      setMsg({ type: "success", text: "Portfolio item added!" });
      fetchWorker();
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.message || err.message || "Upload failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;

    setDeletingId(id);
    try {
      await api.delete(`/workers/portfolio/${id}`);
      fetchWorker();
    } catch {
      setMsg({ type: "error", text: "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Portfolio</h1>
            <p className={styles.pageSub}>
              Showcase your best work with photos and a video intro
            </p>
          </div>
        </div>

        {/* ── Loading: full-page skeleton ── */}
        {loading ? (
          <PortfolioSkeleton />
        ) : (
          <>
            {/* ── Video intro section ── */}
            <VideoIntro
              currentUrl={videoUrl}
              onUpdate={(url) =>
                setWorker((w) => (w ? { ...w, videoIntroUrl: url } : w))
              }
            />

            {/* ── Upload form ── */}
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Add Portfolio Item</h3>

              {msg && (
                <div
                  className={`${styles.alert} ${
                    msg.type === "success"
                      ? styles.alertSuccess
                      : styles.alertError
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

              <form onSubmit={handleUpload} className={styles.uploadForm}>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Title *</label>
                    <input
                      className={styles.input}
                      placeholder="e.g. Kitchen rewiring job"
                      value={form.title}
                      required
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label}>Photo *</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.input}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, file: e.target.files[0] }))
                      }
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Description (optional)</label>
                  <input
                    className={styles.input}
                    placeholder="Describe the work done..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className={styles.uploadBtn}
                  disabled={saving}
                >
                  {saving ? (
                    "Uploading..."
                  ) : (
                    <>
                      <FiPlus size={16} /> Add to Portfolio
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ── Portfolio grid ── */}
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>
                My Portfolio{" "}
                <span className={styles.count}>({portfolio.length})</span>
              </h3>

              {portfolio.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <FiImage />
                  </span>
                  <p className={styles.emptyTitle}>No portfolio items yet</p>
                  <p className={styles.emptySub}>
                    Upload photos of your completed work to attract more clients
                  </p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {portfolio.map((item) => (
                    <div key={item.id} className={styles.portfolioCard}>
                      <button
                        type="button"
                        className={styles.imgWrap}
                        onClick={() => setLightboxItem(item)}
                        aria-label={`View ${item.title} full screen`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={styles.img}
                          loading="lazy"
                        />
                        <span className={styles.imgOverlay}>
                          <FiMaximize2 size={18} />
                        </span>
                      </button>
                      <div className={styles.cardBody}>
                        <p className={styles.itemTitle}>{item.title}</p>
                        {item.description && (
                          <p className={styles.itemDesc}>{item.description}</p>
                        )}
                        <button
                          type="button"
                          className={styles.deleteItemBtn}
                          onClick={() => setPendingDelete(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            "Deleting..."
                          ) : (
                            <>
                              <FiTrash2 size={13} /> Remove
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Fullscreen image lightbox ── */}
      {lightboxItem && (
        <div
          className={styles.lightbox}
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxItem(null);
            }}
            aria-label="Close"
          >
            <FiX size={22} />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxItem.imageUrl}
              alt={lightboxItem.title}
              className={styles.lightboxImg}
            />
            {(lightboxItem.title || lightboxItem.description) && (
              <div className={styles.lightboxCaption}>
                <p className={styles.lightboxTitle}>{lightboxItem.title}</p>
                {lightboxItem.description && (
                  <p className={styles.lightboxDesc}>
                    {lightboxItem.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm delete portfolio item modal ── */}
      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete portfolio item?"
        message="This portfolio item will be permanently removed from your profile. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </WorkerLayout>
  );
}
