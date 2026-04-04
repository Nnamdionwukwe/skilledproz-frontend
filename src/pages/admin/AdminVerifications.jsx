import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

export default function AdminVerifications() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [filter, setFilter] = useState("PENDING");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      // Get workers and filter by verification status
      const res = await api.get("/workers/search", { params: { limit: 50 } });
      // We fetch all workers and filter client-side since the API doesn't filter by verification status
      // In prod you'd add a backend filter
      setWorkers(res.data.data?.workers || []);
    } catch {
      setError("Failed to load workers.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(userId, status) {
    setActing(userId);
    setError("");
    setSuccess("");
    try {
      await api.post(`/admin/workers/${userId}/verify`, { status });
      setSuccess(`Worker ${status.toLowerCase()} successfully.`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Action failed.");
    } finally {
      setActing(null);
    }
  }

  const STATUS_COLORS = {
    UNVERIFIED: "dim",
    PENDING: "orange",
    VERIFIED: "green",
    REJECTED: "red",
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Trust & Safety</p>
            <h1 className={styles.pageTitle}>Worker Verifications</h1>
          </div>
        </div>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        {/* Filter tabs */}
        <div className={styles.filterBar}>
          {["ALL", "UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ""}`}
              onClick={() => setFilter(s)}
            >
              {s === "ALL"
                ? "All Workers"
                : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.listSkeleton}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skRow} />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <Empty icon="🛡️" title="No workers found" />
        ) : (
          <div className={styles.listWrap}>
            {workers
              .filter(
                (w) =>
                  filter === "ALL" ||
                  (w.verificationStatus || "UNVERIFIED") === filter,
              )
              .map((w, i) => {
                const vs = w.verificationStatus || "UNVERIFIED";
                const color = STATUS_COLORS[vs] || "dim";
                return (
                  <div
                    key={w.user?.id || i}
                    className={styles.listRow}
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <div className={styles.listLeft}>
                      <div className={styles.avatar}>
                        {w.user?.avatar ? (
                          <img src={w.user.avatar} alt="" />
                        ) : (
                          <span>
                            {w.user?.firstName?.[0]}
                            {w.user?.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className={styles.listInfo}>
                        <p className={styles.listName}>
                          {w.user?.firstName} {w.user?.lastName}
                        </p>
                        <p className={styles.listMeta}>
                          {w.title} · {w.user?.city}, {w.user?.country}
                        </p>
                        <p className={styles.listMeta}>
                          ★ {w.avgRating?.toFixed(1) || "New"} ·{" "}
                          {w.completedJobs || 0} jobs
                        </p>
                      </div>
                    </div>

                    <div className={styles.listRight}>
                      <span
                        className={`${styles.badge} ${styles[`badge_${color}`]}`}
                      >
                        {vs}
                      </span>
                      {vs !== "VERIFIED" && (
                        <button
                          className={styles.btnGreen}
                          disabled={acting === w.user?.id}
                          onClick={() => handleVerify(w.user?.id, "VERIFIED")}
                        >
                          {acting === w.user?.id ? <Spinner /> : "✓ Verify"}
                        </button>
                      )}
                      {vs !== "REJECTED" && vs !== "UNVERIFIED" && (
                        <button
                          className={styles.btnRed}
                          disabled={acting === w.user?.id}
                          onClick={() => handleVerify(w.user?.id, "REJECTED")}
                        >
                          {acting === w.user?.id ? <Spinner /> : "✕ Reject"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
function Empty({ icon, title }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyTitle}>{title}</p>
    </div>
  );
}
function Spinner() {
  return <span className={styles.spinner} />;
}
