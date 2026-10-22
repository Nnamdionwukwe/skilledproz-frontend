// src/hooks/useSupportChat.js
import { useState, useEffect, useRef, useCallback } from "react";
import { createSupportSocket } from "../lib/supportApi";
import { useAuthStore } from "../store/authStore";

export function useSupportChat(initialConversation = null) {
  const { user, accessToken } = useAuthStore();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialConversation?.messages || []);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Safely merge historical messages when fetched from the API
  useEffect(() => {
    if (conversation?.messages) {
      setMessages((prevMessages) => {
        // If there are no previous messages (first load), just use the API ones
        if (prevMessages.length === 0) return conversation.messages;

        // Merge: Start with historical, then append any live messages that arrived via WebSocket
        const merged = [...conversation.messages];

        prevMessages.forEach((liveMsg) => {
          // Only append if it doesn't already exist in the historical list
          if (
            !merged.some(
              (m) =>
                m.id === liveMsg.id ||
                (m.tempId && m.tempId === liveMsg.tempId),
            )
          ) {
            merged.push(liveMsg);
          }
        });

        // Sort chronologically to ensure proper order
        return merged.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      });
    }
  }, [conversation]);

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

    socket.on("support:message", (msg) => {
      setMessages((prev) => {
        // 1. Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;

        // 2. Swap optimistic UI message for real DB message
        const existingTempIndex = prev.findIndex(
          (m) => m.tempId && m.tempId === msg.tempId,
        );
        if (existingTempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[existingTempIndex] = msg;
          return newMessages;
        }

        // 3. Append new message from agent
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
    (body, attachments = [], replyTo = null) => {
      if (!socketRef.current || !conversation?.id) return;

      const tempId = `temp-${Date.now()}`;

      // Add optimistic message to UI instantly
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          tempId: tempId,
          body,
          attachments,
          replyTo: replyTo
            ? {
                id: replyTo.id,
                body: replyTo.body,
                senderType: replyTo.senderType,
              }
            : null,
          senderType: "USER",
          senderId: user?.id,
          createdAt: new Date().toISOString(),
          isSending: true,
        },
      ]);

      // Send to backend
      socketRef.current.emit(
        "support:message",
        {
          conversationId: conversation.id,
          body,
          attachments,
          replyToId: replyTo?.id || null,
          tempId,
        },
        (ack) => {
          if (ack.ok) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? ack.message : m)),
            );
          } else {
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
