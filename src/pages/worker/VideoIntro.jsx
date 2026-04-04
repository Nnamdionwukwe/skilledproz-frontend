import { useState, useRef } from "react";
import api from "../../lib/api";
import styles from "./VideoIntro.module.css";

export default function VideoIntro({ currentUrl, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file (MP4, MOV, WebM).");
      return;
    }

    // Local preview
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
  };

  const handleDelete = async () => {
    if (!confirm("Remove your video intro?")) return;
    try {
      await api.delete("/workers/video-intro");
      setPreview(null);
      setSuccess("Video intro removed.");
      onUpdate?.(null);
    } catch {
      setError("Failed to remove.");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>🎬 Video Introduction</h3>
          <p className={styles.sub}>
            Record a 60-second intro to stand out. Hirers love it.
          </p>
        </div>
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

      {error && <p className={styles.error}>⚠️ {error}</p>}
      {success && <p className={styles.successMsg}>✅ {success}</p>}
    </div>
  );
}
