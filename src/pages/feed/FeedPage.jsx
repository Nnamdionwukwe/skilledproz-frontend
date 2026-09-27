import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import CreatePost from "../../components/posts/CreatePost";
import PostCard from "../../components/posts/PostCard";
import useFeedPolling from "../../hooks/useFeedPolling";
import styles from "./FeedPage.module.css";
import { Link } from "react-router-dom";
import {
  FiInbox,
  FiAward,
  FiImage,
  FiSpeaker,
  FiZap,
  FiUsers,
  FiBookmark,
  FiRefreshCw,
  FiArrowUp,
} from "react-icons/fi";
import tracker from "../../lib/analytics/tracker";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "GENERAL", label: "General" },
  {
    value: "HIRING",
    label: (
      <>
        Hiring <FiSpeaker size={12} />
      </>
    ),
  },
  {
    value: "ACHIEVEMENT",
    label: (
      <>
        Achievements <FiAward size={12} />
      </>
    ),
  },
  {
    value: "PORTFOLIO",
    label: (
      <>
        Portfolio <FiImage size={12} />
      </>
    ),
  },
  { value: "ANNOUNCEMENT", label: "Announcements" },
];

export default function FeedPage() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [total, setTotal] = useState(0);

  // Track whether any dropdown/modal is open so polling can pause
  const [interacting, setInteracting] = useState(false);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.feed.view", {
      role: user?.role || "GUEST",
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPosts = useCallback(
    async (p = 1, f = filter, reset = false) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.get("/posts/feed", {
          params: { page: p, limit: 15, ...(f !== "ALL" && { type: f }) },
        });
        const newPosts = res.data.data.posts;
        const pages = res.data.data.pages;
        setTotal(res.data.data.total);

        if (reset || p === 1) setPosts(newPosts);
        else setPosts((prev) => [...prev, ...newPosts]);

        setHasMore(p < pages);

        // ── ANALYTICS: feed loaded ───────────────────────────────────────
        tracker.track("feed.loaded", {
          page: p,
          filter: f,
          count: newPosts?.length || 0,
          total: res.data.data.total || 0,
          isLoadMore: p > 1,
        });
      } catch (err) {
        // ── ANALYTICS: feed load failed ──────────────────────────────────
        tracker.track("feed.load.failed", {
          page: p,
          filter: f,
          reason: err.response?.data?.message || "unknown",
        });
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [filter],
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, filter, true);
  }, [filter]);

  // ── Background polling ──
  const { pendingPosts, dismissPending } = useFeedPolling({
    filter,
    currentPosts: posts,
    intervalMs: 25000, // 25s
    // Pause polling while the user is interacting with a dropdown/modal
    enabled: !interacting,
  });

  // ── Merge queued posts into the visible list ──
  const showPending = () => {
    if (!pendingPosts.length) return;
    setPosts((prev) => [...pendingPosts, ...prev]);
    setTotal((prev) => prev + pendingPosts.length);
    dismissPending();
    // Scroll to top so the user actually sees them
    window.scrollTo({ top: 0, behavior: "smooth" });

    // ── ANALYTICS: new posts banner clicked ──────────────────────────────
    tracker.action("feed.newPostsBanner.clicked", {
      pendingCount: pendingPosts.length,
      filter,
    });
  };

  const handleFilterChange = (f) => {
    const prev = filter;
    setFilter(f);
    setPage(1);
    dismissPending();

    // ── ANALYTICS: filter changed ────────────────────────────────────────
    tracker.track("feed.filter.changed", {
      from: prev,
      to: f,
    });
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);

    // ── ANALYTICS: load more clicked ─────────────────────────────────────
    tracker.track("feed.loadMore.clicked", {
      fromPage: page,
      toPage: next,
      filter,
    });
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setTotal((prev) => prev + 1);

    // ── ANALYTICS: post created from feed ────────────────────────────────
    tracker.action("feed.post.created", {
      postId: newPost?.id || null,
      postType: newPost?.type || null,
      hasImages: (newPost?.images?.length || 0) > 0,
      contentLength: newPost?.content?.length || 0,
    });
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((prev) => prev - 1);

    // ── ANALYTICS: post deleted from feed ────────────────────────────────
    tracker.action("feed.post.deleted", {
      postId,
    });
  };

  return (
    <Layout>
      <div
        className={styles.page}
        // Nudge polling to pause while the user hovers the feed on desktop
        // (mobile users won't fire this, which is fine)
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
      >
        <div className={styles.main}>
          {/* New posts banner — sticky at the top of the feed */}
          {pendingPosts.length > 0 && (
            <button
              className={styles.newPostsBanner}
              onClick={showPending}
              type="button"
              data-track-id="feed.newPostsBanner"
            >
              <FiArrowUp size={14} />
              <span>
                {pendingPosts.length} new post
                {pendingPosts.length !== 1 ? "s" : ""} — tap to load
              </span>
            </button>
          )}

          <CreatePost onPostCreated={handlePostCreated} compact />

          <div className={styles.filterBar}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${styles.filterBtn} ${
                  filter === f.value ? styles.filterBtnActive : ""
                }`}
                onClick={() => handleFilterChange(f.value)}
                data-track-id={`feed.filter.${f.value.toLowerCase()}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {!loading && (
            <p className={styles.totalCount}>
              {total} post{total !== 1 ? "s" : ""}
              {pendingPosts.length > 0 && (
                <span className={styles.liveDot} title="Live updates on" />
              )}
            </p>
          )}

          {loading ? (
            <div className={styles.feedList}>
              {[1, 2, 3].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <FiInbox size={32} />
              </span>
              <h3>No posts yet</h3>
              <p>Be the first to share something with the community!</p>
            </div>
          ) : (
            <div className={styles.feedList}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handlePostDeleted}
                />
              ))}

              {hasMore && (
                <button
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  data-track-id="feed.loadMore"
                >
                  {loadingMore ? "Loading..." : "Load more posts"}
                </button>
              )}
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <FeedSidebar />
        </aside>
      </div>
    </Layout>
  );
}

