import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./HirerPublicProfile.module.css";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";

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
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= Math.round(rating) ? styles.starOn : styles.starOff}
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

  // ── CRITICAL: always read the VIEWER's identity from the auth store ─────────
  // This never changes based on whose profile we're viewing
  const { user: viewerUser } = useAuthStore();

  // Layout = whoever is LOGGED IN viewing, not the profile owner
  const Layout = viewerUser?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("jobs");
  const [applying, setApplying] = useState(null);
  const [applyMsg, setApplyMsg] = useState({}); // keyed by jobId
  const [applyResult, setApplyResult] = useState({}); // keyed by jobId

  const isOwnProfile = viewerUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");

    api
      .get(`/hirers/${userId}/profile`)
      .then((res) => setData(res.data.data))
      .catch((e) => setError(e.response?.data?.message || "Profile not found"))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleApply(jobId) {
    setApplying(jobId);
    setApplyResult((r) => ({ ...r, [jobId]: null }));
    try {
      await api.post(`/jobs/${jobId}/apply`, {
        message: applyMsg[jobId] || "",
      });
      setApplyResult((r) => ({
        ...r,
        [jobId]: {
          success: true,
          msg: "Application sent! The hirer will be notified.",
        },
      }));
      setApplyMsg((m) => ({ ...m, [jobId]: "" }));
    } catch (e) {
      setApplyResult((r) => ({
        ...r,
        [jobId]: {
          success: false,
          msg: e.response?.data?.message || "Failed to apply.",
        },
      }));
    } finally {
      setApplying(null);
    }
  }

  if (loading)
    return (
      <Layout>
        <ProfileSkeleton />
      </Layout>
    );
  if (error)
    return (
      <Layout>
        <ProfileError msg={error} />
      </Layout>
    );
  if (!data)
    return (
      <Layout>
        <ProfileError msg="Hirer not found" />
      </Layout>
    );

  const { profile, jobPosts, reviews, stats } = data;
  const hirerUser = profile.user;

  return (
    <Layout>
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
              {profile.companySize && (
                <p className={styles.companySize}>
                  👥 {profile.companySize} employees
                </p>
              )}

              {/* Contact + personal info — only shown if privacy allows */}
              <div className={styles.contactRow}>
                {hirerUser.phone && (
                  <a
                    href={`tel:${hirerUser.phone}`}
                    className={styles.contactItem}
                  >
                    📱 <span>{hirerUser.phone}</span>
                  </a>
                )}
                {hirerUser.email && (
                  <a
                    href={`mailto:${hirerUser.email}`}
                    className={styles.contactItem}
                  >
                    ✉️ <span>{hirerUser.email}</span>
                  </a>
                )}
                {hirerUser.gender && (
                  <span className={styles.contactItem}>
                    🪪 <span>{hirerUser.gender}</span>
                  </span>
                )}
                {hirerUser.language && (
                  <span className={styles.contactItem}>
                    🗣 <span>{hirerUser.language}</span>
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.contactItem}
                  >
                    🌐{" "}
                    <span>{profile.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
              </div>

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

          {/* CTA — only for workers viewing, not own profile */}
          {!isOwnProfile && viewerUser?.role === "WORKER" && (
            <div className={styles.heroCta}>
              <button
                className={styles.msgBtn}
                onClick={() => navigate(`/messages?with=${userId}`)}
              >
                💬 Send Message
              </button>
            </div>
          )}

          {isOwnProfile && (
            <div className={styles.heroCta}>
              <Link to="/settings" className={styles.editBtn}>
                ✏️ Edit Profile
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
              {t === "jobs" ? `Open Jobs (${stats.openJobs})` : ""}
              {t === "reviews" ? `Reviews (${stats.totalReviews})` : ""}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className={styles.tabContent}>
          {/* Jobs */}
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

                    {/* Apply section — only workers, not own profile */}
                    {viewerUser?.role === "WORKER" && !isOwnProfile && (
                      <div className={styles.applySection}>
                        {applyResult[job.id]?.success && (
                          <div className={styles.applySuccess}>
                            {applyResult[job.id].msg}
                          </div>
                        )}
                        {applyResult[job.id] &&
                          !applyResult[job.id].success && (
                            <div className={styles.applyError}>
                              {applyResult[job.id].msg}
                            </div>
                          )}
                        {!applyResult[job.id]?.success && (
                          <>
                            <textarea
                              className={styles.applyInput}
                              placeholder="Add a message to your application (optional)..."
                              value={applyMsg[job.id] || ""}
                              onChange={(e) =>
                                setApplyMsg((m) => ({
                                  ...m,
                                  [job.id]: e.target.value,
                                }))
                              }
                              rows={2}
                            />
                            <button
                              className={styles.applyBtn}
                              onClick={() => handleApply(job.id)}
                              disabled={applying === job.id}
                            >
                              {applying === job.id ? (
                                <>
                                  <span className={styles.spinner} />{" "}
                                  Applying...
                                </>
                              ) : (
                                "✋ Apply Now"
                              )}
                            </button>
                          </>
                        )}
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

          {/* Reviews */}
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
    </Layout>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skHero} />
      <div className={styles.skContent} />
    </div>
  );
}

function ProfileError({ msg }) {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span style={{ fontSize: "2.5rem" }}>
          {msg?.includes("private") ? "🔒" : "🔍"}
        </span>
        <h2>
          {msg?.includes("private") ? "Private Profile" : "Hirer not found"}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{msg}</p>
        <Link to="/search" className={styles.backLink}>
          ← Back to Search
        </Link>
      </div>
    </div>
  );
}
