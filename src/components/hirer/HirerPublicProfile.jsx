import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./HirerPublicProfile.module.css";
import HirerLayout from "../layout/HirerLayout";

function timeAgo(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function Stars({ rating }) {
  return (
    <span style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{
            color:
              s <= Math.round(rating)
                ? "var(--orange)"
                : "rgba(255,255,255,0.12)",
            fontSize: "0.875rem",
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function HirerPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("jobs");
  const [applying, setApplying] = useState(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  useEffect(() => {
    api
      .get(`/hirers/${userId}/profile`)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleApply(jobId) {
    setApplying(jobId);
    setApplyError("");
    setApplySuccess("");
    try {
      await api.post(`/jobs/${jobId}/apply`, { message: applyMessage });
      setApplySuccess("Application sent! The hirer will be notified.");
      setApplyMessage("");
      // Refresh data
      const res = await api.get(`/jobs/hirers/${userId}/profile`);
      setData(res.data.data);
    } catch (e) {
      setApplyError(e.response?.data?.message || "Failed to apply.");
    } finally {
      setApplying(null);
    }
  }

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.skHero} />
        <div className={styles.skContent} />
      </div>
    );

  if (!data)
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <span style={{ fontSize: "2.5rem" }}>🔍</span>
          <h2>Hirer not found</h2>
          <Link to="/search" className={styles.backLink}>
            ← Back to Search
          </Link>
        </div>
      </div>
    );

  const { profile, jobPosts, reviews, stats } = data;
  const hirerUser = profile.user;
  const isOwnProfile = user?.id === userId;

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.avatarWrap}>
              {hirerUser.avatar ? (
                <img
                  src={hirerUser.avatar}
                  alt=""
                  className={styles.avatarImg}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {hirerUser.firstName?.[0]}
                  {hirerUser.lastName?.[0]}
                </div>
              )}
            </div>

            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>
                {hirerUser.firstName} {hirerUser.lastName}
              </h1>
              {profile.companyName && (
                <p className={styles.companyName}>🏢 {profile.companyName}</p>
              )}
              <div className={styles.metaRow}>
                {(hirerUser.city || hirerUser.country) && (
                  <span className={styles.metaItem}>
                    📍{" "}
                    {[hirerUser.city, hirerUser.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                <span className={styles.metaItem}>
                  🗓️ Member since{" "}
                  {new Date(hirerUser.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.metaItem}
                    style={{ color: "var(--orange)" }}
                  >
                    🌐 Website
                  </a>
                )}
              </div>

              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.totalHires}</span>
                  <span className={styles.statLabel}>hires</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.openJobs}</span>
                  <span className={styles.statLabel}>open jobs</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <Stars rating={stats.avgRating} />
                  <span className={styles.statLabel}>
                    {stats.totalReviews} reviews
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA — only for workers */}
          {!isOwnProfile && user?.role === "WORKER" && (
            <div className={styles.heroCta}>
              <Link to={`/messages?with=${userId}`} className={styles.msgBtn}>
                💬 Send Message
              </Link>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabBar}>
          {["jobs", "reviews"].map((t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "jobs"
                ? `Open Jobs (${stats.openJobs})`
                : `Reviews (${stats.totalReviews})`}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className={styles.tabContent}>
          {/* Jobs tab */}
          {tab === "jobs" && (
            <div className={styles.jobsGrid}>
              {jobPosts.length === 0 ? (
                <div className={styles.empty}>
                  <span>📋</span>
                  <p>No open jobs at the moment.</p>
                </div>
              ) : (
                jobPosts.map((job) => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobCardTop}>
                      <div className={styles.jobCat}>
                        {job.category.icon} {job.category.name}
                      </div>
                      <span className={styles.jobTime}>
                        {timeAgo(job.createdAt)}
                      </span>
                    </div>
                    <h3 className={styles.jobTitle}>{job.title}</h3>
                    <p className={styles.jobDesc}>
                      {job.description.slice(0, 120)}
                      {job.description.length > 120 ? "..." : ""}
                    </p>
                    <div className={styles.jobMeta}>
                      <span className={styles.jobBudget}>
                        {job.currency} {Number(job.budget).toLocaleString()}
                      </span>
                      <span className={styles.jobApps}>
                        {job._count.applications} applicant
                        {job._count.applications !== 1 ? "s" : ""}
                      </span>
                      {job.address && (
                        <span className={styles.jobLocation}>
                          📍 {job.address.split(",")[0]}
                        </span>
                      )}
                    </div>

                    {/* Apply section */}
                    {user?.role === "WORKER" && !isOwnProfile && (
                      <div className={styles.applySection}>
                        {applySuccess && applying === null && (
                          <div className={styles.applySuccess}>
                            {applySuccess}
                          </div>
                        )}
                        {applyError && (
                          <div className={styles.applyError}>{applyError}</div>
                        )}
                        <textarea
                          className={styles.applyInput}
                          placeholder="Add a message to your application (optional)..."
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                          rows={2}
                        />
                        <button
                          className={styles.applyBtn}
                          onClick={() => handleApply(job.id)}
                          disabled={applying === job.id}
                        >
                          {applying === job.id ? (
                            <>
                              <span className={styles.spinner} /> Applying...
                            </>
                          ) : (
                            "✋ Apply Now"
                          )}
                        </button>
                      </div>
                    )}

                    <Link to={`/jobs/${job.id}`} className={styles.jobViewLink}>
                      View full details →
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reviews tab */}
          {tab === "reviews" && (
            <div className={styles.reviewsList}>
              {reviews.length === 0 ? (
                <div className={styles.empty}>
                  <span>⭐</span>
                  <p>No reviews yet.</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      <div className={styles.reviewAvatar}>
                        {r.giver.avatar ? (
                          <img src={r.giver.avatar} alt="" />
                        ) : (
                          <span>
                            {r.giver.firstName?.[0]}
                            {r.giver.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className={styles.reviewerName}>
                          {r.giver.firstName} {r.giver.lastName}
                        </p>
                        <p className={styles.reviewDate}>
                          {new Date(r.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Stars rating={r.rating} />
                    </div>
                    {r.comment && (
                      <p className={styles.reviewComment}>"{r.comment}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </HirerLayout>
  );
}
