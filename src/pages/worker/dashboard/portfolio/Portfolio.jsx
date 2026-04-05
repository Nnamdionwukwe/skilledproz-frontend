import { useState, useEffect, useRef } from "react";
import styles from "./Portfolio.module.css";
import api from "../../../../lib/api";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import { useAuthStore } from "../../../../store/authStore";

// ── Video Intro sub-component ─────────────────────────────────────────────────
function VideoIntro({ currentUrl, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024)
      return setError("Video must be under 100MB.");
    if (!file.type.startsWith("video/"))
      return setError("Please upload a video file (MP4, MOV, WebM).");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/workers/video-intro", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Video intro uploaded!");
      onUpdate?.(res.data.data.videoUrl);
    } catch {
      setError("Upload failed. Please try again.");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove your video intro?")) return;
    try {
      await api.delete("/workers/video-intro");
      setPreview(null);
      setSuccess("Video intro removed.");
      onUpdate?.(null);
    } catch {
      setError("Failed to remove.");
    }
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>🎬 Video Introduction</h3>
        <p className={styles.sectionSub}>
          Record a 60-second intro to stand out. Hirers love it.
        </p>
      </div>

      {preview ? (
        <div className={styles.videoWrap}>
          <video src={preview} className={styles.video} controls playsInline />
          <div className={styles.videoActions}>
            <button
              className={styles.reuploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className={styles.spinner} /> Uploading...
                </>
              ) : (
                "Replace Video"
              )}
            </button>
            <button className={styles.deleteBtn} onClick={handleDelete}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={styles.dropzone}
          onClick={() => fileRef.current?.click()}
        >
          <span className={styles.dropIcon}>🎥</span>
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
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {error && <p className={styles.videoError}>⚠️ {error}</p>}
      {success && <p className={styles.videoSuccess}>✅ {success}</p>}
    </div>
  );
}

// ── Main Portfolio page ───────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user } = useAuthStore();
  const [worker, setWorker] = useState(null); // ← null guard fixed
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", file: null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function fetchWorker() {
    if (!user?.id) return;
    api
      .get(`/workers/${user.id}`)
      .then((res) => setWorker(res.data.data?.worker ?? null))
      .catch(() => setWorker(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchWorker();
  }, [user?.id]);

  // Safe: derive portfolio only after worker is loaded
  const portfolio = worker?.portfolio ?? [];
  const videoUrl = worker?.videoIntroUrl ?? null;

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.file)
      return setMsg({ type: "error", text: "Please select an image" });
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
        text: err.response?.data?.message || "Upload failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this portfolio item?")) return;
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
              className={`${styles.alert} ${msg.type === "success" ? styles.alertSuccess : styles.alertError}`}
            >
              {msg.text}
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
              {saving ? "Uploading..." : "+ Add to Portfolio"}
            </button>
          </form>
        </div>

        {/* ── Portfolio grid ── */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>
            My Portfolio{" "}
            <span className={styles.count}>({portfolio.length})</span>
          </h3>

          {loading ? (
            <div className={styles.grid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skCard} />
              ))}
            </div>
          ) : portfolio.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🖼️</span>
              <p className={styles.emptyTitle}>No portfolio items yet</p>
              <p className={styles.emptySub}>
                Upload photos of your completed work to attract more clients
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {portfolio.map((item) => (
                <div key={item.id} className={styles.portfolioCard}>
                  <div className={styles.imgWrap}>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className={styles.img}
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.itemTitle}>{item.title}</p>
                    {item.description && (
                      <p className={styles.itemDesc}>{item.description}</p>
                    )}
                    <button
                      className={styles.deleteItemBtn}
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? "Deleting..." : "🗑 Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
