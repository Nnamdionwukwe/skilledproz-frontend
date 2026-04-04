import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    load(1);
  }, []);

  async function load(p) {
    setLoading(true);
    try {
      const res = await api.get("/admin/reviews", {
        params: { page: p, limit: 15 },
      });
      setReviews(res.data.data.reviews);
      setTotal(res.data.data.total);
      setPages(Math.ceil(res.data.data.total / 15));
      setPage(p);
    } catch {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setDeleting(id);
    setError("");
    setSuccess("");
    try {
      await api.delete(`/admin/reviews/${id}`);
      setSuccess("Review deleted.");
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete review.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Content</p>
            <h1 className={styles.pageTitle}>
              Reviews
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
        </div>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        <div className={styles.listWrap}>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className={styles.skRow} />
            ))
          ) : reviews.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>⭐</span>
              <p className={styles.emptyTitle}>No reviews yet</p>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div
                key={r.id}
                className={styles.reviewRow}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className={styles.reviewLeft}>
                  {/* Stars */}
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={
                          s <= r.rating ? styles.starOn : styles.starOff
                        }
                      >
                        ★
                      </span>
                    ))}
                    <span className={styles.ratingNum}>{r.rating}/5</span>
                  </div>
                  {r.comment && (
                    <p className={styles.reviewComment}>"{r.comment}"</p>
                  )}
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewParty}>
                      By{" "}
                      <strong>
                        {r.giver?.firstName} {r.giver?.lastName}
                      </strong>
                    </span>
                    <span className={styles.reviewDot}>→</span>
                    <span className={styles.reviewParty}>
                      <strong>
                        {r.receiver?.firstName} {r.receiver?.lastName}
                      </strong>
                    </span>
                    {r.booking && (
                      <span className={styles.reviewBooking}>
                        · {r.booking.title}
                      </span>
                    )}
                  </div>
                  <p className={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  className={styles.btnRed}
                  disabled={deleting === r.id}
                  onClick={() => handleDelete(r.id)}
                >
                  {deleting === r.id ? <Spinner /> : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>

        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} / {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button onClick={onClose} className={styles.alertClose}>
        ×
      </button>
    </div>
  );
}
function Spinner() {
  return <span className={styles.spinner} />;
}
