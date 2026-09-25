// src/pages/posts/AdminPosts.jsx
// Full admin community posts management.
// Endpoints:
//   GET    /admin/posts?type=&search=&page=&limit=
//   DELETE /admin/posts/:postId              { reason }
//   DELETE /admin/posts/comments/:commentId
//   GET    /posts/:id/comments               (read post comments in detail view)
//   GET    /posts/:id                        (full post incl. reactions + repostOf)
//
// Renders EVERY field the backend sends. Uses Lucide icons, fully responsive.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Briefcase,
  Trophy,
  Image as ImageIcon,
  Megaphone,
  Users,
  ThumbsUp,
  Heart,
  Lightbulb,
  PartyPopper,
  Handshake,
  Globe,
  Lock,
  Eye,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Search,
  X,
  MessageCircle,
  Zap,
  Repeat,
  Pencil,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
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
  GENERAL: { label: "General", Icon: FileText, color: "dim" },
  JOB_UPDATE: { label: "Job Update", Icon: Briefcase, color: "orange" },
  ACHIEVEMENT: { label: "Achievement", Icon: Trophy, color: "gold" },
  PORTFOLIO: { label: "Portfolio", Icon: ImageIcon, color: "indigo" },
  ANNOUNCEMENT: { label: "Announcement", Icon: Megaphone, color: "red" },
  HIRING: { label: "Hiring", Icon: Users, color: "green" },
};

const ROLE_META = {
  WORKER: { label: "Worker", color: "orange" },
  HIRER: { label: "Hirer", color: "indigo" },
  ADMIN: { label: "Admin", color: "red" },
};

