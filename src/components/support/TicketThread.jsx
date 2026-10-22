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

  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(5);
  const [csatComment, setCsatComment] = useState("");

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
        messages: [...prev.messages, res.data.message],
      }));

      setReplyBody("");
      setFiles([]);
      setReplyTo(null);
    } catch (err) {
      alert("Failed to send reply.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm("Are you sure you want to close this ticket?")) return;
    try {
      await supportApi.closeTicket(id);
      fetchTicket();
    } catch (err) {
      alert("Failed.");
    }
  };
  const handleReopenTicket = async () => {
    try {
      await supportApi.reopenTicket(id);
      fetchTicket();
    } catch (err) {
      alert("Failed.");
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
    } catch (err) {
      alert("Failed.");
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
      <div className={styles.container}>
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
              <button className={styles.closeBtn} onClick={handleCloseTicket}>
                Close Ticket
              </button>
            ) : (
              <button className={styles.reopenBtn} onClick={handleReopenTicket}>
                Reopen
              </button>
            )}
          </div>
        </div>

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
                    className={styles.messageBubble}
                    onDoubleClick={() => setReplyTo(msg)}
                    title="Double-click to reply"
                  >
                    {msg.replyTo && (
                      <div className={styles.replyPreview}>
                        <FiCornerUpLeft size={12} />
                        <span>{msg.replyTo.body || "Attachment"}</span>
                      </div>
                    )}
                    <p>{linkify(msg.body)}</p>

                    {/* Attachment Render */}
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
            <form onSubmit={handleReply}>
              <div className={styles.replyInputWrap}>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={3}
                />
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
              <div className={styles.replyActions}>
                <label className={styles.attachLabel}>
                  <FiPaperclip size={18} />
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    hidden
                  />
                </label>
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={
                    isSending || (!replyBody.trim() && files.length === 0)
                  }
                >
                  {isSending ? (
                    "Sending..."
                  ) : (
                    <>
                      <FiSend size={18} /> Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
