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

/* ── helpers ─────────────────────────────────────────────── */
function initials(u) {
  if (!u) return "??";
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
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
                  {wp?.isVerified && (
                    <ShieldCheck size={18} className={s.verifiedIcon} />
                  )}
                </div>

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

                {wp?.rating != null && (
                  <div className={s.ratingRow}>
                    <Stars rating={wp.rating} />
                    <span className={s.ratingNum}>
                      {Number(wp.rating).toFixed(1)}
                    </span>
                    <span className={s.ratingCount}>
                      ({wp.totalReviews ?? 0} reviews)
                    </span>
                  </div>
                )}
              </div>

              {isOwn && (
                <button className={s.editBtn} onClick={() => setEditing(true)}>
                  <Edit3 size={14} /> Edit Profile
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
                        ₦{Number(wp.hourlyRate ?? 0).toLocaleString()}
                      </span>
                      <span className={s.statLabel}>/hr</span>
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
                  <div className={s.statItem}>
                    <CheckCircle2 size={15} className={s.statIcon} />
                    <div>
                      <span className={s.statVal}>{wp.totalJobs ?? 0}</span>
                      <span className={s.statLabel}>jobs done</span>
                    </div>
                  </div>
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
                  <MapPin size={14} className={s.infoIcon} />
                  <span>
                    {[user.city, user.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {user.email && isOwn && (
                <div className={s.infoRow}>
                  <Mail size={14} className={s.infoIcon} />
                  <span>{user.email}</span>
                </div>
              )}
              {user.currency && (
                <div className={s.infoRow}>
                  <Globe size={14} className={s.infoIcon} />
                  <span>{user.currency}</span>
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
                  {wp?.isVerified && (
                    <div className={`${s.badge} ${s.badgeOrange}`}>
                      <ShieldCheck size={13} /> ID Verified
                    </div>
                  )}
                  {wp?.isBackgroundChecked && (
                    <div className={`${s.badge} ${s.badgeBlue}`}>
                      <Award size={13} /> Background Checked
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PORTFOLIO ── */}
            {tab === "Portfolio" && (
              <div className={s.tabContent}>
                {wp?.portfolio?.length > 0 ? (
                  <div className={s.portfolioGrid}>
                    {wp.portfolio.map((item) => (
                      <div key={item.id} className={s.portfolioCard}>
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
                        {item.title && (
                          <div className={s.portfolioInfo}>
                            <p className={s.portfolioTitle}>{item.title}</p>
                            {item.description && (
                              <p className={s.portfolioDesc}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        )}
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

            {/* ── CERTIFICATIONS ── */}
            {tab === "Certifications" && (
              <div className={s.tabContent}>
                {wp?.certifications?.length > 0 ? (
                  <div className={s.certList}>
                    {wp.certifications.map((cert) => (
                      <div key={cert.id} className={s.certCard}>
                        <div className={s.certIcon}>
                          <Award size={18} />
                        </div>
                        <div className={s.certInfo}>
                          <p className={s.certName}>{cert.name}</p>
                          {cert.issuer && (
                            <p className={s.certIssuer}>{cert.issuer}</p>
                          )}
                          {cert.issuedAt && (
                            <p className={s.certDate}>
                              Issued{" "}
                              {new Date(cert.issuedAt).toLocaleDateString(
                                "en",
                                {
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          )}
                        </div>
                        {cert.isVerified && (
                          <div
                            className={`${s.badge} ${s.badgeGreen}`}
                            style={{ marginLeft: "auto" }}
                          >
                            <CheckCircle2 size={12} /> Verified
                          </div>
                        )}
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

            {/* ── REVIEWS ── */}
            {tab === "Reviews" && (
              <div className={s.tabContent}>
                <div className={s.emptyCard}>
                  <Star size={28} style={{ color: "var(--text-muted)" }} />
                  <p>Reviews coming in Phase 5.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
