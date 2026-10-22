// src/components/support/AttachmentPreview.jsx
import React, { useState } from "react";
import { FiFileText, FiVideo, FiX, FiDownload } from "react-icons/fi";
import styles from "./AttachmentPreview.module.css";

export default function AttachmentPreview({ attachments, isMe }) {
  const [activeMedia, setActiveMedia] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div
        className={`${styles.attachmentsGrid} ${isMe ? styles.myAttachments : ""}`}
      >
        {attachments.map((att, i) => {
          // 1. IMAGE
          if (att.type === "IMAGE") {
            return (
              <div
                key={i}
                className={styles.imageThumb}
                onClick={() => setActiveMedia(att)}
              >
                <img src={att.url} alt={att.name} loading="lazy" />
              </div>
            );
          }

          // 2. VIDEO
          if (att.type === "VIDEO") {
            return (
              <div
                key={i}
                className={styles.videoThumb}
                onClick={() => setActiveMedia(att)}
              >
                {att.thumbnailUrl ? (
                  <img src={att.thumbnailUrl} alt={att.name} />
                ) : (
                  <div className={styles.iconPlaceholder}>
                    <FiVideo size={24} />
                  </div>
                )}
                <div className={styles.playIcon}>▶</div>
              </div>
            );
          }

          // 3. PDF / OTHER DOCUMENTS
          return (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docCard}
            >
              <div className={styles.docIcon}>
                <FiFileText size={20} />
              </div>
              <div className={styles.docInfo}>
                <span className={styles.docName}>{att.name}</span>
                <span className={styles.docSize}>
                  {att.size
                    ? `${(att.size / 1024 / 1024).toFixed(2)} MB`
                    : "PDF"}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Full Screen Lightbox ── */}
      {activeMedia && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setActiveMedia(null)}
        >
          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxHeader}>
              <span className={styles.lightboxTitle}>{activeMedia.name}</span>
              <div className={styles.lightboxActions}>
                <a
                  href={activeMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                >
                  <FiDownload size={20} />
                </a>
                <button
                  onClick={() => setActiveMedia(null)}
                  title="Close"
                  aria-label="Close media"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className={styles.lightboxBody}>
              {activeMedia.type === "IMAGE" && (
                <img src={activeMedia.url} alt={activeMedia.name} />
              )}
              {activeMedia.type === "VIDEO" && (
                <video src={activeMedia.url} controls autoPlay />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