function FeedSidebar() {
  const { user } = useAuthStore();
  return (
    <div className={styles.sidebarContent}>
      <div className={styles.profileCard}>
        <div className={styles.profileCardBg} />
        <div className={styles.profileCardAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <span>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          )}
        </div>
        <p className={styles.profileCardName}>
          {user?.firstName} {user?.lastName}
        </p>
        <p className={styles.profileCardRole}>{user?.role}</p>
        <Link
          to={`/workers/${user?.id}`}
          className={styles.profileCardBtn}
          data-track-id="feed.sidebar.viewProfile"
        >
          View Profile
        </Link>
      </div>

      <div className={styles.tipsCard}>
        <p className={styles.tipsTitle}>
          <FiBookmark size={12} /> What to post
        </p>
        <ul className={styles.tipsList}>
          <li>
            <FiAward size={11} /> Share job achievements
          </li>
          <li>
            <FiImage size={11} /> Show your portfolio
          </li>
          <li>
            <FiSpeaker size={11} /> Post hiring opportunities
          </li>
          <li>
            <FiZap size={11} /> Share industry tips
          </li>
          <li>
            <FiUsers size={11} /> Connect with others
          </li>
        </ul>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skHeader}>
        <div className={styles.skAvatar} />
        <div className={styles.skLines}>
          <div className={styles.skLine} style={{ width: "60%" }} />
          <div className={styles.skLine} style={{ width: "40%" }} />
        </div>
      </div>
      <div className={styles.skBody}>
        <div className={styles.skLine} />
        <div className={styles.skLine} style={{ width: "80%" }} />
        <div className={styles.skLine} style={{ width: "65%" }} />
      </div>
    </div>
  );
}
