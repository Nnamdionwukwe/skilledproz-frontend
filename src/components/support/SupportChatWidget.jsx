// src/components/support/SupportChatWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiMessageSquare, FiX, FiPaperclip, FiSend } from "react-icons/fi";
import { useSupportChat } from "../../hooks/useSupportChat";
import { supportApi } from "../../lib/supportApi";
import styles from "./SupportChatWidget.module.css";

const WIDGET_WIDTH = 360;
const WIDGET_HEIGHT = 550;
const BTN_SIZE = 56;

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const messagesEndRef = useRef(null);

  const {
    conversation,
    setConversation,
    messages,
    isTyping,
    sendMessage,
    setTyping,
    isConnected,
  } = useSupportChat();

  // ── Draggable Logic State ──
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("support_widget_pos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Default: Bottom right
    return {
      x: window.innerWidth - BTN_SIZE - 24,
      y: window.innerHeight - BTN_SIZE - 24,
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

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem("support_widget_pos", JSON.stringify(position));
  }, [position]);

  // ── Drag Handlers ──
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    e.target.setPointerCapture(e.pointerId);

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.moved = true;
    }

    // Clamp to screen bounds (using button size)
    const newX = Math.max(
      10,
      Math.min(window.innerWidth - BTN_SIZE - 10, dragRef.current.posX + dx),
    );
    const newY = Math.max(
      10,
      Math.min(window.innerHeight - BTN_SIZE - 10, dragRef.current.posY + dy),
    );

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    if (!dragRef.current.moved && !isOpen) {
      // If we are opening the chat, ensure the top-left of the window isn't off-screen
      // We want to keep it near the button, but pull it in if it overflows the viewport.
      const safeX = Math.min(position.x, window.innerWidth - WIDGET_WIDTH - 20);
      const safeY = Math.min(
        position.y,
        window.innerHeight - WIDGET_HEIGHT - 20,
      );

      setPosition({
        x: Math.max(20, safeX),
        y: Math.max(20, safeY),
      });

      setIsOpen(true);
    }
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
    if (isOpen && !conversation && !isStarting) {
      handleStartChat();
    }
  }, [isOpen, conversation, isStarting]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || conversation?.status === "ENDED") return;
    sendMessage(inputText.trim());
    setInputText("");
    setTyping(false);
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    setTyping(true);
  };

  // ── Render ──

  if (!isOpen) {
    return (
      <button
        className={styles.floatingBtn}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <FiMessageSquare size={24} />
      </button>
    );
  }

  return (
    <div
      className={styles.widgetContainer}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
        bottom: "auto",
      }}
    >
      <div className={styles.header}>
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

        {messages.map((msg, idx) => {
          const isMe = msg.senderType === "USER";
          const isSystem = msg.senderType === "SYSTEM";

          if (isSystem) {
            return (
              <div key={idx} className={styles.systemMsg}>
                {msg.body}
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`${styles.messageRow} ${isMe ? styles.myMsg : styles.theirMsg}`}
            >
              <div className={styles.bubble}>
                {msg.body && <p>{msg.body}</p>}
                <span className={styles.time}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe && msg.readAt && " ✓✓"}
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

      <form onSubmit={handleSend} className={styles.inputArea}>
        <button type="button" className={styles.attachBtn}>
          <FiPaperclip size={18} />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={handleTyping}
          placeholder={
            conversation?.status === "ENDED"
              ? "Chat ended."
              : "Type a message..."
          }
          disabled={conversation?.status === "ENDED"}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!inputText.trim() || conversation?.status === "ENDED"}
        >
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
}
