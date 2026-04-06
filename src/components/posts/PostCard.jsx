import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./PostCard.module.css";

const REACTIONS = [
  { type: "LIKE", emoji: "👍", label: "Like" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "INSIGHTFUL", emoji: "💡", label: "Insightful" },
  { type: "CELEBRATE", emoji: "🎉", label: "Celebrate" },
  { type: "SUPPORT", emoji: "🤝", label: "Support" },
];

const TYPE_BADGES = {
  HIRING: { label: "Hiring", color: "#22c55e" },
  ACHIEVEMENT: { label: "Achievement 🏆", color: "#f97316" },
  PORTFOLIO: { label: "Portfolio", color: "#818cf8" },
  ANNOUNCEMENT: { label: "Announcement 📢", color: "#fbbf24" },
  JOB_UPDATE: { label: "Job Update", color: "#38bdf8" },
  GENERAL: null,
};

export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuthStore();
  const [post, setPost] = useState(initialPost);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
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

  const handleReact = async (type) => {
    if (!user) return;
    setShowReactions(false);
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
      setShowRepostMenu(false);
      setShowRepostInput(false);
      setRepostContent("");
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await api.delete(`/posts/${post.id}`);
      setDeleted(true);
      onDelete?.(post.id);
    } catch {}
  };

  const currentReactionEmoji = myReaction
    ? REACTIONS.find((r) => r.type === myReaction)?.emoji
    : null;

  const displayComments = showAllComments ? allComments : post.comments;

  return (
    <div className={styles.card}>
      {/* Author header */}
      <div className={styles.header}>
        <Link to={`/workers/${author?.id}`} className={styles.avatarWrap}>
          {author?.avatar ? (
            <img src={author.avatar} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>
              {author?.firstName?.[0]}
              {author?.lastName?.[0]}
            </div>
          )}
          {author?.workerProfile?.verificationStatus === "VERIFIED" && (
            <span className={styles.verifiedDot} title="Verified">
              ✓
            </span>
          )}
        </Link>

        <div className={styles.authorInfo}>
          <div className={styles.authorRow}>
            <Link to={`/workers/${author?.id}`} className={styles.authorName}>
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

        {isOwn && (
          <div className={styles.moreMenu}>
            <button className={styles.moreBtn} onClick={handleDelete}>
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Repost origin */}
      {post.repostOf && (
        <div className={styles.repostBanner}>
          <span>🔁 Reposted</span>
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
            />
            {post.images.length > 1 && (
              <div className={styles.imageDots}>
                {post.images.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.imageDot} ${i === imageIdx ? styles.imageDotActive : ""}`}
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
              <div className={styles.repostAvatar}>
                {post.repostOf.author?.avatar ? (
                  <img src={post.repostOf.author.avatar} alt="" />
                ) : (
                  <span>{post.repostOf.author?.firstName?.[0]}</span>
                )}
              </div>
              <div>
                <p className={styles.repostAuthorName}>
                  {post.repostOf.author?.firstName}{" "}
                  {post.repostOf.author?.lastName}
                </p>
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
            >
              {Object.entries(post.reactionSummary || {})
                .slice(0, 3)
                .map(([type]) => (
                  <span key={type}>
                    {REACTIONS.find((r) => r.type === type)?.emoji}
                  </span>
                ))}
              <span className={styles.countNum}>{totalReactions}</span>
            </button>
          )}
          <div className={styles.countRight}>
            {totalComments > 0 && (
              <button
                className={styles.countBtn}
                onClick={() => setShowComments(!showComments)}
              >
                {totalComments} comment{totalComments !== 1 ? "s" : ""}
              </button>
            )}
            {totalReposts > 0 && (
              <span className={styles.countBtn}>
                {totalReposts} repost{totalReposts !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className={styles.actionBar}>
        {/* Like button with reaction picker */}
        <div className={styles.reactWrap}>
          <button
            className={`${styles.actionBtn} ${myReaction ? styles.actionBtnActive : ""}`}
            onClick={() =>
              myReaction ? handleReact(myReaction) : handleReact("LIKE")
            }
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setTimeout(() => setShowReactions(false), 300)}
          >
            <span>{currentReactionEmoji || "👍"}</span>
            <span>
              {myReaction
                ? REACTIONS.find((r) => r.type === myReaction)?.label
                : "Like"}
            </span>
          </button>
          {showReactions && (
            <div
              className={styles.reactionPicker}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  className={`${styles.reactionPickerBtn} ${myReaction === r.type ? styles.reactionPickerBtnActive : ""}`}
                  onClick={() => handleReact(r.type)}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={styles.actionBtn}
          onClick={() => setShowComments(!showComments)}
        >
          <span>💬</span> <span>Comment</span>
        </button>

        {/* Repost */}
        <div className={styles.reactWrap}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowRepostMenu(!showRepostMenu)}
          >
            <span>🔁</span> <span>Repost</span>
          </button>
          {showRepostMenu && (
            <div className={styles.repostMenu}>
              <button
                className={styles.repostMenuBtn}
                onClick={() => {
                  setShowRepostInput(true);
                  setShowRepostMenu(false);
                }}
              >
                <span>✏️</span>
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
                  setShowRepostMenu(false);
                }}
              >
                <span>🔁</span>
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

        <button
          className={styles.actionBtn}
          onClick={() => {
            navigator.clipboard?.writeText(
              window.location.origin + `/posts/${post.id}`,
            );
          }}
        >
          <span>✈️</span> <span>Send</span>
        </button>
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
            >
              Cancel
            </button>
            <button
              className={styles.postBtn}
              onClick={() => handleRepost(true)}
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className={styles.commentsSection}>
          {/* Comment input */}
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
                  >
                    {submitting ? "..." : "Comment"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Comments list */}
          <div className={styles.commentsList}>
            {displayComments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentAvatar}>
                  {comment.author?.avatar ? (
                    <img src={comment.author.avatar} alt="" />
                  ) : (
                    <span>{comment.author?.firstName?.[0]}</span>
                  )}
                </div>
                <div className={styles.commentBody}>
                  <div className={styles.commentBubble}>
                    <p className={styles.commentAuthor}>
                      {comment.author?.firstName} {comment.author?.lastName}
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
                      >
                        Reply
                      </button>
                    )}
                  </div>

                  {/* Replies */}
                  {comment.replies?.length > 0 && (
                    <div className={styles.replies}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className={styles.replyItem}>
                          <div
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
                          </div>
                          <div className={styles.commentBody}>
                            <div className={styles.commentBubble}>
                              <p className={styles.commentAuthor}>
                                {reply.author?.firstName}{" "}
                                {reply.author?.lastName}
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

                  {/* Reply input */}
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
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load more comments */}
          {totalComments > displayComments.length && !showAllComments && (
            <button
              className={styles.loadMoreBtn}
              onClick={handleLoadMoreComments}
              disabled={loadingComments}
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
        />
      )}
    </div>
  );
}

function ReactionsModal({ postId, onClose }) {
  const [reactions, setReactions] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const REACTIONS = [
    { type: "LIKE", emoji: "👍" },
    { type: "LOVE", emoji: "❤️" },
    { type: "INSIGHTFUL", emoji: "💡" },
    { type: "CELEBRATE", emoji: "🎉" },
    { type: "SUPPORT", emoji: "🤝" },
  ];

  useState(() => {
    api
      .get(`/posts/${postId}/reactions`)
      .then((res) => {
        setReactions(res.data.data.reactions);
        setSummary(res.data.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

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
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.reactionsTabs}>
          <button
            className={`${styles.reactionsTab} ${filter === "ALL" ? styles.reactionsTabActive : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All {total}
          </button>
          {REACTIONS.filter((r) => summary[r.type]).map((r) => (
            <button
              key={r.type}
              className={`${styles.reactionsTab} ${filter === r.type ? styles.reactionsTabActive : ""}`}
              onClick={() => setFilter(r.type)}
            >
              {r.emoji} {summary[r.type]}
            </button>
          ))}
        </div>
        <div className={styles.reactionsList}>
          {loading ? (
            <div className={styles.loadingMsg}>Loading...</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className={styles.reactionsItem}>
                <div className={styles.reactionsAvatar}>
                  {r.user?.avatar ? (
                    <img src={r.user.avatar} alt="" />
                  ) : (
                    <span>{r.user?.firstName?.[0]}</span>
                  )}
                  <span className={styles.reactionEmoji}>
                    {REACTIONS.find((rx) => rx.type === r.type)?.emoji}
                  </span>
                </div>
                <div>
                  <p className={styles.reactionsName}>
                    {r.user?.firstName} {r.user?.lastName}
                  </p>
                </div>
              </div>
            ))
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
