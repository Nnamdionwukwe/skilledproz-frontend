import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import CreatePost from "../../components/posts/CreatePost";
import PostCard from "../../components/posts/PostCard";
import styles from "./FeedPage.module.css";
import { Link } from "react-router-dom";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "GENERAL", label: "General" },
  { value: "HIRING", label: "Hiring 📢" },
  { value: "ACHIEVEMENT", label: "Achievements 🏆" },
  { value: "PORTFOLIO", label: "Portfolio 🎨" },
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
      } catch {}
      setLoading(false);
      setLoadingMore(false);
    },
    [filter],
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, filter, true);
  }, [filter]);

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((prev) => prev - 1);
  };

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.main}>
          {/* Create post */}
          <CreatePost onPostCreated={handlePostCreated} compact />

          {/* Filter tabs */}
          <div className={styles.filterBar}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ""}`}
                onClick={() => handleFilterChange(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Total indicator */}
          {!loading && (
            <p className={styles.totalCount}>
              {total} post{total !== 1 ? "s" : ""}
            </p>
          )}

          {/* Posts */}
          {loading ? (
            <div className={styles.feedList}>
              {[1, 2, 3].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📭</span>
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
                >
                  {loadingMore ? "Loading..." : "Load more posts"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
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
      {/* Your profile quick card */}
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
        <Link href={`/workers/${user?.id}`} className={styles.profileCardBtn}>
          View Profile
        </Link>
      </div>

      {/* Tips card */}
      <div className={styles.tipsCard}>
        <p className={styles.tipsTitle}>📌 What to post</p>
        <ul className={styles.tipsList}>
          <li>🏆 Share job achievements</li>
          <li>🎨 Show your portfolio</li>
          <li>📢 Post hiring opportunities</li>
          <li>💡 Share industry tips</li>
          <li>🤝 Connect with others</li>
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
