// src/pages/posts/AdminPosts.jsx
// Full admin community posts management.
// Endpoints:
//   GET    /admin/posts?type=&search=&page=&limit=
//   DELETE /admin/posts/:postId              { reason }
//   DELETE /admin/posts/comments/:commentId
//   GET    /posts/:id/comments               (read post comments in detail view)

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminPosts.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { key: "ALL", label: "All" },
  { key: "GENERAL", label: "General" },
  { key: "JOB_UPDATE", label: "Job Update" },
  { key: "ACHIEVEMENT", label: "Achievement" },
  { key: "PORTFOLIO", label: "Portfolio" },
  { key: "ANNOUNCEMENT", label: "Announcement" },
  { key: "HIRING", label: "Hiring" },
];

const POST_TYPE_META = {
  GENERAL: { label: "General", icon: "📝", color: "dim" },
  JOB_UPDATE: { label: "Job Update", icon: "💼", color: "orange" },
  ACHIEVEMENT: { label: "Achievement", icon: "🏆", color: "gold" },
  PORTFOLIO: { label: "Portfolio", icon: "🖼️", color: "indigo" },
  ANNOUNCEMENT: { label: "Announcement", icon: "📢", color: "red" },
  HIRING: { label: "Hiring", icon: "👥", color: "green" },
};

const ROLE_META = {
  WORKER: { label: "Worker", color: "orange" },
  HIRER: { label: "Hirer", color: "indigo" },
  ADMIN: { label: "Admin", color: "red" },
};

const REACTION_ICONS = {
  LIKE: "👍",
  LOVE: "❤️",
  INSIGHTFUL: "💡",
  CELEBRATE: "🎉",
  SUPPORT: "🤝",
};

const LIMIT = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function truncate(str, n = 120) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm" }) {
  return (
    <div
      className={`${s.avatar} ${size === "lg" ? s.avatarLg : size === "xs" ? s.avatarXs : ""}`}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const m = POST_TYPE_META[type] ?? { label: type, icon: "📝", color: "dim" };
  return (
    <span className={`${s.typeBadge} ${s[`type_${m.color}`]}`}>
      {m.icon} {m.label}
    </span>
  );
}

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

// ─── Image Strip ─────────────────────────────────────────────────────────────
function ImageStrip({ images, max = 3 }) {
  if (!images?.length) return null;
  const shown = images.slice(0, max);
  const excess = images.length - max;
  return (
    <div className={s.imageStrip}>
      {shown.map((url, i) => (
        <img key={i} src={url} alt="" className={s.imgThumb} />
      ))}
      {excess > 0 && <div className={s.imgMore}>+{excess}</div>}
    </div>
  );
}

// ─── Engagement Row ───────────────────────────────────────────────────────────
function Engagement({ reactions, comments }) {
  return (
    <div className={s.engagement}>
      <span className={s.engItem}>💬 {comments ?? 0}</span>
      <span className={s.engItem}>⚡ {reactions ?? 0}</span>
    </div>
  );
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skCard} />
      ))}
    </>
  );
}

