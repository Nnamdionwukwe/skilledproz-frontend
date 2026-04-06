import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import CreatePost from "../../components/posts/CreatePost";
import PostCard from "../../components/posts/PostCard";
import styles from "./FeedPage.module.css";

export default function MyPostsPage() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const res = await api.get("/posts/my");
      setPosts(res.data.data.posts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handlePostCreated = (newPost) => setPosts((prev) => [newPost, ...prev]);
  const handlePostDeleted = (postId) =>
    setPosts((prev) => prev.filter((p) => p.id !== postId));

  return (
    <Layout>
      <div
        className={styles.main}
        style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem" }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: "0.25rem",
            }}
          >
            My Posts
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
            Share updates, achievements, and opportunities with the SkilledProz
            community.
          </p>
        </div>

        <CreatePost onPostCreated={handlePostCreated} />

        <div style={{ height: "0.875rem" }} />

        {loading ? (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            Loading...
          </p>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✍️</span>
            <h3>No posts yet</h3>
            <p>Create your first post above to share with the community.</p>
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
          </div>
        )}
      </div>
    </Layout>
  );
}
