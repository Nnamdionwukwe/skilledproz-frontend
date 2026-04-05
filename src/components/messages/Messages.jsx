import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import api from "../../lib/api";
import styles from "./Messages.module.css";
import TranslateButton from "../common/TranslateButton";

function Avatar({ user, size = "md" }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
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
  const [mobileView, setMobileView] = useState("list"); // 'list' | 'chat'

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef = useRef(null);

  // Load conversations
  useEffect(() => {
    api
      .get("/messages/conversations")
      .then((res) => setConversations(res.data.data.conversations || []))
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, []);

  // Auto-open conversation from URL param
  useEffect(() => {
    const convoParam = searchParams.get("convo");
    const withParam = searchParams.get("with");
    if (convoParam) {
      setActiveConvoId(convoParam);
      setMobileView("chat");
    } else if (withParam) {
      // Start new convo with this user — handled on send
    }
  }, []);

  // Load messages for active conversation
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
    loadMessages(activeConvoId);
    // Poll every 3 seconds for new messages
    pollRef.current = setInterval(
      () => loadMessages(activeConvoId, true),
      3000,
    );
    return () => clearInterval(pollRef.current);
  }, [activeConvoId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update URL
  useEffect(() => {
    if (activeConvoId) {
      setSearchParams({ convo: activeConvoId });
    }
  }, [activeConvoId]);

  const selectConversation = (convoId) => {
    setActiveConvoId(convoId);
    setMobileView("chat");
    clearInterval(pollRef.current);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const activeConvo = conversations.find((c) => c.id === activeConvoId);
      const otherUser = activeConvo?.users?.find(
        (u) => u.userId !== user?.id,
      )?.user;

      const withParam = searchParams.get("with");
      const receiverId = otherUser?.id || withParam;

      const res = await api.post("/messages", {
        receiverId,
        content,
        conversationId: activeConvoId,
      });

      const { message, conversationId } = res.data.data;

      // If new convo was created
      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        // Refresh convos list
        const convosRes = await api.get("/messages/conversations");
        setConversations(convosRes.data.data.conversations || []);
      } else {
        setMessages((prev) => [...prev, message]);
        // Update last message in sidebar
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get other user in a conversation
  const getOtherUser = (convo) =>
    convo.users?.find((u) => u.userId !== user?.id)?.user;

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const activeOther = activeConvo ? getOtherUser(activeConvo) : null;

  const filteredConvos = conversations.filter((c) => {
    if (!searchQuery) return true;
    const other = getOtherUser(c);
    return `${other?.firstName} ${other?.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  return (
    <Layout>
      <div className={styles.shell}>
        {/* ── Sidebar ── */}
        <div
          className={`${styles.sidebar} ${mobileView === "chat" ? styles.hideMobile : ""}`}
        >
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Messages</h2>
            {conversations.length > 0 && (
              <span className={styles.convoCount}>{conversations.length}</span>
            )}
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
                return (
                  <button
                    key={convo.id}
                    className={`${styles.convoItem} ${isActive ? styles.convoItemActive : ""}`}
                    onClick={() => selectConversation(convo.id)}
                  >
                    <Avatar user={other} size="md" />
                    <div className={styles.convoInfo}>
                      <div className={styles.convoTop}>
                        <span className={styles.convoName}>
                          {other?.firstName} {other?.lastName}
                        </span>
                        {lastMsg && (
                          <span className={styles.convoTime}>
                            {formatTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={styles.convoPreview}>
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
                        const showAvatar =
                          !isMine &&
                          (i === 0 || msgs[i - 1]?.senderId !== msg.senderId);
                        return (
                          <div
                            key={msg.id}
                            className={`${styles.messageRow} ${isMine ? styles.messageRowMine : ""}`}
                          >
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
                              {msg.fileUrl && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.fileAttachment}
                                >
                                  📎 Attachment
                                </a>
                              )}
                              <p className={styles.bubbleText}>{msg.content}</p>{" "}
                              {!isMine && (
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
