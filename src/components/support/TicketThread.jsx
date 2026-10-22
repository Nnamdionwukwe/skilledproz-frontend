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
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import { supportApi } from "../../lib/supportApi";
import styles from "./TicketThread.module.css";

export default function TicketThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const messagesEndRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reply state
  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // CSAT state
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
      setError(
        "Failed to load ticket. It may not exist or you don't have access.",
      );
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
      files.forEach((f) => data.append("attachments", f));

      const res = await supportApi.replyToTicket(id, data);

      setTicket((prev) => ({
        ...prev,
        status: res.data.ticketStatus || prev.status,
        messages: [...prev.messages, res.data.message],
      }));

      setReplyBody("");
      setFiles([]);
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
      alert("Failed to close ticket.");
    }
  };

  const handleReopenTicket = async () => {
    try {
      await supportApi.reopenTicket(id);
      fetchTicket();
    } catch (err) {
      alert("Failed to reopen ticket.");
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
      alert("Failed to submit rating.");
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

  if (loading)
    return (
      <Layout>
        <div className={styles.loading}>Loading ticket...</div>
      </Layout>
    );
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
        {/* ── Header ── */}
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

        {/* ── Messages Thread ── */}
        <div className={styles.threadContainer}>
          {ticket.messages.map((msg, idx) => {
            const isMe = msg.authorType === "USER";
            const isSystem = msg.authorType === "SYSTEM";

            if (isSystem) {
              return (
                <div key={idx} className={styles.systemMessage}>
                  {msg.body}
                </div>
              );
            }

            return (
              <div
                key={idx}
                className={`${styles.messageWrapper} ${isMe ? styles.myMessage : styles.theirMessage}`}
              >
                <div className={styles.messageAvatar}>
                  {isMe ? "You" : "Support"}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageBubble}>
                    <p>{msg.body}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.attachmentLink}
                          >
                            <FiPaperclip size={14} /> {att.name}
                          </a>
                        ))}
                      </div>
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

        {/* ── Reply Area / CSAT ── */}
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
          <form onSubmit={handleReply} className={styles.replyBox}>
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
        )}
      </div>
    </Layout>
  );
}
