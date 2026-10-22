// src/components/support/SupportNotificationListener.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMessageSquare,
  FiFileText,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
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

  const playSound = () => {
    try {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  };

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
    setToasts((prev) => {
      // Prevent duplicate toasts within 10 seconds
      const exists = prev.find(
        (t) => t.id === toast.id && Date.now() - t.toastId < 10000,
      );
      if (exists) return prev;

      // FIX: Generate a guaranteed unique ID to prevent React key collisions
      const uniqueToastId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      return [...prev, { ...toast, toastId: uniqueToastId }];
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

    // 1. Listen for Live Chat Messages
    socket.on("support:inbox:new_message", (data) => {
      addToast({
        id: `chat-${data.conversationId}`,
        type: "chat",
        title: data.senderName || "New Chat Message",
        message: data.body || "Sent an attachment",
        link: "/admin/support",
      });
      refreshUnreadCount();
    });

    // 2. Listen for New Tickets and Ticket Replies
    socket.on("support:inbox:new_ticket", (data) => {
      addToast({
        id: `ticket-${data.ticketId}`,
        type: "ticket",
        title: `New Ticket: ${data.ticketNumber}`,
        message: data.body || data.subject,
        link: "/admin/support",
      });
      refreshUnreadCount();
    });

    socket.on("support:inbox:new_ticket_reply", (data) => {
      addToast({
        id: `ticket-reply-${data.ticketId}`,
        type: "ticket",
        title: `Reply on ${data.ticketNumber}`,
        message: data.body || "User replied",
        link: "/admin/support",
      });
      refreshUnreadCount();
    });

    // 3. REMINDER: Poll for stale (unanswered) messages every 60s
    const checkStale = async () => {
      try {
        const res = await supportApi.getStaleMessages();
        const { staleChats, staleTickets } = res.data.data;

        if (staleChats.length > 0) {
          addToast({
            id: "stale-chats",
            type: "warning",
            title: "Unanswered Chats",
            message: `${staleChats.length} chat(s) have been waiting for a reply.`,
            link: "/admin/support",
          });
        }

        if (staleTickets.length > 0) {
          addToast({
            id: "stale-tickets",
            type: "warning",
            title: "Unanswered Tickets",
            message: `${staleTickets.length} ticket(s) are waiting for a reply.`,
            link: "/admin/support",
          });
        }
      } catch (err) {
        console.error("Failed to check stale messages", err);
      }
    };

    // Run check every 60 seconds (60000 ms)
    const staleInterval = setInterval(checkStale, 60000);

    // Initial check after 5 seconds (give the page time to load)
    const initTimeout = setTimeout(checkStale, 5000);

    return () => {
      socket.disconnect();
      clearInterval(staleInterval);
      clearTimeout(initTimeout);
    };
  }, [accessToken, user?.id]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={`${styles.toastBanner} ${toast.type === "warning" ? styles.warning : ""}`}
        >
          <div className={styles.toastIcon}>
            {toast.type === "warning" ? (
              <FiAlertTriangle size={20} />
            ) : toast.type === "chat" ? (
              <FiMessageSquare size={20} />
            ) : (
              <FiFileText size={20} />
            )}
          </div>

          <div className={styles.toastContent}>
            <p className={styles.toastTitle}>{toast.title}</p>
            <p className={toast.toastMessage}>{toast.message}</p>
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
