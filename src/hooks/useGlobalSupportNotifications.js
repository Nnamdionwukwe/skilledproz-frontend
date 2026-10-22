// src/hooks/useGlobalSupportNotifications.js
import { useEffect, useRef } from "react";
import { createSupportSocket, supportApi } from "../lib/supportApi";
import { useAuthStore } from "../store/authStore";
import { useAdminSupportStore } from "../store/adminSupportStore";

export function useGlobalSupportNotifications() {
  const { accessToken, user } = useAuthStore();
  const { setUnreadCount, showBanner } = useAdminSupportStore();
  const socketRef = useRef(null);

  // Play a subtle sound
  const playSound = () => {
    try {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Refresh the unread count in the store
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

  // Initial fetch on mount
  useEffect(() => {
    if (user?.role === "ADMIN") {
      refreshUnreadCount();
    }
  }, [user?.role]);

  // Socket listener
  useEffect(() => {
    if (!accessToken || user?.role !== "ADMIN") return;

    const socket = createSupportSocket(accessToken);
    socketRef.current = socket;

    socket.on("support:inbox:new_message", (data) => {
      showBanner({
        title: data.senderName || "New Chat Message",
        message: data.body || "Sent an attachment",
      });
      playSound();
      refreshUnreadCount();
    });

    socket.on("support:inbox:new_ticket", (data) => {
      showBanner({
        title: `New Ticket: ${data.ticketNumber}`,
        message: data.subject || "User created a new ticket",
      });
      playSound();
      refreshUnreadCount();
    });

    return () => socket.disconnect();
  }, [accessToken, user?.role, showBanner]);

  // Interval Toast Reminder (every 2 minutes)
  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    const interval = setInterval(() => {
      const currentUnread = useAdminSupportStore.getState().unreadCount;
      if (currentUnread > 0) {
        // Trigger a banner reminder
        showBanner({
          title: "Unread Support Messages",
          message: `You have ${currentUnread} unread message(s) waiting.`,
        });
        playSound();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [user?.role, showBanner]);
}
