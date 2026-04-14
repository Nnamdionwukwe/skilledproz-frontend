import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Star,
  Clock,
  CheckCircle2,
  Briefcase,
  HardHat,
  Camera,
  Edit3,
  ArrowLeft,
  Globe,
  Phone,
  Calendar,
  Award,
  ImageIcon,
  AlertCircle,
  Loader2,
  Mail,
  ChevronRight,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import EditProfile from "./EditProfile";
import s from "./UserProfile.module.css";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import { useSubscription } from "../context/SubscriptionContext";

/* ── helpers ─────────────────────────────────────────────── */
function initials(u) {
  if (!u) return "??";
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function ProBadge({ isOwn }) {
  const { features } = useSubscription();
  if (!isOwn || !features?.proBadge) return null;
  return (
    <span
      style={{
        fontSize: "0.65rem",
        background: "var(--orange)",
        color: "var(--bg)",
        padding: "0.15rem 0.5rem",
        borderRadius: "100px",
        fontWeight: 800,
        letterSpacing: "0.04em",
      }}
    >
      ⭐ PRO
    </span>
  );
}

function timeAgo(date) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

function Stars({ rating = 0, max = 5 }) {
  return (
    <span className={s.stars}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(rating) ? s.starFilled : s.starEmpty}
        />
      ))}
    </span>
  );
}

/* ── Avatar with upload support ──────────────────────────── */
function AvatarBlock({ user, isOwn, onAvatarChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    setUploading(true);
    try {
      const { data } = await api.put("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onAvatarChange?.(data.data.user.avatar);
    } catch {
      // silent fail — toast system can pick this up in Phase 7
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`${s.avatarWrap} ${isOwn ? s.avatarOwn : ""}`}
      onMouseEnter={() => isOwn && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => isOwn && fileRef.current?.click()}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt={user.firstName} className={s.avatarImg} />
      ) : (
        <div className={s.avatarFallback}>{initials(user)}</div>
      )}

      {/* Upload overlay */}
      {isOwn && (hover || uploading) && (
        <div className={s.avatarOverlay}>
          {uploading ? (
            <Loader2 size={20} className={s.spin} />
          ) : (
            <>
              <Camera size={18} />
              <span>Change</span>
            </>
          )}
        </div>
      )}

      {/* Online dot */}
      {!isOwn && <span className={s.onlineDot} />}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}

/* ── Tab bar ─────────────────────────────────────────────── */
const TABS = {
  WORKER: ["About", "Portfolio", "Certifications", "Reviews"],
  HIRER: ["About", "Reviews"],
};

