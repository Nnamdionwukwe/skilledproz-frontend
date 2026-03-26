import { useState, useEffect } from "react";
import styles from "./WorkerPublicProfile.module.css";
import api from "../../lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WorkerPublicProfile({ userId: propUserId }) {
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("about");

  const userId = propUserId || window.location.pathname.split("/").pop();

  useEffect(() => {
    Promise.all([
      api.get(`/workers/${userId}`),
      api
        .get(`/workers/dashboard/reviews`, { params: { limit: 10 } })
        .catch(() => ({ data: { data: { reviews: [] } } })),
    ]).then(([wRes]) => {
      setWorker(wRes.data.data.worker);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <ProfileSkeleton />;
  if (!worker) return <NotFound />;

  const { user, categories, portfolio, certifications, availability } = worker;
  const primaryCat = categories.find((c) => c.isPrimary) || categories[0];

  const availDay = (day) =>
    availability.find((a) => a.dayOfWeek === day && a.isAvailable);

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          {/* Avatar */}
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

          {/* Identity */}
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

            {/* Stats row */}
            <div className={styles.statsRow}>
              <Stat
                icon="⭐"
                value={
                  worker.avgRating > 0 ? worker.avgRating.toFixed(1) : "New"
                }
                label={`${worker.totalReviews} review${worker.totalReviews !== 1 ? "s" : ""}`}
              />
              <div className={styles.statDivider} />
              <Stat icon="✅" value={worker.completedJobs} label="jobs done" />
              <div className={styles.statDivider} />
              <Stat
                icon="📍"
                value={`${user.city || "—"}${user.country ? `, ${user.country}` : ""}`}
                label="location"
              />
              <div className={styles.statDivider} />
              <Stat
                icon="⚡"
                value={`${worker.responseRate}%`}
                label="response"
              />
            </div>
          </div>
        </div>

        {/* Rate + CTA */}
        <div className={styles.heroAction}>
          <div className={styles.rateBlock}>
            <span className={styles.rateAmount}>
              {worker.currency} {worker.hourlyRate?.toLocaleString()}
            </span>
            <span className={styles.rateLabel}>/ hr</span>
          </div>
          <a
            href={`/bookings/new?workerId=${user.id}`}
            className={styles.bookBtn}
          >
            Book Now
          </a>
          <a href={`/messages?with=${user.id}`} className={styles.msgBtn}>
            💬 Message
          </a>
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
                  value={new Date(user.createdAt).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
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

            {/* Availability quick-view */}
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
              Portfolio <span className={styles.count}>{portfolio.length}</span>
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

function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>🔍</span>
        <h2 className={styles.notFoundTitle}>Worker not found</h2>
        <a href="/search" className={styles.notFoundLink}>
          ← Back to Search
        </a>
      </div>
    </div>
  );
}
