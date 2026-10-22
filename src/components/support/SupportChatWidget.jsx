// src/components/support/SupportChatWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiMessageSquare,
  FiX,
  FiPaperclip,
  FiSend,
  FiCornerUpLeft,
} from "react-icons/fi";
import { useSupportChat } from "../../hooks/useSupportChat";
import { supportApi } from "../../lib/supportApi";
import { useSupportStore } from "../../store/supportStore"; // <-- IMPORT STORE
import styles from "./SupportChatWidget.module.css";
import { linkify } from "../../utils/linkify";
import AttachmentPreview from "./AttachmentPreview";

const BTN_SIZE = 56;
const WIDGET_WIDTH = 360;
const WIDGET_HEIGHT = 550;

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);

  // Get the unread count from the global store
  const { unreadCount, setUnreadCount, clearUnread } = useSupportStore();

  const {
    conversation,
    setConversation,
    messages,
    isTyping,
    sendMessage,
    setTyping,
    isConnected,
  } = useSupportChat();

  // ── Draggable Logic ──
  const [btnPos, setBtnPos] = useState(() => {
    const saved = localStorage.getItem("support_btn_pos");
    return saved
      ? JSON.parse(saved)
      : {
          x: window.innerWidth - BTN_SIZE - 24,
          y: window.innerHeight - BTN_SIZE - 24,
        };
  });

  const [winPos, setWinPos] = useState(() => {
    const saved = localStorage.getItem("support_win_pos");
    return saved
      ? JSON.parse(saved)
      : {
          x: window.innerWidth - WIDGET_WIDTH - 24,
          y: window.innerHeight - WIDGET_HEIGHT - 24,
        };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    moved: false,
  });

  useEffect(() => {
    localStorage.setItem("support_btn_pos", JSON.stringify(btnPos));
  }, [btnPos]);
  useEffect(() => {
    localStorage.setItem("support_win_pos", JSON.stringify(winPos));
  }, [winPos]);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const currentPos = isOpen ? winPos : btnPos;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;

    const w = isOpen ? WIDGET_WIDTH : BTN_SIZE;
    const h = isOpen ? WIDGET_HEIGHT : BTN_SIZE;

    const newX = Math.max(
      10,
      Math.min(window.innerWidth - w - 10, dragRef.current.posX + dx),
    );
    const newY = Math.max(
      10,
      Math.min(window.innerHeight - h - 10, dragRef.current.posY + dy),
    );

    if (isOpen) setWinPos({ x: newX, y: newY });
    else setBtnPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (!dragRef.current.moved && !isOpen) {
      const safeX = Math.max(
        20,
        Math.min(btnPos.x, window.innerWidth - WIDGET_WIDTH - 20),
      );
      const safeY = Math.max(
        20,
        Math.min(btnPos.y, window.innerHeight - WIDGET_HEIGHT - 20),
      );
      setWinPos({ x: safeX, y: safeY });
      setIsOpen(true);
    }
  };

  // ── Chat Logic ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Track unread messages when the widget is closed
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (!isOpen && messages.length > prevMessagesLengthRef.current) {
      // If a new message arrived while closed, increment the global store
      const newMessages = messages.slice(prevMessagesLengthRef.current);
      const unreadIncoming = newMessages.filter(
        (m) => m.senderType === "ADMIN",
      ).length;
      if (unreadIncoming > 0) {
        setUnreadCount(unreadCount + unreadIncoming);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isOpen, unreadCount, setUnreadCount]);

  // Clear unread count when opened
  useEffect(() => {
    if (isOpen) {
      clearUnread();
    }
  }, [isOpen, clearUnread]);

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
    if (isOpen && !conversation && !isStarting) handleStartChat();
  }, [isOpen, conversation, isStarting]);

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

  // ── Render Closed State ──
  if (!isOpen) {
    return (
      <button
        className={styles.floatingBtn}
        style={{
          left: `${btnPos.x}px`,
          top: `${btnPos.y}px`,
          right: "auto",
          bottom: "auto",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <FiMessageSquare size={24} />
        {unreadCount > 0 && (
          <span className={styles.floatingBadge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // ── Render Open State ──
  return (
    <div
      className={styles.widgetContainer}
      style={{
        left: `${winPos.x}px`,
        top: `${winPos.y}px`,
        right: "auto",
        bottom: "auto",
      }}
    >
      <div
        className={styles.header}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div>
          <h3>Support Chat</h3>
          <span className={styles.status}>
            {isConnected ? "🟢 Online" : "🔴 Connecting..."}
          </span>
        </div>
        <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
          <FiX size={20} />
        </button>
      </div>

      <div className={styles.messagesArea}>
        {!conversation && isStarting && (
          <div className={styles.emptyState}>Connecting you to an agent...</div>
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
                className={styles.bubble}
                onDoubleClick={() => setReplyTo(msg)}
                title="Double-click to reply"
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
                  {isMe && (msg.isSending ? " ⏳" : msg.readAt ? " ✓✓" : " ✓")}
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
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
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
  );
}
