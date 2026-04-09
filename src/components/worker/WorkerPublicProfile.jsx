import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styles from "./WorkerPublicProfile.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WorkerPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // ── CRITICAL: always use the *viewer's* identity, never the profile owner ──
  const { user: viewerUser } = useAuthStore();

  // Layout is driven by WHO IS VIEWING, not whose profile it is
  const Layout = viewerUser?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("about");

  const isOwnProfile = viewerUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");

    Promise.all([
      api.get(`/workers/${userId}`),
      api
        .get(`/reviews/worker/${userId}`, { params: { limit: 10 } })
        .catch(() => ({ data: { data: { reviews: [] } } })),
    ])
      .then(([wRes, rRes]) => {
        setWorker(wRes.data.data.worker);
        setReviews(rRes.data.data.reviews || []);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Profile not found");
      })
      .finally(() => setLoading(false));
  }, [userId]);

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
  if (!worker)
    return (
      <Layout>
        <ProfileError msg="Worker not found" />
      </Layout>
    );

  const { user, categories, portfolio, certifications, availability } = worker;

  const availDay = (day) =>
    availability.find((a) => a.dayOfWeek === day && a.isAvailable);

  // Has any multi-rate pricing?
  const hasDailyRate = worker.dailyRate > 0;
  const hasWeeklyRate = worker.weeklyRate > 0;
  const hasMonthlyRate = worker.monthlyRate > 0;
  const hasCustomRate = worker.customRate > 0;
  const hasMultiRate =
    hasDailyRate || hasWeeklyRate || hasMonthlyRate || hasCustomRate;

  return (
    <Layout>
      <div className={styles.page}>
        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.firstName} />
                ) : (
                  <span>
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                )}
              </div>
              {worker.isAvailable && <div className={styles.onlineDot} />}
            </div>

            <div className={styles.heroInfo}>
              <div className={styles.heroTop}>
                <div>
                  <h1 className={styles.name}>
                    {user.firstName} {user.lastName}
                    {worker.verificationStatus === "VERIFIED" && (
                      <span className={styles.verifiedBadge} title="Verified">
                        ✓
                      </span>
                    )}
                  </h1>
                  <p className={styles.workerTitle}>{worker.title}</p>
                </div>
                <span
                  className={`${styles.availBadge} ${worker.isAvailable ? styles.availBadgeOn : styles.availBadgeOff}`}
                >
                  {worker.isAvailable ? "● Available" : "○ Unavailable"}
                </span>
              </div>

              {/* Categories */}
              <div className={styles.catRow}>
                {categories.slice(0, 4).map((wc) => (
                  <span
                    key={wc.id}
                    className={`${styles.catChip} ${wc.isPrimary ? styles.catChipPrimary : ""}`}
                  >
                    {wc.category.icon && <span>{wc.category.icon}</span>}
                    {wc.category.name}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className={styles.statsRow}>
                <Stat
                  icon="⭐"
                  value={
                    worker.avgRating > 0 ? worker.avgRating.toFixed(1) : "New"
                  }
                  label={`${worker.totalReviews} review${worker.totalReviews !== 1 ? "s" : ""}`}
                />
                <div className={styles.statDivider} />
                <Stat
                  icon="✅"
                  value={worker.completedJobs}
                  label="jobs done"
                />
                {user.city || user.country ? (
                  <>
                    <div className={styles.statDivider} />
                    <Stat
                      icon="📍"
                      value={[user.city, user.country]
                        .filter(Boolean)
                        .join(", ")}
                      label="location"
                    />
                  </>
                ) : null}
                <div className={styles.statDivider} />
                <Stat
                  icon="⚡"
                  value={`${worker.responseRate}%`}
                  label="response"
                />
              </div>

              {/* Contact info — only shown if privacy allows */}
              <div className={styles.contactRow}>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className={styles.contactItem}>
                    📱 <span>{user.phone}</span>
                  </a>
                )}
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className={styles.contactItem}
                  >
                    ✉️ <span>{user.email}</span>
                  </a>
                )}
                {user.gender && (
                  <span className={styles.contactItem}>
                    🪪 <span>{user.gender}</span>
                  </span>
                )}
                {user.language && (
                  <span className={styles.contactItem}>
                    🗣 <span>{user.language}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rate + CTA */}
          <div className={styles.heroAction}>
            <div className={styles.rateBlock}>
              <span className={styles.rateAmount}>
                {worker.currency} {worker.hourlyRate?.toLocaleString()}
              </span>
              <span className={styles.rateLabel}>/hr</span>
            </div>

            {/* Multi-rate pricing pills */}
            {hasMultiRate && (
              <div className={styles.ratePills}>
                {hasDailyRate && (
                  <RatePill
                    value={worker.dailyRate}
                    suffix="/day"
                    currency={worker.currency}
                  />
                )}
                {hasWeeklyRate && (
                  <RatePill
                    value={worker.weeklyRate}
                    suffix="/wk"
                    currency={worker.currency}
                  />
                )}
                {hasMonthlyRate && (
                  <RatePill
                    value={worker.monthlyRate}
                    suffix="/mo"
                    currency={worker.currency}
                  />
                )}
                {hasCustomRate && (
                  <RatePill
                    value={worker.customRate}
                    suffix={
                      worker.customRateLabel
                        ? `/${worker.customRateLabel}`
                        : "/custom"
                    }
                    currency={worker.currency}
                  />
                )}
              </div>
            )}

            {/* Pricing note */}
            {worker.pricingNote && (
              <p className={styles.pricingNote}>{worker.pricingNote}</p>
            )}

            {/* Don't show Book/Message if viewing own profile */}
            {!isOwnProfile && (
              <>
                <button
                  className={styles.bookBtn}
                  onClick={() =>
                    navigate(`/bookings/create?workerId=${userId}`)
                  }
                >
                  Book Now
                </button>
                <button
                  className={styles.msgBtn}
                  onClick={() => navigate(`/messages?with=${userId}`)}
                >
                  💬
                </button>
              </>
            )}

            {isOwnProfile && (
              <Link to="/settings" className={styles.editBtn}>
                ✏️ Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabBar}>
          {[
            "about",
            "portfolio",
            "certifications",
            "availability",
            "reviews",
          ].map((t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "portfolio" && portfolio.length > 0 && (
                <span className={styles.tabCount}>{portfolio.length}</span>
              )}
              {t === "certifications" && certifications.length > 0 && (
                <span className={styles.tabCount}>{certifications.length}</span>
              )}
              {t === "reviews" && worker.totalReviews > 0 && (
                <span className={styles.tabCount}>{worker.totalReviews}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className={styles.tabContent}>
          {/* About */}
          {tab === "about" && (
            <div className={styles.aboutGrid}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>About</h2>
                <p className={styles.bio}>
                  {worker.description || "No description provided."}
                </p>
                <div className={styles.infoCards}>
                  <InfoCard
                    icon="🏆"
                    label="Years Experience"
                    value={`${worker.yearsExperience || 0} yr${worker.yearsExperience !== 1 ? "s" : ""}`}
                  />
                  <InfoCard
                    icon="📡"
                    label="Service Radius"
                    value={`${worker.serviceRadius} km`}
                  />
                  <InfoCard
                    icon="🗓️"
                    label="Member Since"
                    value={new Date(user.createdAt).toLocaleDateString(
                      "en-GB",
                      { month: "long", year: "numeric" },
                    )}
                  />
                  {worker.backgroundCheck && (
                    <InfoCard
                      icon="🛡️"
                      label="Background Check"
                      value="Cleared"
                      accent
                    />
                  )}
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Weekly Availability</h2>
                <div className={styles.weekRow}>
                  {DAYS.map((d, i) => {
                    const slot = availDay(i);
                    return (
                      <div
                        key={d}
                        className={`${styles.dayCell} ${slot ? styles.dayCellOn : styles.dayCellOff}`}
                      >
                        <span className={styles.dayName}>{d}</span>
                        {slot && (
                          <span className={styles.dayTime}>
                            {slot.startTime?.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* Portfolio */}
          {tab === "portfolio" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Portfolio{" "}
                <span className={styles.count}>{portfolio.length}</span>
              </h2>
              {portfolio.length === 0 ? (
                <Empty icon="🖼️" text="No portfolio items yet." />
              ) : (
                <div className={styles.portfolioGrid}>
                  {portfolio.map((item) => (
                    <div key={item.id} className={styles.portfolioCard}>
                      <div className={styles.portfolioImg}>
                        <img src={item.imageUrl} alt={item.title} />
                      </div>
                      <div className={styles.portfolioBody}>
                        <p className={styles.portfolioTitle}>{item.title}</p>
                        {item.description && (
                          <p className={styles.portfolioDesc}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Certifications */}
          {tab === "certifications" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Certifications{" "}
                <span className={styles.count}>{certifications.length}</span>
              </h2>
              {certifications.length === 0 ? (
                <Empty icon="📜" text="No certifications added." />
              ) : (
                <div className={styles.certList}>
                  {certifications.map((cert) => (
                    <div key={cert.id} className={styles.certCard}>
                      <div className={styles.certIcon}>📜</div>
                      <div className={styles.certInfo}>
                        <p className={styles.certName}>{cert.name}</p>
                        <p className={styles.certIssuer}>
                          Issued by {cert.issuedBy}
                        </p>
                        {cert.issueDate && (
                          <p className={styles.certDate}>
                            {new Date(cert.issueDate).toLocaleDateString(
                              "en-GB",
                              { month: "short", year: "numeric" },
                            )}
                            {cert.expiryDate &&
                              ` – ${new Date(cert.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                          </p>
                        )}
                      </div>
                      {cert.verified && (
                        <span className={styles.certVerified}>✓ Verified</span>
                      )}
                      {cert.documentUrl && (
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.certLink}
                        >
                          View →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Availability */}
          {tab === "availability" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Availability</h2>
              {availability.length === 0 ? (
                <Empty icon="📅" text="No availability set." />
              ) : (
                <div className={styles.availList}>
                  {DAYS.map((day, i) => {
                    const slot = availability.find((a) => a.dayOfWeek === i);
                    return (
                      <div
                        key={day}
                        className={`${styles.availRow} ${slot?.isAvailable ? styles.availRowOn : styles.availRowOff}`}
                      >
                        <span className={styles.availDay}>{day}</span>
                        {slot?.isAvailable ? (
                          <span className={styles.availTime}>
                            {slot.startTime?.slice(0, 5)} –{" "}
                            {slot.endTime?.slice(0, 5)}
                          </span>
                        ) : (
                          <span className={styles.availOff}>Unavailable</span>
                        )}
                        <span
                          className={`${styles.availDot} ${slot?.isAvailable ? styles.availDotOn : styles.availDotOff}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Reviews */}
          {tab === "reviews" && (
            <section className={styles.section}>
              <div className={styles.reviewHeader}>
                <h2 className={styles.sectionTitle}>
                  Reviews{" "}
                  <span className={styles.count}>{worker.totalReviews}</span>
                </h2>
                <div className={styles.ratingOverall}>
                  <span className={styles.ratingBig}>
                    {worker.avgRating > 0 ? worker.avgRating.toFixed(1) : "—"}
                  </span>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={
                          s <= Math.round(worker.avgRating)
                            ? styles.starOn
                            : styles.starOff
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {reviews.length === 0 ? (
                <Empty icon="⭐" text="No reviews yet." />
              ) : (
                <div className={styles.reviewList}>
                  {reviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function RatePill({ value, suffix, currency }) {
  return (
    <div className={styles.ratePill}>
      <span className={styles.ratePillAmount}>
        {currency} {Number(value).toLocaleString()}
      </span>
      <span className={styles.ratePillSuffix}>{suffix}</span>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function InfoCard({ icon, label, value, accent }) {
  return (
    <div
      className={`${styles.infoCard} ${accent ? styles.infoCardAccent : ""}`}
    >
      <span className={styles.infoIcon}>{icon}</span>
      <div>
        <p className={styles.infoLabel}>{label}</p>
        <p
          className={`${styles.infoValue} ${accent ? styles.infoValueAccent : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewTop}>
        <div className={styles.reviewAvatar}>
          {review.giver?.avatar ? (
            <img src={review.giver.avatar} alt="" />
          ) : (
            <span>
              {review.giver?.firstName?.[0]}
              {review.giver?.lastName?.[0]}
            </span>
          )}
        </div>
        <div className={styles.reviewMeta}>
          <p className={styles.reviewName}>
            {review.giver?.firstName} {review.giver?.lastName}
          </p>
          <p className={styles.reviewJob}>{review.booking?.title}</p>
        </div>
        <div className={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={s <= review.rating ? styles.starOn : styles.starOff}
            >
              ★
            </span>
          ))}
        </div>
      </div>
      {review.comment && (
        <p className={styles.reviewComment}>"{review.comment}"</p>
      )}
      <p className={styles.reviewDate}>
        {new Date(review.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skHero} />
      <div className={styles.skTabBar} />
      <div className={styles.skContent} />
    </div>
  );
}

function ProfileError({ msg }) {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>
          {msg?.includes("private") ? "🔒" : "🔍"}
        </span>
        <h2 className={styles.notFoundTitle}>
          {msg?.includes("private") ? "Private Profile" : "Worker not found"}
        </h2>
        <p className={styles.notFoundSub}>{msg}</p>
        <Link to="/search" className={styles.notFoundLink}>
          ← Back to Search
        </Link>
      </div>
    </div>
  );
}
