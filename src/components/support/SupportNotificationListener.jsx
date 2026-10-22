// src/components/support/SupportNotificationListener.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMessageSquare, FiFileText, FiX } from "react-icons/fi";
import { createSupportSocket, supportApi } from "../../lib/supportApi";
import { useAuthStore } from "../../store/authStore";
import { useAdminSupportStore } from "../../store/adminSupportStore";
import styles from "./SupportNotificationListener.module.css";

export default function SupportNotificationListener() {
  const { accessToken, user } = useAuthStore();
  const { setUnreadCount } = useAdminSupportStore();
  const navigate = useNavigate();

  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  // Play a subtle notification sound
  const playSound = () => {
    try {
      // Optional: You can replace this with a real MP3 file
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore autoplay block errors
    } catch (e) {}
  };

  // Refresh the unread count in the global store
  const refreshUnreadCount = async () => {
    try {
      const [chatsRes, ticketsRes] = await Promise.all([
        supportApi.adminListChats(),
        supportApi.adminListTickets(),
      ]);
      const chats = chatsRes.data.chats || [];
      const tickets = ticketsRes.data.tickets || [];

      const chatUnread = chats.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0,
      );
      const ticketUnread = tickets.reduce(
        (sum, t) => sum + (t.unreadCount || 0),
        0,
      );

      setUnreadCount(chatUnread + ticketUnread);
    } catch (err) {}
  };

  const addToast = (toast) => {
    // Avoid duplicate toasts for the same conversation/ticket within 5 seconds
    setToasts((prev) => {
      const exists = prev.find((t) => t.id === toast.id);
      if (exists) return prev;

      const newToast = { ...toast, toastId: Date.now() };
      return [...prev, newToast];
    });

    playSound();
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  useEffect(() => {
    if (!accessToken || user?.role !== "ADMIN") return;

    const socket = createSupportSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Admin Notifier] Connected to support socket");
    });

    // Listen for new chat messages
    socket.on("support:message", async (msg) => {
      // Ignore messages sent by this admin
      if (msg.senderId === user.id) return;

      // Get the conversation details to show the user's name
      try {
        const res = await supportApi.adminGetChat(msg.conversationId);
        const chat = res.data.chat || res.data;

        addToast({
          id: chat.id,
          type: "chat",
          title: `${chat.user?.firstName} ${chat.user?.lastName}`,
          message: msg.body || "Sent an attachment",
          link: "/admin/support", // Navigate to support hub
        });

        refreshUnreadCount();
      } catch (err) {
        // Fallback if fetching details fails
        addToast({
          id: msg.conversationId,
          type: "chat",
          title: "New Chat Message",
          message: msg.body || "Sent an attachment",
          link: "/admin/support",
        });
      }
    });

    // Listen for new inbox notifications (triggered by new tickets or messages when no admin is assigned)
    socket.on("support:inbox:new_message", (data) => {
      // We handle this via the support:message event to get the full text,
      // but this is a good fallback if needed.
      refreshUnreadCount();
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user?.id]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.toastId} className={styles.toastBanner}>
          <div className={styles.toastIcon}>
            {toast.type === "chat" ? (
              <FiMessageSquare size={20} />
            ) : (
              <FiFileText size={20} />
            )}
          </div>

          <div className={styles.toastContent}>
            <p className={styles.toastTitle}>{toast.title}</p>
            <p className={styles.toastMessage}>{toast.message}</p>
          </div>

          <div className={styles.toastActions}>
            <button
              className={styles.viewBtn}
              onClick={() => {
                navigate(toast.link);
                removeToast(toast.toastId);
              }}
            >
              View
            </button>
            <button
              className={styles.closeBtn}
              onClick={() => removeToast(toast.toastId)}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
