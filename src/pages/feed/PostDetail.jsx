import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./PostDetail.module.css";
import PostCard from "../../components/posts/PostCard";
import PostCardSkeleton from "./PostCardSkeleton";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isHydrated } = useAuthStore();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/posts/${id}`)
      .then((res) => {
        if (cancelled) return;
        // Support either { data: { post } } or { data: { data: { post } } }
        const payload = res?.data?.data ?? res?.data;
        const fetched = payload?.post ?? payload;
        setPost(fetched ?? null);
        if (!fetched) setError("This post no longer exists.");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.status === 404
            ? "This post no longer exists."
            : "Could not load this post. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Smart back handler ──
  const handleBack = () => {
    // 1. Not logged in → login page, remember where they came from
    if (!user) {
      navigate("/login", {
        replace: false,
        state: { from: location.pathname + location.search },
      });
      return;
    }

    // 2. Logged in but arrived via direct load (shared link / refresh).
    //    React Router sets location.key === "default" on the initial entry.
    if (location.key === "default") {
      navigate("/feed", { replace: true });
      return;
    }

    // 3. Logged in and arrived from within the app → normal back
    navigate(-1);
  };

  // Wait until auth state has been restored from localStorage
  // so we don't briefly treat a logged-in user as logged-out.
  const showBack = isHydrated;

  return (
    <div className={styles.page}>
      {showBack && (
        <button
          className={styles.backBtn}
          onClick={handleBack}
          type="button"
          aria-label="Go back"
        >
          ← Back
        </button>
      )}

      {loading && (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      )}

      {!loading && error && (
        <div className={styles.state}>
          <p className={styles.stateTitle}>{error}</p>
          <p className={styles.stateSub}>
            The post may have been deleted or made private.
          </p>
          <Link to="/feed" className={styles.stateLink}>
            Go to feed
          </Link>
        </div>
      )}

      {!loading && post && (
        <PostCard post={post} onDelete={() => navigate("/feed")} />
      )}
    </div>
  );
}
