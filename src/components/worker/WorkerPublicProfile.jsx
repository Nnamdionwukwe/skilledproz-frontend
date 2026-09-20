// src/components/worker/WorkerPublicProfile.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styles from "./WorkerPublicProfile.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  FiStar,
  FiCheckCircle,
  FiMapPin,
  FiZap,
  FiPhone,
  FiMail,
  FiUser,
  FiMessageCircle,
  FiEdit3,
  FiAward,
  FiRadio,
  FiCalendar,
  FiShield,
  FiImage,
  FiFileText,
  FiChevronRight,
  FiExternalLink,
  FiLock,
  FiSearch,
  FiArrowLeft,
  FiBookmark,
  FiVideo,
  FiX,
  FiMaximize2,
} from "react-icons/fi";
import VideoIntroSection from "./VideoIntroSection";
import ReportButton from "../../pages/reports/ReportButton";
import useSavedWorker from "../../hooks/useSavedWorker";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isPdfUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.pdf$/.test(clean);
};

const isImageUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)$/.test(clean);
};

export default function WorkerPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { user: viewerUser } = useAuthStore();

  const [lightbox, setLightbox] = useState(null);

  const Layout = viewerUser?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("about");

  const isOwnProfile = viewerUser?.id === userId;

  const isHirer = viewerUser?.role === "HIRER";
  const {
    isSaved,
    checking: checkingSave,
    toggling,
    toggle,
  } = useSavedWorker(userId, { enabled: isHirer && !isOwnProfile });

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

  // ── Escape key closes the lightbox ────────────────────────────────────────
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

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

  const hasVideo = !!worker.videoIntroUrl;

  const availDay = (day) =>
    availability.find((a) => a.dayOfWeek === day && a.isAvailable);

  const hasDailyRate = worker.dailyRate > 0;
  const hasWeeklyRate = worker.weeklyRate > 0;
  const hasMonthlyRate = worker.monthlyRate > 0;
  const hasYearlyRate = worker.yearlyRate > 0;
  const hasCustomRate = worker.customRate > 0;
  const hasMultiRate =
    hasDailyRate ||
    hasWeeklyRate ||
    hasMonthlyRate ||
    hasYearlyRate ||
    hasCustomRate;

  // ── Tab list — video is now included ──────────────────────────────────────
  const tabs = [
    { key: "about", label: "About" },
    { key: "portfolio", label: "Portfolio", count: portfolio.length },
    ...(hasVideo ? [{ key: "video", label: "Video Intro" }] : []),
    {
      key: "certifications",
      label: "Certifications",
      count: certifications.length,
    },
    { key: "availability", label: "Availability" },
    { key: "reviews", label: "Reviews", count: worker.totalReviews },
  ];

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
                {worker.verificationStatus === "VERIFIED" && (
                  <ShieldCheck size={30} className={styles.verifiedDot} />
                )}
              </div>
              {worker.isAvailable && <div className={styles.onlineDot} />}
            </div>

            <div className={styles.heroInfo}>
              <div className={styles.heroTop}>
                <div>
                  <h1 className={styles.name}>
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className={styles.workerTitle}>{worker.title}</p>
                </div>
                <span
                  className={`${styles.availBadge} ${worker.isAvailable ? styles.availBadgeOn : styles.availBadgeOff}`}
                >
                  <span className={styles.availBadgeDot} />
                  {worker.isAvailable ? "Available" : "Unavailable"}
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
                  icon={<FiStar size={12} />}
                  value={
                    worker.avgRating > 0 ? worker.avgRating.toFixed(1) : "New"
                  }
                  label={`${worker.totalReviews} review${worker.totalReviews !== 1 ? "s" : ""}`}
                />
                <div className={styles.statDivider} />
                <Stat
                  icon={<FiCheckCircle size={12} />}
                  value={worker.completedJobs}
                  label="jobs done"
                />
                {user.city || user.country ? (
                  <>
                    <div className={styles.statDivider} />
                    <Stat
                      icon={<FiMapPin size={12} />}
                      value={[user.city, user.country]
                        .filter(Boolean)
                        .join(", ")}
                      label="location"
                    />
                  </>
                ) : null}
                <div className={styles.statDivider} />
                <Stat
                  icon={<FiZap size={12} />}
                  value={`${worker.responseRate}%`}
                  label="response"
                />
              </div>

              {/* Contact info */}
              <div className={styles.contactRow}>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className={styles.contactItem}>
                    <FiPhone size={12} /> <span>{user.phone}</span>
                  </a>
                )}
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className={styles.contactItem}
                  >
                    <FiMail size={12} /> <span>{user.email}</span>
                  </a>
                )}
                {user.gender && (
                  <span className={styles.contactItem}>
                    <FiUser size={12} /> <span>{user.gender}</span>
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
                {hasYearlyRate && (
                  <RatePill
                    value={worker.yearlyRate}
                    suffix="/yr"
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

            {worker.pricingNote && (
              <p className={styles.pricingNote}>{worker.pricingNote}</p>
            )}

            {!isOwnProfile && (
              <div className={styles.actionBtns}>
                <button
                  className={styles.bookBtn}
                  onClick={() =>
                    navigate(`/bookings/create?workerId=${userId}`)
                  }
                >
                  Book Now
                </button>

                {isHirer && (
                  <button
                    className={`${styles.saveBtn} ${isSaved ? styles.saveBtnActive : ""}`}
                    onClick={toggle}
                    disabled={checkingSave || toggling}
                    title={isSaved ? "Remove from saved" : "Save worker"}
                    type="button"
                    aria-pressed={isSaved}
                  >
                    <FiBookmark
                      size={16}
                      fill={isSaved ? "currentColor" : "none"}
                    />
                  </button>
                )}

                <button
                  className={styles.msgBtn}
                  onClick={() => navigate(`/messages?with=${userId}`)}
                  title="Message"
                >
                  <FiMessageCircle size={16} />
                </button>

                <ReportButton
                  targetType="USER"
                  targetId={worker.userId}
                  targetName={`${worker.firstName} ${worker.lastName}`}
                />
              </div>
            )}

            {isOwnProfile && (
              <Link to="/settings" className={styles.editBtn}>
                <FiEdit3 size={14} /> Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabBar}>
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {typeof count === "number" && count > 0 && (
                <span className={styles.tabCount}>{count}</span>
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
                    icon={<FiAward size={16} />}
                    label="Years Experience"
                    value={`${worker.yearsExperience || 0} yr${worker.yearsExperience !== 1 ? "s" : ""}`}
                  />
                  <InfoCard
                    icon={<FiRadio size={16} />}
                    label="Service Radius"
                    value={`${worker.serviceRadius} km`}
                  />
                  <InfoCard
                    icon={<FiCalendar size={16} />}
                    label="Member Since"
                    value={new Date(user.createdAt).toLocaleDateString(
                      "en-GB",
                      { month: "long", year: "numeric" },
                    )}
                  />
                  {worker.backgroundCheck && (
                    <InfoCard
                      icon={<FiShield size={16} />}
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
                <Empty
                  icon={<FiImage size={36} />}
                  text="No portfolio items yet."
                />
              ) : (
                <div className={styles.portfolioGrid}>
                  {portfolio.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.portfolioCard}
                      onClick={() =>
                        setLightbox({
                          type: "portfolio",
                          url: item.imageUrl,
                          title: item.title,
                          description: item.description,
                        })
                      }
                      aria-label={`View ${item.title} full screen`}
                    >
                      <div className={styles.portfolioImg}>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          loading="lazy"
                        />
                        <span className={styles.portfolioZoom}>
                          <FiMaximize2 size={16} />
                        </span>
                      </div>
                      <div className={styles.portfolioBody}>
                        <p className={styles.portfolioTitle}>{item.title}</p>
                        {item.description && (
                          <p className={styles.portfolioDesc}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Video Intro — NEW TAB */}
          {tab === "video" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiVideo size={16} /> Video Introduction
              </h2>
              <VideoIntroSection
                videoUrl={worker.videoIntroUrl}
                workerName={user.firstName}
              />
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
                <Empty
                  icon={<FiFileText size={36} />}
                  text="No certifications added."
                />
              ) : (
                <div className={styles.certList}>
                  {certifications.map((cert) => (
                    <div key={cert.id} className={styles.certCard}>
                      <div className={styles.certIcon}>
                        <FiFileText size={20} />
                      </div>
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
                        <span className={styles.certVerified}>
                          <FiCheckCircle size={11} /> Verified
                        </span>
                      )}
                      {cert.documentUrl && (
                        <button
                          type="button"
                          className={styles.certLink}
                          onClick={() =>
                            setLightbox({
                              type: isPdfUrl(cert.documentUrl) ? "pdf" : "cert",
                              url: cert.documentUrl,
                              title: cert.name,
                              issuer: cert.issuedBy,
                              issueDate: cert.issueDate,
                              expiryDate: cert.expiryDate,
                              isVerified: cert.verified,
                            })
                          }
                        >
                          View <FiChevronRight size={12} />
                        </button>
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
                <Empty
                  icon={<FiCalendar size={36} />}
                  text="No availability set."
                />
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
                        <FiStar size={14} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {reviews.length === 0 ? (
                <Empty icon={<FiStar size={36} />} text="No reviews yet." />
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

      {/* ── FULLSCREEN LIGHTBOX ── */}
      {lightbox && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
        >
          <button
            type="button"
            className={styles.lightboxCloseBtn}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label="Close"
          >
            <FiX size={22} />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Portfolio image */}
            {lightbox.type === "portfolio" && (
              <>
                <img
                  src={lightbox.url}
                  alt={lightbox.title}
                  className={styles.lightboxImg}
                />
                {(lightbox.title || lightbox.description) && (
                  <div className={styles.lightboxCaption}>
                    {lightbox.title && (
                      <h2 className={styles.lightboxTitle}>{lightbox.title}</h2>
                    )}
                    {lightbox.description && (
                      <p className={styles.lightboxDesc}>
                        {lightbox.description}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Cert image */}
            {lightbox.type === "cert" && (
              <>
                <img
                  src={lightbox.url}
                  alt={lightbox.title}
                  className={styles.lightboxImg}
                />
                <div className={styles.lightboxCaption}>
                  {lightbox.title && (
                    <h2 className={styles.lightboxTitle}>{lightbox.title}</h2>
                  )}
                  {lightbox.issuer && (
                    <p className={styles.lightboxDesc}>
                      Issued by <strong>{lightbox.issuer}</strong>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Cert PDF */}
            {lightbox.type === "pdf" && (
              <>
                <iframe
                  src={lightbox.url}
                  title={lightbox.title}
                  className={styles.lightboxPdf}
                />
                {lightbox.title && (
                  <div className={styles.lightboxCaption}>
                    <h2 className={styles.lightboxTitle}>{lightbox.title}</h2>
                    {lightbox.issuer && (
                      <p className={styles.lightboxDesc}>
                        Issued by <strong>{lightbox.issuer}</strong>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

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
              <FiStar size={12} />
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
  const isPrivate = msg?.includes("private");
  return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <span className={styles.notFoundIcon}>
          {isPrivate ? <FiLock size={48} /> : <FiSearch size={48} />}
        </span>
        <h2 className={styles.notFoundTitle}>
          {isPrivate ? "Private Profile" : "Worker not found"}
        </h2>
        <p className={styles.notFoundSub}>{msg}</p>
        <Link to="/search" className={styles.notFoundLink}>
          <FiArrowLeft size={13} /> Back to Search
        </Link>
      </div>
    </div>
  );
}
