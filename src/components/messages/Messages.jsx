import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Messages.module.css";
import {
  FiSearch,
  FiMessageSquare,
  FiSmile,
  FiPaperclip,
  FiSend,
  FiGlobe,
  FiX,
  FiArrowLeft,
  FiChevronDown,
  FiVideo,
  FiPhone,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";
import VoiceCallPanel from "../video/VoiceCallPanel";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ur", label: "Urdu" },
  { code: "tr", label: "Turkish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function Avatar({ user, size = "md" }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.firstName || ""} />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMessageTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── URL detection + linkification ─────────────────────────────────────────

const URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s<>()"']+[^\s<>()"'.,;:!?]|\b(?:call|api|app)\.skilledproz\.com\/[^\s<>()"',;!?]+)/gi;

function linkify(text) {
  if (!text || typeof text !== "string") return text;

  if (!/https?:\/\/|www\.|\.skilledproz\.com/i.test(text)) {
    return text;
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const start = match.index;
    const end = URL_REGEX.lastIndex;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    let url = match[0];
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    parts.push(
      <a
        key={`url-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.messageLink}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

// ─── WhatsApp-style double tick ─────────────────────────────────────────────

function DoubleTick({ read }) {
  return (
    <svg
      className={`${styles.readTick} ${
        read ? styles.tickRead : styles.tickUnread
      }`}
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1 5.5L4.5 9L10 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.5L9.5 9L15 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Translate button ───────────────────────────────────────────────────────

function TranslateButton({ text }) {
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function translate(langCode) {
    setShowPicker(false);
    setLoading(true);

    tracker.action("messages.translate.attempt", {
      targetLang: langCode,
      textLength: text?.length || 0,
    });

    try {
      const res = await api.post("/translate", {
        text,
        targetLang: langCode,
      });
      setTranslated(res.data.data.translated);

      tracker.action("messages.translate.success", {
        targetLang: langCode,
      });
    } catch {
      setTranslated("Translation failed.");

      tracker.action("messages.translate.failed", {
        targetLang: langCode,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.translateWrap}>
      {translated ? (
        <div className={styles.translatedText}>
          <span className={styles.translatedLabel}>Translated:</span>
          <span>{translated}</span>
          <button
            className={styles.translateDismiss}
            onClick={() => {
              setTranslated(null);
              tracker.track("messages.translate.dismissed");
            }}
            type="button"
            aria-label="Dismiss translation"
            data-track-id="messages.translate.dismiss"
          >
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <div className={styles.translateRelative}>
          <button
            className={styles.translateBtn}
            onClick={() => {
              setShowPicker((v) => !v);
              tracker.track("messages.translate.picker.toggled");
            }}
            disabled={loading}
            title="Translate message"
            type="button"
            aria-label="Translate message"
            data-track-id="messages.translate.open"
          >
            {loading ? "…" : <FiGlobe size={14} />}
          </button>
          {showPicker && (
            <div className={styles.langPicker}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={styles.langOption}
                  onClick={() => translate(l.code)}
                  type="button"
                  data-track-id={`messages.translate.lang.${l.code}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  // ── Initial URL state ──
  const initialConvoId = searchParams.get("convo");
  const initialWithId = searchParams.get("with");
  const initialDraft = searchParams.get("draft");

  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(initialConvoId || null);
  const [withUserId, setWithUserId] = useState(initialWithId || null);
  const [withUser, setWithUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(null);
  const [newMessage, setNewMessage] = useState(initialDraft || "");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [startingVoiceCall, setStartingVoiceCall] = useState(false);

  // ── Mobile view: "list" or "chat" ──
  const [mobileView, setMobileView] = useState(() => {
    if (typeof window === "undefined") return "list";
    const hasChatTarget = initialConvoId || initialWithId;
    return window.innerWidth <= 768 && hasChatTarget ? "chat" : "list";
  });

  // ── Jump-to-bottom state — visible only when the user scrolls up ──
  const [showJumpButton, setShowJumpButton] = useState(false);

  // ── Fullscreen image viewer ──
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // ── Refs ──
  const bottomRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const msgPollRef = useRef(null);
  const convoPollRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const justSentRef = useRef(false);
  const initialLoadRef = useRef(true);
  const lastSeenMessageIdRef = useRef(null);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.messages.view", {
      role: user?.role || "GUEST",
      cameWithConvoId: !!initialConvoId,
      cameWithUserId: !!initialWithId,
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll handler — drives the jump button visibility only ──
  const handleMessagesScroll = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const distanceFromBottom = Math.max(
      0,
      el.scrollHeight - el.scrollTop - el.clientHeight,
    );
    const nearBottom = distanceFromBottom < 100;
    isAtBottomRef.current = nearBottom;
    setShowJumpButton(!nearBottom);
  }, []);

  // ── Detect new incoming messages ──
  useEffect(() => {
    if (messages.length === 0) {
      lastSeenMessageIdRef.current = null;
      return;
    }

    const newestId = messages[messages.length - 1]?.id;
    const isNew = newestId && newestId !== lastSeenMessageIdRef.current;
    if (!isNew) return;

    if (initialLoadRef.current) {
      lastSeenMessageIdRef.current = newestId;
      initialLoadRef.current = false;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return;
    }

    if (justSentRef.current) {
      lastSeenMessageIdRef.current = newestId;
      justSentRef.current = false;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }

    lastSeenMessageIdRef.current = newestId;
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);

  // ── Optimistic bubble → scroll to show it ──
  useEffect(() => {
    if (sendingMessage) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [sendingMessage]);

  // ── Reset per-conversation state ──
  useEffect(() => {
    initialLoadRef.current = true;
    lastSeenMessageIdRef.current = null;
    isAtBottomRef.current = true;
    setShowJumpButton(false);
  }, [activeConvoId]);

  // ── Jump-to-bottom handler ──
  const handleJumpToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    isAtBottomRef.current = true;
    setShowJumpButton(false);

    tracker.track("messages.jumpToBottom.clicked", {
      conversationId: activeConvoId,
    });
  }, [activeConvoId]);

  // ── Auto-switch to "chat" view on mobile whenever a chat is active ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 768 && (activeConvoId || withUserId || withUser)) {
      setMobileView("chat");
    }
  }, [activeConvoId, withUserId, withUser]);

  // ── Escape closes the fullscreen image viewer ──
  useEffect(() => {
    if (!lightboxSrc) return;
    function onKey(e) {
      if (e.key === "Escape") {
        setLightboxSrc(null);
        tracker.track("messages.lightbox.closed", { via: "escape" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  // ─────────────────────────────────────────────────────────────────────────
  // Conversations
  // ─────────────────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get("/messages/conversations", {
        params: { page: 1, limit: 50, _t: Date.now() },
      });
      const fresh = res.data.data.conversations || [];
      setConversations(fresh);
      return fresh;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setLoadingConvos(false));
  }, [loadConversations]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle ?with=<userId>
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!withUserId) {
      setWithUser(null);
      return;
    }

    const existing = conversations.find((c) =>
      c.users?.some((u) => u.userId === withUserId),
    );
    if (existing) {
      setActiveConvoId(existing.id);
      setWithUserId(null);
      const next = { convo: existing.id };
      if (initialDraft) next.draft = initialDraft;
      setSearchParams(next, { replace: true });
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      try {
        const res = await api.get(`/users/${withUserId}`);
        if (cancelled) return;

        const u =
          res.data.data?.user ||
          res.data.data?.profile?.user ||
          res.data.data?.profile ||
          res.data.data;

        if (u?.id) setWithUser(u);
        else setWithUser(null);
      } catch {
        if (!cancelled) setWithUser(null);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [withUserId, conversations, setSearchParams]);

  // ── Consume the initial draft ──
  useEffect(() => {
    if (!initialDraft) return;
    const next = new URLSearchParams(searchParams);
    next.delete("draft");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load messages for the active conversation
  // ─────────────────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convoId, silent = false) => {
    if (!convoId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${convoId}`, {
        params: { page: 1, limit: 100, _t: Date.now() },
      });
      setMessages(res.data.data.messages || []);
    } catch {
      if (!silent) setMessages([]);
    }
    if (!silent) setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }

    const convo = conversations.find((c) => c.id === activeConvoId);
    const other = convo?.users?.find((u) => u.userId !== user?.id)?.user;
    tracker.track("messages.conversation.opened", {
      conversationId: activeConvoId,
      hasBooking: !!convo?.booking,
      otherRole: other?.role || null,
    });

    loadMessages(activeConvoId);
    api.patch(`/messages/${activeConvoId}/read`).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvoId ? { ...c, unreadCount: 0 } : c)),
    );

    clearInterval(msgPollRef.current);
    msgPollRef.current = setInterval(() => {
      loadMessages(activeConvoId, true);
    }, 3000);

    clearInterval(convoPollRef.current);
    convoPollRef.current = setInterval(() => {
      loadConversations();
    }, 12000);

    return () => {
      clearInterval(msgPollRef.current);
      clearInterval(convoPollRef.current);
    };
  }, [activeConvoId, loadMessages, loadConversations]);

  // ── URL sync ──
  useEffect(() => {
    if (activeConvoId) {
      setSearchParams({ convo: activeConvoId }, { replace: true });
    }
  }, [activeConvoId, setSearchParams]);

  // ─────────────────────────────────────────────────────────────────────────
  // Selection / navigation
  // ─────────────────────────────────────────────────────────────────────────

  const selectConversation = (convoId) => {
    setActiveConvoId(convoId);
    setWithUserId(null);
    setWithUser(null);
    setMobileView("chat");
    isAtBottomRef.current = true;
    initialLoadRef.current = true;
    lastSeenMessageIdRef.current = null;
    setShowJumpButton(false);

    tracker.action("messages.conversation.selected", {
      conversationId: convoId,
    });
  };

  const handleMobileBack = () => {
    setMobileView("list");
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSearchParams({}, { replace: true });
      setActiveConvoId(null);
      setWithUserId(null);
      setWithUser(null);
    }
  };

  const getOtherUser = (convo) =>
    convo.users?.find((u) => u.userId !== user?.id)?.user;

  // ─────────────────────────────────────────────────────────────────────────
  // Send
  // ─────────────────────────────────────────────────────────────────────────

  const resolveReceiver = () => {
    if (activeConvoId) {
      const activeConvo = conversations.find((c) => c.id === activeConvoId);
      const other = activeConvo?.users?.find(
        (u) => u.userId !== user?.id,
      )?.user;
      if (other?.id) return other.id;
    }
    if (withUserId) return withUserId;
    if (withUser?.id) return withUser.id;
    return null;
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    const receiverId = resolveReceiver();
    if (!receiverId) return;

    tracker.action("messages.send.attempt", {
      conversationId: activeConvoId || null,
      contentLength: content.length,
      isNewConversation: !activeConvoId,
    });

    const tempId = `temp-${Date.now()}`;
    setSendingMessage({
      id: tempId,
      senderId: user?.id,
      receiverId,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    });
    setNewMessage("");
    setSending(true);

    try {
      const res = await api.post("/messages", {
        receiverId,
        content,
        conversationId: activeConvoId || undefined,
      });
      const { message, conversationId } = res.data.data;

      setSendingMessage(null);

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        setWithUserId(null);
        setWithUser(null);
        isAtBottomRef.current = true;
        const fresh = await loadConversations();
        const newConvo = fresh.find((c) => c.id === conversationId);
        if (newConvo) loadMessages(conversationId);
      } else {
        justSentRef.current = true;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvoId
              ? {
                  ...c,
                  messages: [message],
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        );
      }

      tracker.action("messages.sent", {
        conversationId: conversationId || activeConvoId,
        messageId: message.id,
        contentLength: content.length,
        isNewConversation: !activeConvoId,
      });
    } catch (err) {
      setSendingMessage(null);

      tracker.action("messages.send.failed", {
        conversationId: activeConvoId || null,
        contentLength: content.length,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const receiverId = resolveReceiver();
    if (!receiverId) return;

    tracker.action("messages.file.upload.attempt", {
      conversationId: activeConvoId || null,
      fileName: file.name,
      fileType: file.type,
      fileSizeKB: Math.round(file.size / 1024),
    });

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("receiverId", receiverId);
      formData.append("content", file.name);
      if (activeConvoId) formData.append("conversationId", activeConvoId);

      const res = await api.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { message, conversationId } = res.data.data;

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        setWithUserId(null);
        setWithUser(null);
        isAtBottomRef.current = true;
        const fresh = await loadConversations();
        const newConvo = fresh.find((c) => c.id === conversationId);
        if (newConvo) loadMessages(conversationId);
      } else {
        justSentRef.current = true;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      tracker.action("messages.file.uploaded", {
        conversationId: conversationId || activeConvoId,
        messageId: message.id,
        fileType: file.type,
        fileSizeKB: Math.round(file.size / 1024),
      });
    } catch (err) {
      tracker.action("messages.file.upload.failed", {
        conversationId: activeConvoId || null,
        fileType: file.type,
        reason: err.response?.data?.message || "unknown",
      });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Voice call initiation (from the toolbar button)
  // ─────────────────────────────────────────────────────────────────────────

  const handleStartVoiceCall = async () => {
    if (!activeConvoId || startingVoiceCall) return;
    setStartingVoiceCall(true);
    try {
      await api.post(`/voice-calls/${activeConvoId}/initiate`);
      // The VoiceCallPanel polls every 3 seconds and will pick up the
      // PENDING state on the next tick. No explicit refresh needed here.
      tracker.action("messages.voiceCall.initiated", {
        conversationId: activeConvoId,
      });
    } catch (err) {
      console.error("Voice call initiate failed:", err.message);
    } finally {
      setStartingVoiceCall(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────────────────────────────────

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const activeOther = activeConvo
    ? getOtherUser(activeConvo)
    : withUser || null;

  const otherProfileUrl = activeOther
    ? activeOther.role === "WORKER"
      ? `/workers/${activeOther.id}`
      : `/hirers/${activeOther.id}`
    : null;

  const filteredConvos = conversations.filter((c) => {
    if (!searchQuery) return true;
    const other = getOtherUser(c);
    return `${other?.firstName} ${other?.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const groupedMessages = useMemo(() => {
    return messages.reduce((groups, msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
      return groups;
    }, {});
  }, [messages]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  const hasActiveChat = !!(activeConvoId || withUserId || withUser);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className={styles.shell}>
        {/* ── Sidebar ── */}
        <div
          className={`${styles.sidebar} ${
            mobileView === "chat" ? styles.hideMobile : ""
          }`}
        >
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>
              Messages
              {totalUnread > 0 && (
                <span className={styles.totalUnreadBadge}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </h2>
          </div>

          <div className={styles.searchWrap}>
            <FiSearch size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchQuery && e.target.value.length === 1) {
                  tracker.track("messages.search.started");
                }
              }}
              onBlur={(e) => {
                if (e.target.value.length > 0) {
                  tracker.action("messages.search.committed", {
                    queryLength: e.target.value.length,
                    resultCount: filteredConvos.length,
                  });
                }
              }}
              data-track-id="messages.search.input"
            />
          </div>

          <div className={styles.convoList}>
            {loadingConvos ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.convoSkeleton} />
              ))
            ) : filteredConvos.length === 0 ? (
              <div className={styles.noConvos}>
                <FiMessageSquare size={28} className={styles.emptyIcon} />
                <p>No conversations yet</p>
                <span className={styles.noConvosSub}>
                  Start a booking to begin messaging
                </span>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const other = getOtherUser(convo);
                const lastMsg = convo.messages?.[0];
                const isActive = convo.id === activeConvoId;
                const unread = convo.unreadCount || 0;
                const isUnread = unread > 0;

                return (
                  <button
                    key={convo.id}
                    className={`${styles.convoItem} ${
                      isActive ? styles.convoItemActive : ""
                    } ${isUnread ? styles.convoItemUnread : ""}`}
                    onClick={() => selectConversation(convo.id)}
                    type="button"
                    data-track-id={`messages.convo.${convo.id}`}
                  >
                    <div className={styles.convoAvatarWrap}>
                      <Avatar user={other} size="md" />
                    </div>
                    <div className={styles.convoInfo}>
                      <div className={styles.convoTop}>
                        <span
                          className={`${styles.convoName} ${
                            isUnread ? styles.convoNameBold : ""
                          }`}
                        >
                          {other?.firstName} {other?.lastName}
                        </span>
                        <div className={styles.convoTopRight}>
                          {lastMsg && (
                            <span className={styles.convoTime}>
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                          {unread > 0 && (
                            <span className={styles.unreadBadge}>
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`${styles.convoPreview} ${
                          isUnread ? styles.convoPreviewBold : ""
                        }`}
                      >
                        {lastMsg
                          ? lastMsg.senderId === user?.id
                            ? `You: ${lastMsg.content}`
                            : lastMsg.content
                          : "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat pane ── */}
        <div
          className={`${styles.chatPane} ${
            mobileView === "list" ? styles.hideMobile : ""
          }`}
        >
          {!hasActiveChat ? (
            <div className={styles.emptyChat}>
              <FiMessageSquare size={48} className={styles.emptyChatIcon} />
              <h3 className={styles.emptyChatTitle}>Select a conversation</h3>
              <p className={styles.emptyChatSub}>
                Choose a conversation from the list to start messaging
              </p>
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                <button
                  className={styles.backBtn}
                  onClick={handleMobileBack}
                  type="button"
                  aria-label="Back to conversations"
                  data-track-id="messages.mobile.back"
                >
                  <FiArrowLeft size={18} />
                </button>
                {activeOther && (
                  <>
                    <Avatar user={activeOther} size="sm" />
                    <div className={styles.chatHeaderInfo}>
                      <p className={styles.chatHeaderName}>
                        {activeOther.firstName} {activeOther.lastName}
                      </p>
                      <p className={styles.chatHeaderSub}>
                        {activeConvo?.booking
                          ? `Booking: ${activeConvo.booking.title}`
                          : "Direct message"}
                      </p>
                    </div>
                  </>
                )}
                {otherProfileUrl && (
                  <Link
                    to={otherProfileUrl}
                    className={styles.viewProfileBtn}
                    data-track-id="messages.viewProfile"
                  >
                    View Profile →
                  </Link>
                )}
              </div>

              <div className={styles.messagesAreaRelative}>
                <div
                  ref={messagesAreaRef}
                  className={styles.messagesArea}
                  onScroll={handleMessagesScroll}
                >
                  {loadingMessages ? (
                    <div className={styles.loadingMessages}>
                      <div className={styles.spinner} />
                    </div>
                  ) : messages.length === 0 && !sendingMessage ? (
                    <div className={styles.noMessages}>
                      <FiSmile size={40} className={styles.noMessagesIcon} />
                      <p>Start the conversation</p>
                      <span className={styles.noMessagesSub}>
                        Say hello to get things started
                      </span>
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedMessages).map(
                        ([dateKey, msgs]) => (
                          <div key={dateKey}>
                            <div className={styles.dateDivider}>
                              <span>
                                {formatDateDivider(msgs[0].createdAt)}
                              </span>
                            </div>
                            {msgs.map((msg, i) => {
                              const isMine = msg.senderId === user?.id;
                              const isMedia =
                                msg.fileUrl &&
                                (msg.fileUrl.match(
                                  /\.(jpg|jpeg|png|webp|gif)$/i,
                                ) ||
                                  msg.fileUrl.includes("image"));
                              const isVideo =
                                msg.fileUrl &&
                                (msg.fileUrl.match(/\.(mp4|mov|webm)$/i) ||
                                  msg.fileUrl.includes("video"));
                              const showAvatar =
                                !isMine &&
                                (i === 0 ||
                                  msgs[i - 1]?.senderId !== msg.senderId);

                              return (
                                <div
                                  key={msg.id}
                                  className={`${styles.messageRow} ${
                                    isMine ? styles.messageRowMine : ""
                                  }`}
                                >
                                  {!isMine && (
                                    <div
                                      className={`${styles.messageAvatar} ${
                                        showAvatar ? "" : styles.avatarHidden
                                      }`}
                                    >
                                      {showAvatar && (
                                        <Avatar user={msg.sender} size="xs" />
                                      )}
                                    </div>
                                  )}

                                  <div
                                    className={`${styles.bubble} ${
                                      isMine
                                        ? styles.bubbleMine
                                        : styles.bubbleTheirs
                                    }`}
                                  >
                                    {!isMine && showAvatar && (
                                      <span className={styles.senderName}>
                                        {msg.sender?.firstName}{" "}
                                        {msg.sender?.lastName}
                                      </span>
                                    )}

                                    {isMedia && (
                                      <img
                                        src={msg.fileUrl}
                                        alt="attachment"
                                        className={styles.messageImage}
                                        onClick={() => {
                                          setLightboxSrc(msg.fileUrl);
                                          tracker.action(
                                            "messages.image.opened",
                                            {
                                              messageId: msg.id,
                                              conversationId: activeConvoId,
                                            },
                                          );
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            setLightboxSrc(msg.fileUrl);
                                          }
                                        }}
                                      />
                                    )}
                                    {isVideo && (
                                      <video
                                        controls
                                        className={styles.messageVideo}
                                      >
                                        <source src={msg.fileUrl} />
                                      </video>
                                    )}
                                    {msg.fileUrl && !isMedia && !isVideo && (
                                      <a
                                        href={msg.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.fileAttachment}
                                        onClick={() =>
                                          tracker.action(
                                            "messages.file.downloaded",
                                            {
                                              messageId: msg.id,
                                              conversationId: activeConvoId,
                                            },
                                          )
                                        }
                                        data-track-id={`messages.file.download.${msg.id}`}
                                      >
                                        <FiPaperclip size={13} />
                                        <span>
                                          {msg.content || "Attachment"}
                                        </span>
                                      </a>
                                    )}

                                    {(!msg.fileUrl ||
                                      (!isMedia && !isVideo)) && (
                                      <p className={styles.bubbleText}>
                                        {linkify(msg.content)}
                                      </p>
                                    )}

                                    {!isMine && msg.content && (
                                      <TranslateButton text={msg.content} />
                                    )}

                                    <span className={styles.bubbleTime}>
                                      {formatMessageTime(msg.createdAt)}
                                      {isMine && (
                                        <DoubleTick read={!!msg.isRead} />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ),
                      )}

                      {sendingMessage && (
                        <div
                          className={`${styles.messageRow} ${styles.messageRowMine}`}
                        >
                          <div
                            className={`${styles.bubble} ${styles.bubbleMine} ${styles.bubblePending}`}
                          >
                            <p className={styles.bubbleText}>
                              {sendingMessage.content}
                            </p>
                            <span className={styles.bubbleTime}>sending…</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={bottomRef} />
                </div>

                {showJumpButton && (
                  <button
                    type="button"
                    className={styles.jumpToBottom}
                    onClick={handleJumpToBottom}
                    aria-label="Scroll to latest message"
                    title="Scroll to latest"
                    data-track-id="messages.jumpToBottom"
                  >
                    <FiChevronDown size={20} />
                  </button>
                )}
              </div>

              <div className={styles.inputArea}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />

                <div className={styles.inputToolbar}>
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    title="Send image or video"
                    aria-label="Send image or video"
                    data-track-id="messages.attach"
                  >
                    {uploadingFile ? (
                      <span className={styles.spinner} />
                    ) : (
                      <FiPaperclip size={16} />
                    )}
                  </button>

                  {/* ── Voice call button ── */}
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={handleStartVoiceCall}
                    disabled={!activeConvoId || startingVoiceCall}
                    title="Start voice call"
                    aria-label="Start voice call"
                    data-track-id="messages.voiceCall.start"
                  >
                    {startingVoiceCall ? (
                      <span className={styles.spinner} />
                    ) : (
                      <FiPhone size={16} />
                    )}
                  </button>

                  {/* ── Video call button ── */}
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => {
                      if (!activeConvoId) return;
                      tracker.action("messages.videoCall.initiated", {
                        conversationId: activeConvoId,
                      });
                      navigate(`/messages/call/${activeConvoId}`);
                    }}
                    disabled={!activeConvoId}
                    title="Start video call"
                    aria-label="Start video call"
                    data-track-id="messages.videoCall.start"
                  >
                    <FiVideo size={16} />
                  </button>
                </div>

                <div className={styles.inputWrap}>
                  <textarea
                    ref={textareaRef}
                    className={styles.messageInput}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (!newMessage) {
                        tracker.track("messages.input.focused");
                      }
                    }}
                    rows={1}
                    data-track-id="messages.input"
                  />
                  <button
                    className={`${styles.sendBtn} ${
                      newMessage.trim() ? styles.sendBtnActive : ""
                    }`}
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    type="button"
                    aria-label="Send message"
                    data-track-id="messages.send"
                  >
                    {sending ? (
                      <span className={styles.spinner} />
                    ) : (
                      <FiSend size={16} />
                    )}
                  </button>
                </div>
                <p className={styles.inputHint}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Floating voice call panel — persists across conversation switches ── */}
      <VoiceCallPanel
        conversationId={activeConvoId || null}
        otherUser={activeOther}
      />

      {/* Fullscreen image viewer */}
      {lightboxSrc && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => {
            setLightboxSrc(null);
            tracker.track("messages.lightbox.closed", { via: "overlay" });
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => {
              setLightboxSrc(null);
              tracker.track("messages.lightbox.closed", { via: "closeBtn" });
            }}
            aria-label="Close image"
            data-track-id="messages.lightbox.close"
          >
            <FiX size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
}
