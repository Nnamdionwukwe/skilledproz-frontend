import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEnvelope,
  FaCheckCircle,
  FaSpinner,
  FaClipboardList,
  FaArrowRight,
  FaStar,
  FaGift,
  FaRocket,
  FaShieldAlt,
  FaUsers,
  FaCrown,
  FaGem,
  FaBolt,
  FaInfinity,
  FaAward,
  FaGlobe,
  FaShareAlt,
  FaWhatsapp,
  FaTwitter,
  FaFacebook,
  FaLink,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import styles from "./WaitlistSection.module.css";
import CountdownTimer from "../ui/CountdownTimer";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/waitlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setStatus("success");
      setMessage("🎉 You're on the list! Check your email for confirmation.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Failed to join. Please try again.");
    }
  };

  const referralLink = "https://skilledproz.com/ref/your-code-here";
  const referralMessage =
    "Join SkilledProz - the global platform for skilled workers! Get early access, exclusive bonuses, and lifetime benefits. 🚀 Use my referral link:";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOnWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${referralMessage}\n${referralLink}`)}`,
      "_blank",
    );
  };

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${referralMessage}\n${referralLink}`)}`,
      "_blank",
    );
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      "_blank",
    );
  };

  const benefits = [
    {
      icon: <FaRocket />,
      title: "Early Access",
      desc: "Be among the first 1,000 users to access the platform",
      color: "#F59E0B",
    },
    {
      icon: <FaGift />,
      title: "Exclusive Bonuses",
      desc: "₦5,000 credit for hirers & free premium badges for workers",
      color: "#10B981",
    },
    {
      icon: <FaCrown />,
      title: "Lifetime Benefits",
      desc: "Lock in free lifetime registration and 0% commission for early adopters",
      color: "#8B5CF6",
    },
    {
      icon: <FaShieldAlt />,
      title: "VIP Support",
      desc: "Priority customer support and early feature access",
      color: "#3B82F6",
    },
  ];

  const stats = [
    { value: "500+", label: "Already Joined", icon: <FaUsers /> },
    { value: "50+", label: "Countries", icon: <FaGlobe /> },
    { value: "100%", label: "Free Forever", icon: <FaInfinity /> },
  ];

  return (
    <section className={styles.waitlist}>
      <div className={styles.container}>
        {/* Social Proof Banner */}
        <div className={styles.socialProof}>
          <div className={styles.socialProofContent}>
            <span className={styles.socialProofDot} />
            <span className={styles.socialProofText}>
              <FaUsers /> <strong>500+</strong> early adopters already signed up
            </span>
            <span className={styles.socialProofDivider}>·</span>
            <span className={styles.socialProofText}>
              <FaAward /> Join the waitlist today
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className={styles.countdownWrapper}>
          <div className={styles.countdownBadge}>
            <FaBolt /> Limited Time
          </div>
          <CountdownTimer
            targetDate="2026-09-01T00:00:00"
            title="Launch Countdown"
            size="md"
            variant="orange"
          />
          <p className={styles.countdownSubtext}>
            ⏰ Only {Math.floor(Math.random() * 30) + 10} days left for
            exclusive bonuses
          </p>
        </div>

        <div className={styles.content}>
          {/* Header */}
          <div className={styles.headerBadge}>
            <FaGem /> Early Adopter Program
          </div>
          <h2 className={styles.title}>
            Get <span className={styles.highlight}>Premium Access</span> to the
            Future of Work
          </h2>
          <p className={styles.subtitle}>
            Join thousands of skilled workers and hirers already on the
            waitlist. Get exclusive benefits, early access, and lifetime perks —
            completely free.
          </p>

          {/* Benefits Grid */}
          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => (
              <div key={benefit.title} className={styles.benefitCard}>
                <span
                  className={styles.benefitIcon}
                  style={{
                    background: `${benefit.color}15`,
                    color: benefit.color,
                  }}
                >
                  {benefit.icon}
                </span>
                <div>
                  <h4 className={styles.benefitTitle}>{benefit.title}</h4>
                  <p className={styles.benefitDesc}>{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statItem}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>
                <FaStar className={styles.formStar} /> Join the Waitlist
              </h3>
              <p className={styles.formSubtext}>
                Enter your email to claim your exclusive early adopter benefits
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <FaEnvelope className={styles.inputIcon} />
                <input
                  type="email"
                  className={styles.input}
                  placeholder="Enter your best email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading" || status === "success"}
                />
                <button
                  type="submit"
                  className={styles.button}
                  disabled={status === "loading" || status === "success"}
                >
                  {status === "loading" ? (
                    <FaSpinner className={styles.spinner} />
                  ) : status === "success" ? (
                    "🎉 Joined!"
                  ) : (
                    "Claim My Spot 🚀"
                  )}
                </button>
              </div>
              {message && (
                <p
                  className={`${styles.message} ${status === "success" ? styles.success : styles.error}`}
                >
                  {status === "success" && (
                    <FaCheckCircle className={styles.messageIcon} />
                  )}
                  {message}
                </p>
              )}
            </form>

            <div className={styles.formFooter}>
              <span className={styles.footerBadge}>
                <FaCheckCircle /> No spam. Unsubscribe anytime.
              </span>
              <span className={styles.footerBadge}>
                <FaShieldAlt /> Your data is safe with us.
              </span>
            </div>
          </div>

          {/* ── Refer a Friend Section ── */}
          <div className={styles.referralWrapper}>
            <button
              className={styles.referralToggle}
              onClick={() => setShowReferral(!showReferral)}
            >
              <FaShareAlt /> Refer a Friend & Earn Bonuses
              <span className={styles.referralToggleIcon}>
                {showReferral ? "−" : "+"}
              </span>
            </button>

            {showReferral && (
              <div className={styles.referralContent}>
                <div className={styles.referralHeader}>
                  <div className={styles.referralBadge}>
                    <FaGift /> Both Get ₦2,000
                  </div>
                  <h4 className={styles.referralTitle}>
                    Invite Friends, Earn Together
                  </h4>
                  <p className={styles.referralDesc}>
                    Share your referral link. When your friend joins,{" "}
                    <strong>you both get ₦2,000</strong> in platform credit!
                  </p>
                </div>

                {/* Referral Link */}
                <div className={styles.referralLinkBox}>
                  <input
                    type="text"
                    className={styles.referralLinkInput}
                    value={referralLink}
                    readOnly
                  />
                  <button
                    className={styles.referralCopyBtn}
                    onClick={handleCopyLink}
                  >
                    {copied ? <FaCheck /> : <FaCopy />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Share Buttons */}
                <div className={styles.referralShareButtons}>
                  <button
                    className={styles.shareBtnWhatsApp}
                    onClick={shareOnWhatsApp}
                  >
                    <FaWhatsapp /> WhatsApp
                  </button>
                  <button
                    className={styles.shareBtnTwitter}
                    onClick={shareOnTwitter}
                  >
                    <FaTwitter /> Twitter
                  </button>
                  <button
                    className={styles.shareBtnFacebook}
                    onClick={shareOnFacebook}
                  >
                    <FaFacebook /> Facebook
                  </button>
                  <button
                    className={styles.shareBtnLink}
                    onClick={handleCopyLink}
                  >
                    <FaLink /> Copy Link
                  </button>
                </div>

                <div className={styles.referralFooter}>
                  <div className={styles.referralPerks}>
                    <span className={styles.perkItem}>
                      <FaCheckCircle /> You get ₦2,000
                    </span>
                    <span className={styles.perkItem}>
                      <FaCheckCircle /> Friend gets ₦2,000
                    </span>
                    <span className={styles.perkItem}>
                      <FaCheckCircle /> Unlimited referrals
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Survey Link */}
          <div className={styles.surveyWrapper}>
            <div className={styles.surveyDivider}>
              <span className={styles.surveyDividerLine} />
              <span className={styles.surveyDividerText}>or</span>
              <span className={styles.surveyDividerLine} />
            </div>
            <Link
              to={`/survey${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className={styles.surveyBtn}
            >
              <FaClipboardList /> Tell us what feature you need most{" "}
              <FaArrowRight className={styles.surveyArrow} />
            </Link>
            <p className={styles.surveySubtext}>
              Help us build the platform <strong>you</strong> actually need
            </p>

            <Link to={`/socials`} className={styles.socialBtn}>
              <span className={styles.socialBtnIcon}>
                <FaShareAlt />
                <span className={styles.socialBtnPulse} />
              </span>
              <span className={styles.socialBtnText}>
                Join <strong>5,000+</strong> Followers
              </span>
              <span className={styles.socialBtnBadge}>
                <FaArrowRight />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
