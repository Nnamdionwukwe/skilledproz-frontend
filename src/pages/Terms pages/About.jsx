import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./About.module.css";

const stats = [
  { value: "500+", label: "Skill Categories" },
  { value: "50+", label: "Countries Supported" },
  { value: "100+", label: "Skilled Workers" },
  { value: "98%", label: "Satisfaction Rate" },
];

const values = [
  {
    icon: "⚡",
    title: "Speed & Precision",
    desc: "We match hirers with the right skilled worker in minutes, not days. Location-aware, category-smart, always accurate.",
  },
  {
    icon: "🔒",
    title: "Trust & Safety",
    desc: "Every worker is identity-verified. Background checks, credential uploads, and peer endorsements build a platform you can rely on.",
  },
  {
    icon: "🌍",
    title: "Truly Global",
    desc: "Built for every region — multi-currency payments, local mobile money, regional compliance, and support for every local language.",
  },
  {
    icon: "💰",
    title: "Fair for Everyone",
    desc: "Workers keep more of what they earn. Hirers get transparent pricing. No hidden fees. No surprises.",
  },
];

const team = [
  { name: "Nnamdi Onwukwe", role: "Founder & CEO", flag: "🇳🇬" },
  { name: "Global Team", role: "Engineering & Design", flag: "🌍" },
  { name: "You", role: "Join the Mission", flag: "✨" },
];

export default function About() {
  const heroRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          Skilled<span>Proz</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/contact">Contact</Link>
          <Link to="/login" className={styles.navCta}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroBadge}>Our Story</div>
        <h1 className={styles.heroTitle}>
          The world's skills and professionals
          <br />
          <span className={styles.accent}>one platform.</span>
        </h1>
        <p className={styles.heroSub}>
          SkilledProz was built to solve a simple but massive Problem — skilled
          workers and professionals exist everywhere, but hirers can never find
          them fast enough. We're changing that, globally, one booking at a
          time.
        </p>
        <div className={styles.heroDivider} />
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        {stats.map((s, i) => (
          <div
            className={styles.stat}
            key={i}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* Mission */}
      <section className={styles.mission}>
        <div className={styles.missionLeft}>
          <div className={styles.sectionTag}>Our Mission</div>
          <h2 className={styles.sectionTitle}>
            Connecting talent
            <br />
            with opportunity,
            <br />
            <em>everywhere.</em>
          </h2>
        </div>
        <div className={styles.missionRight}>
          <p>
            Most hiring platforms are built for office work in rich countries.
            SkilledProz was built for the whole world — the electrician in
            Lagos, the carpenter in Manila, the coder in Nairobi, the plumber in
            São Paulo.
          </p>
          <p>
            We believe skilled workers and all professionals deserves a
            world-class marketplace. One that treats every trade and profession
            as valuable, every worker as a Professional, and every hirer as
            someone who deserves fast, reliable service.
          </p>
          <p>
            That's why we built AI-powered matching, multi-currency payments,
            identity verification, and real-time communication — all in one
            platform, for every category, in every country.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className={styles.values}>
        <div className={styles.sectionTag}>What We Stand For</div>
        <h2 className={styles.sectionTitle}>Our Core Values</h2>
        <div className={styles.valuesGrid}>
          {values.map((v, i) => (
            <div
              className={styles.valueCard}
              key={i}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className={styles.valueIcon}>{v.icon}</span>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueDesc}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className={styles.team}>
        <div className={styles.sectionTag}>The People</div>
        <h2 className={styles.sectionTitle}>Built by a global team</h2>
        <div className={styles.teamGrid}>
          {team.map((t, i) => (
            <div className={styles.teamCard} key={i}>
              <span className={styles.teamFlag}>{t.flag}</span>
              <h3 className={styles.teamName}>{t.name}</h3>
              <p className={styles.teamRole}>{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to join the movement?</h2>
        <p className={styles.ctaSub}>
          Whether you hire or you work — SkilledProz is built for you.
        </p>
        <div className={styles.ctaButtons}>
          <Link to="/register/hirer" className={styles.ctaPrimary}>
            Hire Proz
          </Link>
          <Link to="/register/worker" className={styles.ctaSecondary}>
            Join as a Worker
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} SkilledProz. All rights reserved.
        </span>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
