import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Messages.module.css";

const LANGUAGES = [
  { code: "en", label: "🇬🇧 English" },
  { code: "fr", label: "🇫🇷 French" },
  { code: "ar", label: "🇸🇦 Arabic" },
  { code: "yo", label: "🇳🇬 Yoruba" },
  { code: "ha", label: "🇳🇬 Hausa" },
  { code: "ig", label: "🇳🇬 Igbo" },
  { code: "sw", label: "🇰🇪 Swahili" },
  { code: "pt", label: "🇵🇹 Portuguese" },
  { code: "es", label: "🇪🇸 Spanish" },
  { code: "de", label: "🇩🇪 German" },
  { code: "zh", label: "🇨🇳 Chinese" },
  { code: "hi", label: "🇮🇳 Hindi" },
  { code: "bn", label: "🇧🇩 Bengali" },
  { code: "ur", label: "🇵🇰 Urdu" },
  { code: "tr", label: "🇹🇷 Turkish" },
  { code: "ko", label: "🇰🇷 Korean" },
  { code: "ja", label: "🇯🇵 Japanese" },
  { code: "ru", label: "🇷🇺 Russian" },
  { code: "id", label: "🇮🇩 Indonesian" },
  { code: "vi", label: "🇻🇳 Vietnamese" },
  { code: "th", label: "🇹🇭 Thai" },
  { code: "ms", label: "🇲🇾 Malay" },
  { code: "fil", label: "🇵🇭 Filipino" },
];

function initials(user) {
  return (
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    "?"
  );
}

function formatSidebarTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = (now - d) / 86400000;
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMsgTime(dateStr) {
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

function detectFileType(fileUrl) {
  if (!fileUrl) return null;
  if (
    /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(fileUrl) ||
    fileUrl.includes("/image/upload/")
  )
    return "image";
  if (
    /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(fileUrl) ||
    fileUrl.includes("/video/upload/")
  )
    return "video";
  return "file";
}

function Avatar({ user, size = "md" }) {
  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user?.firstName || ""} />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

function TypingBubble({ user }) {
  return (
    <div className={`${styles.messageRow} ${styles.rowTheirs}`}>
      <div className={styles.msgAvatarSlot}>
        <Avatar user={user} size="xs" />
      </div>
      <div className={styles.bubbleCol}>
        <div
          className={`${styles.bubble} ${styles.bubbleTheirs} ${styles.typingBubble}`}
        >
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
        </div>
      </div>
    </div>
  );
}

function TranslateButton({ text }) {
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function translate(code) {
    setOpen(false);
    setLoading(true);
    try {
      const res = await api.post("/translate", { text, targetLang: code });
      setTranslated(res.data.data?.translated || "Translation failed.");
    } catch {
      setTranslated("Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!text || ["[Image]", "[Video]", "[File]"].includes(text)) return null;

  return (
    <div className={styles.translateWrap} ref={ref}>
      {translated ? (
        <div className={styles.translatedBox}>
          <span className={styles.translatedLabel}>Translated</span>
          <p className={styles.translatedText}>{translated}</p>
          <button
            className={styles.translateDismiss}
            onClick={() => setTranslated(null)}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <button
            className={styles.translateTrigger}
            onClick={() => setOpen((v) => !v)}
            disabled={loading}
          >
            {loading ? <span className={styles.dotSpinner} /> : "🌐 Translate"}
          </button>
          {open && (
            <div className={styles.langPicker}>
              <p className={styles.langPickerLabel}>Translate to…</p>
              <div className={styles.langList}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={styles.langItem}
                    onClick={() => translate(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef = useRef(null);
  const imgInputRef = useRef(null);
  const vidInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMsgCount = useRef(0);
  const activeConvoIdRef = useRef(activeConvoId);
  useEffect(() => {
    activeConvoIdRef.current = activeConvoId;
  }, [activeConvoId]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get("/messages/conversations");
      setConversations(res.data.data.conversations || []);
    } catch {}
  }, []);

  const loadMessages = useCallback(
    async (convoId, silent = false) => {
      if (!convoId) return;
      if (!silent) setLoadingMessages(true);
      try {
        const res = await api.get(`/messages/${convoId}?limit=100`);
        const incoming = res.data.data.messages || [];
        if (silent && incoming.length > prevMsgCount.current) {
          const newest = incoming[incoming.length - 1];
          if (newest?.senderId !== user?.id) {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              setMessages(incoming);
              prevMsgCount.current = incoming.length;
            }, 800);
            return;
          }
        }
        setMessages(incoming);
        prevMsgCount.current = incoming.length;
      } catch {}
      if (!silent) setLoadingMessages(false);
    },
    [user?.id],
  );

  useEffect(() => {
    loadConversations().finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    const convoParam = searchParams.get("convo");
    if (convoParam) {
      setActiveConvoId(convoParam);
      setMobileView("chat");
    }
  }, []);

  useEffect(() => {
    if (!activeConvoId) return;
    setMessages([]);
    setIsTyping(false);
    prevMsgCount.current = 0;
    loadMessages(activeConvoId);
    loadConversations();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadMessages(activeConvoIdRef.current, true);
      loadConversations();
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeConvoId]);

  useEffect(() => {
    if (!isTyping) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isTyping) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isTyping]);

  useEffect(() => {
    if (activeConvoId)
      setSearchParams({ convo: activeConvoId }, { replace: true });
  }, [activeConvoId]);

  const getOtherUser = (convo) =>
    convo?.users?.find((u) => u.userId !== user?.id)?.user;
  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const activeOther = getOtherUser(activeConvo);
  const totalUnread = conversations.reduce(
    (n, c) => n + (c.unreadCount || 0),
    0,
  );

  const filteredConvos = conversations.filter((c) => {
    if (!searchQuery) return true;
    const other = getOtherUser(c);
    return `${other?.firstName} ${other?.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const groupedMessages = messages.reduce((acc, msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const selectConversation = (convoId) => {
    setActiveConvoId(convoId);
    setMobileView("chat");
    setMessages([]);
    setIsTyping(false);
    clearInterval(pollRef.current);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    try {
      const withParam = searchParams.get("with");
      const otherUser = getOtherUser(activeConvo);
      const receiverId = otherUser?.id || withParam;
      if (!receiverId) {
        setSending(false);
        return;
      }

      const res = await api.post("/messages", {
        receiverId,
        content,
        conversationId: activeConvoId || undefined,
      });
      const { message, conversationId } = res.data.data;

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        await loadConversations();
      } else {
        setMessages((prev) => [...prev, message]);
        prevMsgCount.current += 1;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvoId
              ? { ...c, messages: [message], updatedAt: new Date() }
              : c,
          ),
        );
      }
    } catch {}
    setSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const withParam = searchParams.get("with");
    const otherUser = getOtherUser(activeConvo);
    const receiverId = otherUser?.id || withParam;
    if (!receiverId) return;

    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("receiverId", receiverId);
      form.append("content", "");
      if (activeConvoId) form.append("conversationId", activeConvoId);

      const res = await api.post("/messages", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { message, conversationId } = res.data.data;

      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        await loadConversations();
      } else {
        setMessages((prev) => [...prev, message]);
        prevMsgCount.current += 1;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvoId
              ? { ...c, messages: [message], updatedAt: new Date() }
              : c,
          ),
        );
      }
    } catch (err) {
      console.error("File upload failed:", err?.response?.data || err);
    }
    setUploadingFile(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className={styles.shell}>
        {/* ═══ SIDEBAR ═══ */}
        <aside
          className={`${styles.sidebar} ${mobileView === "chat" ? styles.hideMobile : ""}`}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitleRow}>
              <h2 className={styles.sidebarTitle}>Messages</h2>
              {totalUnread > 0 && (
                <span className={styles.totalUnreadBadge}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
          </div>

          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search conversations…"
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
                <span className={styles.noConvosIcon}>💬</span>
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
                const hasUnread = unread > 0;

                let preview = "No messages yet";
                if (lastMsg) {
                  const mine = lastMsg.senderId === user?.id;
                  const fType = detectFileType(lastMsg.fileUrl);
                  const pfx = mine ? "You: " : "";
                  if (fType === "image") preview = `${pfx}📷 Photo`;
                  else if (fType === "video") preview = `${pfx}🎥 Video`;
                  else if (fType === "file") preview = `${pfx}📎 File`;
                  else preview = `${pfx}${lastMsg.content}`;
                }

                return (
                  <button
                    key={convo.id}
                    className={[
                      styles.convoItem,
                      isActive ? styles.convoItemActive : "",
                      hasUnread && !isActive ? styles.convoItemUnread : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectConversation(convo.id)}
                  >
                    <div className={styles.convoAvatarWrap}>
                      <Avatar user={other} size="md" />
                    </div>
                    <div className={styles.convoInfo}>
                      <div className={styles.convoTopRow}>
                        <span
                          className={`${styles.convoName} ${hasUnread && !isActive ? styles.bold : ""}`}
                        >
                          {other?.firstName} {other?.lastName}
                        </span>
                        <div className={styles.convoMeta}>
                          {lastMsg && (
                            <span className={styles.convoTime}>
                              {formatSidebarTime(lastMsg.createdAt)}
                            </span>
                          )}
                          {hasUnread && (
                            <span className={styles.unreadBadge}>
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`${styles.convoPreview} ${hasUnread && !isActive ? styles.bold : ""}`}
                      >
                        {preview}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ═══ CHAT PANE ═══ */}
        <div
          className={`${styles.chatPane} ${mobileView === "list" ? styles.hideMobile : ""}`}
        >
          {!activeConvoId && !searchParams.get("with") ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>💬</div>
              <h3 className={styles.emptyChatTitle}>Select a conversation</h3>
              <p className={styles.emptyChatSub}>
                Choose from the list to start messaging
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
                  </>
                )}
              </div>

              {/* Messages */}
              <div className={styles.messagesArea}>
                {loadingMessages ? (
                  <div className={styles.loadingMessages}>
                    <div className={styles.spinner} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.noMessages}>
                    <span>👋</span>
                    <p>Say hello to get things started</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                    <div key={dateKey}>
                      <div className={styles.dateDivider}>
                        <span>{formatDateDivider(msgs[0].createdAt)}</span>
                      </div>
                      {msgs.map((msg, i) => {
                        const isMine = msg.senderId === user?.id;
                        const fileType = detectFileType(msg.fileUrl);
                        const showInfo =
                          !isMine &&
                          (i === 0 || msgs[i - 1]?.senderId !== msg.senderId);
                        const mediaOnly =
                          (fileType === "image" || fileType === "video") &&
                          (!msg.content ||
                            ["[Image]", "[Video]"].includes(msg.content));

                        return (
                          <div
                            key={msg.id}
                            className={`${styles.messageRow} ${isMine ? styles.rowMine : styles.rowTheirs}`}
                          >
                            {!isMine && (
                              <div
                                className={`${styles.msgAvatarSlot} ${!showInfo ? styles.avatarInvisible : ""}`}
                              >
                                {showInfo && (
                                  <Avatar user={msg.sender} size="xs" />
                                )}
                              </div>
                            )}
                            <div className={styles.bubbleCol}>
                              {!isMine && showInfo && (
                                <span className={styles.senderName}>
                                  {msg.sender?.firstName} {msg.sender?.lastName}
                                </span>
                              )}
                              <div
                                className={[
                                  styles.bubble,
                                  isMine
                                    ? styles.bubbleMine
                                    : styles.bubbleTheirs,
                                  mediaOnly ? styles.bubbleMedia : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {fileType === "image" && (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={msg.fileUrl}
                                      alt="Photo"
                                      className={styles.msgImage}
                                      onLoad={() =>
                                        bottomRef.current?.scrollIntoView({
                                          behavior: "smooth",
                                        })
                                      }
                                    />
                                  </a>
                                )}
                                {fileType === "video" && (
                                  <video
                                    controls
                                    className={styles.msgVideo}
                                    playsInline
                                  >
                                    <source src={msg.fileUrl} />
                                  </video>
                                )}
                                {fileType === "file" && (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.fileChip}
                                  >
                                    <span>📎</span>
                                    <span>
                                      {!["[File]", ""].includes(msg.content)
                                        ? msg.content
                                        : "Download file"}
                                    </span>
                                  </a>
                                )}
                                {!mediaOnly && !fileType && (
                                  <p className={styles.bubbleText}>
                                    {msg.content}
                                  </p>
                                )}
                                {!isMine && !fileType && (
                                  <TranslateButton text={msg.content} />
                                )}

                                <span
                                  className={`${styles.bubbleTime} ${mediaOnly ? styles.bubbleTimeOnMedia : ""}`}
                                >
                                  {formatMsgTime(msg.createdAt)}
                                  {isMine && (
                                    <span
                                      className={
                                        msg.isRead
                                          ? styles.tickRead
                                          : styles.tickSent
                                      }
                                    >
                                      {msg.isRead ? " ✓✓" : " ✓"}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Typing indicator */}
                {isTyping && activeOther && <TypingBubble user={activeOther} />}
                <div ref={bottomRef} />
              </div>

              {/* Hidden inputs */}
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <input
                ref={vidInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              {/* Input area */}
              <div className={styles.inputArea}>
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.toolBtn}
                    title="Send photo"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    className={styles.toolBtn}
                    title="Send video"
                    onClick={() => vidInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    🎥
                  </button>
                  <button
                    type="button"
                    className={styles.toolBtn}
                    title="Send file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    📎
                  </button>
                  {uploadingFile && (
                    <span className={styles.uploadingLabel}>Uploading…</span>
                  )}
                </div>
                <div className={styles.inputRow}>
                  <textarea
                    ref={textareaRef}
                    className={styles.msgInput}
                    placeholder="Type a message…"
                    value={newMessage}
                    rows={1}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className={`${styles.sendBtn} ${newMessage.trim() ? styles.sendBtnActive : ""}`}
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? <span className={styles.spinner} /> : "➤"}
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
