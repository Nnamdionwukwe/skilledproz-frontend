import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Messages.module.css";

// All platform languages
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

function Avatar({ user, size = "md" }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.firstName} />
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

// Inline translate button for each message
function TranslateButton({ text }) {
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function translate(langCode) {
    setShowPicker(false);
    setLoading(true);
    try {
      const res = await api.post("/translate", { text, targetLang: langCode });
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
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <button
            className={styles.translateBtn}
            onClick={() => setShowPicker((v) => !v)}
            disabled={loading}
            title="Translate message"
          >
            {loading ? "…" : "🌐"}
          </button>
          {showPicker && (
            <div className={styles.langPicker}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={styles.langOption}
                  onClick={() => translate(l.code)}
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

export default function Messages() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(
    searchParams.get("convo") || null,
  );
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // REPLACE the initial state declaration for mobileView:
  const [mobileView, setMobileView] = useState(() => {
    // On mobile, always start on list regardless of URL
    if (window.innerWidth <= 768) return "list";
    // On desktop, if there's a convo in URL, "chat" pane is always visible anyway
    return "list";
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const msgPollRef = useRef(null);
  const convoPollRef = useRef(null);
  const fileInputRef = useRef(null);

  // REPLACE the existing loadConversations with this merge version:
  const loadConversations = useCallback(async (justReadConvoId = null) => {
    try {
      const res = await api.get("/messages/conversations");
      const fresh = res.data.data.conversations || [];
      setConversations((prev) => {
        const prevUnread = {};
        prev.forEach((c) => {
          prevUnread[c.id] = c.unreadCount || 0;
        });

        return fresh.map((f) => {
          // If this is the convo we just marked as read — trust server (should be 0)
          if (f.id === justReadConvoId) {
            return { ...f, unreadCount: f.unreadCount ?? 0 };
          }
          // All other convos: take higher of server vs local to avoid badge flicker
          return {
            ...f,
            unreadCount: Math.max(f.unreadCount ?? 0, prevUnread[f.id] ?? 0),
          };
        });
      });
    } catch {}
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setLoadingConvos(false));
  }, []);

  // REPLACE the useEffect that reads the convo URL param:
  // REPLACE the URL param useEffect:
  useEffect(() => {
    const convoParam = searchParams.get("convo");
    if (convoParam) {
      setActiveConvoId(convoParam);
      // Only auto-open chat on desktop
      if (window.innerWidth > 768) {
        setMobileView("chat");
      }
      // Mobile: stays on "list" — user taps a card to open chat
    }
  }, []); // eslint-disable-line

  const loadMessages = useCallback(async (convoId, silent = false) => {
    if (!convoId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${convoId}?limit=100`);
      setMessages(res.data.data.messages || []);
    } catch {}
    if (!silent) setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!activeConvoId) return;

    // Load messages (no longer marks as read)
    loadMessages(activeConvoId);

    // Mark this conversation as read explicitly — separate API call
    // This is what zeros out the unread badge for the active convo
    api.patch(`/messages/${activeConvoId}/read`).catch(() => {});

    // After mark-as-read completes, sync sidebar counts
    const syncTimer = setTimeout(async () => {
      const res = await api.get("/messages/conversations").catch(() => null);
      if (!res) return;
      const fresh = res.data.data.conversations || [];
      setConversations((prev) =>
        prev.map((c) => {
          const fromServer = fresh.find((f) => f.id === c.id);
          if (!fromServer) return c;
          if (c.id === activeConvoId) {
            // Active convo: trust server (mark-as-read just ran)
            return { ...fromServer, unreadCount: fromServer.unreadCount ?? 0 };
          }
          // Other convos: take higher of server vs local to avoid badge flicker
          return {
            ...fromServer,
            unreadCount: Math.max(
              fromServer.unreadCount ?? 0,
              c.unreadCount ?? 0,
            ),
          };
        }),
      );
    }, 600);

    // Fast poll — messages only (3s), does NOT mark as read
    clearInterval(msgPollRef.current);
    msgPollRef.current = setInterval(() => {
      loadMessages(activeConvoId, true);
    }, 3000);

    // Slow poll — sidebar conversation list (12s)
    clearInterval(convoPollRef.current);
    convoPollRef.current = setInterval(() => {
      loadConversations();
    }, 12000);

    return () => {
      clearTimeout(syncTimer);
      clearInterval(msgPollRef.current);
      clearInterval(convoPollRef.current);
    };
  }, [activeConvoId, loadMessages, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // REPLACE the useEffect that syncs activeConvoId to URL:
  useEffect(() => {
    // Only sync URL on desktop — on mobile, mobileView state controls navigation
    if (activeConvoId && window.innerWidth > 768) {
      setSearchParams({ convo: activeConvoId }, { replace: true });
    }
  }, [activeConvoId]);

  // REPLACE selectConversation:
  // REPLACE selectConversation:
  const selectConversation = (convoId) => {
    if (convoId === activeConvoId) {
      // Already selected — on mobile just open the pane
      setMobileView("chat");
      return;
    }
    setActiveConvoId(convoId);
    setMobileView("chat"); // ← this is intentional: user tapped a card
    setConversations((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, unreadCount: 0 } : c)),
    );
  };

  const getOtherUser = (convo) =>
    convo.users?.find((u) => u.userId !== user?.id)?.user;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      const withParam = searchParams.get("with");
      const activeConvo = conversations.find((c) => c.id === activeConvoId);
      const otherUser = activeConvo?.users?.find(
        (u) => u.userId !== user?.id,
      )?.user;
      const receiverId = otherUser?.id || withParam;
      if (!receiverId) return;

      const res = await api.post("/messages", {
        receiverId,
        content,
        conversationId: activeConvoId || undefined,
      });
      const { message, conversationId } = res.data.data;

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        await loadConversations();
        // In handleSend, REPLACE the else block after message is sent:
      } else {
        setMessages((prev) => [...prev, message]);
        // Optimistic sidebar update — don't trigger a full conversation reload
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
        // No loadConversations() call here — avoids wiping other convos' unread counts
      }
    } catch {}
    setSending(false);
  };

  // Handle file/image/video upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const withParam = searchParams.get("with");
    const activeConvo = conversations.find((c) => c.id === activeConvoId);
    const otherUser = activeConvo?.users?.find(
      (u) => u.userId !== user?.id,
    )?.user;
    const receiverId = otherUser?.id || withParam;
    if (!receiverId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("receiverId", receiverId);
      formData.append("content", file.name); // filename as content
      if (activeConvoId) formData.append("conversationId", activeConvoId);

      const res = await api.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { message, conversationId } = res.data.data;

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        await loadConversations();
      } else {
        setMessages((prev) => [...prev, message]);
      }
    } catch {}
    setUploadingFile(false);
    e.target.value = "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const activeOther = activeConvo ? getOtherUser(activeConvo) : null;
  const filteredConvos = conversations.filter((c) => {
    if (!searchQuery) return true;
    const other = getOtherUser(c);
    return `${other?.firstName} ${other?.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  // Total unread across all conversations (for nav badge)
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  return (
    <Layout>
      <div className={styles.shell}>
        {/* ── Conversation sidebar ── */}
        <div
          className={`${styles.sidebar} ${mobileView === "chat" ? styles.hideMobile : ""}`}
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
            <span className={styles.searchIcon}>🔍</span>
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
                <span>💬</span>
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
                    className={`${styles.convoItem} ${isActive ? styles.convoItemActive : ""} ${isUnread ? styles.convoItemUnread : ""}`}
                    onClick={() => selectConversation(convo.id)}
                  >
                    <div className={styles.convoAvatarWrap}>
                      <Avatar user={other} size="md" />
                      {/* Online indicator could go here */}
                    </div>
                    <div className={styles.convoInfo}>
                      <div className={styles.convoTop}>
                        <span
                          className={`${styles.convoName} ${isUnread ? styles.convoNameBold : ""}`}
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
                        className={`${styles.convoPreview} ${isUnread ? styles.convoPreviewBold : ""}`}
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
          className={`${styles.chatPane} ${mobileView === "list" ? styles.hideMobile : ""}`}
        >
          {!activeConvoId && !searchParams.get("with") ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>💬</div>
              <h3 className={styles.emptyChatTitle}>Select a conversation</h3>
              <p className={styles.emptyChatSub}>
                Choose a conversation from the list to start messaging
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <button
                  className={styles.backBtn}
                  onClick={() => setMobileView("list")}
                >
                  ←
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
                {activeOther && (
                  <Link
                    to={
                      activeOther.role === "WORKER"
                        ? `/workers/${activeOther.id}`
                        : `/profile/${activeOther.id}`
                    }
                    className={styles.viewProfileBtn}
                  >
                    View Profile →
                  </Link>
                )}
              </div>

              {/* Messages area */}
              <div className={styles.messagesArea}>
                {loadingMessages ? (
                  <div className={styles.loadingMessages}>
                    <div className={styles.spinner} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.noMessages}>
                    <span>👋</span>
                    <p>Start the conversation</p>
                    <span className={styles.noMessagesSub}>
                      Say hello to get things started
                    </span>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                    <div key={dateKey}>
                      <div className={styles.dateDivider}>
                        <span>{formatDateDivider(msgs[0].createdAt)}</span>
                      </div>
                      {msgs.map((msg, i) => {
                        const isMine = msg.senderId === user?.id;
                        const isMedia =
                          msg.fileUrl &&
                          (msg.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                            msg.fileUrl.includes("image"));
                        const isVideo =
                          msg.fileUrl &&
                          (msg.fileUrl.match(/\.(mp4|mov|webm)$/i) ||
                            msg.fileUrl.includes("video"));
                        const showAvatar =
                          !isMine &&
                          (i === 0 || msgs[i - 1]?.senderId !== msg.senderId);

                        return (
                          <div
                            key={msg.id}
                            className={`${styles.messageRow} ${isMine ? styles.messageRowMine : ""}`}
                          >
                            {/* Sender avatar — shown for other person's messages */}
                            {!isMine && (
                              <div
                                className={`${styles.messageAvatar} ${showAvatar ? "" : styles.avatarHidden}`}
                              >
                                {showAvatar && (
                                  <Avatar user={msg.sender} size="xs" />
                                )}
                              </div>
                            )}

                            <div
                              className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}
                            >
                              {/* Sender name on first message in a group */}
                              {!isMine && showAvatar && (
                                <span className={styles.senderName}>
                                  {msg.sender?.firstName} {msg.sender?.lastName}
                                </span>
                              )}

                              {/* Media content */}
                              {isMedia && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={msg.fileUrl}
                                    alt="attachment"
                                    className={styles.messageImage}
                                  />
                                </a>
                              )}
                              {isVideo && (
                                <video controls className={styles.messageVideo}>
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
                                  📎 {msg.content || "Attachment"}
                                </a>
                              )}

                              {/* Text content — don't show filename if it's just a media message */}
                              {(!msg.fileUrl || (!isMedia && !isVideo)) && (
                                <p className={styles.bubbleText}>
                                  {msg.content}
                                </p>
                              )}

                              {/* Translate button for received messages */}
                              {!isMine && msg.content && (
                                <TranslateButton text={msg.content} />
                              )}

                              <span className={styles.bubbleTime}>
                                {formatMessageTime(msg.createdAt)}
                                {isMine && (
                                  <span className={styles.readTick}>
                                    {msg.isRead ? " ✓✓" : " ✓"}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div className={styles.inputArea}>
                {/* Hidden file inputs */}
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
                  >
                    {uploadingFile ? <span className={styles.spinner} /> : "📎"}
                  </button>
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingFile}
                    title="Send photo"
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => {
                      fileInputRef.current.accept = "video/*";
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingFile}
                    title="Send video"
                  >
                    🎥
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
                    className={`${styles.sendBtn} ${newMessage.trim() ? styles.sendBtnActive : ""}`}
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? (
                      <span className={styles.spinner} />
                    ) : (
                      <span className={styles.sendIcon}>➤</span>
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
    </Layout>
  );
}
