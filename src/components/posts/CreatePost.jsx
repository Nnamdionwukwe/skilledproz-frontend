import { useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./CreatePost.module.css";

const POST_TYPES = [
  { value: "GENERAL", label: "💬 General" },
  { value: "ACHIEVEMENT", label: "🏆 Achievement" },
  { value: "PORTFOLIO", label: "🎨 Portfolio" },
  { value: "HIRING", label: "📢 Hiring" },
  { value: "JOB_UPDATE", label: "💼 Job Update" },
  { value: "ANNOUNCEMENT", label: "📣 Announcement" },
];

export default function CreatePost({ onPostCreated, compact = false }) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(!compact);
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  if (!user) return null;

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 4) {
      setError("Maximum 4 images allowed");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((f) => ({ url: URL.createObjectURL(f), name: f.name })),
    ]);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Please write something.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("content", content);
      form.append("type", type);
      form.append("isPublic", isPublic);
      images.forEach((img) => form.append("files", img));

      const res = await api.post("/posts", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onPostCreated?.(res.data.data.post);
      setContent("");
      setImages([]);
      setPreviews([]);
      setType("GENERAL");
      if (compact) setExpanded(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  };

  const charLimit = 3000;
  const charLeft = charLimit - content.length;

  return (
    <div className={styles.wrap}>
      {/* Compact trigger */}
      {compact && !expanded && (
        <div
          className={styles.compactTrigger}
          onClick={() => setExpanded(true)}
        >
          <div className={styles.triggerAvatar}>
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <span>{user.firstName?.[0]}</span>
            )}
          </div>
          <div className={styles.triggerInput}>
            Start a post, share an update...
          </div>
          <div className={styles.triggerActions}>
            <button
              className={styles.triggerBtn}
              onClick={() => {
                setExpanded(true);
                fileRef.current?.click();
              }}
            >
              📷
            </button>
            <button className={styles.triggerBtn}>📢</button>
          </div>
        </div>
      )}

      {/* Full editor */}
      {expanded && (
        <div className={styles.editor}>
          {/* Author */}
          <div className={styles.editorHeader}>
            <div className={styles.editorAvatar}>
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                <span>{user.firstName?.[0]}</span>
              )}
            </div>
            <div>
              <p className={styles.editorName}>
                {user.firstName} {user.lastName}
              </p>
              <div className={styles.visibilityRow}>
                <select
                  className={styles.visibilitySelect}
                  value={isPublic ? "public" : "private"}
                  onChange={(e) => setIsPublic(e.target.value === "public")}
                >
                  <option value="public">🌍 Public</option>
                  <option value="private">🔒 Only me</option>
                </select>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className={styles.textarea}
            placeholder="What's on your mind? Share a job update, achievement, or anything work-related..."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
            rows={5}
            autoFocus={!compact}
          />

          {/* Char count */}
          {content.length > charLimit * 0.8 && (
            <div
              className={`${styles.charCount} ${charLeft < 100 ? styles.charCountWarn : ""}`}
            >
              {charLeft} characters remaining
            </div>
          )}

          {/* Image previews */}
          {previews.length > 0 && (
            <div className={styles.previews}>
              {previews.map((p, i) => (
                <div key={i} className={styles.previewItem}>
                  <img src={p.url} alt="" className={styles.previewImg} />
                  <button
                    className={styles.previewRemove}
                    onClick={() => removeImage(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className={styles.error}>⚠️ {error}</p>}

          {/* Post type */}
          <div className={styles.typeRow}>
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                className={`${styles.typeBtn} ${type === t.value ? styles.typeBtnActive : ""}`}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <button
                className={styles.attachBtn}
                onClick={() => fileRef.current?.click()}
                title="Add images"
              >
                📷 Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleImages}
              />
            </div>
            <div className={styles.footerRight}>
              {compact && (
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setExpanded(false);
                    setContent("");
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                className={styles.postBtn}
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <span className={styles.spinner} /> Posting...
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
