// src/pages/messages/AdminMessages.jsx
// Full admin conversation oversight — read-only.
// Fixes: image messages styled + clickable lightbox, thread fills full screen.

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
  const diff = Date.now() - dt;
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

function getParticipants(conv) {
  return (conv.users ?? []).map((cu) => cu.user).filter(Boolean);
}

function isSameDay(a, b) {
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// Detect whether a string looks like an image URL
function isImageUrl(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  // Direct image extension
  if (
    /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(
      trimmed,
    )
  )
    return true;
  // Common CDN patterns that serve images
  if (
    /^https?:\/\/.*(cloudinary\.com|cloudfront\.net|amazonaws\.com|supabase\.co|firebase\w*\.app|imgix\.net|imagekit\.io|res\.cloudinary\.com)\/.+/i.test(
      trimmed,
    )
  )
    return true;
  return false;
}

// Parse a message object into { type, text, imageUrls }
function parseContent(msg) {
  // Explicit image fields from the backend
  const explicitImages = [
    ...(Array.isArray(msg.images) ? msg.images : []),
    ...(Array.isArray(msg.imageUrls) ? msg.imageUrls : []),
    ...(Array.isArray(msg.attachments)
      ? msg.attachments.map((a) => a?.url ?? a)
      : []),
    ...(msg.imageUrl ? [msg.imageUrl] : []),
  ].filter((u) => typeof u === "string" && u.length > 0);

  const raw = msg.content ?? "";

  // If the entire content is an image URL and no explicit images
  if (!explicitImages.length && isImageUrl(raw.trim())) {
    return { type: "image", text: "", imageUrls: [raw.trim()] };
  }

  // If there are explicit image fields
  if (explicitImages.length > 0) {
    return {
      type: raw.trim() ? "mixed" : "image",
      text: raw.trim(),
      imageUrls: explicitImages,
    };
  }

  // Mixed content: lines may contain image URLs
  const lines = raw.split("\n");
  const imgLines = lines.filter((l) => isImageUrl(l.trim()));
  const textLines = lines.filter((l) => !isImageUrl(l.trim()) && l.trim());

  if (imgLines.length > 0) {
    return {
      type: textLines.length > 0 ? "mixed" : "image",
      text: textLines.join("\n").trim(),
      imageUrls: imgLines.map((l) => l.trim()),
    };
  }

  return { type: "text", text: raw, imageUrls: [] };
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className={s.lightbox} onClick={onClose}>
      <button className={s.lightboxClose} onClick={onClose} title="Close (Esc)">
        ✕
      </button>
      <div className={s.lightboxImgWrap} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Full size attachment" className={s.lightboxImg} />
      </div>
    </div>
  );
}