/* ── Main component ──────────────────────────────────────── */
export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuthStore();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("About");
  const [editing, setEditing] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  const [lightbox, setLightbox] = useState(null);

  const Layout = me?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const isOwn = me?.id === id || (!id && !!me);
  const profileId = id || me?.id;
  if (!me && !id) return null;

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    api
      .get(`/users/${profileId}`)
      .then(({ data }) => setUser(data.data.user))
      .catch(() => setError("User not found"))
      .finally(() => setLoading(false));
  }, [profileId]);

  // Fetch reviews when Reviews tab is opened
  useEffect(() => {
    if (tab !== "Reviews" || !profileId) return;
    setReviewsLoading(true);
    const endpoint =
      user?.role === "WORKER"
        ? `/reviews/worker/${profileId}`
        : `/reviews/hirer/${profileId}`;
    api
      .get(endpoint, { params: { limit: 20 } })
      .then((res) => {
        setReviews(res.data.data.reviews || []);
        setReviewsTotal(res.data.data.total || 0);
      })
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [tab, profileId, user?.role]);

  const handleAvatarChange = (url) => setUser((u) => ({ ...u, avatar: url }));

  const handleProfileSaved = (updated) => {
    setUser((u) => ({ ...u, ...updated }));
    setEditing(false);
  };

  /* ── Loading ── */
  if (loading)
    return (
      <div className={s.page}>
        <div className={s.loadingWrap}>
          <Loader2
            size={32}
            className={s.spin}
            style={{ color: "var(--orange)" }}
          />
          <p>Loading profile…</p>
        </div>
      </div>
    );

  /* ── Error ── */
  if (error || !user)
    return (
      <div className={s.page}>
        <div className={s.errorWrap}>
          <AlertCircle size={36} style={{ color: "var(--red)" }} />
          <p>{error || "Something went wrong"}</p>
          <button className={s.btnBack} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Go back
          </button>
        </div>
      </div>
    );

  /* ── Edit mode ── */
  if (editing)
    return (
      <div className={s.page}>
        <EditProfile
          user={user}
          onSaved={handleProfileSaved}
          onCancel={() => setEditing(false)}
        />
      </div>
    );

  const wp = user.workerProfile;
  const tabs = TABS[user.role] ?? ["About"];

  return (
    <Layout>
      <div className={s.page}>
        {/* ── Back nav ── */}
        {!isOwn && (
          <button className={s.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
        )}

        <div className={s.layout}>
          {/* ══════════════ LEFT COLUMN ══════════════ */}
          <aside className={s.sidebar}>
            {/* Hero card */}
            <div className={s.heroCard}>
              <div className={s.heroBg} />

              <AvatarBlock
                user={user}
                isOwn={isOwn}
                onAvatarChange={handleAvatarChange}
              />
              <div className={s.heroInfo}>
                <div className={s.heroNameRow}>
                  <h1 className={s.heroName}>
                    {user.firstName} {user.lastName}
                  </h1>
                  {(wp?.verificationStatus === "VERIFIED" ||
                    user.workerProfile?.verificationStatus === "VERIFIED") && (
                    <ShieldCheck
                      size={16}
                      className={s.verifiedIcon}
                      title="Identity Verified"
                    />
                  )}
                </div>

                {/* Pro badge */}
                <ProBadge isOwn={isOwn} />

                {/* Verified text badge under name */}
                {wp?.verificationStatus === "VERIFIED" && (
                  <div
                    className={`${s.badge} ${s.badgeGreen}`}
                    style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                  >
                    <ShieldCheck size={10} /> Verified Worker
                  </div>
                )}

                <div className={s.rolePill}>
                  {user.role === "WORKER" ? (
                    <>
                      <HardHat size={12} /> Worker
                    </>
                  ) : (
                    <>
                      <Briefcase size={12} /> Hirer
                    </>
                  )}
                </div>

                {wp?.title && <p className={s.heroTitle}>{wp.title}</p>}

                {wp?.avgRating > 0 && (
                  <div className={s.ratingRow}>
                    <Stars rating={wp.avgRating} />
                    <span className={s.ratingNum}>
                      {Number(wp.avgRating).toFixed(1)}
                    </span>
                    <span className={s.ratingCount}>
                      ({wp.totalReviews ?? 0} reviews)
                    </span>
                  </div>
                )}
              </div>

              {isOwn && (
                <button
                  className={s.editBtn}
                  onClick={() => navigate("/settings")}
                >
                  ⚙️ Settings
                </button>
              )}
            </div>

            {/* Quick stats */}
            <div className={s.statsCard}>
              {wp && (
                <>
                  <div className={s.statItem}>
                    <DollarSign size={15} className={s.statIcon} />
                    <div>
                      <span className={s.statVal}>
                        {wp.currency ?? user.currency ?? "USD"}{" "}
                        {Number(wp.hourlyRate ?? 0).toLocaleString()}
                      </span>
                      <span className={s.statLabel}>/hr</span>
                    </div>
                  </div>

                  <div className={s.statItem}>
                    <CheckCircle2 size={15} className={s.statIcon} />
                    <div>
                      <span className={s.statVal}>
                        {wp.completedJobs ?? wp.totalJobs ?? 0}
                      </span>
                      <span className={s.statLabel}>jobs done</span>
                    </div>
                  </div>

                  {wp.serviceRadius && (
                    <div className={s.statItem}>
                      <MapPin size={15} className={s.statIcon} />
                      <div>
                        <span className={s.statVal}>{wp.serviceRadius} km</span>
                        <span className={s.statLabel}>radius</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── HIRER stats ── */}
              {user.role === "HIRER" && user.hirerStats && (
                <>
                  <div className={s.statItem}>
                    <Briefcase size={15} className={s.statIcon} />
                    <div>
                      <span className={s.statVal}>
                        {user.hirerStats.totalHires}
                      </span>
                      <span className={s.statLabel}>total hires</span>
                    </div>
                  </div>

                  <div className={s.statItem}>
                    <DollarSign size={15} className={s.statIcon} />
                    <div>
                      <span className={s.statVal}>
                        {user.currency ?? "USD"}{" "}
                        {Number(user.hirerStats.totalSpent).toLocaleString()}
                      </span>
                      <span className={s.statLabel}>total spent</span>
                    </div>
                  </div>

                  {user.hirerStats.avgRating > 0 && (
                    <div className={s.statItem}>
                      <Star size={15} className={s.statIcon} />
                      <div>
                        <span className={s.statVal}>
                          {Number(user.hirerStats.avgRating).toFixed(1)}
                        </span>
                        <span className={s.statLabel}>
                          rating ({user.hirerStats.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className={s.statItem}>
                <Clock size={15} className={s.statIcon} />
                <div>
                  <span className={s.statVal}>{timeAgo(user.lastSeen)}</span>
                  <span className={s.statLabel}>last seen</span>
                </div>
              </div>

              <div className={s.statItem}>
                <Calendar size={15} className={s.statIcon} />
                <div>
                  <span className={s.statVal}>
                    {new Date(user.createdAt).toLocaleDateString("en", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className={s.statLabel}>joined</span>
                </div>
              </div>
            </div>

            {/* Location + contact */}
            <div className={s.infoCard}>
              {(user.city || user.country) && (
                <div className={s.infoRow}>
                  <MapPin size={14} className={s.statIcon} />
                  <span>
                    {[user.city, user.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {user.phone && (
                <div className={s.infoRow}>
                  <Phone size={15} className={s.statIcon} />
                  <div>
                    <a
                      href={`tel:${user.phone}`}
                      className={s.statVal}
                      style={{
                        fontSize: "13px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      {user.phone}
                    </a>
                  </div>
                </div>
              )}

              {user.email && isOwn && (
                <div className={s.infoRow}>
                  <Mail size={14} className={s.statIcon} />
                  <a
                    href={`mailto:${user.email}`}
                    style={{
                      fontSize: "13px",
                      textDecoration: "none",
                      color: "inherit",
                      wordBreak: "break-all",
                      maxWidth: "200px",
                      display: "block",
                    }}
                  >
                    {user.email}
                  </a>
                </div>
              )}
              {user.currency && (
                <div className={s.infoRow}>
                  <Globe size={14} className={s.statIcon} />
                  <span>{user.currency}</span>
                </div>
              )}

              {/* Website — hirer only */}
              {user.hirerProfile?.website && (
                <div className={s.infoRow}>
                  <Globe size={14} className={s.statIcon} />
                  <a
                    href={
                      user.hirerProfile.website.startsWith("http")
                        ? user.hirerProfile.website
                        : `https://${user.hirerProfile.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={s.websiteLink}
                  >
                    {user.hirerProfile.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>

            {/* Categories */}
            {wp?.categories?.length > 0 && (
              <div className={s.catCard}>
                <p className={s.cardLabel}>Specialities</p>
                <div className={s.catWrap}>
                  {wp.categories.map((c) => (
                    <span key={c.id} className={s.catPill}>
                      {c.category?.name ?? c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA for non-owner */}
            {!isOwn && user.role === "WORKER" && (
              <button
                className={s.bookBtn}
                onClick={() => navigate(`/book/${user.id}`)}
              >
                Book {user.firstName} <ChevronRight size={16} />
              </button>
            )}
          </aside>

          {/* ══════════════ RIGHT COLUMN ══════════════ */}
          <section className={s.main}>
            {/* Tab bar */}
            <div className={s.tabBar}>
              {tabs.map((t) => (
                <button
                  key={t}
                  className={`${s.tabBtn} ${tab === t ? s.tabBtnActive : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── ABOUT ── */}
            {tab === "About" && (
              <div className={s.tabContent}>
                {user.bio ? (
                  <div className={s.bioCard}>
                    <p className={s.cardLabel}>About</p>
                    <p className={s.bioText}>{user.bio}</p>
                  </div>
                ) : (
                  <div className={s.emptyCard}>
                    <p>
                      {isOwn
                        ? "Add a bio to tell people about yourself."
                        : "No bio yet."}
                    </p>
                    {isOwn && (
                      <button
                        className={s.emptyBtn}
                        onClick={() => setEditing(true)}
                      >
                        <Edit3 size={13} /> Add bio
                      </button>
                    )}
                  </div>
                )}

                {/* Availability */}
                {wp?.availability && (
                  <div className={s.availCard}>
                    <p className={s.cardLabel}>Availability</p>
                    <div className={s.availDays}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (d) => {
                          const active = wp.availability?.includes(d);
                          return (
                            <span
                              key={d}
                              className={`${s.dayPill} ${active ? s.dayActive : ""}`}
                            >
                              {d}
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* Verification badges */}
                <div className={s.badgeRow}>
                  <div
                    className={`${s.badge} ${user.isEmailVerified ? s.badgeGreen : s.badgeGray}`}
                  >
                    <CheckCircle2 size={13} />
                    Email {user.isEmailVerified ? "Verified" : "Unverified"}
                  </div>
                  {wp?.verificationStatus === "VERIFIED" && (
                    <div className={`${s.badge} ${s.badgeOrange}`}>
                      <ShieldCheck size={13} /> ID Verified
                    </div>
                  )}
                  {wp?.backgroundCheck === true && (
                    <div className={`${s.badge} ${s.badgeBlue}`}>
                      <Award size={13} /> Background Checked
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PORTFOLIO — clickable for full-page view ── */}
            {tab === "Portfolio" && (
              <div className={s.tabContent}>
                {wp?.portfolio?.length > 0 ? (
                  <div className={s.portfolioGrid}>
                    {wp.portfolio.map((item) => (
                      <div
                        key={item.id}
                        className={`${s.portfolioCard} ${s.portfolioCardClickable}`}
                        onClick={() => setLightbox({ type: "portfolio", item })}
                        title="Click to view full size"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className={s.portfolioImg}
                          />
                        ) : (
                          <div className={s.portfolioPlaceholder}>
                            <ImageIcon
                              size={24}
                              style={{ color: "var(--text-muted)" }}
                            />
                          </div>
                        )}
                        <div className={s.portfolioInfo}>
                          <p className={s.portfolioTitle}>{item.title}</p>
                          {item.description && (
                            <p className={s.portfolioDesc}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className={s.portfolioExpand}>⛶ View full</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.emptyCard}>
                    <ImageIcon
                      size={28}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <p>
                      {isOwn
                        ? "Upload your best work to attract clients."
                        : "No portfolio items yet."}
                    </p>
                    {isOwn && (
                      <button
                        className={s.emptyBtn}
                        onClick={() => navigate("/dashboard/worker/portfolio")}
                      >
                        <Camera size={13} /> Add portfolio
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CERTIFICATIONS — clickable for full-page view ── */}
            {tab === "Certifications" && (
              <div className={s.tabContent}>
                {wp?.certifications?.length > 0 ? (
                  <div className={s.certList}>
                    {wp.certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className={`${s.certCard} ${s.certCardClickable}`}
                        onClick={() =>
                          setLightbox({ type: "cert", item: cert })
                        }
                        title="Click to view full details"
                      >
                        <div className={s.certIcon}>
                          <Award size={18} />
                        </div>
                        <div className={s.certInfo}>
                          <p className={s.certName}>{cert.name}</p>
                          {cert.issuer && (
                            <p className={s.certIssuer}>
                              Issued by {cert.issuer}
                            </p>
                          )}
                          {cert.issuedAt && (
                            <p className={s.certDate}>
                              {new Date(cert.issuedAt).toLocaleDateString(
                                "en",
                                { month: "short", year: "numeric" },
                              )}
                              {cert.expiryDate &&
                                ` – ${new Date(cert.expiryDate).toLocaleDateString("en", { month: "short", year: "numeric" })}`}
                            </p>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 6,
                            marginLeft: "auto",
                          }}
                        >
                          {cert.isVerified && (
                            <div className={`${s.badge} ${s.badgeGreen}`}>
                              <CheckCircle2 size={12} /> Verified
                            </div>
                          )}
                          <span className={s.certViewHint}>View →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.emptyCard}>
                    <Award size={28} style={{ color: "var(--text-muted)" }} />
                    <p>
                      {isOwn
                        ? "Add certifications to build trust with clients."
                        : "No certifications listed."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── REVIEWS — live from API ── */}
            {tab === "Reviews" && (
              <div className={s.tabContent}>
                {reviewsLoading ? (
                  <div className={s.reviewsLoading}>
                    <Loader2
                      size={22}
                      className={s.spin}
                      style={{ color: "var(--orange)" }}
                    />
                    <span>Loading reviews…</span>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className={s.emptyCard}>
                    <Star size={28} style={{ color: "var(--text-muted)" }} />
                    <p>No reviews yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary bar */}
                    {reviewsTotal > 0 && (
                      <div className={s.reviewSummary}>
                        <div className={s.reviewSummaryLeft}>
                          <span className={s.reviewSummaryScore}>
                            {reviews.length > 0
                              ? (
                                  reviews.reduce((a, r) => a + r.rating, 0) /
                                  reviews.length
                                ).toFixed(1)
                              : "—"}
                          </span>
                          <Stars
                            rating={
                              reviews.length > 0
                                ? reviews.reduce((a, r) => a + r.rating, 0) /
                                  reviews.length
                                : 0
                            }
                          />
                        </div>
                        <span className={s.reviewSummaryCount}>
                          {reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    <div className={s.reviewsList}>
                      {reviews.map((r) => (
                        <div key={r.id} className={s.reviewCard}>
                          <div className={s.reviewTop}>
                            <div className={s.reviewAvatar}>
                              {r.giver?.avatar ? (
                                <img src={r.giver.avatar} alt="" />
                              ) : (
                                <span>
                                  {r.giver?.firstName?.[0]}
                                  {r.giver?.lastName?.[0]}
                                </span>
                              )}
                            </div>
                            <div className={s.reviewMeta}>
                              <p className={s.reviewerName}>
                                {r.giver?.firstName} {r.giver?.lastName}
                                <span className={s.reviewerRole}>
                                  {" "}
                                  ·{" "}
                                  {r.giver?.role === "HIRER"
                                    ? "Hirer"
                                    : "Worker"}
                                </span>
                              </p>
                              {r.booking?.title && (
                                <p className={s.reviewBooking}>
                                  {r.booking.category?.icon} {r.booking.title}
                                </p>
                              )}
                              <p className={s.reviewDate}>
                                {new Date(r.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                            <div className={s.reviewStars}>
                              <Stars rating={r.rating} />
                              <span className={s.reviewRatingNum}>
                                {r.rating}/5
                              </span>
                            </div>
                          </div>
                          {r.comment && (
                            <p className={s.reviewComment}>"{r.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className={s.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div className={s.lightboxBox} onClick={(e) => e.stopPropagation()}>
            <button
              className={s.lightboxClose}
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>

            {/* Portfolio lightbox */}
            {lightbox.type === "portfolio" && (
              <>
                {lightbox.item.imageUrl && (
                  <img
                    src={lightbox.item.imageUrl}
                    alt={lightbox.item.title}
                    className={s.lightboxImg}
                  />
                )}
                <div className={s.lightboxInfo}>
                  <h2 className={s.lightboxTitle}>{lightbox.item.title}</h2>
                  {lightbox.item.description && (
                    <p className={s.lightboxDesc}>
                      {lightbox.item.description}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Certification lightbox */}
            {lightbox.type === "cert" && (
              <div className={s.lightboxCert}>
                <div className={s.lightboxCertIcon}>
                  <Award size={40} />
                </div>
                <h2 className={s.lightboxTitle}>{lightbox.item.name}</h2>
                {lightbox.item.issuer && (
                  <p className={s.lightboxCertMeta}>
                    Issued by <strong>{lightbox.item.issuer}</strong>
                  </p>
                )}
                <div className={s.lightboxCertDates}>
                  {lightbox.item.issueDate && (
                    <div className={s.lightboxCertDate}>
                      <span>Issue date</span>
                      <strong>
                        {new Date(lightbox.item.issueDate).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </strong>
                    </div>
                  )}
                  {lightbox.item.expiryDate && (
                    <div className={s.lightboxCertDate}>
                      <span>Expiry date</span>
                      <strong>
                        {new Date(lightbox.item.expiryDate).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </strong>
                    </div>
                  )}
                </div>
                {lightbox.item.isVerified && (
                  <div
                    className={`${s.badge} ${s.badgeGreen}`}
                    style={{ margin: "1rem auto 0" }}
                  >
                    <CheckCircle2 size={13} /> Verified by SkilledProz
                  </div>
                )}
                {lightbox.item.documentUrl && (
                  <a
                    href={lightbox.item.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={s.lightboxDocLink}
                  >
                    📄 View Certificate Document →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