// ─── Delete Post Modal ────────────────────────────────────────────────────────
function DeletePostModal({ post, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/admin/posts/${post.id}`, { data: { reason } });
      onSuccess(`Post by ${post.author?.firstName} removed.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete post.");
    } finally {
      setLoading(false);
    }
  }

  const typeMeta = POST_TYPE_META[post.type] ?? {
    label: post.type,
    icon: "📝",
  };

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>🗑 Delete Post</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <span>⚠️</span>
            <p>
              This post and all its comments will be permanently deleted. The
              author will be notified.
            </p>
          </div>

          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Author</span>
              <span className={s.summaryVal}>
                {post.author?.firstName} {post.author?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Type</span>
              <span className={s.summaryVal}>
                {typeMeta.icon} {typeMeta.label}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Content</span>
              <span className={`${s.summaryVal} ${s.contentPreview}`}>
                {truncate(post.content, 60)}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Engagement</span>
              <span className={s.summaryVal}>
                {post._count?.reactions ?? 0} reactions ·{" "}
                {post._count?.comments ?? 0} comments
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>
              Reason (sent to author as notification)
            </label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Post violates our community guidelines regarding spam content."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnDelete}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <span className={s.spinner} /> : "🗑 Delete Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Comment Modal ─────────────────────────────────────────────────────
function DeleteCommentModal({ comment, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/admin/posts/comments/${comment.id}`);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete comment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>🗑 Delete Comment</h3>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <span>⚠️</span>
            <p>This comment will be permanently deleted.</p>
          </div>
          <div className={s.commentPreviewBox}>
            <div className={s.commentPreviewMeta}>
              {comment.author?.firstName} {comment.author?.lastName} ·{" "}
              {fmtRelative(comment.createdAt)}
            </div>
            <p className={s.commentPreviewText}>
              {truncate(comment.content, 150)}
            </p>
          </div>
          {error && <p className={s.inlineError}>{error}</p>}
          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnDelete}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <span className={s.spinner} /> : "🗑 Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────
function PostDetailModal({ post, onClose, onDeletePost }) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [deleteComment, setDeleteComment] = useState(null);
  const [activeImg, setActiveImg] = useState(null);

  // Load comments from regular endpoint
  useEffect(() => {
    api
      .get(`/posts/${post.id}/comments`, { params: { limit: 50 } })
      .then((r) => setComments(r.data.data?.comments ?? r.data.data ?? []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [post.id]);

  function handleCommentDeleteSuccess() {
    setComments((prev) => prev.filter((c) => c.id !== deleteComment.id));
    setDeleteComment(null);
  }

  const typeMeta = POST_TYPE_META[post.type] ?? {
    label: post.type,
    icon: "📝",
    color: "dim",
  };
  const images = post.images ?? [];

  return (
    <>
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modalLg} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={s.modalHeader}>
            <div className={s.modalTitleRow}>
              <TypeBadge type={post.type} />
              <span className={s.modalPublicTag}>
                {post.isPublic ? "🌐 Public" : "🔒 Private"}
              </span>
            </div>
            <button className={s.modalClose} onClick={onClose}>
              ✕
            </button>
          </div>

          <div className={s.modalBody}>
            {/* Author */}
            <div className={s.detailAuthor}>
              <Avatar user={post.author} size="lg" />
              <div className={s.detailAuthorInfo}>
                <span className={s.detailAuthorName}>
                  {post.author?.firstName} {post.author?.lastName}
                </span>
                <div className={s.detailAuthorMeta}>
                  <RoleBadge role={post.author?.role} />
                  <span className={s.detailDate}>
                    {fmtRelative(post.createdAt)} · {fmtDate(post.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className={s.detailContent}>{post.content}</div>

            {/* Images */}
            {images.length > 0 && (
              <div className={s.detailImages}>
                {images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className={s.detailImg}
                    onClick={() => setActiveImg(url)}
                  />
                ))}
              </div>
            )}

            {/* Engagement stats */}
            <div className={s.detailStats}>
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>
                  {post._count?.reactions ?? 0}
                </span>
                <span className={s.detailStatLabel}>Reactions</span>
              </div>
              <div className={s.detailStatDivider} />
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>{comments.length}</span>
                <span className={s.detailStatLabel}>Comments</span>
              </div>
              <div className={s.detailStatDivider} />
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>
                  {post.isPublic ? "Public" : "Private"}
                </span>
                <span className={s.detailStatLabel}>Visibility</span>
              </div>
            </div>

            {/* Comments section */}
            <div className={s.commentsSection}>
              <div className={s.commentsSectionHeader}>
                <span className={s.commentsSectionTitle}>
                  💬 Comments {!commentsLoading && `(${comments.length})`}
                </span>
                {commentsLoading && <span className={s.spinner} />}
              </div>

              {!commentsLoading && comments.length === 0 && (
                <p className={s.noComments}>No comments on this post.</p>
              )}

              <div className={s.commentsList}>
                {comments.map((c) => (
                  <div key={c.id} className={s.commentRow}>
                    <Avatar user={c.author} size="xs" />
                    <div className={s.commentBody}>
                      <div className={s.commentMeta}>
                        <span className={s.commentAuthor}>
                          {c.author?.firstName} {c.author?.lastName}
                        </span>
                        <span className={s.commentDate}>
                          {fmtRelative(c.createdAt)}
                        </span>
                      </div>
                      <p className={s.commentText}>{c.content}</p>
                    </div>
                    <button
                      className={s.commentDeleteBtn}
                      onClick={() => setDeleteComment(c)}
                      title="Delete comment"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete post button */}
            <div className={s.detailFooter}>
              <button
                className={s.btnDeletePost}
                onClick={() => {
                  onClose();
                  onDeletePost(post);
                }}
              >
                🗑 Delete This Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen image lightbox */}
      {activeImg && (
        <div className={s.lightbox} onClick={() => setActiveImg(null)}>
          <img src={activeImg} alt="" className={s.lightboxImg} />
          <button className={s.lightboxClose}>✕</button>
        </div>
      )}

      {/* Delete comment sub-modal */}
      {deleteComment && (
        <DeleteCommentModal
          comment={deleteComment}
          onClose={() => setDeleteComment(null)}
          onSuccess={handleCommentDeleteSuccess}
        />
      )}
    </>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, index, onView, onDelete }) {
  const typeMeta = POST_TYPE_META[post.type] ?? {
    label: post.type,
    icon: "📝",
    color: "dim",
  };
  const images = post.images ?? [];
  const hasImages = images.length > 0;

  return (
    <div className={s.postCard} style={{ animationDelay: `${index * 0.03}s` }}>
      {/* Card top: author + type + date */}
      <div className={s.cardTop}>
        <Avatar user={post.author} />
        <div className={s.cardAuthorInfo}>
          <div className={s.cardAuthorRow}>
            <span className={s.cardAuthorName}>
              {post.author?.firstName} {post.author?.lastName}
            </span>
            <RoleBadge role={post.author?.role} />
          </div>
          <span className={s.cardDate}>{fmtRelative(post.createdAt)}</span>
        </div>
        <div className={s.cardTopRight}>
          <TypeBadge type={post.type} />
          {!post.isPublic && <span className={s.privatePill}>🔒</span>}
        </div>
      </div>

      {/* Content */}
      <p className={s.cardContent}>
        {truncate(post.content, hasImages ? 80 : 140)}
      </p>

      {/* Images */}
      {hasImages && <ImageStrip images={images} max={3} />}

      {/* Footer: engagement + actions */}
      <div className={s.cardFooter}>
        <Engagement
          reactions={post._count?.reactions}
          comments={post._count?.comments}
        />
        <div className={s.cardActions}>
          <button
            className={s.viewBtn}
            onClick={() => onView(post)}
            title="View post"
          >
            👁 View
          </button>
          <button
            className={s.delBtn}
            onClick={() => onDelete(post)}
            title="Delete post"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);

  // Modals
  const [viewPost, setViewPost] = useState(null);
  const [deletePost, setDeletePost] = useState(null);

  const searchTimer = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, type = typeFilter, q = search) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (type !== "ALL") params.type = type;
        if (q.trim()) params.search = q.trim();

        const res = await api.get("/admin/posts", { params });
        const d = res.data.data;

        setPosts(d.posts);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);
      } catch {
        showToast("error", "Failed to load posts.");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, search],
  );

  useEffect(() => {
    load(1, typeFilter, search);
  }, [typeFilter]);

  // ── Aggregates from current page ────────────────────────────────────────────
  const totalReactions = posts.reduce(
    (s, p) => s + (p._count?.reactions ?? 0),
    0,
  );
  const totalComments = posts.reduce(
    (s, p) => s + (p._count?.comments ?? 0),
    0,
  );
  const postsWithImages = posts.filter((p) => p.images?.length > 0).length;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, typeFilter, val), 380);
  }

  function handleTypeChange(key) {
    setTypeFilter(key);
    setSearch("");
    setPage(1);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleDeleteSuccess(msg) {
    setDeletePost(null);
    setViewPost(null);
    showToast("success", msg);
    load(page, typeFilter, search);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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
            <p className={s.eyebrow}>Community</p>
            <h1 className={s.pageTitle}>
              Posts
              {total > 0 && <span className={s.countPill}>{total}</span>}
            </h1>
            <p className={s.pageSubtitle}>
              Moderate community posts, manage content and remove violations
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon="📝"
            label="Total Posts"
            value={total}
            sub="All types"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon="⚡"
            label="Reactions"
            value={totalReactions}
            sub="This page"
            accent="gold"
            delay={0.05}
          />
          <StatCard
            icon="💬"
            label="Comments"
            value={totalComments}
            sub="This page"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon="🖼️"
            label="Has Media"
            value={postsWithImages}
            sub="Posts with images"
            accent="green"
            delay={0.15}
          />
        </div>

        {/* ── Post type breakdown bar ── */}
        <div className={s.typeBreakdown}>
          {TYPE_TABS.slice(1).map((tab) => {
            const count = posts.filter((p) => p.type === tab.key).length;
            const meta = POST_TYPE_META[tab.key];
            return (
              <button
                key={tab.key}
                className={`${s.typeBreakdownItem} ${typeFilter === tab.key ? s.typeBreakdownActive : ""}`}
                onClick={() => handleTypeChange(tab.key)}
              >
                <span className={s.typeBreakdownIcon}>{meta.icon}</span>
                <span className={s.typeBreakdownLabel}>{tab.label}</span>
                <span className={s.typeBreakdownCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${typeFilter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTypeChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Search post content…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                className={s.searchClear}
                onClick={() => {
                  setSearch("");
                  load(1, typeFilter, "");
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Post Grid ── */}
        {loading ? (
          <div className={s.postGrid}>
            <SkeletonCards />
          </div>
        ) : posts.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>📭</span>
            <p className={s.emptyTitle}>
              {typeFilter === "ALL" && !search
                ? "No posts yet"
                : "No posts match your filters"}
            </p>
            <p className={s.emptySub}>
              {typeFilter !== "ALL" || search
                ? "Try a different type or clear your search."
                : "Community posts will appear here."}
            </p>
            {(typeFilter !== "ALL" || search) && (
              <button
                className={s.emptyReset}
                onClick={() => {
                  handleTypeChange("ALL");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={s.postGrid}>
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i}
                onView={setViewPost}
                onDelete={setDeletePost}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {viewPost && (
        <PostDetailModal
          post={viewPost}
          onClose={() => setViewPost(null)}
          onDeletePost={(p) => {
            setViewPost(null);
            setDeletePost(p);
          }}
        />
      )}

      {deletePost && (
        <DeletePostModal
          post={deletePost}
          onClose={() => setDeletePost(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </AdminLayout>
  );
}
