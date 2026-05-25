// src/pages/messages/AdminMessages.jsx
// Full admin conversation oversight (read-only).
// Endpoints:
//   GET /admin/conversations?page=&limit=
//   GET /admin/conversations/:conversationId?page=&limit=

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminMessages.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const CONV_LIMIT = 20;
const MSG_LIMIT = 50;

const ROLE_META = {
  WORKER: { label: "Worker", color: "orange" },
  HIRER: { label: "Hirer", color: "indigo" },
  ADMIN: { label: "Admin", color: "red" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateFull(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function truncate(str, n = 55) {
  if (!str) return "No messages yet";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// Extract participants from conversation.users array
function getParticipants(conv) {
  return (conv.users ?? []).map((cu) => cu.user).filter(Boolean);
}

// Check if two messages are on the same calendar day
function isSameDay(a, b) {
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm", index = 0 }) {
  const sizeClass =
    { sm: s.avatar, md: s.avatarMd, lg: s.avatarLg, xs: s.avatarXs }[size] ??
    s.avatar;
  const colors = [s.avatarOrange, s.avatarIndigo, s.avatarGreen, s.avatarRose];
  const colorClass = colors[index % colors.length];
  return (
    <div className={`${sizeClass} ${colorClass}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// Overlapping avatar stack for conversation list
function AvatarStack({ participants }) {
  const shown = participants.slice(0, 2);
  return (
    <div className={s.avatarStack}>
      {shown.map((u, i) => (
        <div
          key={u?.id ?? i}
          className={s.avatarStackItem}
          style={{ zIndex: shown.length - i }}
        >
          <Avatar user={u} size="sm" index={i} />
        </div>
      ))}
    </div>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_META[role] ?? { label: role, color: "dim" };
  return (
    <span className={`${s.roleBadge} ${s[`role_${m.color}`]}`}>{m.label}</span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function ConvSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={s.skConvRow} />
      ))}
    </>
  );
}

function MsgSkeletons() {
  return (
    <div className={s.msgSkeletons}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`${s.skMsgBubble} ${i % 2 === 0 ? s.skLeft : s.skRight}`}
        />
      ))}
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────
function DateDivider({ date }) {
  return (
    <div className={s.dateDivider}>
      <div className={s.dateDividerLine} />
      <span className={s.dateDividerLabel}>{fmtDateFull(date)}</span>
      <div className={s.dateDividerLine} />
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, participants, isFirst, showDate, prevMsg }) {
  // Assign a consistent side to each participant
  const p0Id = participants[0]?.id;
  const isLeft = msg.senderId !== p0Id; // right = first participant, left = second
  const sender = msg.sender;

  // Group consecutive messages from same sender (show avatar only on last in group)
  const showSender = !prevMsg || prevMsg.senderId !== msg.senderId || showDate;

  return (
    <>
      {showDate && <DateDivider date={msg.createdAt} />}
      <div className={`${s.bubble} ${isLeft ? s.bubbleLeft : s.bubbleRight}`}>
        {/* Avatar — only show on first message of group (left side) */}
        {isLeft ? (
          <div className={s.bubbleAvatarWrap}>
            {showSender ? (
              <Avatar user={sender} size="xs" index={1} />
            ) : (
              <div className={s.bubbleAvatarSpacer} />
            )}
          </div>
        ) : null}

        <div className={s.bubbleCol}>
          {showSender && (
            <span
              className={`${s.bubbleSenderName} ${isLeft ? s.bubbleSenderLeft : s.bubbleSenderRight}`}
            >
              {sender?.firstName} {sender?.lastName}
            </span>
          )}
          <div
            className={`${s.bubbleContent} ${isLeft ? s.bubbleContentLeft : s.bubbleContentRight}`}
          >
            <p className={s.bubbleText}>{msg.content}</p>
            <span className={s.bubbleTime}>{fmtTime(msg.createdAt)}</span>
          </div>
        </div>

        {/* Avatar right side */}
        {!isLeft ? (
          <div className={s.bubbleAvatarWrap}>
            {showSender ? (
              <Avatar user={sender} size="xs" index={0} />
            ) : (
              <div className={s.bubbleAvatarSpacer} />
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvRow({ conv, active, onClick, searchQuery }) {
  const participants = getParticipants(conv);
  const lastMsg = conv.messages?.[0];
  const msgCount = conv._count?.messages ?? 0;
  const hasBooking = !!conv.bookingId;
  const names = participants
    .map((u) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim())
    .join(" & ");
  const lastMsgContent = lastMsg?.content ?? "";

  // Highlight search match
  function highlight(str) {
    if (!searchQuery || !str) return str;
    const re = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = str.split(re);
    return parts.map((p, i) =>
      re.test(p) ? (
        <mark key={i} className={s.highlight}>
          {p}
        </mark>
      ) : (
        p
      ),
    );
  }

  return (
    <button
      className={`${s.convRow} ${active ? s.convRowActive : ""}`}
      onClick={onClick}
    >
      <AvatarStack participants={participants} />

      <div className={s.convInfo}>
        <div className={s.convTopRow}>
          <span className={s.convNames}>{highlight(names)}</span>
          <span className={s.convTime}>{fmtDate(conv.updatedAt)}</span>
        </div>
        <div className={s.convBottomRow}>
          <span className={s.convPreview}>
            {highlight(truncate(lastMsgContent))}
          </span>
          <div className={s.convMeta}>
            {hasBooking && <span className={s.bookingTag}>📅</span>}
            <span className={s.msgCountBadge}>{msgCount}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Thread Header ────────────────────────────────────────────────────────────
function ThreadHeader({ conv, onClose }) {
  if (!conv) return null;
  const participants = getParticipants(conv);
  const msgCount = conv._count?.messages ?? 0;

  return (
    <div className={s.threadHeader}>
      <button
        className={s.threadBackBtn}
        onClick={onClose}
        title="Back to list"
      >
        ←
      </button>

      <div className={s.threadHeaderParticipants}>
        {participants.map((u, i) => (
          <div key={u?.id ?? i} className={s.threadParticipant}>
            <Avatar user={u} size="sm" index={i} />
            <div className={s.threadParticipantInfo}>
              <span className={s.threadParticipantName}>
                {u?.firstName} {u?.lastName}
              </span>
              <RoleBadge role={u?.role} />
            </div>
          </div>
        ))}
      </div>

      <div className={s.threadHeaderRight}>
        {conv.bookingId && (
          <span className={s.threadBookingTag}>📅 Booking</span>
        )}
        <span className={s.threadMsgCount}>{msgCount} messages</span>
      </div>
    </div>
  );
}

// ─── Empty Thread Pane ────────────────────────────────────────────────────────
function EmptyThread() {
  return (
    <div className={s.emptyThread}>
      <div className={s.emptyThreadIcon}>💬</div>
      <p className={s.emptyThreadTitle}>Select a conversation</p>
      <p className={s.emptyThreadSub}>
        Choose a conversation from the list to read the thread
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMessages() {
  // ── Conversations ────────────────────────────────────────────────────────────
  const [convs, setConvs] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [convPages, setConvPages] = useState(1);
  const [convTotal, setConvTotal] = useState(0);
  const [search, setSearch] = useState("");

  // ── Selected thread ──────────────────────────────────────────────────────────
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [msgPages, setMsgPages] = useState(1);
  const [msgTotal, setMsgTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Mobile pane toggle ───────────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState("list"); // "list" | "thread"

  const [toast, setToast] = useState(null);
  const threadEndRef = useRef(null);
  const searchTimer = useRef(null);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalMessages = convs.reduce(
    (sum, c) => sum + (c._count?.messages ?? 0),
    0,
  );
  const withBooking = convs.filter((c) => !!c.bookingId).length;
  const avgMsgCount =
    convs.length > 0
      ? Math.round(
          convs.reduce((s, c) => s + (c._count?.messages ?? 0), 0) /
            convs.length,
        )
      : 0;

  // ── Load conversations ────────────────────────────────────────────────────────
  const loadConvs = useCallback(async (pg = 1, q = search) => {
    if (pg === 1) setConvLoading(true);
    try {
      const params = { page: pg, limit: CONV_LIMIT };
      // Note: backend doesn't have search on conversations, we filter client-side
      const res = await api.get("/admin/conversations", { params });
      const d = res.data.data;
      setConvs(
        pg === 1 ? d.conversations : (prev) => [...prev, ...d.conversations],
      );
      setConvTotal(d.total);
      setConvPages(d.pages);
      setConvPage(pg);
    } catch {
      showToast("error", "Failed to load conversations.");
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConvs(1);
  }, []);

  // ── Load thread messages ──────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId, pg = 1, append = false) => {
    if (pg === 1 && !append) setMsgLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get(`/admin/conversations/${convId}`, {
        params: { page: pg, limit: MSG_LIMIT },
      });
      const d = res.data.data;
      setMessages(append ? (prev) => [...d.messages, ...prev] : d.messages);
      setMsgTotal(d.total);
      setMsgPages(d.pages);
      setMsgPage(pg);
    } catch {
      showToast("error", "Failed to load messages.");
    } finally {
      setMsgLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Select a conversation
  function selectConv(conv) {
    setActiveConv(conv);
    setMessages([]);
    setMsgPage(1);
    setMobileView("thread");
    loadMessages(conv.id, 1, false);
  }

  // Scroll to bottom on new messages loaded (pg=1)
  useEffect(() => {
    if (msgPage === 1 && messages.length > 0) {
      setTimeout(
        () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    }
  }, [messages, msgPage]);

  // ── Search (client-side filter over loaded convs) ─────────────────────────────
  function handleSearch(e) {
    const val = e.target.value;
    setSearch(val);
  }

  const filteredConvs = search.trim()
    ? convs.filter((c) => {
        const names = getParticipants(c)
          .map(
            (u) =>
              `${u?.firstName ?? ""} ${u?.lastName ?? ""} ${u?.email ?? ""}`,
          )
          .join(" ")
          .toLowerCase();
        return names.includes(search.toLowerCase());
      })
    : convs;

  // ── Toast ────────────────────────────────────────────────────────────────────
  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Get participants of active conv ──────────────────────────────────────────
  const activeParticipants = activeConv ? getParticipants(activeConv) : [];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Platform</p>
            <h1 className={s.pageTitle}>
              Messages
              {convTotal > 0 && (
                <span className={s.countPill}>{convTotal}</span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Read-only oversight of all user conversations
            </p>
          </div>
          <div className={s.readOnlyBanner}>
            <span className={s.readOnlyDot} />
            <span className={s.readOnlyText}>Read-only view</span>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon="💬"
            label="Conversations"
            value={convTotal}
            sub="All platform"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon="📨"
            label="Messages"
            value={totalMessages}
            sub="This page total"
            accent="indigo"
            delay={0.05}
          />
          <StatCard
            icon="📅"
            label="With Booking"
            value={withBooking}
            sub="Linked to a booking"
            accent="green"
            delay={0.1}
          />
          <StatCard
            icon="📊"
            label="Avg. Messages"
            value={avgMsgCount}
            sub="Per conversation"
            accent="yellow"
            delay={0.15}
          />
        </div>

        {/* ── Mobile tabs ── */}
        <div className={s.mobileTabs}>
          <button
            className={`${s.mobileTab} ${mobileView === "list" ? s.mobileTabActive : ""}`}
            onClick={() => setMobileView("list")}
          >
            📋 Conversations
            {convTotal > 0 && (
              <span className={s.mobileTabCount}>{convTotal}</span>
            )}
          </button>
          <button
            className={`${s.mobileTab} ${mobileView === "thread" ? s.mobileTabActive : ""}`}
            onClick={() => setMobileView("thread")}
            disabled={!activeConv}
          >
            💬 Thread
            {activeConv && <span className={s.mobileTabCount}>{msgTotal}</span>}
          </button>
        </div>

        {/* ── Split pane ── */}
        <div className={s.splitPane}>
          {/* ── LEFT: Conversations list ── */}
          <div
            className={`${s.convPane} ${mobileView === "thread" ? s.convPaneHidden : ""}`}
          >
            {/* Search */}
            <div className={s.convSearch}>
              <span className={s.searchIcon}>🔍</span>
              <input
                className={s.searchInput}
                placeholder="Search by name or email…"
                value={search}
                onChange={handleSearch}
              />
              {search && (
                <button className={s.searchClear} onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>

            {/* List */}
            <div className={s.convList}>
              {convLoading ? (
                <ConvSkeletons />
              ) : filteredConvs.length === 0 ? (
                <div className={s.convEmpty}>
                  <span>💭</span>
                  <p>
                    {search
                      ? "No conversations match your search."
                      : "No conversations yet."}
                  </p>
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <ConvRow
                    key={conv.id}
                    conv={conv}
                    active={activeConv?.id === conv.id}
                    onClick={() => selectConv(conv)}
                    searchQuery={search}
                  />
                ))
              )}
            </div>

            {/* Load more conversations */}
            {convPage < convPages && (
              <div className={s.convLoadMore}>
                <button
                  className={s.loadMoreBtn}
                  onClick={() => loadConvs(convPage + 1)}
                >
                  Load more conversations
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Thread view ── */}
          <div
            className={`${s.threadPane} ${mobileView === "list" ? s.threadPaneHidden : ""}`}
          >
            {!activeConv ? (
              <EmptyThread />
            ) : (
              <>
                {/* Thread header */}
                <ThreadHeader
                  conv={activeConv}
                  onClose={() => {
                    setMobileView("list");
                  }}
                />

                {/* Messages */}
                <div className={s.threadBody}>
                  {/* Load earlier messages */}
                  {msgPage < msgPages && !loadingMore && (
                    <div className={s.loadEarlierWrap}>
                      <button
                        className={s.loadEarlierBtn}
                        onClick={() =>
                          loadMessages(activeConv.id, msgPage + 1, true)
                        }
                      >
                        ↑ Load earlier messages
                      </button>
                    </div>
                  )}
                  {loadingMore && (
                    <div className={s.loadingMore}>
                      <span className={s.spinner} />
                    </div>
                  )}

                  {msgLoading ? (
                    <MsgSkeletons />
                  ) : messages.length === 0 ? (
                    <div className={s.noMessages}>
                      <span>📭</span>
                      <p>No messages in this conversation.</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const prev = messages[i - 1];
                      const showDate =
                        !prev || !isSameDay(prev.createdAt, msg.createdAt);
                      return (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          participants={activeParticipants}
                          isFirst={i === 0}
                          showDate={showDate}
                          prevMsg={prev}
                        />
                      );
                    })
                  )}

                  {/* Scroll anchor */}
                  <div ref={threadEndRef} />
                </div>

                {/* Read-only footer */}
                <div className={s.threadFooter}>
                  <div className={s.readOnlyFooter}>
                    <span className={s.readOnlyFooterIcon}>🔒</span>
                    <p className={s.readOnlyFooterText}>
                      Admin view only · {msgTotal} message
                      {msgTotal !== 1 ? "s" : ""} in this conversation
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
