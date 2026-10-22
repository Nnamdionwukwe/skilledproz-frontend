// src/pages/support/TicketThread.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSend,
  FiPaperclip,
  FiCheckCircle,
  FiStar,
  FiX,
  FiCornerUpLeft,
  FiAlertTriangle,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import { supportApi } from "../../lib/supportApi";
import styles from "./TicketThread.module.css";
import { linkify } from "../../utils/linkify";
import AttachmentPreview from "../../components/support/AttachmentPreview";

// Simple shimmer block for loading state
const Skeleton = ({ width, height, style }) => (
  <div
    style={{
      width: width || "100%",
      height: height || "20px",
      background: "var(--bg-input)",
      borderRadius: "4px",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
        animation: "shimmer 1.5s infinite",
      }}
    />
  </div>
);

export default function TicketThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const messagesEndRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // Highlight State for Double Tap
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const lastTapRef = useRef(0);

  // Modals & Toasts State
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null });

  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(5);
  const [csatComment, setCsatComment] = useState("");

  // ── Helper: Show Toast ──
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Helper: Double Tap / Double Click ──
  const handleBubbleClick = (msg) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // It's a double tap!
      if (msg.authorType === "SYSTEM") return; // Can't reply to system messages

      setReplyTo(msg);
      setHighlightedMsgId(msg.id);

      // Remove highlight after 1 second
      setTimeout(() => setHighlightedMsgId(null), 1000);
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const fetchTicket = async () => {
    try {
      const res = await supportApi.getTicket(id);
      setTicket(res.data.ticket);
    } catch (err) {
      setError("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim() && files.length === 0) return;
    setIsSending(true);

    try {
      const data = new FormData();
      if (replyBody.trim()) data.append("body", replyBody);
      if (replyTo) data.append("replyToId", replyTo.id);
      files.forEach((f) => data.append("attachments", f));

      const res = await supportApi.replyToTicket(id, data);

      setTicket((prev) => ({
        ...prev,
        status: res.data.ticketStatus || prev.status,
        messages: [...(prev.messages || []), res.data.message],
      }));

      setReplyBody("");
      setFiles([]);
      setReplyTo(null);
      showToast("Reply sent successfully", "success");
    } catch (err) {
      console.error(err);
      if (
        err.response?.status === 400 &&
        err.response?.data?.message?.includes("closed")
      ) {
        showToast("This ticket is closed. Reopen it to reply.", "warning");
      } else {
        showToast(
          err.response?.data?.message || "Failed to send reply",
          "error",
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const executeCloseTicket = async () => {
    setConfirmModal({ open: false, type: null });
    try {
      await supportApi.closeTicket(id);
      fetchTicket();
      showToast("Ticket closed", "success");
    } catch (err) {
      showToast("Failed to close ticket", "error");
    }
  };

  const executeReopenTicket = async () => {
    setConfirmModal({ open: false, type: null });
    try {
      await supportApi.reopenTicket(id);
      fetchTicket();
      showToast("Ticket reopened", "success");
    } catch (err) {
      showToast("Failed to reopen ticket", "error");
    }
  };

  const handleSubmitCsat = async () => {
    try {
      await supportApi.submitTicketCsat(id, {
        rating: csatRating,
        comment: csatComment,
      });
      setShowCsat(false);
      fetchTicket();
      showToast("Thank you for your feedback!", "success");
    } catch (err) {
      showToast("Failed to submit rating", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return <span className={`${styles.badge} ${styles.open}`}>Open</span>;
      case "IN_PROGRESS":
        return (
          <span className={`${styles.badge} ${styles.progress}`}>
            In Progress
          </span>
        );
      case "WAITING_USER":
        return (
          <span className={`${styles.badge} ${styles.waiting}`}>
            Action Needed
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${styles.badge} ${styles.resolved}`}>Resolved</span>
        );
      case "CLOSED":
        return (
          <span className={`${styles.badge} ${styles.closed}`}>Closed</span>
        );
      default:
        return null;
    }
  };

  // SKELETON LOADER
  if (loading) {
    return (
      <Layout>
        <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        <div className={styles.container}>
          <div className={styles.header}>
            <Skeleton
              width="100px"
              height="20px"
              style={{ marginBottom: "1rem" }}
            />
            <div className={styles.headerMain}>
              <div>
                <Skeleton
                  width="300px"
                  height="30px"
                  style={{ marginBottom: "0.5rem" }}
                />
                <Skeleton width="200px" height="16px" />
              </div>
              <Skeleton width="100px" height="40px" />
            </div>
          </div>
          <div className={styles.threadContainer}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: i % 2 === 0 ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                <Skeleton
                  width="60%"
                  height="80px"
                  style={{ borderRadius: "12px" }}
                />
              </div>
            ))}
          </div>
          <Skeleton
            width="100%"
            height="120px"
            style={{ borderRadius: "12px" }}
          />
        </div>
      </Layout>
    );
  }

  if (error)
    return (
      <Layout>
        <div className={styles.error}>{error}</div>
      </Layout>
    );
  if (!ticket) return null;

  const isClosed = ["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <Layout>
      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.type === "success" && <FiCheckCircle size={16} />}
          {toast.type === "error" && <FiAlertTriangle size={16} />}
          {toast.type === "warning" && <FiAlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal.open && (
        <div
          className={styles.modalOverlay}
          onClick={() => setConfirmModal({ open: false, type: null })}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {confirmModal.type === "close"
                ? "Close Ticket?"
                : "Reopen Ticket?"}
            </h3>
            <p className={styles.modalMessage}>
              {confirmModal.type === "close"
                ? "Are you sure you want to close this ticket? You won't be able to reply until it's reopened."
                : "Are you sure you want to reopen this ticket? This will notify support."}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmModal({ open: false, type: null })}
              >
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={
                  confirmModal.type === "close"
                    ? executeCloseTicket
                    : executeReopenTicket
                }
              >
                {confirmModal.type === "close"
                  ? "Close Ticket"
                  : "Reopen Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.container}>
        {/* ── Fixed Header ── */}
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/support")}
          >
            <FiArrowLeft /> Back to Hub
          </button>

          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              <h1>{ticket.subject}</h1>
              {getStatusBadge(ticket.status)}
            </div>
            <div className={styles.metaRow}>
              <span>Ticket {ticket.ticketNumber}</span>
              <span className={styles.dot}>•</span>
              <span>{ticket.category.replace("_", " ")}</span>
              <span className={styles.dot}>•</span>
              <span>
                Opened {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            {!isClosed ? (
              <button
                className={styles.closeBtn}
                onClick={() => setConfirmModal({ open: true, type: "close" })}
              >
                Close Ticket
              </button>
            ) : (
              <button
                className={styles.reopenBtn}
                onClick={() => setConfirmModal({ open: true, type: "reopen" })}
              >
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable Thread ── */}
        <div className={styles.threadContainer}>
          {ticket.messages.map((msg, idx) => {
            const isMe = msg.authorType === "USER";
            const isSystem = msg.authorType === "SYSTEM";

            if (isSystem)
              return (
                <div key={idx} className={styles.systemMessage}>
                  {msg.body}
                </div>
              );

            return (
              <div
                key={idx}
                className={`${styles.messageWrapper} ${isMe ? styles.myMessage : styles.theirMessage}`}
              >
                <div className={styles.messageAvatar}>
                  {isMe ? "You" : "Support"}
                </div>
                <div className={styles.messageContent}>
                  <div
                    className={`${styles.messageBubble} ${highlightedMsgId === msg.id ? styles.highlighted : ""}`}
                    onClick={() => handleBubbleClick(msg)}
                    title="Double-tap to reply"
                  >
                    {msg.replyTo && (
                      <div className={styles.replyPreview}>
                        <FiCornerUpLeft size={12} />
                        <span>{msg.replyTo.body || "Attachment"}</span>
                      </div>
                    )}
                    <p>{linkify(msg.body)}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <AttachmentPreview
                        attachments={msg.attachments}
                        isMe={isMe}
                      />
                    )}
                  </div>
                  <span className={styles.messageTime}>
                    {new Date(msg.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Fixed Input / Banners ── */}
        {ticket.status === "RESOLVED" && !ticket.csatRating && !showCsat && (
          <div className={styles.csatBanner}>
            <p>This ticket was marked as resolved. How did we do?</p>
            <button onClick={() => setShowCsat(true)}>Rate Support</button>
          </div>
        )}

        {showCsat ? (
          <div className={styles.csatForm}>
            <h3>Rate your support experience</h3>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setCsatRating(star)}
                  className={
                    csatRating >= star ? styles.starActive : styles.starInactive
                  }
                >
                  <FiStar
                    fill={csatRating >= star ? "currentColor" : "none"}
                    size={24}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Any additional comments? (Optional)"
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
            />
            <div className={styles.csatActions}>
              <button onClick={() => setShowCsat(false)}>Cancel</button>
              <button onClick={handleSubmitCsat}>Submit Rating</button>
            </div>
          </div>
        ) : isClosed ? (
          <div className={styles.closedBanner}>
            <FiCheckCircle size={20} />
            <span>
              This ticket is {ticket.status.toLowerCase()}. Reopen it to reply.
            </span>
          </div>
        ) : (
          <div className={styles.replyBox}>
            {replyTo && (
              <div className={styles.replyHeader}>
                <div className={styles.replyHeaderText}>
                  <span>
                    Replying to{" "}
                    {replyTo.authorType === "USER" ? "yourself" : "Support"}
                  </span>
                  <p>{replyTo.body || "Attachment"}</p>
                </div>
                <button onClick={() => setReplyTo(null)}>
                  <FiX size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleReply} className={styles.inputArea}>
              <label className={styles.attachBtn}>
                <FiPaperclip size={18} />
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  hidden
                />
              </label>
              <input
                type="text"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type a reply..."
                disabled={isSending}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={
                  isSending || (!replyBody.trim() && files.length === 0)
                }
              >
                {isSending ? "⏳" : <FiSend size={18} />}
              </button>
            </form>

            {files.length > 0 && (
              <div className={styles.filePreviews}>
                {files.map((f, i) => (
                  <div key={i} className={styles.fileChip}>
                    <span>{f.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(files.filter((_, idx) => idx !== i))
                      }
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
