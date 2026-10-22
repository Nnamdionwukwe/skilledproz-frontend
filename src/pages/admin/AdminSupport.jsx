// src/pages/admin/AdminSupport.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiMessageSquare,
  FiFileText,
  FiSearch,
  FiSend,
  FiPaperclip,
  FiX,
  FiArrowLeft,
  FiCornerUpLeft,
} from "react-icons/fi";
import AdminLayout from "../../components/layout/AdminLayout";
import { supportApi, createSupportSocket } from "../../lib/supportApi";
import { useAuthStore } from "../../store/authStore";
import { linkify } from "../../utils/linkify";
import AttachmentPreview from "../../components/support/AttachmentPreview";
import styles from "./AdminSupport.module.css";

export default function AdminSupport() {
  const { user, accessToken } = useAuthStore();

  // State
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [mobileView, setMobileView] = useState("list");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Input State
  const [inputText, setInputText] = useState("");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── 1. Data Fetching (Silent Polling) ──
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [chatsRes, ticketsRes] = await Promise.all([
        supportApi.adminListChats(),
        supportApi.adminListTickets(),
      ]);
      setChats(chatsRes.data.chats || []);
      setTickets(ticketsRes.data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Silently poll every 5 seconds for new messages/tickets
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Socket Setup ──
  useEffect(() => {
    if (!accessToken) return;
    const socket = createSupportSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => {
      if (activeChat) {
        socket.emit("support:join", { conversationId: activeChat.id });
      }
    });

    socket.on("support:message", (msg) => {
      // If the message is for the active chat, append it
      if (activeChat && msg.conversationId === activeChat.id) {
        setActiveChat((prev) => {
          if (prev.messages.some((m) => m.id === msg.id)) return prev;
          return { ...prev, messages: [...prev.messages, msg] };
        });
        socket.emit("support:read", { conversationId: activeChat.id });
      }
      // Silent refresh to update the sidebar list and unread counts
      fetchData(true);
    });

    socket.on("support:typing", ({ isTyping: typing, userId }) => {
      if (userId !== user?.id) setIsTyping(typing);
    });

    socket.on("support:read", ({ byUserId, at }) => {
      if (byUserId !== user?.id && activeChat) {
        setActiveChat((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.senderId === user?.id ? { ...m, readAt: at } : m,
          ),
        }));
      }
    });

    return () => socket.disconnect();
  }, [accessToken, activeChat?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, activeTicket?.messages, isTyping]);

  // ── 3. Actions ──
  const handleSelectChat = async (chat) => {
    try {
      const res = await supportApi.adminGetChat(chat.id);
      setActiveChat(res.data.chat || res.data);
      setActiveTicket(null);
      setMobileView("chat");

      // Clear the unread badge locally so it disappears instantly
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)),
      );

      // Tell the server we read it
      if (socketRef.current) {
        socketRef.current.emit("support:read", { conversationId: chat.id });
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  const handleSelectTicket = async (ticket) => {
    try {
      const res = await supportApi.adminGetTicket(ticket.id);
      setActiveTicket(res.data.ticket || res.data);
      setActiveChat(null);
      setMobileView("chat");
    } catch (err) {
      console.error("Failed to load ticket:", err);
    }
  };

  const handleMobileBack = () => setMobileView("list");

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && files.length === 0) || !activeChat) return;

    setIsUploading(true);
    let uploadedAttachments = [];

    try {
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("attachments", f));
        const uploadRes = await supportApi.uploadChatAttachments(formData);
        uploadedAttachments = uploadRes.data.attachments || [];
      }

      socketRef.current.emit(
        "support:message",
        {
          conversationId: activeChat.id,
          body: inputText.trim(),
          attachments: uploadedAttachments,
          replyToId: replyTo?.id,
          tempId: `temp-${Date.now()}`,
        },
        (ack) => {
          if (ack.ok) {
            setActiveChat((prev) => ({
              ...prev,
              messages: [...prev.messages, ack.message],
            }));
          }
        },
      );

      setInputText("");
      setFiles([]);
      setReplyTo(null);
      socketRef.current.emit("support:typing", {
        conversationId: activeChat.id,
        isTyping: false,
      });
    } catch (err) {
      alert("Failed to send.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplyTicket = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && files.length === 0) || !activeTicket) return;

    setIsUploading(true);
    try {
      const data = new FormData();
      if (inputText.trim()) data.append("body", inputText);
      if (replyTo) data.append("replyToId", replyTo.id);
      files.forEach((f) => data.append("attachments", f));

      const res = await supportApi.adminReplyToTicket(activeTicket.id, data);

      setActiveTicket((prev) => ({
        ...prev,
        status: res.data.ticketStatus,
        messages: [...prev.messages, res.data.message],
      }));

      setInputText("");
      setFiles([]);
      setReplyTo(null);
    } catch (err) {
      alert("Failed to send reply.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateTicketStatus = async (status) => {
    if (!activeTicket) return;
    try {
      const res = await supportApi.adminUpdateStatus(activeTicket.id, {
        status,
      });
      setActiveTicket(res.data.ticket);
      fetchData(true);
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  // ── 4. Render ──
  const filteredChats = chats.filter((c) =>
    `${c.user?.firstName} ${c.user?.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const filteredTickets = tickets.filter((t) =>
    `${t.ticketNumber} ${t.subject}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const totalUnreadChats = chats.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* ── Sidebar (List) ── */}
        <div
          className={`${styles.sidebar} ${mobileView === "chat" ? styles.hideMobile : ""}`}
        >
          <div className={styles.tabs}>
            <button
              className={activeTab === "chats" ? styles.activeTab : styles.tab}
              onClick={() => {
                setActiveTab("chats");
                setActiveTicket(null);
              }}
            >
              <FiMessageSquare /> Chats
              {totalUnreadChats > 0 && (
                <span className={styles.tabBadge}>{totalUnreadChats}</span>
              )}
            </button>
            <button
              className={
                activeTab === "tickets" ? styles.activeTab : styles.tab
              }
              onClick={() => {
                setActiveTab("tickets");
                setActiveChat(null);
              }}
            >
              <FiFileText /> Tickets
            </button>
          </div>

          <div className={styles.searchBar}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : activeTab === "chats" ? (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`${styles.listItem} ${activeChat?.id === chat.id ? styles.activeItem : ""}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={styles.avatar}>
                    {chat.user?.firstName?.[0]}
                    {chat.user?.lastName?.[0]}
                  </div>
                  <div className={styles.itemInfo}>
                    <h4>
                      {chat.user?.firstName} {chat.user?.lastName}
                    </h4>
                    <p>{chat.lastMessagePreview || "No messages yet"}</p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              ))
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`${styles.listItem} ${activeTicket?.id === ticket.id ? styles.activeItem : ""}`}
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <div className={styles.ticketIcon}>
                    <FiFileText />
                  </div>
                  <div className={styles.itemInfo}>
                    <h4>{ticket.subject}</h4>
                    <p>
                      {ticket.ticketNumber} • {ticket.user?.firstName}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main Chat/Thread Area ── */}
        <div
          className={`${styles.main} ${mobileView === "list" ? styles.hideMobile : ""}`}
        >
          {!activeChat && !activeTicket ? (
            <div className={styles.emptyState}>
              <FiMessageSquare size={48} />
              <h2>Select a conversation</h2>
              <p>
                Choose a live chat or ticket from the list to start replying.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                <button className={styles.backBtn} onClick={handleMobileBack}>
                  <FiArrowLeft size={20} />
                </button>
                <div className={styles.headerInfo}>
                  <h2>
                    {activeChat
                      ? `${activeChat.user?.firstName} ${activeChat.user?.lastName}`
                      : activeTicket?.subject}
                  </h2>
                  <span>
                    {activeChat
                      ? "Live Chat"
                      : `Ticket ${activeTicket?.ticketNumber}`}
                  </span>
                </div>
                {activeTicket && (
                  <div className={styles.ticketActions}>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_USER">Waiting User</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.messagesArea}>
                {(activeChat?.messages || activeTicket?.messages || []).map(
                  (msg, idx) => {
                    const isAdmin =
                      msg.senderType === "ADMIN" || msg.authorType === "ADMIN";
                    const isSystem =
                      msg.senderType === "SYSTEM" ||
                      msg.authorType === "SYSTEM";

                    if (isSystem)
                      return (
                        <div key={idx} className={styles.systemMsg}>
                          {msg.body}
                        </div>
                      );

                    return (
                      <div
                        key={idx}
                        className={`${styles.messageRow} ${isAdmin ? styles.myMsg : styles.theirMsg}`}
                      >
                        <div
                          className={styles.bubble}
                          onDoubleClick={() => setReplyTo(msg)}
                          title="Double-click to reply"
                        >
                          {msg.replyTo && (
                            <div className={styles.replyPreview}>
                              <FiCornerUpLeft size={12} />
                              <span>{msg.replyTo.body || "Attachment"}</span>
                            </div>
                          )}
                          {msg.body && <p>{linkify(msg.body)}</p>}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <AttachmentPreview
                              attachments={msg.attachments}
                              isMe={isAdmin}
                            />
                          )}
                          <span className={styles.time}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isAdmin && (msg.readAt ? " ✓✓" : " ✓")}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
                {isTyping && (
                  <div className={styles.typingIndicator}>
                    User is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.replyBox}>
                {replyTo && (
                  <div className={styles.replyHeader}>
                    <div className={styles.replyHeaderText}>
                      <span>
                        Replying to{" "}
                        {replyTo.senderType === "USER" ||
                        replyTo.authorType === "USER"
                          ? "User"
                          : "Admin"}
                      </span>
                      <p>{replyTo.body || "Attachment"}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)}>
                      <FiX size={14} />
                    </button>
                  </div>
                )}
                {files.length > 0 && (
                  <div className={styles.filePreviews}>
                    {files.map((f, i) => (
                      <div key={i} className={styles.fileChip}>
                        <span>{f.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles(files.filter((_, idx) => idx !== i))
                          }
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={activeChat ? handleSendMessage : handleReplyTicket}
                  className={styles.inputArea}
                >
                  <label className={styles.attachBtn}>
                    <FiPaperclip size={18} />
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files))}
                      hidden
                    />
                  </label>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (activeChat)
                        socketRef.current.emit("support:typing", {
                          conversationId: activeChat.id,
                          isTyping: true,
                        });
                    }}
                    placeholder="Type a reply..."
                    disabled={isUploading}
                  />
                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={
                      (!inputText.trim() && files.length === 0) || isUploading
                    }
                  >
                    {isUploading ? "⏳" : <FiSend size={18} />}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
