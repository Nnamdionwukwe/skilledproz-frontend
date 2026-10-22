// src/hooks/useSupportChat.js
import { useState, useEffect, useRef, useCallback } from "react";
import { createSupportSocket } from "../lib/supportApi";
import { useAuthStore } from "../store/authStore";

export function useSupportChat(initialConversation = null) {
  const { user, accessToken } = useAuthStore();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    // Connect to the /support namespace
    const socket = createSupportSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (conversation?.id) {
        socket.emit("support:join", { conversationId: conversation.id });
      }
    });

    socket.on("disconnect", () => setIsConnected(false));

    // New message received
    socket.on("support:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      // If it's from the other person, mark as read immediately
      if (msg.senderId !== user?.id) {
        socket.emit("support:read", { conversationId: msg.conversationId });
      }
    });

    // Someone is typing
    socket.on("support:typing", ({ isTyping: typing, userId }) => {
      if (userId !== user?.id) setIsTyping(typing);
    });

    // Read receipt received
    socket.on("support:read", ({ byUserId, at }) => {
      if (byUserId !== user?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user?.id ? { ...m, readAt: at } : m)),
        );
      }
    });

    // Chat ended
    socket.on("support:ended", ({ systemMessage }) => {
      setConversation((prev) => ({ ...prev, status: "ENDED" }));
      setMessages((prev) => [...prev, systemMessage]);
    });

    return () => socket.disconnect();
  }, [conversation?.id, accessToken, user?.id]);

  const sendMessage = useCallback(
    (body, attachments = []) => {
      if (!socketRef.current || !conversation?.id) return;

      // Optimistic UI update (shows instantly before server responds)
      const tempId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          body,
          attachments,
          senderType: "USER",
          senderId: user?.id,
          createdAt: new Date().toISOString(),
        },
      ]);

      socketRef.current.emit(
        "support:message",
        { conversationId: conversation.id, body, attachments },
        (ack) => {
          if (ack.ok) {
            // Replace optimistic message with the real one from the server
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? ack.message : m)),
            );
          }
        },
      );
    },
    [conversation?.id, user?.id],
  );

  const setTyping = useCallback(
    (typing) => {
      if (!socketRef.current || !conversation?.id) return;

      // Throttle typing events to avoid spamming the server
      if (typing) {
        clearTimeout(typingTimeoutRef.current);
        socketRef.current.emit("support:typing", {
          conversationId: conversation.id,
          isTyping: true,
        });
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit("support:typing", {
            conversationId: conversation.id,
            isTyping: false,
          });
        }, 2000);
      } else {
        socketRef.current.emit("support:typing", {
          conversationId: conversation.id,
          isTyping: false,
        });
      }
    },
    [conversation?.id],
  );

  return {
    conversation,
    setConversation,
    messages,
    setMessages,
    isConnected,
    isTyping,
    sendMessage,
    setTyping,
  };
}
