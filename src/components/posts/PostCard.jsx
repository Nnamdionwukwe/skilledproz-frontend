import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./PostCard.module.css";
import { ShieldCheck } from "lucide-react";
import ReportButton from "../../pages/reports/ReportButton";
import {
  FiThumbsUp,
  FiHeart,
  FiZap,
  FiStar,
  FiUsers,
  FiRepeat,
  FiMessageCircle,
  FiSend,
  FiEdit3,
  FiTrash2,
  FiX,
  FiAward,
  FiBriefcase,
  FiVolume2,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiCheck,
  FiMail,
  FiExternalLink,
  FiAlertTriangle,
} from "react-icons/fi";

// ── Reactions — Feather icons, matching the Prisma ReactionType enum ─────────
const REACTIONS = [
  { type: "LIKE", Icon: FiThumbsUp, label: "Like" },
  { type: "LOVE", Icon: FiHeart, label: "Love" },
  { type: "INSIGHTFUL", Icon: FiZap, label: "Insightful" },
  { type: "CELEBRATE", Icon: FiStar, label: "Celebrate" },
  { type: "SUPPORT", Icon: FiUsers, label: "Support" },
];

const TYPE_BADGES = {
  HIRING: { label: "Hiring", color: "#22c55e", Icon: FiBriefcase },
  ACHIEVEMENT: { label: "Achievement", color: "#f97316", Icon: FiAward },
  PORTFOLIO: { label: "Portfolio", color: "#818cf8", Icon: FiInfo },
  ANNOUNCEMENT: { label: "Announcement", color: "#fbbf24", Icon: FiVolume2 },
  JOB_UPDATE: { label: "Job Update", color: "#38bdf8", Icon: FiBriefcase },
  GENERAL: null,
};

// ── Resolve the public profile URL for a user based on viewer's role ─────────
function profileUrlFor(viewer, target) {
  if (!target) return "#";
  if (viewer && viewer.id === target.id) {
    return target.role === "WORKER"
      ? `/workers/${target.id}`
      : `/hirers/${target.id}`;
  }
  return target.role === "WORKER"
    ? `/workers/${target.id}`
    : `/hirers/${target.id}`;
}

