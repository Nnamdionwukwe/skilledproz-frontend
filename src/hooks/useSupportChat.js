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

    const socket = createSupportSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (conversation?.id) {
        socket.emit("support:join", { conversationId: conversation.id });
      }
    });

    socket.on("disconnect", () => setIsConnected(false));

    // New message received (either from us or the agent)
    socket.on("support:message", (msg) => {
      setMessages((prev) => {
        // 1. If the message ID is ALREADY in the list, ignore it (prevents duplicate echo)
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }

        // 2. If the message has a tempId matching an optimistic message, replace it
        // (This happens if the ack fails but the socket delivers the message)
        const existingTempIndex = prev.findIndex((m) => m.id === msg.tempId);
        if (existingTempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[existingTempIndex] = msg;
          return newMessages;
        }

        // 3. Otherwise, it's a brand new message
        if (msg.senderId !== user?.id) {
          socket.emit("support:read", { conversationId: msg.conversationId });
        }

        return [...prev, msg];
      });
    });

    socket.on("support:typing", ({ isTyping: typing, userId }) => {
      if (userId !== user?.id) setIsTyping(typing);
    });

    socket.on("support:read", ({ byUserId, at }) => {
      if (byUserId !== user?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user?.id ? { ...m, readAt: at } : m)),
        );
      }
    });

    socket.on("support:ended", ({ systemMessage }) => {
      setConversation((prev) => ({ ...prev, status: "ENDED" }));
      setMessages((prev) => [...prev, systemMessage]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversation?.id, accessToken, user?.id]);

  const sendMessage = useCallback(
    (body, attachments = []) => {
      if (!socketRef.current || !conversation?.id) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. Instantly add to UI with a temporary ID
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          tempId: tempId, // We save this so we can match it later
          body,
          attachments,
          senderType: "USER",
          senderId: user?.id,
          createdAt: new Date().toISOString(),
          isSending: true,
        },
      ]);

      // 2. Send to server
      socketRef.current.emit(
        "support:message",
        { conversationId: conversation.id, body, attachments, tempId },
        (ack) => {
          if (ack.ok) {
            // 3. The server successfully saved it. Replace the temp message with the real one.
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === tempId) {
                  // Keep the tempId reference on the real message so the socket listener can find it
                  return { ...ack.message, tempId };
                }
                return m;
              }),
            );
          } else {
            // Handle error (e.g., mark the message as failed)
            console.error("Failed to send message", ack.error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, isFailed: true, isSending: false }
                  : m,
              ),
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