const REACTION_ICONS = {
  LIKE: ThumbsUp,
  LOVE: Heart,
  INSIGHTFUL: Lightbulb,
  CELEBRATE: PartyPopper,
  SUPPORT: Handshake,
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

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ─── Copy pill ────────────────────────────────────────────────────────────────
function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={s.dimText}>—</span>;
  return (
    <span className={s.copyPill} title={String(text)}>
      <span className={s.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={s.copyPillBtn}
        onClick={async (e) => {
          e.stopPropagation();
          if (await copyText(text)) {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }
        }}
        title="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
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
  const m = POST_TYPE_META[type] ?? {
    label: type,
    Icon: FileText,
    color: "dim",
  };
  const Icon = m.Icon;
  return (
    <span className={`${s.typeBadge} ${s[`type_${m.color}`]}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] ?? { label: role, color: "dim" };
  return (
    <span className={`${s.roleBadge} ${s[`role_${m.color}`]}`}>{m.label}</span>
  );
}

function VisibilityBadge({ isPublic }) {
  return (
    <span
      className={`${s.visibilityBadge} ${isPublic ? s.visibilityPublic : s.visibilityPrivate}`}
    >
      {isPublic ? <Globe size={10} /> : <Lock size={10} />}
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  const Icon = icon;
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{Icon ? <Icon size={18} /> : null}</span>
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
function Engagement({ reactions, comments, reposts, views }) {
  return (
    <div className={s.engagement}>
      <span className={s.engItem} title="Comments">
        <MessageCircle size={12} /> {comments ?? 0}
      </span>
      <span className={s.engItem} title="Reactions">
        <Zap size={12} /> {reactions ?? 0}
      </span>
      <span className={s.engItem} title="Reposts">
        <Repeat size={12} /> {reposts ?? 0}
      </span>
      <span className={s.engItem} title="Views">
        <Eye size={12} /> {views ?? 0}
      </span>
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
    Icon: FileText,
  };
  const TypeIcon = typeMeta.Icon;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <Trash2 size={15} /> Delete Post
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <AlertTriangle size={16} />
            <p>
              This post and all its comments will be permanently deleted. The
              author will be notified.
            </p>
          </div>

          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Post ID</span>
              <span className={`${s.summaryVal} ${s.mono}`}>
                <CopyPill text={post.id} label={post.id.slice(0, 12) + "…"} />
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Author</span>
              <span className={s.summaryVal}>
                {post.author?.firstName} {post.author?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Type</span>
              <span className={s.summaryVal}>
                <TypeIcon size={11} /> {typeMeta.label}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Visibility</span>
              <span className={s.summaryVal}>
                {post.isPublic ? "Public" : "Private"}
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
                {post._count?.comments ?? 0} comments ·{" "}
                {post._count?.reposts ?? 0} reposts
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Views</span>
              <span className={s.summaryVal}>{post.viewCount ?? 0}</span>
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
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <Trash2 size={13} /> Delete Post
                </>
              )}
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
          <h3 className={s.modalTitle}>
            <Trash2 size={15} /> Delete Comment
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className={s.modalBody}>
          <div className={s.deleteWarning}>
            <AlertTriangle size={16} />
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
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <Trash2 size={13} /> Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reaction Breakdown ───────────────────────────────────────────────────────
function ReactionBreakdown({ reactions }) {
  if (!Array.isArray(reactions) || reactions.length === 0) return null;
  const byType = reactions.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className={s.reactionBreakdown}>
      {Object.entries(byType).map(([type, count]) => {
        const Icon = REACTION_ICONS[type];
        return (
          <span key={type} className={s.reactionChip}>
            {Icon ? <Icon size={11} /> : null} {type.toLowerCase()} · {count}
          </span>
        );
      })}
    </div>
  );
}

// ─── Comment Row ─────────────────────────────────────────────────────────────
function CommentRow({ comment, onDelete, indent = false }) {
  return (
    <div
      className={s.commentRow}
      style={indent ? { paddingLeft: "2.25rem" } : undefined}
    >
      <Avatar user={comment.author} size="xs" />
      <div className={s.commentBody}>
        <div className={s.commentMeta}>
          <span className={s.commentAuthor}>
            {comment.author?.firstName} {comment.author?.lastName}
          </span>
          {comment.author?.role && <RoleBadge role={comment.author.role} />}
          <span className={s.commentDate}>
            {fmtRelative(comment.createdAt)}
          </span>
        </div>
        <p className={s.commentText}>{comment.content}</p>
        <div className={s.commentFooter}>
          <CopyPill
            text={comment.id}
            label={`id ${comment.id.slice(0, 10)}…`}
          />
          {comment.createdAt && (
            <span className={s.commentDateFull}>
              {fmtDateTime(comment.createdAt)}
            </span>
          )}
        </div>
      </div>
      <button
        className={s.commentDeleteBtn}
        onClick={() => onDelete(comment)}
        title="Delete comment"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────
function PostDetailModal({ post, onClose, onDeletePost }) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [deleteComment, setDeleteComment] = useState(null);
  const [activeImg, setActiveImg] = useState(null);
  const [fullPost, setFullPost] = useState(post);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api
        .get(`/posts/${post.id}`)
        .then((r) => r.data.data?.post ?? null)
        .catch(() => null),
      api
        .get(`/posts/${post.id}/comments`, { params: { limit: 50 } })
        .then((r) => r.data.data?.comments ?? r.data.data ?? [])
        .catch(() => []),
    ]).then(([full, cmts]) => {
      if (cancelled) return;
      if (full) setFullPost(full);
      setComments(cmts);
      setCommentsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  function handleCommentDeleteSuccess() {
    setComments((prev) => prev.filter((c) => c.id !== deleteComment.id));
    setDeleteComment(null);
  }

  const images = fullPost.images ?? [];
  const author = fullPost.author ?? {};
  const worker = author.workerProfile ?? null;
  const hirer = author.hirerProfile ?? null;
  const reactions = fullPost.reactions ?? [];
  const repostOf = fullPost.repostOf ?? null;
  const counts = fullPost._count ?? {};

  return (
    <>
      <div className={s.backdrop} onClick={onClose}>
        <div className={s.modalLg} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalHeader}>
            <div className={s.modalTitleRow}>
              <TypeBadge type={fullPost.type} />
              <VisibilityBadge isPublic={fullPost.isPublic} />
            </div>
            <button className={s.modalClose} onClick={onClose}>
              <X size={15} />
            </button>
          </div>

          <div className={s.modalBody}>
            {/* Author */}
            <div className={s.detailAuthor}>
              <Avatar user={author} size="lg" />
              <div className={s.detailAuthorInfo}>
                <span className={s.detailAuthorName}>
                  {author.firstName} {author.lastName}
                </span>
                <div className={s.detailAuthorMeta}>
                  <RoleBadge role={author.role} />
                  {worker?.title && (
                    <span className={s.detailDate}>{worker.title}</span>
                  )}
                  {hirer?.companyName && (
                    <span className={s.detailDate}>{hirer.companyName}</span>
                  )}
                  {(author.city || author.country) && (
                    <span className={s.detailDate}>
                      {[author.city, author.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                <div className={s.detailAuthorMeta}>
                  <span className={s.detailDate}>
                    {fmtRelative(fullPost.createdAt)} ·{" "}
                    {fmtDateTime(fullPost.createdAt)}
                  </span>
                  {fullPost.updatedAt &&
                    fullPost.updatedAt !== fullPost.createdAt && (
                      <span className={s.detailDate}>
                        · edited {fmtRelative(fullPost.updatedAt)}
                      </span>
                    )}
                </div>
                {worker?.verificationStatus === "VERIFIED" && (
                  <span
                    className={s.detailDate}
                    style={{
                      color: "var(--green)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Check size={11} /> Verified worker
                    {worker.avgRating
                      ? ` · ${worker.avgRating.toFixed(1)}★`
                      : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Repost-of block */}
            {repostOf && (
              <div className={s.repostBlock}>
                <div className={s.repostLabel}>
                  <Repeat size={11} /> Reposted from{" "}
                  <strong>
                    {repostOf.author?.firstName} {repostOf.author?.lastName}
                  </strong>
                </div>
                <p className={s.repostContent}>
                  {truncate(repostOf.content, 180)}
                </p>
                <CopyPill
                  text={repostOf.id}
                  label={`original id ${repostOf.id.slice(0, 10)}…`}
                />
              </div>
            )}

            {/* Content */}
            <div className={s.detailContent}>{fullPost.content || "—"}</div>

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
                  {counts.reactions ?? reactions.length ?? 0}
                </span>
                <span className={s.detailStatLabel}>Reactions</span>
              </div>
              <div className={s.detailStatDivider} />
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>
                  {counts.comments ?? comments.length}
                </span>
                <span className={s.detailStatLabel}>Comments</span>
              </div>
              <div className={s.detailStatDivider} />
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>{counts.reposts ?? 0}</span>
                <span className={s.detailStatLabel}>Reposts</span>
              </div>
              <div className={s.detailStatDivider} />
              <div className={s.detailStat}>
                <span className={s.detailStatVal}>
                  {fullPost.viewCount ?? 0}
                </span>
                <span className={s.detailStatLabel}>Views</span>
              </div>
            </div>

            {/* Reaction breakdown */}
            {reactions.length > 0 && (
              <div className={s.reactionBreakdownSection}>
                <p className={s.sectionTitle}>Reactions breakdown</p>
                <ReactionBreakdown reactions={reactions} />
              </div>
            )}

            {/* Identifiers */}
            <div className={s.detailIdentifiers}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Post ID</span>
                <CopyPill
                  text={fullPost.id}
                  label={fullPost.id.slice(0, 12) + "…"}
                />
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Author ID</span>
                <CopyPill
                  text={fullPost.authorId}
                  label={fullPost.authorId.slice(0, 12) + "…"}
                />
              </div>
              {fullPost.repostOfId && (
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Repost of</span>
                  <CopyPill
                    text={fullPost.repostOfId}
                    label={fullPost.repostOfId.slice(0, 12) + "…"}
                  />
                </div>
              )}
            </div>

            {/* Comments section */}
            <div className={s.commentsSection}>
              <div className={s.commentsSectionHeader}>
                <span className={s.commentsSectionTitle}>
                  <MessageCircle size={13} /> Comments{" "}
                  {!commentsLoading && `(${comments.length})`}
                </span>
                {commentsLoading && <span className={s.spinner} />}
              </div>

              {!commentsLoading && comments.length === 0 && (
                <p className={s.noComments}>No comments on this post.</p>
              )}

              <div className={s.commentsList}>
                {comments.map((c) => (
                  <div key={c.id}>
                    <CommentRow comment={c} onDelete={setDeleteComment} />
                    {Array.isArray(c.replies) &&
                      c.replies.map((reply) => (
                        <CommentRow
                          key={reply.id}
                          comment={reply}
                          onDelete={setDeleteComment}
                          indent
                        />
                      ))}
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
                  onDeletePost(fullPost);
                }}
              >
                <Trash2 size={14} /> Delete This Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen image lightbox */}
      {activeImg && (
        <div className={s.lightbox} onClick={() => setActiveImg(null)}>
          <img src={activeImg} alt="" className={s.lightboxImg} />
          <button className={s.lightboxClose}>
            <X size={16} />
          </button>
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
  const images = post.images ?? [];
  const hasImages = images.length > 0;
  const worker = post.author?.workerProfile ?? null;
  const hirer = post.author?.hirerProfile ?? null;
  const isEdited =
    post.updatedAt && post.createdAt && post.updatedAt !== post.createdAt;

  return (
    <div className={s.postCard} style={{ animationDelay: `${index * 0.03}s` }}>
      <div className={s.cardTop}>
        <Avatar user={post.author} />
        <div className={s.cardAuthorInfo}>
          <div className={s.cardAuthorRow}>
            <span className={s.cardAuthorName}>
              {post.author?.firstName} {post.author?.lastName}
            </span>
            <RoleBadge role={post.author?.role} />
          </div>
          <span className={s.cardDate}>
            {fmtRelative(post.createdAt)}
            {isEdited && ` · edited`}
          </span>
          {(worker?.title || hirer?.companyName) && (
            <span className={s.cardContext}>
              {worker?.title || hirer?.companyName}
              {worker?.verificationStatus === "VERIFIED" && (
                <>
                  {" · "}
                  <Check size={10} style={{ verticalAlign: -1 }} />
                </>
              )}
            </span>
          )}
        </div>
        <div className={s.cardTopRight}>
          <TypeBadge type={post.type} />
          <VisibilityBadge isPublic={post.isPublic} />
        </div>
      </div>

      <p className={s.cardContent}>
        {truncate(post.content, hasImages ? 80 : 140)}
      </p>

      {hasImages && <ImageStrip images={images} max={3} />}

      <div className={s.cardIdRow}>
        <CopyPill text={post.id} label={`id ${post.id.slice(0, 10)}…`} />
      </div>

      <div className={s.cardFooter}>
        <Engagement
          reactions={post._count?.reactions}
          comments={post._count?.comments}
          reposts={post._count?.reposts}
          views={post.viewCount}
        />
        <div className={s.cardActions}>
          <button
            className={s.viewBtn}
            onClick={() => onView(post)}
            title="View post"
          >
            <Eye size={12} /> View
          </button>
          <button
            className={s.delBtn}
            onClick={() => onDelete(post)}
            title="Delete post"
          >
            <Trash2 size={13} />
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

  const [viewPost, setViewPost] = useState(null);
  const [deletePost, setDeletePost] = useState(null);

  const searchTimer = useRef(null);

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

  const totalReactions = posts.reduce(
    (acc, p) => acc + (p._count?.reactions ?? 0),
    0,
  );
  const totalComments = posts.reduce(
    (acc, p) => acc + (p._count?.comments ?? 0),
    0,
  );
  const totalReposts = posts.reduce(
    (acc, p) => acc + (p._count?.reposts ?? 0),
    0,
  );
  const totalViews = posts.reduce((acc, p) => acc + (p.viewCount ?? 0), 0);
  const postsWithImages = posts.filter((p) => p.images?.length > 0).length;

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

  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span className={s.toastMsg}>
              {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
              {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div className={s.headerText}>
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
            icon={FileText}
            label="Total Posts"
            value={total}
            sub="All types"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon={Zap}
            label="Reactions"
            value={totalReactions}
            sub="This page"
            accent="gold"
            delay={0.05}
          />
          <StatCard
            icon={MessageCircle}
            label="Comments"
            value={totalComments}
            sub="This page"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon={Repeat}
            label="Reposts"
            value={totalReposts}
            sub="This page"
            accent="green"
            delay={0.12}
          />
          <StatCard
            icon={Eye}
            label="Views"
            value={totalViews}
            sub="This page"
            accent="orange"
            delay={0.15}
          />
          <StatCard
            icon={ImageIcon}
            label="Has Media"
            value={postsWithImages}
            sub="Posts with images"
            accent="indigo"
            delay={0.18}
          />
        </div>

        {/* ── Post type breakdown bar ── */}
        <div className={s.typeBreakdown}>
          {TYPE_TABS.slice(1).map((tab) => {
            const count = posts.filter((p) => p.type === tab.key).length;
            const meta = POST_TYPE_META[tab.key];
            const Icon = meta.Icon;
            return (
              <button
                key={tab.key}
                className={`${s.typeBreakdownItem} ${typeFilter === tab.key ? s.typeBreakdownActive : ""}`}
                onClick={() => handleTypeChange(tab.key)}
              >
                <span className={s.typeBreakdownIcon}>
                  <Icon size={13} />
                </span>
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
            <span className={s.searchIcon}>
              <Search size={13} />
            </span>
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
                <X size={13} />
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
            <span className={s.emptyIcon}>
              <Inbox size={40} />
            </span>
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
              <ChevronLeft size={13} /> Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next <ChevronRight size={13} />
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