export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuthStore();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [repostContent, setRepostContent] = useState("");
  const [showRepostInput, setShowRepostInput] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [allComments, setAllComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  // ── Fullscreen image viewer ──
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // ── Mutually exclusive dropdown state ──
  // One of: null | "reactions" | "repost" | "share"
  const [openMenu, setOpenMenu] = useState(null);

  // ── Share menu ──
  const [copied, setCopied] = useState(false);

  // ── Delete confirmation ──
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Refs for outside-click detection ──
  const actionBarRef = useRef(null);

  // ── Outside-click handler for all dropdowns ──
  useEffect(() => {
    function handleClickOutside(e) {
      if (actionBarRef.current && !actionBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // ── Lightbox keyboard controls ──
  useEffect(() => {
    if (lightboxIdx === null) return;
    function handleKey(e) {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i + 1) % post.images.length);
      else if (e.key === "ArrowLeft")
        setLightboxIdx(
          (i) => (i - 1 + post.images.length) % post.images.length,
        );
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxIdx, post.images?.length]);

  if (deleted) return null;

  const author = post.author;
  const isOwn = user?.id === post.authorId;
  const myReaction = post.myReaction;
  const totalReactions = post._count?.reactions || 0;
  const totalComments = post._count?.comments || 0;
  const totalReposts = post._count?.reposts || 0;
  const typeBadge = TYPE_BADGES[post.type];
  const shouldTruncate = post.content.length > 300 && !expanded;

  const authorTitle =
    author?.role === "WORKER"
      ? author.workerProfile?.title
      : author?.hirerProfile?.companyName;

  const authorProfileUrl = profileUrlFor(user, author);
  const commentProfileUrl = (commentAuthor) =>
    profileUrlFor(user, commentAuthor);

  const postUrl = `${window.location.origin}/posts/${post.id}`;

  // ── Toggle helper — only one dropdown at a time ──
  const toggleMenu = (name) => {
    setOpenMenu((current) => (current === name ? null : name));
  };

  const handleReact = async (type) => {
    if (!user) return;
    setOpenMenu(null);
    try {
      const res = await api.post(`/posts/${post.id}/react`, { type });
      const newReaction = res.data.data.reaction;
      setPost((prev) => ({
        ...prev,
        myReaction: newReaction ? type : null,
        reactionSummary: recalcSummary(
          prev.reactionSummary,
          prev.myReaction,
          newReaction ? type : null,
        ),
        _count: {
          ...prev._count,
          reactions: newReaction
            ? prev.myReaction
              ? prev._count.reactions
              : prev._count.reactions + 1
            : prev._count.reactions - 1,
        },
      }));
    } catch {}
  };

  const handleComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: newComment,
      });
      const comment = res.data.data.comment;
      setPost((prev) => ({
        ...prev,
        comments: [comment, ...prev.comments],
        _count: { ...prev._count, comments: prev._count.comments + 1 },
      }));
      setNewComment("");
    } catch {}
    setSubmitting(false);
  };

  const handleReply = async (commentId) => {
    if (!replyContent.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: replyContent,
        parentId: commentId,
      });
      const reply = res.data.data.comment;
      setPost((prev) => ({
        ...prev,
        comments: prev.comments.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies || []), reply] }
            : c,
        ),
      }));
      setReplyTo(null);
      setReplyContent("");
    } catch {}
    setSubmitting(false);
  };

  const handleLoadMoreComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/posts/${post.id}/comments`);
      setAllComments(res.data.data.comments);
      setShowAllComments(true);
    } catch {}
    setLoadingComments(false);
  };

  const handleRepost = async (withThoughts) => {
    if (!user) return;
    if (withThoughts && !repostContent.trim()) return;
    try {
      await api.post(`/posts/${post.id}/repost`, { content: repostContent });
      setPost((prev) => ({
        ...prev,
        _count: { ...prev._count, reposts: prev._count.reposts + 1 },
      }));
      setOpenMenu(null);
      setShowRepostInput(false);
      setRepostContent("");
    } catch {}
  };

  // ── NEW: show inline confirmation instead of window.confirm ──
  const requestDelete = () => {
    setConfirmDelete(true);
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
  };

  const confirmDeletePost = async () => {
    try {
      await api.delete(`/posts/${post.id}`);
      setDeleted(true);
      onDelete?.(post.id);
    } catch {
      setConfirmDelete(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = postUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExternalShare = (platform) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(
      (post.content?.slice(0, 200) || "Check this post on SkilledProz") + " — ",
    );

    const shareMap = {
      whatsapp: `https://wa.me/?text=${encodedText}${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      email: `mailto:?subject=Check out this post on SkilledProz&body=${encodedText}${encodedUrl}`,
    };

    const url = shareMap[platform];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setOpenMenu(null);
    }
  };

  const handleSendInApp = () => {
    const params = new URLSearchParams({
      share: "post",
      postId: post.id,
      postUrl,
      postAuthor: `${author?.firstName || ""} ${author?.lastName || ""}`.trim(),
    });
    window.location.href = `/messages?${params.toString()}`;
    setOpenMenu(null);
  };

  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const nextImage = () => {
    if (lightboxIdx === null) return;
    setLightboxIdx((i) => (i + 1) % post.images.length);
  };
  const prevImage = () => {
    if (lightboxIdx === null) return;
    setLightboxIdx((i) => (i - 1 + post.images.length) % post.images.length);
  };

  const currentReaction = myReaction
    ? REACTIONS.find((r) => r.type === myReaction)
    : null;
  const CurrentReactionIcon = currentReaction?.Icon;

  const displayComments = showAllComments ? allComments : post.comments;

  return (
    <div className={styles.card}>
      {/* Author header */}
      <div className={styles.header}>
        <Link to={authorProfileUrl} className={styles.avatarWrap}>
          {author?.avatar ? (
            <img src={author.avatar} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>
              {author?.firstName?.[0]}
              {author?.lastName?.[0]}
            </div>
          )}
          {author?.workerProfile?.verificationStatus === "VERIFIED" && (
            <ShieldCheck className={styles.verifiedDot} size={18} />
          )}
        </Link>

        <div className={styles.authorInfo}>
          <div className={styles.authorRow}>
            <Link to={authorProfileUrl} className={styles.authorName}>
              {author?.firstName} {author?.lastName}
            </Link>
            {typeBadge && (
              <span
                className={styles.typeBadge}
                style={{
                  background: `${typeBadge.color}22`,
                  color: typeBadge.color,
                }}
              >
                <typeBadge.Icon size={11} />
                {typeBadge.label}
              </span>
            )}
          </div>
          {authorTitle && <p className={styles.authorTitle}>{authorTitle}</p>}
          <p className={styles.postTime}>
            {author?.city && `${author.city} · `}
            {timeAgo(post.createdAt)}
            {post.updatedAt !== post.createdAt && " · Edited"}
          </p>
        </div>

        {isOwn && !confirmDelete && (
          <div className={styles.moreMenu}>
            <button
              className={styles.moreBtn}
              onClick={requestDelete}
              type="button"
            >
              <FiTrash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ── NEW: Inline delete confirmation (replaces window.confirm) ── */}
      {isOwn && confirmDelete && (
        <div className={styles.deleteConfirm}>
          <div className={styles.deleteConfirmIcon}>
            <FiAlertTriangle size={16} />
          </div>
          <div className={styles.deleteConfirmBody}>
            <p className={styles.deleteConfirmTitle}>Delete this post?</p>
            <p className={styles.deleteConfirmText}>
              This action cannot be undone.
            </p>
          </div>
          <div className={styles.deleteConfirmActions}>
            <button
              className={styles.deleteConfirmCancel}
              onClick={cancelDelete}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.deleteConfirmYes}
              onClick={confirmDeletePost}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Repost origin */}
      {post.repostOf && (
        <div className={styles.repostBanner}>
          <FiRepeat size={12} />
          <span>Reposted</span>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        <p className={styles.text}>
          {shouldTruncate ? post.content.slice(0, 300) : post.content}
          {shouldTruncate && (
            <>
              {"... "}
              <button
                className={styles.moreText}
                onClick={() => setExpanded(true)}
              >
                see more
              </button>
            </>
          )}
        </p>

        {/* Images */}
        {post.images?.length > 0 && (
          <div className={styles.imageGrid}>
            <img
              src={post.images[imageIdx]}
              alt=""
              className={styles.mainImage}
              onClick={() => openLightbox(imageIdx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openLightbox(imageIdx)}
            />
            {post.images.length > 1 && (
              <div className={styles.imageDots}>
                {post.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.imageDot} ${
                      i === imageIdx ? styles.imageDotActive : ""
                    }`}
                    onClick={() => setImageIdx(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Repost card */}
        {post.repostOf && (
          <div className={styles.repostCard}>
            <div className={styles.repostCardHeader}>
              <Link
                to={profileUrlFor(user, post.repostOf.author)}
                className={styles.repostAvatar}
              >
                {post.repostOf.author?.avatar ? (
                  <img src={post.repostOf.author.avatar} alt="" />
                ) : (
                  <span>{post.repostOf.author?.firstName?.[0]}</span>
                )}
              </Link>
              <div>
                <Link
                  to={profileUrlFor(user, post.repostOf.author)}
                  className={styles.repostAuthorName}
                >
                  {post.repostOf.author?.firstName}{" "}
                  {post.repostOf.author?.lastName}
                </Link>
                <p className={styles.repostTime}>
                  {timeAgo(post.repostOf.createdAt)}
                </p>
              </div>
            </div>
            <p className={styles.repostText}>
              {post.repostOf.content.slice(0, 200)}
              {post.repostOf.content.length > 200 ? "..." : ""}
            </p>
          </div>
        )}
      </div>

      {/* Reaction counts */}
      {(totalReactions > 0 || totalComments > 0 || totalReposts > 0) && (
        <div className={styles.countRow}>
          {totalReactions > 0 && (
            <button
              className={styles.countBtn}
              onClick={() => setShowReactionsModal(true)}
              type="button"
            >
              <span className={styles.countIcons}>
                {Object.entries(post.reactionSummary || {})
                  .slice(0, 3)
                  .map(([type]) => {
                    const r = REACTIONS.find((x) => x.type === type);
                    if (!r) return null;
                    const Icon = r.Icon;
                    return <Icon key={type} size={12} />;
                  })}
              </span>
              <span className={styles.countNum}>{totalReactions}</span>
            </button>
          )}
          <div className={styles.countRight}>
            {totalComments > 0 && (
              <button
                className={styles.countBtn}
                onClick={() => setShowComments(!showComments)}
                type="button"
              >
                {totalComments} comment{totalComments !== 1 ? "s" : ""}
              </button>
            )}
            {totalReposts > 0 && (
              <span className={styles.countBtn}>
                {totalReposts} repost{totalReposts !== 1 ? "s" : ""}
              </span>
            )}
            <ReportButton
              targetType="POST"
              targetId={post.id}
              targetName={post.title}
              variant="menu-item"
            />
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className={styles.actionBar} ref={actionBarRef}>
        {/* ── Like button — click to open picker ── */}
        <div className={styles.reactWrap}>
          <button
            className={`${styles.actionBtn} ${
              myReaction ? styles.actionBtnActive : ""
            }`}
            onClick={() => toggleMenu("reactions")}
            type="button"
          >
            {CurrentReactionIcon ? (
              <CurrentReactionIcon size={16} />
            ) : (
              <FiThumbsUp size={16} />
            )}
            <span>{currentReaction ? currentReaction.label : "Like"}</span>
          </button>
          {openMenu === "reactions" && (
            <div className={styles.reactionPicker}>
              {REACTIONS.map((r) => {
                const Icon = r.Icon;
                return (
                  <button
                    key={r.type}
                    className={`${styles.reactionPickerBtn} ${
                      myReaction === r.type
                        ? styles.reactionPickerBtnActive
                        : ""
                    }`}
                    onClick={() => handleReact(r.type)}
                    title={r.label}
                    type="button"
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          className={styles.actionBtn}
          onClick={() => setShowComments(!showComments)}
          type="button"
        >
          <FiMessageCircle size={16} />
          <span>Comment</span>
        </button>

        {/* Repost */}
        <div className={styles.reactWrap}>
          <button
            className={styles.actionBtn}
            onClick={() => toggleMenu("repost")}
            type="button"
          >
            <FiRepeat size={16} />
            <span>Repost</span>
          </button>
          {openMenu === "repost" && (
            <div className={styles.repostMenu}>
              <button
                className={styles.repostMenuBtn}
                onClick={() => {
                  setShowRepostInput(true);
                  setOpenMenu(null);
                }}
                type="button"
              >
                <FiEdit3 size={16} />
                <div>
                  <p>Repost with your thoughts</p>
                  <p className={styles.repostMenuSub}>
                    Create a new post with this post attached
                  </p>
                </div>
              </button>
              <button
                className={styles.repostMenuBtn}
                onClick={() => {
                  handleRepost(false);
                  setOpenMenu(null);
                }}
                type="button"
              >
                <FiRepeat size={16} />
                <div>
                  <p>Repost</p>
                  <p className={styles.repostMenuSub}>
                    Instantly share with your network
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ── Send button ── */}
        <div className={styles.reactWrap}>
          <button
            className={styles.actionBtn}
            onClick={() => toggleMenu("share")}
            type="button"
          >
            <FiSend size={16} />
            <span>Send</span>
          </button>

          {openMenu === "share" && (
            <div className={styles.shareMenu}>
              <p className={styles.shareMenuTitle}>Share this post</p>

              <button
                className={styles.shareMenuBtn}
                onClick={handleSendInApp}
                type="button"
              >
                <FiMessageCircle size={16} />
                <div>
                  <p>Send on SkilledProz</p>
                  <p className={styles.shareMenuSub}>
                    Send to a friend or colleague
                  </p>
                </div>
              </button>

              <div className={styles.shareMenuDivider} />

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("whatsapp")}
                type="button"
              >
                <FiMessageCircle size={16} />
                <div>
                  <p>WhatsApp</p>
                </div>
              </button>

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("twitter")}
                type="button"
              >
                <FiExternalLink size={16} />
                <div>
                  <p>X (Twitter)</p>
                </div>
              </button>

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("facebook")}
                type="button"
              >
                <FiExternalLink size={16} />
                <div>
                  <p>Facebook</p>
                </div>
              </button>

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("linkedin")}
                type="button"
              >
                <FiExternalLink size={16} />
                <div>
                  <p>LinkedIn</p>
                </div>
              </button>

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("telegram")}
                type="button"
              >
                <FiSend size={16} />
                <div>
                  <p>Telegram</p>
                </div>
              </button>

              <button
                className={styles.shareMenuBtn}
                onClick={() => openExternalShare("email")}
                type="button"
              >
                <FiMail size={16} />
                <div>
                  <p>Email</p>
                </div>
              </button>

              <div className={styles.shareMenuDivider} />

              <button
                className={styles.shareMenuBtn}
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                <div>
                  <p>{copied ? "Copied!" : "Copy link"}</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Repost with thoughts input */}
      {showRepostInput && (
        <div className={styles.repostInputWrap}>
          <textarea
            className={styles.repostInput}
            placeholder="Add your thoughts..."
            value={repostContent}
            onChange={(e) => setRepostContent(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className={styles.repostInputActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowRepostInput(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.postBtn}
              onClick={() => handleRepost(true)}
              type="button"
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className={styles.commentsSection}>
          {user && (
            <div className={styles.commentInputWrap}>
              <div className={styles.commentAvatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <span>{user.firstName?.[0]}</span>
                )}
              </div>
              <div className={styles.commentInputRight}>
                <input
                  className={styles.commentInput}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleComment(e)
                  }
                />
                {newComment && (
                  <button
                    className={styles.commentSubmitBtn}
                    onClick={handleComment}
                    disabled={submitting}
                    type="button"
                  >
                    {submitting ? "..." : "Comment"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={styles.commentsList}>
            {displayComments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <Link
                  to={commentProfileUrl(comment.author)}
                  className={styles.commentAvatar}
                >
                  {comment.author?.avatar ? (
                    <img src={comment.author.avatar} alt="" />
                  ) : (
                    <span>{comment.author?.firstName?.[0]}</span>
                  )}
                </Link>
                <div className={styles.commentBody}>
                  <div className={styles.commentBubble}>
                    <p className={styles.commentAuthor}>
                      <Link
                        to={commentProfileUrl(comment.author)}
                        className={styles.commentAuthorLink}
                      >
                        {comment.author?.firstName} {comment.author?.lastName}
                      </Link>
                      <span className={styles.commentRole}>
                        {" "}
                        ·{" "}
                        {comment.author?.role === "HIRER" ? "Hirer" : "Worker"}
                      </span>
                    </p>
                    <p className={styles.commentText}>{comment.content}</p>
                  </div>
                  <div className={styles.commentMeta}>
                    <span>{timeAgo(comment.createdAt)}</span>
                    {user && (
                      <button
                        className={styles.replyBtn}
                        onClick={() =>
                          setReplyTo(replyTo === comment.id ? null : comment.id)
                        }
                        type="button"
                      >
                        Reply
                      </button>
                    )}
                  </div>

                  {comment.replies?.length > 0 && (
                    <div className={styles.replies}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className={styles.replyItem}>
                          <Link
                            to={commentProfileUrl(reply.author)}
                            className={styles.commentAvatar}
                            style={{ width: 28, height: 28 }}
                          >
                            {reply.author?.avatar ? (
                              <img src={reply.author.avatar} alt="" />
                            ) : (
                              <span style={{ fontSize: "0.65rem" }}>
                                {reply.author?.firstName?.[0]}
                              </span>
                            )}
                          </Link>
                          <div className={styles.commentBody}>
                            <div className={styles.commentBubble}>
                              <p className={styles.commentAuthor}>
                                <Link
                                  to={commentProfileUrl(reply.author)}
                                  className={styles.commentAuthorLink}
                                >
                                  {reply.author?.firstName}{" "}
                                  {reply.author?.lastName}
                                </Link>
                              </p>
                              <p className={styles.commentText}>
                                {reply.content}
                              </p>
                            </div>
                            <span className={styles.commentMeta}>
                              {timeAgo(reply.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyTo === comment.id && user && (
                    <div className={styles.replyInputWrap}>
                      <input
                        className={styles.commentInput}
                        placeholder={`Reply to ${comment.author?.firstName}...`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleReply(comment.id)
                        }
                        autoFocus
                      />
                      <button
                        className={styles.commentSubmitBtn}
                        onClick={() => handleReply(comment.id)}
                        disabled={submitting}
                        type="button"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalComments > displayComments.length && !showAllComments && (
            <button
              className={styles.loadMoreBtn}
              onClick={handleLoadMoreComments}
              disabled={loadingComments}
              type="button"
            >
              {loadingComments
                ? "Loading..."
                : `View all ${totalComments} comments`}
            </button>
          )}
        </div>
      )}

      {/* Reactions modal */}
      {showReactionsModal && (
        <ReactionsModal
          postId={post.id}
          onClose={() => setShowReactionsModal(false)}
          user={user}
        />
      )}

      {/* Fullscreen image lightbox */}
      {lightboxIdx !== null && post.images?.length > 0 && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <button
            className={styles.lightboxClose}
            onClick={closeLightbox}
            type="button"
            title="Close"
          >
            <FiX size={22} />
          </button>

          {post.images.length > 1 && (
            <>
              <button
                className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                type="button"
                title="Previous"
              >
                <FiChevronLeft size={28} />
              </button>
              <button
                className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                type="button"
                title="Next"
              >
                <FiChevronRight size={28} />
              </button>
            </>
          )}

          <img
            src={post.images[lightboxIdx]}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />

          {post.images.length > 1 && (
            <div className={styles.lightboxCounter}>
              {lightboxIdx + 1} / {post.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reactions modal ───────────────────────────────────────────────────────────
function ReactionsModal({ postId, onClose, user }) {
  const [reactions, setReactions] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/posts/${postId}/reactions`)
      .then((res) => {
        setReactions(res.data.data.reactions);
        setSummary(res.data.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const filtered =
    filter === "ALL" ? reactions : reactions.filter((r) => r.type === filter);
  const total = reactions.length;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.reactionsModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.reactionsHeader}>
          <h3>Reactions</h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            type="button"
            title="Close"
          >
            <FiX size={18} />
          </button>
        </div>
        <div className={styles.reactionsTabs}>
          <button
            className={`${styles.reactionsTab} ${
              filter === "ALL" ? styles.reactionsTabActive : ""
            }`}
            onClick={() => setFilter("ALL")}
            type="button"
          >
            All {total}
          </button>
          {REACTIONS.filter((r) => summary[r.type]).map((r) => {
            const Icon = r.Icon;
            return (
              <button
                key={r.type}
                className={`${styles.reactionsTab} ${
                  filter === r.type ? styles.reactionsTabActive : ""
                }`}
                onClick={() => setFilter(r.type)}
                type="button"
              >
                <Icon size={12} /> {summary[r.type]}
              </button>
            );
          })}
        </div>
        <div className={styles.reactionsList}>
          {loading ? (
            <div className={styles.loadingMsg}>Loading...</div>
          ) : (
            filtered.map((r) => {
              const reaction = REACTIONS.find((rx) => rx.type === r.type);
              const ReactionIcon = reaction?.Icon;
              const profileUrl = profileUrlFor(user, r.user);
              return (
                <Link
                  key={r.id}
                  to={profileUrl}
                  className={styles.reactionsItem}
                  onClick={onClose}
                >
                  <div className={styles.reactionsAvatar}>
                    {r.user?.avatar ? (
                      <img src={r.user.avatar} alt="" />
                    ) : (
                      <span>{r.user?.firstName?.[0]}</span>
                    )}
                    {ReactionIcon && (
                      <span className={styles.reactionEmoji}>
                        <ReactionIcon size={9} />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className={styles.reactionsName}>
                      {r.user?.firstName} {r.user?.lastName}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function recalcSummary(prev, oldType, newType) {
  const s = { ...prev };
  if (oldType) s[oldType] = Math.max(0, (s[oldType] || 0) - 1);
  if (newType) s[newType] = (s[newType] || 0) + 1;
  return s;
}
