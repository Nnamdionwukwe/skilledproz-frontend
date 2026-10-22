// src/pages/support/SupportChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiPaperclip, FiX, FiCornerUpLeft } from "react-icons/fi"; // Removed FiMessageSquare as it's not in the widget header
import { useSupportChat } from "../../hooks/useSupportChat";
import { supportApi } from "../../lib/supportApi";
import { useAuthStore } from "../../store/authStore";
import WorkerLayout from "../../components/layout/WorkerLayout";
import HirerLayout from "../../components/layout/HirerLayout";
import { linkify } from "../../utils/linkify";
import AttachmentPreview from "../../components/support/AttachmentPreview";
import styles from "./SupportChat.module.css";

export default function SupportChat() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [inputText, setInputText] = useState("");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);

  // Highlight State for Double Tap
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const lastTapRef = useRef(0);

  const {
    conversation,
    setConversation,
    messages,
    isTyping,
    sendMessage,
    setTyping,
    isConnected,
  } = useSupportChat();

  // ── Double Tap Logic ──
  const handleBubbleClick = (msg) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (msg.senderType === "SYSTEM") return;

      setReplyTo(msg);
      setHighlightedMsgId(msg.id);
      setTimeout(() => setHighlightedMsgId(null), 1000);
    }
    lastTapRef.current = now;
  };

  // ── Chat Logic ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleStartChat = async () => {
    setIsStarting(true);
    try {
      const res = await supportApi.startChat({});
      setConversation(res.data.conversation);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!conversation && !isStarting) handleStartChat();
  }, [conversation, isStarting]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (
      (!inputText.trim() && files.length === 0) ||
      conversation?.status === "ENDED"
    )
      return;

    setIsUploading(true);
    let uploadedAttachments = [];

    try {
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("attachments", f));
        const uploadRes = await supportApi.uploadChatAttachments(formData);
        uploadedAttachments = uploadRes.data.attachments || [];
      }

      sendMessage(inputText.trim(), uploadedAttachments, replyTo);
      setInputText("");
      setFiles([]);
      setReplyTo(null);
      setTyping(false);
    } catch (err) {
      console.error(err);
      alert("Failed to upload attachment. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    setTyping(true);
  };

  return (
    <Layout>
      <div className={styles.page}>
        {/* Exact Header from Widget */}
        <div className={styles.header}>
          <div>
            <h3>Support Chat</h3>
            <span className={styles.status}>
              {isConnected ? "🟢 Online" : "🔴 Connecting..."}
            </span>
          </div>
        </div>

        <div className={styles.chatContainer}>
          <div className={styles.messagesArea}>
            {!conversation && isStarting && (
              <div className={styles.emptyState}>
                Connecting you to an agent...
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderType === "USER";
              const isSystem = msg.senderType === "SYSTEM";

              if (isSystem)
                return (
                  <div key={msg.id} className={styles.systemMsg}>
                    {msg.body}
                  </div>
                );

              return (
                <div
                  key={msg.id}
                  className={`${styles.messageRow} ${isMe ? styles.myMsg : styles.theirMsg}`}
                >
                  <div
                    className={`${styles.bubble} ${highlightedMsgId === msg.id ? styles.highlighted : ""}`}
                    onClick={() => handleBubbleClick(msg)}
                    title="Double-tap to reply"
                  >
                    {msg.replyTo && (
                      <div className={styles.replyPreview}>
                        <FiCornerUpLeft size={12} />
                        <span>{msg.replyTo.body || "Attachment"}</span>
                      </div>
                    )}
                    {msg.body && <p>{linkify(msg.body)}</p>}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <AttachmentPreview
                        attachments={msg.attachments}
                        isMe={isMe}
                      />
                    )}
                    <span className={styles.time}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMe &&
                        (msg.isSending ? " ⏳" : msg.readAt ? " ✓✓" : " ✓")}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className={styles.typingIndicator}>Agent is typing...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.replyBoxWrap}>
            <div className={styles.hintText}>
              <FiCornerUpLeft size={12} /> double-tap a message to reply
            </div>

            {replyTo && (
              <div className={styles.replyHeader}>
                <div className={styles.replyHeaderText}>
                  <span>
                    Replying to{" "}
                    {replyTo.senderType === "USER" ? "yourself" : "Agent"}
                  </span>
                  <p>{replyTo.body || "Attachment"}</p>
                </div>
                <button onClick={() => setReplyTo(null)}>
                  <FiX size={14} />
                </button>
              </div>
            )}

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

            <form onSubmit={handleSend} className={styles.inputArea}>
              <label className={styles.attachBtn} title="Attach file">
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
                value={inputText}
                onChange={handleTyping}
                placeholder={
                  conversation?.status === "ENDED"
                    ? "Chat ended."
                    : "Type a message..."
                }
                disabled={conversation?.status === "ENDED" || isUploading}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={
                  (!inputText.trim() && files.length === 0) ||
                  conversation?.status === "ENDED" ||
                  isUploading
                }
              >
                {isUploading ? "⏳" : <FiSend size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
