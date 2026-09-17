import { useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./CreatePost.module.css";
import {
  FiMessageSquare,
  FiAward,
  FiImage,
  FiSpeaker,
  FiBriefcase,
  FiVolume2,
  FiCamera,
  FiVideo,
  FiEdit3,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";

const POST_TYPES = [
  { value: "GENERAL", label: "General", icon: FiMessageSquare },
  { value: "ACHIEVEMENT", label: "Achievement", icon: FiAward },
  { value: "PORTFOLIO", label: "Portfolio", icon: FiImage },
  { value: "HIRING", label: "Hiring", icon: FiSpeaker },
  { value: "JOB_UPDATE", label: "Job Update", icon: FiBriefcase },
  { value: "ANNOUNCEMENT", label: "Announcement", icon: FiVolume2 },
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
  const textareaRef = useRef(null);

  if (!user) return null;

  const openEditor = () => {
    setExpanded(true);
    // focus the textarea once it mounts
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

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
      {/* ── LinkedIn-style compact trigger ── */}
      {compact && !expanded && (
        <div className={styles.compactTrigger}>
          {/* Row 1 — avatar + pill input */}
          <div className={styles.triggerTop}>
            <div className={styles.triggerAvatar}>
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                <span>{user.firstName?.[0]}</span>
              )}
            </div>
            <button
              type="button"
              className={styles.triggerInput}
              onClick={openEditor}
            >
              <span className={styles.triggerInputText}>
                Start a post, share an update...
              </span>
            </button>
          </div>

          {/* Row 2 — labeled action buttons like LinkedIn */}
          <div className={styles.triggerActions}>
            <button
              type="button"
              className={styles.triggerAction}
              onClick={openEditor}
            >
              <FiVideo size={18} className={styles.actionVideo} />
              <span>Video</span>
            </button>

            <button
              type="button"
              className={styles.triggerAction}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
                setTimeout(() => fileRef.current?.click(), 0);
              }}
            >
              <FiCamera size={18} className={styles.actionPhoto} />
              <span>Photo</span>
            </button>

            <button
              type="button"
              className={styles.triggerAction}
              onClick={() => {
                setType("HIRING");
                openEditor();
              }}
            >
              <FiBriefcase size={18} className={styles.actionJob} />
              <span>Job</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Full editor ── */}
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
                  <option value="public">Public</option>
                  <option value="private">Only me</option>
                </select>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
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
                    type="button"
                    title="Remove image"
                  >
                    <FiX size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className={styles.errorBanner}>
              <FiAlertCircle size={15} className={styles.errorIcon} />
              <span className={styles.errorText}>{error}</span>
              <button
                type="button"
                className={styles.errorClose}
                onClick={() => setError("")}
                title="Dismiss"
              >
                <FiX size={14} />
              </button>
            </div>
          )}

          {/* Post type */}
          <div className={styles.typeRow}>
            {POST_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeBtn} ${type === t.value ? styles.typeBtnActive : ""}`}
                  onClick={() => setType(t.value)}
                >
                  <Icon size={12} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <button
                type="button"
                className={styles.attachBtn}
                onClick={() => fileRef.current?.click()}
                title="Add images"
              >
                <FiCamera size={14} />
                <span>Photo</span>
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
                  type="button"
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
                type="button"
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