// ─── Message image group ──────────────────────────────────────────────────────
function MsgImages({ urls, onImageClick }) {
  const count = urls.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className={s.msgImgSingle} onClick={() => onImageClick(urls[0])}>
        <img src={urls[0]} alt="attachment" className={s.msgImgFull} />
        <div className={s.msgImgOverlay} />
      </div>
    );
  }

  const shown = urls.slice(0, 4);
  const extra = count - 4;

  return (
    <div
      className={`${s.msgImgGrid} ${count >= 3 ? s.msgImgGrid3 : s.msgImgGrid2}`}
    >
      {shown.map((url, i) => (
        <div key={i} className={s.msgImgCell} onClick={() => onImageClick(url)}>
          <img src={url} alt="attachment" className={s.msgImgThumb} />
          {i === 3 && extra > 0 && <div className={s.msgImgMore}>+{extra}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm", index = 0 }) {
  const sizeClass =
    { sm: s.avatar, md: s.avatarMd, lg: s.avatarLg, xs: s.avatarXs }[size] ??
    s.avatar;
  const colorClass = [
    s.avatarOrange,
    s.avatarIndigo,
    s.avatarGreen,
    s.avatarRose,
  ][index % 4];
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

function AvatarStack({ participants }) {
  return (
    <div className={s.avatarStack}>
      {participants.slice(0, 2).map((u, i) => (
        <div
          key={u?.id ?? i}
          className={s.avatarStackItem}
          style={{ zIndex: 2 - i }}
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

// ─── Skeletons ────────────────────────────────────────────────────────────────
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
      {[60, 45, 70, 38, 55, 48, 65].map((w, i) => (
        <div
          key={i}
          className={`${s.skMsgBubble} ${i % 2 === 0 ? s.skLeft : s.skRight}`}
          style={{ width: `${w}%` }}
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
function MessageBubble({ msg, participants, showDate, prevMsg, onImageClick }) {
  const p0Id = participants[0]?.id;
  const isLeft = msg.senderId !== p0Id;
  const sender = msg.sender;
  const showSender = !prevMsg || prevMsg.senderId !== msg.senderId || showDate;
  const parsed = parseContent(msg);
  const hasImg = parsed.imageUrls.length > 0;
  const hasText = parsed.text.length > 0;

  return (
    <>
      {showDate && <DateDivider date={msg.createdAt} />}
      <div
        className={`${s.bubbleWrap} ${isLeft ? s.bubbleWrapLeft : s.bubbleWrapRight}`}
      >
        {/* Avatar slot */}
        <div className={s.bubbleAvatar}>
          {showSender ? (
            <Avatar user={sender} size="xs" index={isLeft ? 1 : 0} />
          ) : (
            <div className={s.bubbleAvatarGap} />
          )}
        </div>

        <div
          className={`${s.bubbleCol} ${isLeft ? s.bubbleColLeft : s.bubbleColRight}`}
        >
          {showSender && (
            <span
              className={`${s.bubbleSender} ${isLeft ? s.bubbleSenderLeft : s.bubbleSenderRight}`}
            >
              {sender?.firstName} {sender?.lastName}
            </span>
          )}

          {/* Images */}
          {hasImg && (
            <div
              className={`${s.bubbleImgs} ${isLeft ? s.bubbleImgsLeft : s.bubbleImgsRight}`}
            >
              <MsgImages urls={parsed.imageUrls} onImageClick={onImageClick} />
            </div>
          )}

          {/* Text */}
          {hasText && (
            <div
              className={`${s.bubble} ${isLeft ? s.bubbleLeft : s.bubbleRight}`}
            >
              <p className={s.bubbleText}>{parsed.text}</p>
              <span className={s.bubbleTime}>{fmtTime(msg.createdAt)}</span>
            </div>
          )}

          {/* Time under image-only messages */}
          {hasImg && !hasText && (
            <span
              className={`${s.bubbleTimeOnly} ${isLeft ? s.bubbleTimeLeft : s.bubbleTimeRight}`}
            >
              {fmtTime(msg.createdAt)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvRow({ conv, active, onClick, searchQuery }) {
  const participants = getParticipants(conv);
  const lastMsg = conv.messages?.[0];
  const msgCount = conv._count?.messages ?? 0;
  const names = participants
    .map((u) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim())
    .join(" & ");
  const lastContent = lastMsg?.content ?? "";
  const previewText = isImageUrl(lastContent.trim())
    ? "📷 Image"
    : truncate(lastContent);

  function hl(str) {
    if (!searchQuery || !str) return str;
    const re = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = str.split(re);
    return parts.map((p, i) =>
      re.test(p) ? (
        <mark key={i} className={s.hl}>
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
          <span className={s.convNames}>{hl(names)}</span>
          <span className={s.convTime}>{fmtDate(conv.updatedAt)}</span>
        </div>
        <div className={s.convBottomRow}>
          <span className={s.convPreview}>{hl(previewText)}</span>
          <div className={s.convMeta}>
            {conv.bookingId && <span>📅</span>}
            <span className={s.convCount}>{msgCount}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Thread Header ────────────────────────────────────────────────────────────
function ThreadHeader({ conv, onBack }) {
  const participants = getParticipants(conv);
  const msgCount = conv._count?.messages ?? 0;
  return (
    <div className={s.threadHeader}>
      <button className={s.backBtn} onClick={onBack}>
        ←
      </button>
      <div className={s.threadParticipants}>
        {participants.map((u, i) => (
          <div key={u?.id ?? i} className={s.threadParticipant}>
            <Avatar user={u} size="sm" index={i} />
            <div className={s.threadParticipantMeta}>
              <span className={s.threadParticipantName}>
                {u?.firstName} {u?.lastName}
              </span>
              <RoleBadge role={u?.role} />
            </div>
          </div>
        ))}
      </div>
      <div className={s.threadHeaderRight}>
        {conv.bookingId && <span className={s.bookingTag}>📅 Booking</span>}
        <span className={s.threadCount}>{msgCount} msgs</span>
      </div>
    </div>
  );
}

// ─── Empty thread ─────────────────────────────────────────────────────────────
function EmptyThread() {
  return (
    <div className={s.emptyThread}>
      <span className={s.emptyThreadIcon}>💬</span>
      <p className={s.emptyThreadTitle}>Select a conversation</p>
      <p className={s.emptyThreadSub}>
        Choose from the list to read the thread
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMessages() {
  const [convs, setConvs] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [convPages, setConvPages] = useState(1);
  const [convTotal, setConvTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [msgPages, setMsgPages] = useState(1);
  const [msgTotal, setMsgTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mobileView, setMobileView] = useState("list");
  const [toast, setToast] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const threadEndRef = useRef(null);

  const totalMessages = convs.reduce(
    (s, c) => s + (c._count?.messages ?? 0),
    0,
  );
  const withBooking = convs.filter((c) => !!c.bookingId).length;
  const avgMsgCount = convs.length
    ? Math.round(
        convs.reduce((s, c) => s + (c._count?.messages ?? 0), 0) / convs.length,
      )
    : 0;

  // ── Load conversations ────────────────────────────────────────────────────────
  const loadConvs = useCallback(async (pg = 1) => {
    if (pg === 1) setConvLoading(true);
    try {
      const res = await api.get("/admin/conversations", {
        params: { page: pg, limit: CONV_LIMIT },
      });
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

  // ── Load thread ───────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId, pg = 1, append = false) => {
    if (!append) setMsgLoading(true);
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

  function selectConv(conv) {
    setActiveConv(conv);
    setMessages([]);
    setMsgPage(1);
    setMobileView("thread");
    loadMessages(conv.id, 1, false);
  }

  useEffect(() => {
    if (msgPage === 1 && messages.length > 0) {
      setTimeout(
        () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    }
  }, [messages, msgPage]);

  const filteredConvs = search.trim()
    ? convs.filter((c) =>
        getParticipants(c)
          .map(
            (u) =>
              `${u?.firstName ?? ""} ${u?.lastName ?? ""} ${u?.email ?? ""}`,
          )
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : convs;

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const activeParticipants = activeConv ? getParticipants(activeConv) : [];

  return (
    <AdminLayout>
      {/* Lightbox — rendered outside the page flow, covers everything */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div className={s.page}>
        {/* Toast */}
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

        {/* ── Top section (doesn't grow) ── */}
        <div className={s.topSection}>
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
              <span className={s.readOnlyText}>Read-only</span>
            </div>
          </div>

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

          {/* Mobile tabs */}
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
              {activeConv && (
                <span className={s.mobileTabCount}>{msgTotal}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Split pane — fills remaining height ── */}
        <div className={s.splitPane}>
          {/* LEFT — conversation list */}
          <div
            className={`${s.convPane} ${mobileView === "thread" ? s.convPaneHidden : ""}`}
          >
            <div className={s.convSearch}>
              <span className={s.searchIcon}>🔍</span>
              <input
                className={s.searchInput}
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className={s.searchClear} onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>

            <div className={s.convList}>
              {convLoading ? (
                <ConvSkeletons />
              ) : filteredConvs.length === 0 ? (
                <div className={s.convEmpty}>
                  <span>💭</span>
                  <p>
                    {search ? "No matches found." : "No conversations yet."}
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

            {convPage < convPages && (
              <div className={s.convLoadMore}>
                <button
                  className={s.loadMoreBtn}
                  onClick={() => loadConvs(convPage + 1)}
                >
                  Load more
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — thread */}
          <div
            className={`${s.threadPane} ${mobileView === "list" ? s.threadPaneHidden : ""}`}
          >
            {!activeConv ? (
              <EmptyThread />
            ) : (
              <>
                <ThreadHeader
                  conv={activeConv}
                  onBack={() => setMobileView("list")}
                />

                <div className={s.threadBody}>
                  {/* Load earlier */}
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
                    <div className={s.spinnerRow}>
                      <span className={s.spinner} />
                    </div>
                  )}

                  {msgLoading ? (
                    <MsgSkeletons />
                  ) : messages.length === 0 ? (
                    <div className={s.noMsgs}>
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
                          showDate={showDate}
                          prevMsg={prev}
                          onImageClick={setLightboxSrc}
                        />
                      );
                    })
                  )}
                  <div ref={threadEndRef} />
                </div>

                <div className={s.threadFooter}>
                  <span>🔒</span>
                  <span className={s.threadFooterText}>
                    Admin read-only · {msgTotal} message
                    {msgTotal !== 1 ? "s" : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
