import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
} from "react-icons/fi";

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
    try {
      const res = await api.post("/translate", {
        text,
        targetLang: langCode,
      });
      setTranslated(res.data.data.translated);
    } catch {
      setTranslated("Translation failed.");
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
            onClick={() => setTranslated(null)}
            type="button"
            aria-label="Dismiss translation"
          >
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <div className={styles.translateRelative}>
          <button
            className={styles.translateBtn}
            onClick={() => setShowPicker((v) => !v)}
            disabled={loading}
            title="Translate message"
            type="button"
            aria-label="Translate message"
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
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  // ── Initial URL state ──
  const initialConvoId = searchParams.get("convo");
  const initialWithId = searchParams.get("with");

  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(initialConvoId || null);
  const [withUserId, setWithUserId] = useState(initialWithId || null);
  const [withUser, setWithUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

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
  // Silent: never auto-scrolls on incoming messages. Only:
  //  - first load of a conversation → jump to bottom (invisible, no animation)
  //  - user just sent → scroll to their own message
  //  - user is already at the bottom → scroll smoothly to keep them there
  //  - otherwise → do nothing; the user will see the message when they scroll
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
    // else: silent — no scroll, no badge, no visible indicator
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
  }, []);

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
      if (e.key === "Escape") setLightboxSrc(null);
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
      setSearchParams({ convo: existing.id }, { replace: true });
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      try {
        const res = await api.get(`/workers/${withUserId}`);
        if (cancelled) return;
        const worker = res.data.data?.worker;
        const u = worker?.user || worker;
        if (u?.id) {
          setWithUser(u);
          return;
        }
      } catch {
        /* try next */
      }

      try {
        const res = await api.get(`/hirers/${withUserId}`);
        if (cancelled) return;
        const hirer = res.data.data?.profile || res.data.data?.hirer;
        const u = hirer?.user || hirer;
        if (u?.id) {
          setWithUser(u);
          return;
        }
      } catch {
        /* try next */
      }

      try {
        const res = await api.get(`/users/${withUserId}`);
        if (cancelled) return;
        const u =
          res.data.data?.user ||
          res.data.data?.profile?.user ||
          res.data.data?.profile ||
          res.data.data;
        if (u?.id) {
          setWithUser(u);
          return;
        }
      } catch {
        /* give up */
      }

      if (!cancelled) setWithUser(null);
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [withUserId, conversations, setSearchParams]);

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
    } catch {
      setSendingMessage(null);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const receiverId = resolveReceiver();
    if (!receiverId) return;

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
    } catch {
      /* silent */
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  <Link to={otherProfileUrl} className={styles.viewProfileBtn}>
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
                                        onClick={() =>
                                          setLightboxSrc(msg.fileUrl)
                                        }
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
                                        {msg.content}
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

                {/* Jump-to-bottom — appears when the user scrolls up.
                    No badge, no count — just a way back to the newest message. */}
                {showJumpButton && (
                  <button
                    type="button"
                    className={styles.jumpToBottom}
                    onClick={handleJumpToBottom}
                    aria-label="Scroll to latest message"
                    title="Scroll to latest"
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
                  >
                    {uploadingFile ? (
                      <span className={styles.spinner} />
                    ) : (
                      <FiPaperclip size={16} />
                    )}
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
                    rows={1}
                  />
                  <button
                    className={`${styles.sendBtn} ${
                      newMessage.trim() ? styles.sendBtnActive : ""
                    }`}
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    type="button"
                    aria-label="Send message"
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

      {/* Fullscreen image viewer */}
      {lightboxSrc && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightboxSrc(null)}
            aria-label="Close image"
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
